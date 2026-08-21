import { describe, expect, it } from "vitest";
import {
  defaultValidUntil,
  discountFromPercent,
  documentTotals,
  isQuoteExpired,
  lineIsStorable,
  MAX_AMOUNT_MINOR,
  priceDocument,
  priceLine,
  totalsAreStorable,
} from "@/lib/pricing";

describe("priceLine", () => {
  it("derives gross, net and tax from a normal line", () => {
    const line = priceLine({ unitPriceMinor: 11_80_000, quantity: 50, gstRatePercent: 18 });
    expect(line.grossMinor).toBe(5_90_00_000);
    expect(line.discountMinor).toBe(0);
    expect(line.lineTotalMinor).toBe(5_90_00_000);
    expect(line.taxMinor).toBe(1_06_20_000);
  });

  it("applies a discount before tax", () => {
    const line = priceLine({
      unitPriceMinor: 1_00_000,
      quantity: 10,
      discountMinor: 1_00_000,
      gstRatePercent: 18,
    });
    expect(line.grossMinor).toBe(10_00_000);
    expect(line.lineTotalMinor).toBe(9_00_000);
    // Tax is charged on the discounted amount, not the gross.
    expect(line.taxMinor).toBe(1_62_000);
  });

  it("never lets a discount push a line negative", () => {
    const line = priceLine({ unitPriceMinor: 1_000, quantity: 1, discountMinor: 999_999 });
    expect(line.discountMinor).toBe(1_000);
    expect(line.lineTotalMinor).toBe(0);
    expect(line.taxMinor).toBe(0);
  });

  it("rejects negative prices, quantities and discounts", () => {
    const line = priceLine({ unitPriceMinor: -500, quantity: -3, discountMinor: -100 });
    expect(line.unitPriceMinor).toBe(0);
    expect(line.quantity).toBe(1);
    expect(line.discountMinor).toBe(0);
    expect(line.lineTotalMinor).toBe(0);
  });

  it("clamps absurd quantities and GST rates", () => {
    expect(priceLine({ unitPriceMinor: 100, quantity: 10_000_000 }).quantity).toBe(100_000);
    expect(priceLine({ unitPriceMinor: 100, quantity: 1, gstRatePercent: 900 }).gstRatePercent).toBe(50);
  });

  it("survives non-finite input rather than producing NaN", () => {
    const line = priceLine({
      unitPriceMinor: Number.NaN,
      quantity: Number.POSITIVE_INFINITY,
      discountMinor: Number.NaN,
      gstRatePercent: Number.NaN,
    });
    expect(Number.isInteger(line.lineTotalMinor)).toBe(true);
    expect(Number.isInteger(line.taxMinor)).toBe(true);
    expect(line.lineTotalMinor).toBe(0);
  });

  it("keeps every amount an integer number of paise", () => {
    const line = priceLine({ unitPriceMinor: 3_333, quantity: 7, gstRatePercent: 18 });
    for (const value of Object.values(line)) expect(Number.isInteger(value)).toBe(true);
  });
});

describe("documentTotals", () => {
  it("reconciles exactly against its lines", () => {
    const { lines, totals } = priceDocument([
      { unitPriceMinor: 11_80_000, quantity: 50 },
      { unitPriceMinor: 19_20_000, quantity: 25, discountMinor: 50_000 },
      { unitPriceMinor: 1_46_300_00, quantity: 10 },
    ]);

    expect(totals.subtotalMinor).toBe(lines.reduce((s, l) => s + l.grossMinor, 0));
    expect(totals.discountMinor).toBe(lines.reduce((s, l) => s + l.discountMinor, 0));
    expect(totals.taxMinor).toBe(lines.reduce((s, l) => s + l.taxMinor, 0));
    expect(totals.totalMinor).toBe(
      totals.subtotalMinor - totals.discountMinor + totals.taxMinor,
    );
  });

  it("totals an empty document to zero rather than NaN", () => {
    expect(documentTotals([])).toEqual({
      subtotalMinor: 0,
      discountMinor: 0,
      taxMinor: 0,
      totalMinor: 0,
    });
  });

  it("handles mixed GST rates across lines", () => {
    const { totals } = priceDocument([
      { unitPriceMinor: 1_00_000, quantity: 1, gstRatePercent: 18 },
      { unitPriceMinor: 1_00_000, quantity: 1, gstRatePercent: 0 },
    ]);
    expect(totals.taxMinor).toBe(18_000);
    expect(totals.totalMinor).toBe(2_18_000);
  });
});

