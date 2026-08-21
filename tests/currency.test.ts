import { describe, expect, it } from "vitest";
import {
  availableCurrencies,
  convertInclusive,
  isDisplayCurrency,
  resolveCurrency,
  toDisplay,
  type ExchangeRates,
} from "@/lib/currency";
import { formatMoney } from "@/lib/money";

/**
 * `Intl` separates a currency *code* from its number with a non-breaking space
 * (U+00A0), not an ordinary one — so "AED 933.63" typed here does not equal
 * "AED 933.63" rendered, and the failure prints two strings that look the same.
 * Comparing normalised keeps the assertions readable without pretending the
 * character is not there.
 */
const spaces = (value: string) => value.replace(/\u00a0/g, " ");

/**
 * Prices read in another currency.
 *
 * Two things are worth testing here and one of them is not arithmetic. The
 * conversion has to be right, obviously. But the rule that decides what is
 * *written beside* the number matters more, because getting it wrong does not
 * produce a wrong figure — it produces a correct figure with a false sentence
 * next to it, which nobody spots by looking at a page.
 */

const rates: ExchangeRates = { USD: 8350, AED: 2275 };
const noRates: ExchangeRates = { USD: null, AED: null };

describe("what a visitor may choose", () => {
  it("offers only currencies that have been priced", () => {
    // A rate is set by a person or the currency is not offered. Nothing here
    // guesses, and no live feed is consulted.
    expect(availableCurrencies(noRates).map((option) => option.code)).toEqual(["INR"]);
    expect(availableCurrencies({ USD: 8350, AED: null }).map((option) => option.code)).toEqual([
      "INR",
      "USD",
    ]);
    expect(availableCurrencies(rates).map((option) => option.code)).toEqual(["INR", "USD", "AED"]);
  });

  it("falls back to rupees for anything unrecognised or unpriced", () => {
    expect(resolveCurrency("USD", rates)).toBe("USD");
    // A cookie is a string a visitor controls.
    expect(resolveCurrency("BTC", rates)).toBe("INR");
    expect(resolveCurrency(undefined, rates)).toBe("INR");
    expect(resolveCurrency(null, rates)).toBe("INR");
    // Priced nowhere: asking for dollars on a deployment that never set a rate
    // must not produce a rupee figure under a dollar sign.
    expect(resolveCurrency("USD", noRates)).toBe("INR");
  });

  it("rejects anything that is not one of the three", () => {
    expect(isDisplayCurrency("INR")).toBe(true);
    expect(isDisplayCurrency("inr")).toBe(false);
    expect(isDisplayCurrency("")).toBe(false);
    expect(isDisplayCurrency(42)).toBe(false);
  });
});

describe("converting a price", () => {
  it("leaves rupees exactly as the catalogue stores them", () => {
    // ₹18,000 before GST.
    const view = toDisplay(1_800_000, 18, "INR", rates);
    expect(view.amountMinor).toBe(1_800_000);
    expect(view.taxStatedSeparately).toBe(true);
  });

  it("adds GST before converting, so a foreign figure is the whole amount owed", () => {
    /*
     * The rule this feature exists for. A buyer in Dubai is quoted what the
     * order will cost, not a subtotal they would have to know Indian tax law to
     * complete. ₹18,000 + 18% = ₹21,240; at ₹83.50 to the dollar that is
     * $254.37.
     */
    const view = toDisplay(1_800_000, 18, "USD", rates);
    const inclusivePaise = 1_800_000 + 324_000;
    expect(inclusivePaise).toBe(2_124_000);
    expect(view.amountMinor).toBe(Math.round((inclusivePaise * 100) / 8350));
    expect(view.amountMinor).toBe(25_437);
    expect(spaces(formatMoney(view.amountMinor, "USD"))).toBe("$254.37");
  });

  it("does the same in dirhams", () => {
    const view = toDisplay(1_800_000, 18, "AED", rates);
    expect(view.amountMinor).toBe(Math.round((2_124_000 * 100) / 2275));
    expect(spaces(formatMoney(view.amountMinor, "AED"))).toBe("AED 933.63");
  });

  it("never states tax separately in a foreign currency", () => {
    /*
     * The assertion that protects the wording. `taxStatedSeparately` is what
     * every component consults before writing "excl. GST" beside a number, and
     * a foreign figure already contains the tax — so the label would be false,
     * not merely redundant.
     */
    expect(toDisplay(1_800_000, 18, "USD", rates).taxStatedSeparately).toBe(false);
    expect(toDisplay(1_800_000, 18, "AED", rates).taxStatedSeparately).toBe(false);
    expect(toDisplay(1_800_000, 18, "INR", rates).taxStatedSeparately).toBe(true);
  });

  it("does not add GST twice to an amount that already includes it", () => {
    // A basket total is computed inclusive elsewhere. Running it through the
    // base-price conversion would charge the tax on the tax.
    const inclusive = convertInclusive(2_124_000, "USD", rates);
    expect(inclusive.amountMinor).toBe(25_437);
    expect(inclusive.amountMinor).toBe(toDisplay(1_800_000, 18, "USD", rates).amountMinor);
  });

  it("honours a per-product GST rate rather than assuming eighteen", () => {
    // Not every line is 18%. Hard-coding it would quietly misprice anything
    // that is not, and only in the foreign-currency view.
    const at5 = toDisplay(1_000_000, 5, "USD", rates);
    expect(at5.amountMinor).toBe(Math.round((1_050_000 * 100) / 8350));
    expect(at5.amountMinor).not.toBe(toDisplay(1_000_000, 18, "USD", rates).amountMinor);
  });

  it("returns rupees rather than dividing by zero on a missing rate", () => {
    // Reaching here means a caller skipped `resolveCurrency`. Rupees is the
    // honest answer; Infinity is not.
    const view = toDisplay(1_800_000, 18, "USD", noRates);
    expect(view.currency).toBe("INR");
    expect(view.amountMinor).toBe(1_800_000);
    expect(view.taxStatedSeparately).toBe(true);
  });

  it("rounds to the minor unit rather than truncating", () => {
    // A fractional cent has to land somewhere, and rounding down would
    // under-quote consistently across a long catalogue.
    const view = toDisplay(100_000, 18, "USD", { USD: 8333, AED: null });
    expect(view.amountMinor).toBe(Math.round((118_000 * 100) / 8333));
    expect(Number.isInteger(view.amountMinor)).toBe(true);
  });
});

describe("formatting", () => {
  it("groups rupees in lakhs and the rest in thousands", () => {
    // ₹12,50,000 is what an Indian buyer expects; ₹1,250,000 is not.
    expect(spaces(formatMoney(125_000_000, "INR"))).toBe("₹12,50,000");
    expect(spaces(formatMoney(125_000, "USD"))).toBe("$1,250.00");
  });

  it("shows minor units for converted currencies and not for rupees", () => {
    // A converted figure is a rupee amount divided by a rate and is rarely
    // round; hiding the cents would make two different prices look identical.
    expect(formatMoney(1_800_000, "INR")).not.toContain(".");
    expect(formatMoney(25_437, "USD")).toContain(".37");
  });
});
