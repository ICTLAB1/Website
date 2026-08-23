import { describe, expect, it } from "vitest";

import {
  CODE_LENGTH,
  MAX_CODE_ATTEMPTS,
  checkCode,
  formatCodeForDisplay,
  generateCode,
  isWellFormedCode,
  normaliseCode,
} from "@/lib/auth/otp";

/**
 * The rules that make a six-digit secret safe.
 *
 * A code is only a million possibilities, so nothing here is decoration: the
 * ordering of the checks is what stops a correct code being accepted against an
 * expired or exhausted record, and the attempt cap is the only thing standing
 * between six digits and a script.
 */

const record = (over: Partial<Parameters<typeof checkCode>[1]> = {}) => ({
  expiresAt: new Date(Date.now() + 5 * 60_000),
  usedAt: null,
  attempts: 0,
  codeHash: "hash",
  ...over,
});

describe("generateCode", () => {
  it("is always six digits, including when it starts with zeros", () => {
    for (let n = 0; n < 500; n += 1) {
      const code = generateCode();
      expect(code).toHaveLength(CODE_LENGTH);
      expect(/^\d{6}$/.test(code)).toBe(true);
    }
  });

  it("does not repeat itself", () => {
    // Not a randomness test — a smoke test that it is not a constant, which is
    // the failure mode a stubbed implementation leaves behind.
    const seen = new Set(Array.from({ length: 200 }, generateCode));
    expect(seen.size).toBeGreaterThan(150);
  });

  it("covers the whole range rather than clustering", () => {
    const values = Array.from({ length: 2000 }, () => Number(generateCode()));
    expect(Math.min(...values)).toBeLessThan(200_000);
    expect(Math.max(...values)).toBeGreaterThan(800_000);
  });
});

describe("normaliseCode", () => {
  it("accepts the ways people actually paste a code", () => {
    for (const typed of ["123456", "123 456", "123-456", " 123456 ", "12 34 56"]) {
      expect(normaliseCode(typed)).toBe("123456");
    }
  });

  it("leaves something unusable unusable", () => {
    expect(isWellFormedCode(normaliseCode("12345"))).toBe(false);
    expect(isWellFormedCode(normaliseCode("abcdef"))).toBe(false);
    expect(isWellFormedCode(normaliseCode("1234567"))).toBe(false);
  });
});

describe("checkCode", () => {
  it("accepts a correct code against a live record", () => {
    expect(checkCode("123456", record(), true)).toEqual({ ok: true });
  });

  it("refuses a correct code once the record has expired", () => {
    // The ordering check: `matches` is true, and it must still be refused.
    const expired = record({ expiresAt: new Date(Date.now() - 1000) });
    expect(checkCode("123456", expired, true)).toEqual({ ok: false, reason: "expired" });
  });

  it("refuses a correct code once the record has been used", () => {
    expect(checkCode("123456", record({ usedAt: new Date() }), true)).toEqual({
      ok: false,
      reason: "used",
    });
  });

  it("refuses a correct code once the attempts are spent", () => {
    // This is the one that matters. Without it, five wrong guesses followed by
    // the right one succeeds, and the cap protects nothing.
    const spent = record({ attempts: MAX_CODE_ATTEMPTS });
    expect(checkCode("123456", spent, true)).toEqual({ ok: false, reason: "locked" });
  });

  it("counts down the attempts left on a wrong code", () => {
    expect(checkCode("123456", record({ attempts: 0 }), false)).toEqual({
      ok: false,
      reason: "wrong",
      remaining: 4,
    });
    expect(checkCode("123456", record({ attempts: 4 }), false)).toEqual({
      ok: false,
      reason: "wrong",
      remaining: 0,
    });
  });

  it("refuses anything that is not six digits before looking at anything else", () => {
    expect(checkCode("12345", record(), true).ok).toBe(false);
    expect(checkCode("", record(), true)).toEqual({ ok: false, reason: "malformed" });
  });

  it("refuses a record that carries no code at all", () => {
    // A row issued before codes existed, or one already consumed by the link
    // flow. It must not be treated as "no hash, so anything matches".
    expect(checkCode("123456", record({ codeHash: null }), true)).toEqual({
      ok: false,
      reason: "malformed",
    });
  });
});

describe("formatCodeForDisplay", () => {
  it("splits it into two threes", () => {
    expect(formatCodeForDisplay("123456")).toBe("123 456");
    expect(formatCodeForDisplay("000123")).toBe("000 123");
  });
});
