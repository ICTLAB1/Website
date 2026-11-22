import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

// The form posts to a server action; rendering it needs the action to exist, not to run.
vi.mock("@/app/requirement/actions", () => ({ submitRequirement: vi.fn() }));
// The success path navigates to /thank-you; a static render has no router to ask.
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }), usePathname: () => "/" }));

import { LandingEnquiryForm } from "@/components/enquiry/landing-enquiry-form";
import { LEAD_PAGES, NOT_SURE, leadPageFor } from "@/lib/lead-pages";
import { describeRequirement } from "@/lib/requirement-service";

const SLUGS = ["microsoft-365", "adobe-licensing", "autodesk-licensing", "enterprise-it-hardware", "corporate-it-solutions"];

describe("which pages open with the form", () => {
  it("is the five that were asked for, and the managed IT services page", () => {
    expect(Object.keys(LEAD_PAGES).sort()).toEqual([...SLUGS, "managed-it-services"].sort());
  });

  it("knows nothing about any other page", () => {
    for (const slug of ["adobe", "about", "", "constructor", "__proto__", "toString"]) {
      expect(leadPageFor(slug)).toBeNull();
    }
  });

  it.each(SLUGS)("%s: a source of its own, products with no repeats, and a way out for the undecided", (slug) => {
    const page = leadPageFor(slug)!;
    expect(page.source).toMatch(/^landing_[a-z0-9_]+$/);
    expect(new Set(page.products).size).toBe(page.products.length);
    expect(page.products.at(-1)).toBe(NOT_SURE);
    expect(page.products.length).toBeGreaterThanOrEqual(5);
  });

  it("gives every page a different source, so a report can tell them apart", () => {
    const sources = Object.values(LEAD_PAGES).map((page) => page.source);
    expect(new Set(sources).size).toBe(sources.length);
  });
});

