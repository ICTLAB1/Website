import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { attributionFromForm, attributionLines } from "@/lib/attribution";
import {
  contentName,
  isContentPath,
  leadEventId,
  META_CSP,
  META_PIXEL_ID,
  REFERENCE_PATTERN,
} from "@/lib/meta";
import {
  buildPayload,
  hashEmail,
  hashPhone,
  resolveFbc,
  sendCapiEvent,
  sha256,
} from "@/lib/meta-capi";

describe("hashing, as Meta requires it", () => {
  it("lower-cases and trims an email before hashing", () => {
    expect(hashEmail("  Asha.Test@Acme.EXAMPLE ")).toBe(sha256("asha.test@acme.example"));
  });

  it("hashes digits only, adding the country code to a ten-digit Indian number", () => {
    expect(hashPhone("98765 43210")).toBe(sha256("919876543210"));
    expect(hashPhone("+91 98765-43210")).toBe(sha256("919876543210"));
    expect(hashPhone("09876543210")).toBe(sha256("919876543210"));
  });

  it("refuses to hash something that is not an email or a number", () => {
    expect(hashEmail("not an email")).toBeUndefined();
    expect(hashPhone("12")).toBeUndefined();
  });
});

describe("the click identifier", () => {
  it("prefers the cookie when it is well formed", () => {
    expect(resolveFbc({ fbc: "fb.1.1700000000000.AbCdEf123456", fbclid: "ignored123" })).toBe(
      "fb.1.1700000000000.AbCdEf123456",
    );
  });

  it("builds it from the fbclid in the landing URL when the cookie is missing", () => {
    expect(resolveFbc({ fbclid: "IwAR0abcdef", fbclidAt: 1700000000123 })).toBe(
      "fb.1.1700000000123.IwAR0abcdef",
    );
  });

  it("builds nothing from a malformed value", () => {
    expect(resolveFbc({ fbc: "garbage", fbclid: "<script>" })).toBeUndefined();
    expect(resolveFbc({})).toBeUndefined();
  });
});

type Sent = {
  event_name: string;
  event_time: number;
  event_id: string;
  event_source_url: string;
  action_source: string;
  user_data: Record<string, unknown>;
};

describe("the Conversions API payload", () => {
  const input = {
    event: "Lead" as const,
    eventId: leadEventId("ENQ-2026-ABC123"),
    sourceUrl: "https://example.test/adobe-licensing",
    ip: "203.0.113.9",
    userAgent: "Mozilla/5.0",
    fbp: "fb.1.1700000000000.1234567890",
    email: "Asha@Acme.example",
    phone: "9876543210",
  };

  it("carries the event id, the website source, and only hashed identity", () => {
    const body = buildPayload(input, new Date("2026-11-19T10:00:00Z"));
    const [event] = body.data as [Sent];
    expect(event.event_name).toBe("Lead");
    expect(event.event_id).toBe("lead-ENQ-2026-ABC123");
    expect(event.action_source).toBe("website");
    expect(event.event_source_url).toBe(input.sourceUrl);
    expect(event.event_time).toBe(Math.floor(Date.parse("2026-11-19T10:00:00Z") / 1000));
    expect(event.user_data.em).toEqual([sha256("asha@acme.example")]);
    expect(event.user_data.ph).toEqual([sha256("919876543210")]);
    expect(event.user_data.client_ip_address).toBe("203.0.113.9");
    expect(event.user_data.client_user_agent).toBe("Mozilla/5.0");
    expect(event.user_data.fbp).toBe(input.fbp);
    const serialised = JSON.stringify(body);
    expect(serialised).not.toContain("asha@acme.example");
    expect(serialised).not.toContain("9876543210");
  });

  it("omits an unknown IP rather than sending the word", () => {
    const body = buildPayload({ ...input, ip: "unknown" });
    const [event] = body.data as [Sent];
    expect(event.user_data).not.toHaveProperty("client_ip_address");
  });

  describe("test code", () => {
    afterEach(() => vi.unstubAllEnvs());

    it("is added only while META_TEST_EVENT_CODE is set", () => {
      expect(buildPayload(input)).not.toHaveProperty("test_event_code");
      vi.stubEnv("META_TEST_EVENT_CODE", "TEST123");
      expect(buildPayload(input)).toHaveProperty("test_event_code", "TEST123");
    });
  });
});

