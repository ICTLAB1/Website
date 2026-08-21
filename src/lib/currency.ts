/**
 * Showing prices in the visitor's currency.
 *
 * The catalogue is priced in rupees and every order is placed, invoiced and
 * paid in rupees. What this adds is a way to *read* those prices in US dollars
 * or UAE dirhams, for the buyers in those markets who cannot judge a rupee
 * figure at a glance.
 *
 * Two rules, and the second one is the one that needs care.
 *
 * **A rate is set by a person or the currency is not offered.** No default, no
 * live feed. An invented rate is a price this business never agreed to, and a
 * feed that failed would either freeze at a stale number or take the catalogue
 * down with it. Somebody decides what a dollar is worth here, and revisits it.
 *
 * **A foreign price is the whole amount, stated once.** In rupees the site
 * shows the price and the GST on it separately, because that is what an Indian
 * buyer needs for input credit and what their invoice will show. In dollars or
 * dirhams it shows a single all-in figure — and, critically, says nothing about
 * tax at all. Carrying the rupee wording across would put "excluding GST" next
 * to a number that includes it, which would be false. The absence is the point:
 * one number, no claim either way.
 *
 * This is a display layer and nothing more. It never reaches an order, a
 * quotation, an invoice or a payment — those stay in rupees, which is the
 * currency the money actually moves in.
 */

export const DISPLAY_CURRENCIES = ["INR", "USD", "AED"] as const;
export type DisplayCurrency = (typeof DISPLAY_CURRENCIES)[number];

export const CURRENCY_COOKIE = "display_currency";

/** How many paise one unit of each foreign currency is worth. Null = not offered. */
export type ExchangeRates = {
  USD: number | null;
  AED: number | null;
};

export type CurrencyOption = { code: DisplayCurrency; label: string };

export function isDisplayCurrency(value: unknown): value is DisplayCurrency {
  return typeof value === "string" && (DISPLAY_CURRENCIES as readonly string[]).includes(value);
}

/**
 * The currencies a visitor may actually choose.
 *
 * Rupees always; the others only once priced. A switcher offering a currency
 * with no rate would either show nothing or show a rupee figure under a dollar
 * sign, and the second is worse than not offering it.
 */
export function availableCurrencies(rates: ExchangeRates): CurrencyOption[] {
  return [
    { code: "INR" as const, label: "₹ INR" },
    ...(rates.USD ? [{ code: "USD" as const, label: "$ USD" }] : []),
    ...(rates.AED ? [{ code: "AED" as const, label: "AED" }] : []),
  ];
}

/** Falls back to rupees for anything unrecognised or unpriced. */
export function resolveCurrency(requested: unknown, rates: ExchangeRates): DisplayCurrency {
  if (!isDisplayCurrency(requested) || requested === "INR") return "INR";
  return rates[requested] ? requested : "INR";
}

export type PriceView = {
  currency: DisplayCurrency;
  /** Minor units *in the display currency*: paise, cents or fils. */
  amountMinor: number;
  /**
   * Whether GST is shown as its own line beside this figure.
   *
   * True only in rupees. False means the amount is the whole of what is owed
   * and no tax wording belongs anywhere near it — not "including", not
   * "excluding". See the note at the top of this file.
   */
  taxStatedSeparately: boolean;
};

/**
 * Converts a rupee amount for display.
 *
 * `baseMinor` is the price before GST, as the catalogue stores it. In rupees it
 * comes back untouched. In any other currency the GST is added first and the
 * whole thing converted, because a buyer paying from Dubai is quoted what the
 * order will actually cost — not a subtotal they would have to know Indian tax
 * law to complete.
 *
 * Rounds half-up to the minor unit. A fractional cent has to land somewhere and
 * rounding down would, across a long catalogue, consistently under-quote.
 */
export function toDisplay(
  baseMinor: number,
  gstRatePercent: number,
  currency: DisplayCurrency,
  rates: ExchangeRates,
): PriceView {
  if (currency === "INR") {
    return { currency: "INR", amountMinor: baseMinor, taxStatedSeparately: true };
  }

  const rate = rates[currency];
  if (!rate || rate <= 0) {
    // Unpriced currency reaching this far is a caller that skipped
    // `resolveCurrency`. Rupees is the honest answer, never a divide by zero.
    return { currency: "INR", amountMinor: baseMinor, taxStatedSeparately: true };
  }

  const inclusivePaise = baseMinor + Math.round((baseMinor * gstRatePercent) / 100);

  return {
    currency,
    // × 100 because both sides are in minor units: paise in, cents out.
    amountMinor: Math.round((inclusivePaise * 100) / rate),
    taxStatedSeparately: false,
  };
}

/**
 * The same conversion for an amount that already includes tax.
 *
 * Used where a total has been computed elsewhere — a basket, a line total — and
 * adding GST again would charge it twice.
 */
export function convertInclusive(
  inclusiveMinor: number,
  currency: DisplayCurrency,
  rates: ExchangeRates,
): PriceView {
  if (currency === "INR") {
    return { currency: "INR", amountMinor: inclusiveMinor, taxStatedSeparately: true };
  }
  const rate = rates[currency];
  if (!rate || rate <= 0) {
    return { currency: "INR", amountMinor: inclusiveMinor, taxStatedSeparately: true };
  }
  return {
    currency,
    amountMinor: Math.round((inclusiveMinor * 100) / rate),
    taxStatedSeparately: false,
  };
}