describe("the form", () => {
  const html = renderToStaticMarkup(<LandingEnquiryForm products={LEAD_PAGES["adobe-licensing"]!.products} source="landing_adobe_licensing" />);

  it("asks the seven things, in the order they were listed", () => {
    const labels = [...html.matchAll(/<label[^>]*>(.*?)<\/label>/gs)].map((m) => m[1]!.replace(/<[^>]+>/g, "").replace(/\*/g, "").replace(/&#x27;/g, "'").trim());
    expect(labels).toEqual([
      "Company name",
      "Contact person's name",
      "Designation",
      "Corporate email",
      "Phone number",
      "Product interested in",
      "Estimated quantity or number of licences",
    ]);
  });

  it("posts them under the names the existing requirement action already reads", () => {
    for (const name of ["companyName", "contactName", "contactDesignation", "contactEmail", "contactPhone", "lines.0.description", "lines.0.quantity"]) {
      expect(html).toContain(`name="${name}"`);
    }
  });

  it("requires every one in the browser, and uses the right kind of input for each", () => {
    expect(html.match(/ required=""/g)?.length).toBeGreaterThanOrEqual(7);
    expect(html).toMatch(/<input[^>]*name="contactEmail"[^>]*type="email"|<input[^>]*type="email"[^>]*name="contactEmail"/);
    expect(html).toMatch(/type="tel"/);
    expect(html).toMatch(/<input[^>]*type="number"[^>]*min="1"|<input[^>]*min="1"[^>]*type="number"/);
    expect(html).toMatch(/autocomplete="organization-title"/i);
  });

  it("tells the server it is the strict form", () => {
    expect(html).toContain('<input type="hidden" name="form" value="landing"/>');
  });

  it("offers this page's products, with nothing preselected", () => {
    for (const product of LEAD_PAGES["adobe-licensing"]!.products) {
      expect(html).toContain(`>${product.replace(/&/g, "&amp;")}</option>`);
    }
    // Selected, so the browser does not quietly pick the first real product for them.
    expect(html).toMatch(/<option value="" disabled="" selected="">Choose one<\/option>/);
  });

  it("has one submit button, labelled for what it does, and says nothing is ordered", () => {
    expect(html.match(/type="submit"/g)).toHaveLength(1);
    expect(html).toContain("Request a quotation");
    expect(html).toContain("places no order");
  });

  it("has no honeypot-less trick fields or new-tab links", () => {
    expect(html).not.toMatch(/target=/);
  });
});

describe("what sales is told", () => {
  it("writes the designation into the text every existing screen shows", () => {
    const text = describeRequirement({
      lines: [{ description: "Creative Cloud All Apps", quantity: 25, brands: [], needsReview: false }],
      contactDesignation: "Head of IT",
    });
    expect(text).toContain("25 × Creative Cloud All Apps");
    expect(text).toContain("Contact's designation: Head of IT");
  });

  it("says nothing about a designation that was not given", () => {
    const text = describeRequirement({
      lines: [{ description: "Acrobat Pro", quantity: 5, brands: [], needsReview: false }],
    });
    expect(text).not.toMatch(/designation/i);
  });
});

/* ---------------------------------------------------------------------------
 * The server action's own rules
 * ------------------------------------------------------------------------- */

const created: unknown[] = [];

vi.mock("@/lib/auth/session", () => ({ getSessionUser: vi.fn().mockResolvedValue(null) }));
vi.mock("@/lib/auth/guards", () => ({ canTransact: vi.fn().mockResolvedValue(true) }));
vi.mock("@/lib/auth/capabilities", () => ({ canInCompany: vi.fn().mockReturnValue(true) }));
vi.mock("@/lib/auth/request", () => ({ clientIp: vi.fn().mockResolvedValue("203.0.113.5") }));
vi.mock("@/lib/auth/rate-limit", () => ({
  hit: vi.fn().mockReturnValue({ allowed: true }),
  LIMITS: { enquiry: { limit: 100, windowSeconds: 60 } },
}));
vi.mock("@/lib/audit", () => ({ recordAudit: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@/lib/requirement-service", async (original) => ({
  ...(await original<typeof import("@/lib/requirement-service")>()),
  createRequirement: vi.fn(async (requirement: unknown, contact: unknown) => {
    created.push({ requirement, contact });
    return { ok: true, reference: "ENQ-2026-TEST01" };
  }),
}));

describe("the action behind the form", () => {
  const form = (over: Record<string, string | undefined> = {}) => {
    const data = new FormData();
    const base: Record<string, string> = {
      form: "landing",
      companyName: "Acme Industries Pvt Ltd",
      contactName: "Asha Rao",
      contactDesignation: "Head of IT",
      contactEmail: "asha@acme-industries.example",
      contactPhone: "9876543210",
      "lines.0.description": "Creative Cloud All Apps",
      "lines.0.quantity": "25",
    };
    for (const [key, value] of Object.entries({ ...base, ...over })) if (value !== undefined) data.set(key, value);
    return data;
  };

  let submit: (typeof import("@/app/requirement/actions"))["submitRequirement"];
  beforeEach(async () => {
    created.length = 0;
    // The real action, not the stub the form tests used.
    vi.doUnmock("@/app/requirement/actions");
    vi.resetModules();
    submit = (await vi.importActual<typeof import("@/app/requirement/actions")>("@/app/requirement/actions")).submitRequirement;
  });

  it("accepts a complete submission and records the designation with the requirement", async () => {
    const result = await submit({ status: "idle" }, form());
    expect(result.status).toBe("success");
    expect(result.reference).toBe("ENQ-2026-TEST01");
    const { requirement, contact } = created[0] as { requirement: { contactDesignation?: string; lines: { description: string; quantity: number }[] }; contact: { companyName: string } };
    expect(requirement.contactDesignation).toBe("Head of IT");
    expect(requirement.lines[0]).toMatchObject({ description: "Creative Cloud All Apps", quantity: 25 });
    expect(contact.companyName).toBe("Acme Industries Pvt Ltd");
  });

  it.each([
    ["no designation", { contactDesignation: "" }, "contactDesignation"],
    ["a one-letter designation", { contactDesignation: "x" }, "contactDesignation"],
    ["no quantity", { "lines.0.quantity": "" }, "lines.0.quantity"],
    ["a zero quantity", { "lines.0.quantity": "0" }, "lines.0.quantity"],
    ["a negative quantity", { "lines.0.quantity": "-3" }, "lines.0.quantity"],
    ["a quantity that is not a number", { "lines.0.quantity": "lots" }, "lines.0.quantity"],
    ["no company", { companyName: "" }, "companyName"],
    ["no name", { contactName: "" }, "contactName"],
    ["a malformed email", { contactEmail: "not-an-email" }, "contactEmail"],
    ["no product", { "lines.0.description": "" }, "lines.0.description"],
  ])("refuses %s, against the right field, and creates nothing", async (_name, over, field) => {
    const result = await submit({ status: "idle" }, form(over));
    expect(result.status).toBe("error");
    expect(Object.keys(result.fieldErrors ?? {})).toContain(field);
    expect(created).toHaveLength(0);
  });

  it("does not change what the other forms accept: no designation needed, a blank quantity is still 1", async () => {
    const result = await submit(
      { status: "idle" },
      form({ form: undefined, contactDesignation: undefined, "lines.0.quantity": "" }),
    );
    expect(result.status).toBe("success");
    const { requirement } = created[0] as { requirement: { contactDesignation?: string; lines: { quantity: number }[] } };
    expect(requirement.contactDesignation).toBeUndefined();
    expect(requirement.lines[0]!.quantity).toBe(1);
  });
});
