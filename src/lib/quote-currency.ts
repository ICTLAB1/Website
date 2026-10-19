/**
 * Quoting in a currency other than the rupee.
 *
 * `lib/currency.ts` is a *display* layer: it restates a catalogue price so a
 * visitor can judge it, and never touches a stored figure. This is the other
 * thing, and the distinction matters. A quotation drafted in dollars is not a
 * rupee quotation being read in dollars — it is an offer to supply at a dollar
 * price, which is what the customer signs, what the order carries and what the
 * invoice is raised against. The figures are stored in that currency's minor
 * unit, and the rupee amount is gone.
 *
 * Three rules.
 *
 * **The rate is the one an administrator set.** The same rate the catalogue
 * switcher uses, from /admin/settings, in paise per unit. No live feed and no
 * default: a currency with no rate cannot be quoted in, because the
 * alternative is a price this business never agreed to. See `lib/currency.ts`
 * for the longer version of that argument.
 *
 * **The rate is a starting point, not the price.** Converting restates every
 * line, and then the person quoting edits what they mean to charge. A dollar
 * price arrived at by dividing a rupee price is rarely the price anybody would
 * actually offer, so the rate it was converted at is recorded on the quotation
 * — not to recompute anything from, but so that a figure nobody can explain
 * six weeks later can at least be traced.
 *
 * **Indian GST is not charged on a foreign-currency quotation.** A supply
 * billed in dollars to a customer abroad is an export, and adding 18% to it
 * would overstate the price by 18% and misstate the tax position at the same
 * time. Switching off the rupee therefore zeroes the tax on every line, and
 * the tax rows disappear from the document rather than printing as zero.
 * Switching back restores the catalogue's rate for each line. Where a supply
 * genuinely does attract Indian tax, it is quoted in rupees.
 */

import { DEFAULT_GST_RATE } from "@/lib/money";
import type { ExchangeRates } from "@/lib/currency";

export const QUOTE_CURRENCIES = ["INR", "USD", "AED"] as const;
export type QuoteCurrency = (typeof QUOTE_CURRENCIES)[number];

export function isQuoteCurrency(value: unknown): value is QuoteCurrency {
  return typeof value === "string" && (QUOTE_CURRENCIES as readonly string[]).includes(value);
}

/** How the currency is named on a form. */
export const QUOTE_CURRENCY_LABELS: Record<QuoteCurrency, string> = {
  INR: "Indian rupee (INR)",
  USD: "US dollar (USD)",
  AED: "UAE dirham (AED)",
};

/** The symbol that goes in a form label beside an amount. */
export const CURRENCY_SYMBOLS: Record<string, string> = { INR: "₹", USD: "$", AED: "AED" };

export function currencySymbol(currency: string): string {
  return CURRENCY_SYMBOLS[currency] ?? currency;
}

/**
 * Paise per one unit of the currency.
 *
 * A rupee is a hundred paise by definition, which is what lets one function
 * convert between any two of these without a special case for the rupee at
 * either end. Null means no rate is set and the currency cannot be quoted in.
 */
export function ratePaise(currency: QuoteCurrency, rates: ExchangeRates): number | null {
  if (currency === "INR") return 100;
  const rate = rates[currency];
  return rate && rate > 0 ? rate : null;
}

/**
 * Restates an amount from one currency's minor unit in another's.
 *
 * `round` rather than `floor`: a fractional cent has to land somewhere, and
 * rounding down would shave a unit off every line in the same direction.
 * Null when either side has no rate — the caller must refuse, never guess.
 */
export function convertMinor(
  amountMinor: number,
  from: QuoteCurrency,
  to: QuoteCurrency,
  rates: ExchangeRates,
): number | null {
  if (from === to) return amountMinor;
  const source = ratePaise(from, rates);
  const target = ratePaise(to, rates);
  if (source == null || target == null) return null;
  return Math.round((amountMinor * source) / target);
}

/** The currencies a quotation may actually be drafted in, rupees always first. */
export function quotableCurrencies(rates: ExchangeRates): QuoteCurrency[] {
  return QUOTE_CURRENCIES.filter((code) => ratePaise(code, rates) != null);
}

/**
 * The GST rate a line carries once the quotation's currency has changed.
 *
 * Zero in anything but rupees, for the reason at the top of this file. Coming
 * back to rupees restores the catalogue's rate for the line where the
 * catalogue knows it, and the default where the line was typed by hand — which
 * is the same rule `addQuoteLine` applies to a line added without one.
 */
export function gstRateAfterSwitch(
  to: QuoteCurrency,
  catalogueRate: number | null | undefined,
): number {
  if (to !== "INR") return 0;
  return catalogueRate ?? DEFAULT_GST_RATE;
}

/**
 * The ceiling a quotation cannot exceed, written in its own currency.
 *
 * Every money column is a 32-bit integer of minor units, which stops a shade
 * over 21.47 million whole units whatever the currency. The rupee figure reads
 * as 2.14 crore because that is how an Indian reader parses it; a dollar figure
 * does not, and a message that told a salesperson their dollar quotation was
 * over "₹2.14 crore" would send them looking for a rupee amount that is not on
 * the screen.
 */
export function ceilingLabel(currency: string): string {
  if (currency === "INR") return "about ₹2.14 crore";
  return `about ${currencySymbol(currency)}21.4 million`;
}

/**
 * Which set of printed terms a quotation carries.
 *
 * The rupee terms state a tax position — "prices are exclusive of applicable
 * GST" is the usual wording, and it belongs there — which is false on a
 * quotation billed abroad, where no Indian GST is charged. So an administrator
 * may write a second list for those, and this is the one place that chooses
 * between them: the emailed quotation and the PDF both come through here, so
 * the attachment cannot contradict the message it is attached to.
 *
 * Keyed on the currency rather than on whether tax happens to be zero. A rupee
 * quotation whose lines are all zero-rated is still a domestic supply under
 * Indian terms; what changes the terms is the currency the money moves in.
 *
 * Falls back to the rupee terms when no foreign list is set. That is the
 * behaviour before this existed, and it is the honest default: a list this
 * application composed for an export sale would be a commitment the business
 * never made.
 */
export function termsFor(
  currency: string,
  terms: string | null,
  foreignTerms: string | null,
): string | null {
  if (currency === "INR") return terms;
  return foreignTerms?.trim() ? foreignTerms : terms;
}
