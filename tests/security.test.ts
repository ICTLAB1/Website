import { describe, expect, it } from "vitest";
import { redact } from "@/lib/logger";
import { publicReference, safeEqual } from "@/lib/auth/tokens";
import { __basketInternals } from "@/components/enquiry/basket-provider";

describe("log redaction", () => {
  it("removes credentials and tokens from nested structures", () => {
    const redacted = redact({
      email: "user@example.test",
      password: "CorrectHorse9",
      passwordHash: "$2a$12$abcdef",
      session: { token: "secret-token", expiresAt: "2026-01-01" },
      headers: { authorization: "Bearer abc", cookie: "session=abc" },
      apiKey: "sk-live-123",
      gstin: "22AAAAA0000A1Z5",
    }) as Record<string, unknown>;

    expect(redacted.email).toBe("user@example.test");
    expect(redacted.password).toBe("[redacted]");
    expect(redacted.passwordHash).toBe("[redacted]");
    expect(redacted.session).toBe("[redacted]");
    expect(redacted.apiKey).toBe("[redacted]");
    expect(redacted.gstin).toBe("[redacted]");
    expect((redacted.headers as Record<string, unknown>).authorization).toBe("[redacted]");
    expect((redacted.headers as Record<string, unknown>).cookie).toBe("[redacted]");
  });

  it("does not follow deeply nested structures indefinitely", () => {
    type Nested = { next?: Nested; value?: string };
    let deepest: Nested = { value: "leaf" };
    for (let depth = 0; depth < 20; depth += 1) deepest = { next: deepest };
    expect(() => redact(deepest)).not.toThrow();
  });

  it("caps very long strings so a log line cannot be flooded", () => {
    const redacted = redact({ note: "x".repeat(5000) }) as { note: string };
    expect(redacted.note.length).toBeLessThanOrEqual(2049);
  });
});

describe("public references", () => {
  it("uses the documented shape and no ambiguous characters", () => {
    for (let attempt = 0; attempt < 50; attempt += 1) {
      const reference = publicReference("ENQ");
      expect(reference).toMatch(/^ENQ-\d{4}-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/);
      // 0/O and 1/I are excluded so a reference read aloud is unambiguous.
      expect(reference.slice(9)).not.toMatch(/[01OI]/);
    }
  });

  it("does not repeat within a large sample", () => {
    const seen = new Set<string>();
    for (let attempt = 0; attempt < 2000; attempt += 1) seen.add(publicReference("ENQ"));
    expect(seen.size).toBe(2000);
  });
});

describe("safeEqual", () => {
  it("compares equal and unequal values correctly", () => {
    expect(safeEqual("abc123", "abc123")).toBe(true);
    expect(safeEqual("abc123", "abc124")).toBe(false);
    expect(safeEqual("abc", "abcdef")).toBe(false);
    expect(safeEqual("", "")).toBe(true);
  });
});

describe("basket parsing", () => {
  const { parseStored, clampQuantity } = __basketInternals;

  it("clamps quantities read back from browser storage", () => {
    expect(clampQuantity(-10)).toBe(1);
    expect(clampQuantity(0)).toBe(1);
    expect(clampQuantity(2.9)).toBe(2);
    expect(clampQuantity(10_000_000)).toBe(100_000);
    expect(clampQuantity(Number.NaN)).toBe(1);
  });

  it("survives corrupt or hostile storage contents", () => {
    expect(parseStored(null)).toEqual([]);
    expect(parseStored("not json")).toEqual([]);
    expect(parseStored('{"not":"an array"}')).toEqual([]);
    expect(parseStored('[{"no":"sku"}]')).toEqual([]);
  });

  it("normalises a tampered quantity rather than trusting it", () => {
    const lines = parseStored('[{"sku":"X","quantity":-50}]');
    expect(lines).toHaveLength(1);
    expect(lines[0]!.quantity).toBe(1);
  });

  it("caps the number of lines restored from storage", () => {
    const many = JSON.stringify(
      Array.from({ length: 200 }, (_, index) => ({ sku: `SKU-${index}`, quantity: 1 })),
    );
    expect(parseStored(many).length).toBeLessThanOrEqual(60);
  });
});

describe("JSON-LD serialisation", () => {
  it("escapes a closing script tag so structured data cannot inject markup", async () => {
    const { jsonLdHtml } = await import("@/lib/seo");
    const html = jsonLdHtml({
      "@type": "FAQPage",
      question: 'Does this break out? </script><script>alert(1)</script>',
    });
    expect(html).not.toContain("</script>");
    expect(html).toContain("\\u003c/script");
  });

  it("still produces valid JSON after escaping", async () => {
    const { jsonLdHtml } = await import("@/lib/seo");
    const html = jsonLdHtml({ name: "Adobe <Creative> Cloud", price: 1000 });
    const parsed = JSON.parse(html) as { name: string; price: number };
    expect(parsed.name).toBe("Adobe <Creative> Cloud");
    expect(parsed.price).toBe(1000);
  });
});
