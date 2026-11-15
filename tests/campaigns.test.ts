import { describe, expect, it } from "vitest";

import {
  appearsOn,
  dismissalHolds,
  hiddenCampaignIds,
  isLive,
  liveCampaigns,
  parseDismissals,
  parseIstLocal,
  pathMatches,
  pickFor,
  safeCampaignHref,
  serialiseDismissals,
  storageKey,
  toIstLocal,
  type CampaignRow,
  type PublicCampaign,
} from "@/lib/campaigns";
import { schemaFor, toPrismaData } from "@/lib/admin/fields";
import { RESOURCES } from "@/lib/admin/resources";

const row = (over: Partial<CampaignRow> = {}): CampaignRow => ({
  id: "c1",
  message: "Hello",
  href: "/enterprise",
  linkLabel: "See offer",
  tone: "PROMO",
  startsAt: null,
  endsAt: null,
  active: true,
  displayOrder: 100,
  updatedAt: new Date("2026-11-01T00:00:00Z"),
  format: "BANNER",
  title: null,
  pages: [],
  frequency: "ONCE_PER_DAY",
  delaySeconds: 4,
  ...over,
});

const pub = (over: Partial<PublicCampaign> = {}): PublicCampaign => ({
  ...(liveCampaigns([row()], new Date("2026-11-15T00:00:00Z"))[0] as PublicCampaign),
  ...over,
});

describe("India time", () => {
  it("reads a typed IST moment as the instant it names", () => {
    // 11:59 pm on the 19th in India is 18:29 UTC the same day — not midnight UTC.
    expect(parseIstLocal("2026-11-19T23:59")?.toISOString()).toBe("2026-11-19T18:29:00.000Z");
  });

  it("round-trips an instant back to what the admin typed", () => {
    const typed = "2026-11-20T00:00";
    expect(toIstLocal(parseIstLocal(typed) as Date)).toBe(typed);
  });

  it("rejects dates and times that do not exist instead of rolling them over", () => {
    expect(parseIstLocal("2026-02-31T10:00")).toBeNull();
    expect(parseIstLocal("2026-11-20T25:00")).toBeNull();
    expect(parseIstLocal("not a date")).toBeNull();
    expect(parseIstLocal("2026-11-20")).toBeNull();
  });

  it("is what the admin datetime field validates and stores", () => {
    const fields = RESOURCES.banners.fields.filter((f) => f.name === "endsAt");
    const schema = schemaFor(fields);
    expect(schema.safeParse({ endsAt: "2026-11-19T23:59" }).success).toBe(true);
    expect(schema.safeParse({ endsAt: "" }).success).toBe(true);
    expect(schema.safeParse({ endsAt: "2026-13-40T99:99" }).success).toBe(false);

    const payload = toPrismaData(fields, { endsAt: "2026-11-19T23:59" });
    expect((payload.endsAt as Date).toISOString()).toBe("2026-11-19T18:29:00.000Z");
    expect(toPrismaData(fields, { endsAt: "" }).endsAt).toBeNull();
  });
});

describe("whether a campaign is running", () => {
  const now = new Date("2026-11-15T12:00:00Z");

  it("needs to be switched on and have a format", () => {
    expect(isLive(row(), now)).toBe(true);
    expect(isLive(row({ active: false }), now)).toBe(false);
    // A row from the old banner feature has no format and must never appear.
    expect(isLive(row({ format: null }), now)).toBe(false);
  });

  it("starts at its start instant and stops at its end instant", () => {
    const window = row({
      startsAt: new Date("2026-11-15T12:00:00Z"),
      endsAt: new Date("2026-11-16T12:00:00Z"),
    });
    expect(isLive(window, new Date("2026-11-15T11:59:59Z"))).toBe(false);
    expect(isLive(window, new Date("2026-11-15T12:00:00Z"))).toBe(true);
    expect(isLive(window, new Date("2026-11-16T11:59:59Z"))).toBe(true);
    expect(isLive(window, new Date("2026-11-16T12:00:00Z"))).toBe(false);
  });

  it("orders by priority and sends the browser nothing internal", () => {
    const out = liveCampaigns(
      [row({ id: "b", displayOrder: 5 }), row({ id: "a", displayOrder: 1 }), row({ id: "x", active: false })],
      now,
    );
    expect(out.map((c) => c.id)).toEqual(["a", "b"]);
    expect(Object.keys(out[0] as object)).not.toContain("active");
    expect(Object.keys(out[0] as object)).not.toContain("name");
  });

  it("drops an unsafe link, and a link without a label", () => {
    expect(safeCampaignHref("javascript:alert(1)")).toBeNull();
    expect(safeCampaignHref("//evil.test")).toBeNull();
    expect(safeCampaignHref("/\\evil.test")).toBeNull();
    expect(safeCampaignHref("http://insecure.test")).toBeNull();
    expect(safeCampaignHref("/enterprise")).toBe("/enterprise");
    expect(safeCampaignHref("https://example.com/x")).toBe("https://example.com/x");

    const bad = liveCampaigns([row({ href: "javascript:alert(1)" })], now)[0] as PublicCampaign;
    expect(bad.href).toBeNull();
    expect(bad.linkLabel).toBeNull();
    const unlabelled = liveCampaigns([row({ linkLabel: "" })], now)[0] as PublicCampaign;
    expect(unlabelled.href).toBeNull();
  });
});

