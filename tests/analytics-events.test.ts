import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CONVERSION_EVENTS } from "@/lib/analytics";

/**
 * Counting a conversion once.
 *
 * A conversion counted twice inflates the number an advertising budget is set
 * from, and nothing in the report says it happened — so the guard is the part
 * worth pinning, in each of the ways the handler can plausibly run again.
 *
 * The module keeps an in-memory set alongside the stored flag, so every test
 * here re-imports it fresh rather than sharing one across cases.
 */

function browser(storage: Storage | null) {
  const globals = globalThis as unknown as { window?: unknown; sessionStorage?: unknown };
  const events: unknown[] = [];
  globals.window = {
    dataLayer: undefined,
    get sessionStorage() {
      if (!storage) throw new Error("storage refused");
      return storage;
    },
  };
  return { globals, events };
}

function memoryStorage(): Storage {
  const map = new Map<string, string>();
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => void map.set(key, value),
    removeItem: (key) => void map.delete(key),
    clear: () => map.clear(),
    key: (index) => [...map.keys()][index] ?? null,
    get length() {
      return map.size;
    },
  } as Storage;
}

async function freshModule() {
  vi.resetModules();
  return import("@/lib/analytics-events");
}

const pushed = () =>
  ((globalThis as unknown as { window: { dataLayer?: unknown[] } }).window.dataLayer ?? []).map(
    (entry) => (entry as { event: string }).event,
  );

let storage: Storage;

beforeEach(() => {
  storage = memoryStorage();
  browser(storage);
});

afterEach(() => {
  delete (globalThis as unknown as { window?: unknown }).window;
});

describe("pushing a conversion", () => {
  it("puts the event name the container listens for onto the queue", async () => {
    const { pushConversion } = await freshModule();
    pushConversion(CONVERSION_EVENTS.quoteFormSubmit, "ENQ-2026-AAAAAA");
    expect(pushed()).toEqual(["quote_form_submit"]);
  });

  it("creates the queue when no tag has made one", async () => {
    const { pushConversion } = await freshModule();
    pushConversion(CONVERSION_EVENTS.quoteFormSubmit, "ENQ-2026-AAAAAA");
    expect(Array.isArray((globalThis as { window?: { dataLayer?: unknown } }).window?.dataLayer)).toBe(
      true,
    );
  });

  it("refuses the same occurrence a second time", async () => {
    const { pushConversion } = await freshModule();
    pushConversion(CONVERSION_EVENTS.quoteFormSubmit, "ENQ-2026-AAAAAA");
    pushConversion(CONVERSION_EVENTS.quoteFormSubmit, "ENQ-2026-AAAAAA");
    pushConversion(CONVERSION_EVENTS.quoteFormSubmit, "ENQ-2026-AAAAAA");
    expect(pushed()).toEqual(["quote_form_submit"]);
  });

  it("counts a genuinely second enquiry", async () => {
    const { pushConversion } = await freshModule();
    pushConversion(CONVERSION_EVENTS.quoteFormSubmit, "ENQ-2026-AAAAAA");
    pushConversion(CONVERSION_EVENTS.quoteFormSubmit, "ENQ-2026-BBBBBB");
    expect(pushed()).toEqual(["quote_form_submit", "quote_form_submit"]);
  });

  it("still refuses a repeat after a refresh, which the stored flag is for", async () => {
    const first = await freshModule();
    first.pushConversion(CONVERSION_EVENTS.quoteFormSubmit, "ENQ-2026-AAAAAA");

    // A refresh: the module's memory goes, the browser's storage does not.
    const reloaded = await freshModule();
    (globalThis as unknown as { window: { dataLayer?: unknown[] } }).window.dataLayer = [];
    reloaded.pushConversion(CONVERSION_EVENTS.quoteFormSubmit, "ENQ-2026-AAAAAA");

    expect(pushed()).toEqual([]);
  });

  it("keeps working when the browser refuses storage", async () => {
    browser(null);
    const { pushConversion } = await freshModule();
    pushConversion(CONVERSION_EVENTS.quoteFormSubmit, "ENQ-2026-AAAAAA");
    pushConversion(CONVERSION_EVENTS.quoteFormSubmit, "ENQ-2026-AAAAAA");
    /*
     * Once, from the in-memory set. A refresh would count it again, which is
     * the right direction to fail: under-counting a conversion is a reporting
     * error, and refusing to count one at all is a broken feature.
     */
    expect(pushed()).toEqual(["quote_form_submit"]);
  });

  it("does nothing at all on the server", async () => {
    delete (globalThis as unknown as { window?: unknown }).window;
    const { pushConversion } = await freshModule();
    expect(() => pushConversion(CONVERSION_EVENTS.quoteFormSubmit, "ENQ-2026-AAAAAA")).not.toThrow();
  });
});

describe("the event names", () => {
  it("are the exact strings the container triggers are built against", () => {
    expect(CONVERSION_EVENTS.quoteFormSubmit).toBe("quote_form_submit");
    expect(CONVERSION_EVENTS.whatsappClick).toBe("whatsapp_click");
  });
});
