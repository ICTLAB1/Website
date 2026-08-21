import { formatMoney } from "@/lib/money";
import { convertInclusive, toDisplay, type DisplayCurrency, type ExchangeRates } from "@/lib/currency";

/**
 * Rendering one price, in whatever currency the visitor is reading.
 *
 * A thin pair of helpers so that a component showing a price does not have to
 * know about exchange rates, and — more importantly — cannot forget the rule
 * that goes with them: GST is written beside a figure in rupees and nowhere
 * else. See `lib/currency.ts` for why.
 *
 * `display` is optional throughout. Absent means rupees, which keeps every
 * caller that only ever shows rupees — the admin panel, the account pages,
 * every email — working exactly as before without threading anything through.
 */
export type PriceDisplay = { currency: DisplayCurrency; rates: ExchangeRates };

/** A price stored before GST, formatted for this visitor. */
export function showPrice(
  baseMinor: number,
  gstRatePercent: number,
  display?: PriceDisplay,
): string {
  if (!display || display.currency === "INR") return formatMoney(baseMinor, "INR");
  const view = toDisplay(baseMinor, gstRatePercent, display.currency, display.rates);
  return formatMoney(view.amountMinor, view.currency);
}

/** An amount that already includes tax — a basket total, a line total. */
export function showInclusive(inclusiveMinor: number, display?: PriceDisplay): string {
  if (!display || display.currency === "INR") return formatMoney(inclusiveMinor, "INR");
  const view = convertInclusive(inclusiveMinor, display.currency, display.rates);
  return formatMoney(view.amountMinor, view.currency);
}

/**
 * Whether GST belongs in the copy next to this price.
 *
 * True in rupees, false in anything else. The one place this rule is expressed,
 * so a component cannot half-apply it.
 */
export function statesTaxSeparately(display?: PriceDisplay): boolean {
  return !display || display.currency === "INR";
}