describe("discountFromPercent", () => {
  it("converts a percentage to minor units", () => {
    expect(discountFromPercent(10_00_000, 10)).toBe(1_00_000);
    expect(discountFromPercent(10_00_000, 0)).toBe(0);
  });

  it("clamps out-of-range percentages", () => {
    expect(discountFromPercent(10_00_000, 150)).toBe(10_00_000);
    expect(discountFromPercent(10_00_000, -20)).toBe(0);
    expect(discountFromPercent(10_00_000, Number.NaN)).toBe(0);
  });
});

describe("quote validity", () => {
  it("defaults to 30 days ahead", () => {
    const from = new Date("2026-01-01T00:00:00Z");
    expect(defaultValidUntil(from).toISOString().slice(0, 10)).toBe("2026-01-31");
  });

  it("treats a past date as expired and a future date as live", () => {
    const now = new Date("2026-06-15T12:00:00Z");
    expect(isQuoteExpired(new Date("2026-06-14T12:00:00Z"), now)).toBe(true);
    expect(isQuoteExpired(new Date("2026-06-16T12:00:00Z"), now)).toBe(false);
    expect(isQuoteExpired(null, now)).toBe(false);
  });
});

describe("the 32-bit ceiling on stored money", () => {
  /*
   * Every money column in the schema is a Postgres `integer`. A total past
   * 2^31 − 1 paise cannot be written, and before this was checked the attempt
   * reached the database and came back to the customer as an unexplained 500
   * at the moment they pressed "Place order".
   *
   * Eight seats of the most expensive licence in the catalogue was enough to
   * reach it, which is why these tests use realistic figures rather than
   * absurd ones: the bug was reachable by an ordinary enterprise order, not by
   * an attacker.
   */
  const line = (unitPriceMinor: number, quantity: number) =>
    priceLine({ unitPriceMinor, quantity, gstRatePercent: 18 });

  it("accepts a large order that still fits", () => {
    // The real figure from the catalogue: ₹24.5 lakh a seat. Seven seats is
    // ₹1.71 crore before GST and ₹2.02 crore after. Large, real, and storable.
    const totals = documentTotals([line(245_000_000, 7)]);
    expect(totals.totalMinor).toBeLessThanOrEqual(MAX_AMOUNT_MINOR);
    expect(totalsAreStorable(totals)).toBe(true);
  });

  it("refuses the one more seat that does not fit", () => {
    // The actual failure. The subtotal at eight seats is ₹1.96 crore, which
    // fits — it is GST on top that takes the total to ₹2.31 crore and past the
    // limit. A check on line values alone would have missed exactly this.
    const eight = line(245_000_000, 8);
    expect(lineIsStorable(eight)).toBe(true);

    const totals = documentTotals([eight]);
    expect(totals.subtotalMinor).toBeLessThanOrEqual(MAX_AMOUNT_MINOR);
    expect(totals.totalMinor).toBeGreaterThan(MAX_AMOUNT_MINOR);
    expect(totalsAreStorable(totals)).toBe(false);
  });

  it("refuses a total reached by many small lines, not only one big one", () => {
    // The same ceiling from the other direction: no single line is anywhere
    // near it, and the document still cannot be stored.
    const many = Array.from({ length: 300 }, () => line(1_000_000, 100));
    expect(many.every(lineIsStorable)).toBe(true);
    expect(totalsAreStorable(documentTotals(many))).toBe(false);
  });

  it("treats the boundary itself as storable", () => {
    // Off-by-one in the safe direction would silently refuse a legitimate
    // order at exactly the limit, which nobody would ever report as a bug.
    const totals = {
      subtotalMinor: MAX_AMOUNT_MINOR,
      discountMinor: 0,
      taxMinor: 0,
      totalMinor: MAX_AMOUNT_MINOR,
    };
    expect(totalsAreStorable(totals)).toBe(true);
    expect(totalsAreStorable({ ...totals, totalMinor: MAX_AMOUNT_MINOR + 1 })).toBe(false);
  });

  it("checks every stored column, not just the total", () => {
    // discount and tax have their own columns and their own ceilings. A
    // document whose total fits only because a huge discount was subtracted
    // still cannot be written.
    expect(
      totalsAreStorable({
        subtotalMinor: MAX_AMOUNT_MINOR,
        discountMinor: MAX_AMOUNT_MINOR + 1,
        taxMinor: 0,
        totalMinor: 0,
      }),
    ).toBe(false);
  });
});
