import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * GA4's generate_lead: once per lead, only on success, no personal data.
 * `pushConversion` is called only after the server accepted the submission, so
 * these cover what it sends and what it must never send.
 */
const gtag = vi.fn();

function page(withGtag = true) {
  (globalThis as unknown as { window: unknown }).window = {
    ...(withGtag ? { gtag } : {}),
    dataLayer: [],
    location: { pathname: "/products/autocad" },
    sessionStorage: {
      store: new Map<string, string>(),
      getItem(key: string) {
        return (this.store as Map<string, string>).get(key) ?? null;
      },
      setItem(key: string, value: string) {
        (this.store as Map<string, string>).set(key, value);
      },
    },
  };
}

describe("generate_lead", () => {
  beforeEach(() => {
    vi.resetModules();
    gtag.mockClear();
    page();
  });

  const leads = () => gtag.mock.calls.filter((call) => call[1] === "generate_lead");

  it("sends form, path, value and currency, and nothing personal", async () => {
    const { pushConversion } = await import("@/lib/analytics-events");
    const { CONVERSION_EVENTS } = await import("@/lib/analytics");
    pushConversion(CONVERSION_EVENTS.quoteFormSubmit, "ENQ-2026-ABCDEF", { form: "enquiry_basket" });

    expect(leads()).toHaveLength(1);
    expect(leads()[0]).toEqual([
      "event",
      "generate_lead",
      { form_name: "enquiry_basket", page_path: "/products/autocad", value: 1, currency: "INR" },
    ]);
    // The reference is the dedupe key, never a parameter.
    expect(JSON.stringify(leads()[0])).not.toContain("ENQ-2026-ABCDEF");
  });

  it("counts a lead once however often it is reported", async () => {
    const { pushConversion } = await import("@/lib/analytics-events");
    const { CONVERSION_EVENTS } = await import("@/lib/analytics");
    pushConversion(CONVERSION_EVENTS.quoteFormSubmit, "ENQ-1", { form: "contact" });
    pushConversion(CONVERSION_EVENTS.quoteFormSubmit, "ENQ-1", { form: "contact" });
    expect(leads()).toHaveLength(1);
  });

  it("is not sent for events that are not a quote request", async () => {
    const { pushConversion } = await import("@/lib/analytics-events");
    const { CONVERSION_EVENTS } = await import("@/lib/analytics");
    pushConversion(CONVERSION_EVENTS.whatsappClick, "wa-1");
    expect(leads()).toHaveLength(0);
  });

  it("does nothing, and does not throw, where the tag is not loaded", async () => {
    page(false);
    const { pushConversion } = await import("@/lib/analytics-events");
    const { CONVERSION_EVENTS } = await import("@/lib/analytics");
    expect(() => pushConversion(CONVERSION_EVENTS.quoteFormSubmit, "ENQ-9", { form: "contact" })).not.toThrow();
  });

  it("is available for the chat lead, once per conversation", async () => {
    const { trackGenerateLead } = await import("@/lib/analytics-events");
    trackGenerateLead("conv-1", "chat_assistant");
    trackGenerateLead("conv-1", "chat_assistant");
    expect(leads()).toHaveLength(1);
    expect(leads()[0]?.[2]).toMatchObject({ form_name: "chat_assistant" });
  });
});