describe("which pages a campaign appears on", () => {
  it("matches exact paths, trailing slashes and sections", () => {
    expect(pathMatches("/", "/")).toBe(true);
    expect(pathMatches("/about", "/about/")).toBe(true);
    expect(pathMatches("/products/*", "/products")).toBe(true);
    expect(pathMatches("/products/*", "/products/office-365")).toBe(true);
    expect(pathMatches("/products/*", "/productsxyz")).toBe(false);
    expect(pathMatches("/about", "/about/team")).toBe(false);
    expect(pathMatches("*", "/anything")).toBe(true);
    expect(pathMatches("", "/")).toBe(false);
  });

  it("means every page when the list is empty", () => {
    expect(appearsOn({ format: "BANNER", pages: [] }, "/products/x")).toBe(true);
  });

  it("is limited to the listed pages otherwise", () => {
    const c = { format: "BANNER" as const, pages: ["/", "/products/*"] };
    expect(appearsOn(c, "/")).toBe(true);
    expect(appearsOn(c, "/products/x")).toBe(true);
    expect(appearsOn(c, "/contact")).toBe(false);
  });

  it("never lands a pop-up on a page where somebody is mid-task", () => {
    for (const path of ["/login", "/checkout", "/enquiry", "/contact", "/register", "/account/orders", "/track-order"]) {
      expect(appearsOn({ format: "MODAL", pages: [] }, path)).toBe(false);
    }
    // Even when an admin names the page on purpose.
    expect(appearsOn({ format: "MODAL", pages: ["/login"] }, "/login")).toBe(false);
  });

  it("keeps every campaign off the admin and the API", () => {
    for (const format of ["BANNER", "MODAL"] as const) {
      expect(appearsOn({ format, pages: [] }, "/admin/banners")).toBe(false);
      expect(appearsOn({ format, pages: ["*"] }, "/api/chat")).toBe(false);
    }
  });

  it("shows a banner on a form page where a pop-up would be kept off", () => {
    expect(appearsOn({ format: "BANNER", pages: [] }, "/enquiry")).toBe(true);
  });

  it("picks the highest-priority match for the page and format", () => {
    const campaigns = [
      pub({ id: "a", pages: ["/products/*"] }),
      pub({ id: "b", pages: [] }),
      pub({ id: "m", format: "MODAL" }),
    ];
    expect(pickFor(campaigns, "BANNER", "/products/x")?.id).toBe("a");
    expect(pickFor(campaigns, "BANNER", "/contact")?.id).toBe("b");
    expect(pickFor(campaigns, "MODAL", "/about")?.id).toBe("m");
    expect(pickFor(campaigns, "BANNER", "/products/x", (c) => c.id === "a")?.id).toBe("b");
  });
});

describe("remembering a dismissal", () => {
  const day = 24 * 60 * 60 * 1000;

  it("holds for a day, forever, or the visit, by frequency", () => {
    expect(dismissalHolds("ONCE_PER_DAY", 1000, 1000 + day - 1)).toBe(true);
    expect(dismissalHolds("ONCE_PER_DAY", 1000, 1000 + day)).toBe(false);
    expect(dismissalHolds("ONCE", 1000, 1000 + 400 * day)).toBe(true);
    expect(dismissalHolds("EVERY_VISIT", 1000, 5000)).toBe(true);
    expect(dismissalHolds("ONCE", null, 5000)).toBe(false);
  });

  it("shows an edited campaign again, because its version changes", () => {
    const original = pub({ id: "c1", version: 1 });
    const edited = pub({ id: "c1", version: 2 });
    const remembered = { [storageKey(original)]: 10_000 };
    expect(hiddenCampaignIds([original], remembered, 20_000)).toEqual(["c1"]);
    expect(hiddenCampaignIds([edited], remembered, 20_000)).toEqual([]);
  });

  it("round-trips the cookie and discards anything malformed", () => {
    const text = serialiseDismissals({ "a.1": 100, "b.2": 200 });
    expect(parseDismissals(text)).toEqual({ "a.1": 100, "b.2": 200 });
    expect(parseDismissals("garbage~a.1:abc~:5~<x>:9")).toEqual({});
    expect(parseDismissals(null)).toEqual({});
  });

  it("remembers only the most recent dismissals", () => {
    const many = Object.fromEntries(Array.from({ length: 30 }, (_, i) => [`k${i}.1`, i + 1]));
    expect(Object.keys(parseDismissals(serialiseDismissals(many)))).toHaveLength(12);
  });
});