describe("sending", () => {
  const input = {
    event: "Contact" as const,
    eventId: "abc-12345678",
    sourceUrl: "https://example.test/",
  };

  beforeEach(() => vi.stubGlobal("fetch", vi.fn()));
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("sends nothing, and says so, when the token is not set", async () => {
    vi.stubEnv("META_CAPI_TOKEN", "");
    expect(await sendCapiEvent(input)).toBe(false);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("posts to this dataset's events endpoint with the token in a header, never the URL", async () => {
    vi.stubEnv("META_CAPI_TOKEN", "secret-token-value");
    vi.mocked(fetch).mockResolvedValue(new Response("{}", { status: 200 }));

    expect(await sendCapiEvent(input)).toBe(true);

    const [url, init] = vi.mocked(fetch).mock.calls[0]!;
    expect(String(url)).toBe(`https://graph.facebook.com/v21.0/${META_PIXEL_ID}/events`);
    expect(String(url)).not.toContain("secret-token-value");
    expect((init!.headers as Record<string, string>).authorization).toBe("Bearer secret-token-value");
    expect(String(init!.body)).not.toContain("secret-token-value");
  });

  it("reports a refusal without throwing", async () => {
    vi.stubEnv("META_CAPI_TOKEN", "t");
    vi.mocked(fetch).mockResolvedValue(new Response("bad", { status: 400 }));
    expect(await sendCapiEvent(input)).toBe(false);
  });

  it("reports a network failure without throwing", async () => {
    vi.stubEnv("META_CAPI_TOKEN", "t");
    vi.mocked(fetch).mockRejectedValue(new Error("offline"));
    expect(await sendCapiEvent(input)).toBe(false);
  });
});

describe("what counts as a product page", () => {
  it("includes the pages about something to buy", () => {
    for (const path of [
      "/microsoft-365",
      "/adobe-licensing",
      "/autodesk-licensing",
      "/enterprise-it-hardware",
      "/corporate-it-solutions",
      "/products/some-sku",
      "/brands/adobe",
      "/services/aws",
      "/hardware",
    ]) {
      expect(isContentPath(path), path).toBe(true);
    }
  });

  it("leaves the rest alone", () => {
    for (const path of ["/", "/careers", "/privacy", "/contact", "/thank-you", "/admin/products"]) {
      expect(isContentPath(path), path).toBe(false);
    }
  });

  it("names a page by its title without the site suffix", () => {
    expect(contentName("Adobe Licensing for Teams | TechZoid", "/x")).toBe("Adobe Licensing for Teams");
    expect(contentName("", "/adobe")).toBe("/adobe");
  });
});

describe("references and ids", () => {
  it("accepts the two reference shapes and nothing else", () => {
    expect(REFERENCE_PATTERN.test("ENQ-2026-ABC123")).toBe(true);
    expect(REFERENCE_PATTERN.test("TKT-2026-ABC123")).toBe(true);
    expect(REFERENCE_PATTERN.test("ENQ-2026-abc123")).toBe(false);
    expect(REFERENCE_PATTERN.test("ENQ-2026-ABC123; drop")).toBe(false);
  });

  it("allows Meta's hosts under the three directives the pixel uses", () => {
    expect(META_CSP.script).toContain("https://connect.facebook.net");
    expect(META_CSP.connect).toContain("https://www.facebook.com");
    expect(META_CSP.img).toContain("https://www.facebook.com");
  });
});

describe("the campaign an enquiry came from", () => {
  it("keeps the seven known keys and nothing else", () => {
    const form = new FormData();
    form.set("utm_source", "meta");
    form.set("utm_medium", "paid_social");
    form.set("utm_campaign", "adobe_nov");
    form.set("fbclid", "IwAR0abc");
    form.set("landing", "/adobe-licensing");
    form.set("role", "admin");
    form.set("utm_term", "");
    const attribution = attributionFromForm(form);
    expect(attribution).toEqual({
      utm_source: "meta",
      utm_medium: "paid_social",
      utm_campaign: "adobe_nov",
      fbclid: "IwAR0abc",
      landing: "/adobe-licensing",
    });
    expect(attribution).not.toHaveProperty("role");
  });

  it("returns nothing for a visitor who arrived without tags", () => {
    expect(attributionFromForm(new FormData())).toBeUndefined();
  });

  it("strips control characters and angle brackets, and caps the length", () => {
    const form = new FormData();
    form.set("utm_campaign", `<b>x</b>\n${"a".repeat(400)}`);
    const campaign = attributionFromForm(form)!.utm_campaign!;
    expect(campaign).not.toMatch(/[<>\n]/);
    expect(campaign.length).toBeLessThanOrEqual(150);
  });

  it("writes plain lines for the staff email", () => {
    expect(attributionLines({ utm_source: "meta", utm_campaign: "adobe_nov" })).toEqual([
      "Campaign source: meta",
      "Campaign name: adobe_nov",
    ]);
    expect(attributionLines(undefined)).toEqual([]);
  });
});
