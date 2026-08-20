import { describe, expect, it } from "vitest";
import {
  discountPercent,
  effectivePriceMinor,
  formatMoney,
  formatTerm,
  gstAmountMinor,
  lineTotalMinor,
} from "@/lib/money";

describe("money", () => {
  it("formats INR in minor units without decimals by default", () => {
    expect(formatMoney(12_50_000)).toBe("₹12,500");
    expect(formatMoney(1_25_00_000)).toBe("₹1,25,000");
    expect(formatMoney(0)).toBe("₹0");
  });

  it("uses the sale price only when it is genuinely lower", () => {
    expect(effectivePriceMinor(1000, 800)).toBe(800);
    expect(effectivePriceMinor(1000, 1000)).toBe(1000);
    expect(effectivePriceMinor(1000, 1200)).toBe(1000);
    expect(effectivePriceMinor(1000, null)).toBe(1000);
    expect(effectivePriceMinor(1000, 0)).toBe(1000);
  });

  it("never reports a fabricated discount", () => {
    expect(discountPercent(1000, 750)).toBe(25);
    // A "sale" price at or above list must not produce a badge.
    expect(discountPercent(1000, 1000)).toBeNull();
    expect(discountPercent(1000, 1200)).toBeNull();
    expect(discountPercent(1000, null)).toBeNull();
    expect(discountPercent(1000, -5)).toBeNull();
  });

  it("rounds discount down so the saving is never overstated", () => {
    // 1/3 off is 33.33%, which must round down to 33.
    expect(discountPercent(300, 200)).toBe(33);
  });

  it("computes GST on integer minor units", () => {
    expect(gstAmountMinor(10_000, 18)).toBe(1_800);
    expect(gstAmountMinor(0, 18)).toBe(0);
    // Rounds to the nearest paisa rather than producing a fraction.
    expect(Number.isInteger(gstAmountMinor(3_333, 18))).toBe(true);
  });

  it("never returns a negative line total", () => {
    expect(lineTotalMinor(1_000, 3)).toBe(3_000);
    expect(lineTotalMinor(1_000, 3, 500)).toBe(2_500);
    expect(lineTotalMinor(1_000, 1, 99_999)).toBe(0);
  });

  it("describes licence terms in human units", () => {
    expect(formatTerm(null)).toBe("Perpetual");
    expect(formatTerm(12)).toBe("1 year");
    expect(formatTerm(36)).toBe("3 years");
    expect(formatTerm(1)).toBe("1 month");
    expect(formatTerm(18)).toBe("18 months");
  });
});
