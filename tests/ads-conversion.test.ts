import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The Ads conversion, counted once per lead and only for a lead.
 *
 * `pushConversion` is the one place every quote form reports through, so it is
 * the one place this can be got wrong for all of them at once. Three things
 * matter and none is visible from a page that looks correct: that a second
 * report for the same reference counts nothing, that a different conversion
 * event is not filed as a quote request, and that a page with no tag on it
 * does not throw on somebody's successful enquiry.
 *
 * The label is supplied here rather than taken from the shipped default, which
 * is empty because the Tag Manager container does the counting. These exercise
 * the mechanism for the day that moves back into this codebase; the last case
 * covers the state as it actually ships.
 */

const gtag = vi.fn();

describe("reporting a quote request to Google Ads", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_LABEL = "HBAhCJCc0OccEL3h2slE";
    gtag.mockClear();
    // A fresh page each time: the helper remembers what it has counted.
    (globalThis as unknown as { window: unknown }).window = {
      gtag,
      dataLayer: [],
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
  });

  const conversions = () => gtag.mock.calls.filter((call) => call[1] === "conversion");

  it("reports once, with the account and label as one send_to", async () => {
    const { pushConversion } = await import("@/lib/analytics-events");
    const { CONVERSION_EVENTS, ADS_CONVERSION_SEND_TO } = await import("@/lib/analytics");

    pushConversion(CONVERSION_EVENTS.quoteFormSubmit, "ENQ-2026-ABCDEF", { form: "enquiry_basket" });

    expect(conversions()).toHaveLength(1);
    expect(conversions()[0]).toEqual(["event", "conversion", { send_to: ADS_CONVERSION_SEND_TO }]);
  });

  it("does not report the same reference twice", async () => {
    const { pushConversion } = await import("@/lib/analytics-events");
    const { CONVERSION_EVENTS } = await import("@/lib/analytics");

    // A refreshed confirmation page, or a form submitted twice against one
    // stored enquiry. The lead happened once.
    pushConversion(CONVERSION_EVENTS.quoteFormSubmit, "ENQ-2026-ABCDEF", { form: "requirement" });
    pushConversion(CONVERSION_EVENTS.quoteFormSubmit, "ENQ-2026-ABCDEF", { form: "requirement" });

    expect(conversions()).toHaveLength(1);
  });

  it("reports each distinct lead", async () => {
    const { pushConversion } = await import("@/lib/analytics-events");
    const { CONVERSION_EVENTS } = await import("@/lib/analytics");

    pushConversion(CONVERSION_EVENTS.quoteFormSubmit, "ENQ-1", { form: "contact" });
    pushConversion(CONVERSION_EVENTS.quoteFormSubmit, "ENQ-2", { form: "contact" });

    expect(conversions()).toHaveLength(2);
  });

  it("does not file another conversion event as a quote request", async () => {
    const { pushConversion } = await import("@/lib/analytics-events");
    const { CONVERSION_EVENTS } = await import("@/lib/analytics");

    pushConversion(CONVERSION_EVENTS.whatsappClick, "wa-1");

    // It still reaches the dataLayer — the container may want it — but it is
    // not this conversion action.
    expect(conversions()).toHaveLength(0);
    expect((globalThis as unknown as { window: { dataLayer: unknown[] } }).window.dataLayer).toHaveLength(1);
  });

  it("does not throw on a page where the tag never loaded", async () => {
    (globalThis as unknown as { window: Record<string, unknown> }).window.gtag = undefined;

    const { pushConversion } = await import("@/lib/analytics-events");
    const { CONVERSION_EVENTS } = await import("@/lib/analytics");

    // Analytics is off on localhost and on every signed-in path, and this runs
    // on the success path of a real enquiry.
    expect(() => pushConversion(CONVERSION_EVENTS.quoteFormSubmit, "ENQ-3")).not.toThrow();
  });

  it("reports nothing at all while the container is the counter", async () => {
    /*
     * How this ships. An empty label makes `send_to` null, and a null one must
     * mean silence rather than a `gtag` call with a half-built destination —
     * `AW-123/` is accepted and counts nothing, which would look configured
     * and report into a void.
     */
    process.env.NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_LABEL = "";
    vi.resetModules();

    const { pushConversion } = await import("@/lib/analytics-events");
    const { CONVERSION_EVENTS } = await import("@/lib/analytics");

    pushConversion(CONVERSION_EVENTS.quoteFormSubmit, "ENQ-2026-QUIET", { form: "contact" });

    expect(conversions()).toHaveLength(0);
    // The dataLayer push is unaffected: that is what the container listens to.
    expect((globalThis as unknown as { window: { dataLayer: unknown[] } }).window.dataLayer).toHaveLength(1);
  });
});
