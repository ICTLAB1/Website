import { describe, expect, it } from "vitest";
import {
  ceilingLabel,
  convertMinor,
  currencySymbol,
  gstRateAfterSwitch,
  isQuoteCurrency,
  quotableCurrencies,
  ratePaise,
  termsFor,
} from "@/lib/quote-currency";
import { amountInWords } from "@/lib/pdf/money";
import type { ExchangeRates } from "@/lib/currency";

/** ₹88.40 to the dollar, ₹24.07 to the dirham — the shape the settings page stores. */
const rates: ExchangeRates = { USD: 8840, AED: 2407 };
const none: ExchangeRates = { USD: null, AED: null };

describe("quotable currencies", () => {
  it("offers the rupee always and the others only once priced", () => {
    expect(quotableCurrencies(none)).toEqual(["INR"]);
    expect(quotableCurrencies({ USD: 8840, AED: null })).toEqual(["INR", "USD"]);
    expect(quotableCurrencies(rates)).toEqual(["INR", "USD", "AED"]);
  });

  it("treats a rate of zero as no rate at all", () => {
    // A zero would otherwise divide, and the quotation would carry Infinity.
    expect(ratePaise("USD", { USD: 0, AED: null })).toBeNull();
    expect(quotableCurrencies({ USD: 0, AED: null })).toEqual(["INR"]);
  });

  it("recognises only the three it can quote in", () => {
    expect(isQuoteCurrency("INR")).toBe(true);
    expect(isQuoteCurrency("GBP")).toBe(false);
    expect(isQuoteCurrency(null)).toBe(false);
  });
});

describe("restating a quotation", () => {
  it("converts paise to cents at the stored rate", () => {
    // ₹1,18,000.00 = 11_800_000 paise; at ₹88.40 that is $1,334.84.
    expect(convertMinor(11_800_000, "INR", "USD", rates)).toBe(133_484);
  });

  it("converts back to very nearly where it started", () => {
    const there = convertMinor(11_800_000, "INR", "USD", rates)!;
    const back = convertMinor(there, "USD", "INR", rates)!;
    // Rounding to the cent loses a fraction of a paisa, never more than the
    // rate itself. What must not happen is a drift of orders of magnitude.
    expect(Math.abs(back - 11_800_000)).toBeLessThan(8840);
  });

  it("goes between two foreign currencies through the rupee", () => {
    // $1,000.00 at ₹88.40 is ₹88,400, which at ₹24.07 is AED 3,672.62.
    expect(convertMinor(100_000, "USD", "AED", rates)).toBe(367_262);
  });

  it("leaves an amount alone when the currency has not changed", () => {
    expect(convertMinor(12_345, "USD", "USD", none)).toBe(12_345);
  });

  it("refuses rather than guesses when a rate is missing", () => {
    expect(convertMinor(11_800_000, "INR", "USD", none)).toBeNull();
    expect(convertMinor(100_000, "USD", "INR", none)).toBeNull();
  });
});

describe("tax on a restated quotation", () => {
  it("takes Indian GST off every line leaving the rupee", () => {
    expect(gstRateAfterSwitch("USD", 18)).toBe(0);
    expect(gstRateAfterSwitch("AED", 5)).toBe(0);
  });

  it("puts the catalogue's own rate back on the way in", () => {
    expect(gstRateAfterSwitch("INR", 5)).toBe(5);
    expect(gstRateAfterSwitch("INR", 0)).toBe(0);
  });

  it("falls back to the default where the catalogue does not know the line", () => {
    // A free line — a service, freight — has no variant behind it.
    expect(gstRateAfterSwitch("INR", null)).toBe(18);
    expect(gstRateAfterSwitch("INR", undefined)).toBe(18);
  });
});

describe("what the messages and labels say", () => {
  it("writes the storable ceiling in the quotation's own currency", () => {
    expect(ceilingLabel("INR")).toContain("₹2.14 crore");
    expect(ceilingLabel("USD")).toContain("$21.4 million");
    // Never a rupee figure on a dollar quotation: the salesperson would go
    // looking for an amount that is not on the screen.
    expect(ceilingLabel("USD")).not.toContain("₹");
  });

  it("uses the symbol a form label needs", () => {
    expect(currencySymbol("INR")).toBe("₹");
    expect(currencySymbol("USD")).toBe("$");
    expect(currencySymbol("AED")).toBe("AED");
  });
});

describe("the total written out on the document", () => {
  it("groups rupees in lakhs and crores", () => {
    expect(amountInWords(11_800_000, "INR")).toBe(
      "Rupees One Lakh Eighteen Thousand Only",
    );
  });

  it("groups anything else in millions and thousands", () => {
    expect(amountInWords(133_484, "USD")).toBe(
      "USD One Thousand Three Hundred Thirty Four and Eighty Four Cents Only",
    );
    expect(amountInWords(200_000_000, "USD")).toContain("Two Million");
    // The one thing that must not appear on a dollar document.
    expect(amountInWords(200_000_000, "USD")).not.toContain("Lakh");
  });

  it("calls a hundredth of a dirham a fils", () => {
    expect(amountInWords(367_262, "AED")).toContain("Sixty Two Fils");
  });
});

describe("which terms are printed", () => {
  const rupee = "Prices are exclusive of applicable GST.";
  const abroad = "Prices are exclusive of taxes payable in the country of import.";

  it("prints the rupee terms on a rupee quotation", () => {
    expect(termsFor("INR", rupee, abroad)).toBe(rupee);
  });

  it("prints the foreign terms on a dollar or dirham one", () => {
    expect(termsFor("USD", rupee, abroad)).toBe(abroad);
    expect(termsFor("AED", rupee, abroad)).toBe(abroad);
  });

  it("falls back to the rupee terms when no foreign list is set", () => {
    // The behaviour before the second field existed. Wording invented for an
    // export sale would be a commitment the business never made.
    expect(termsFor("USD", rupee, null)).toBe(rupee);
    expect(termsFor("USD", rupee, "   ")).toBe(rupee);
  });

  it("keys on the currency, not on whether tax happens to be zero", () => {
    // A rupee quotation whose lines are all zero-rated is still a domestic
    // supply, and the domestic terms are the ones that apply to it.
    expect(termsFor("INR", rupee, abroad)).not.toBe(abroad);
  });

  it("carries no terms either way when none are set", () => {
    expect(termsFor("INR", null, null)).toBeNull();
    expect(termsFor("USD", null, null)).toBeNull();
  });
});
