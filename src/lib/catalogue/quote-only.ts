import type { FormFactor, PurchaseMode } from "@prisma/client";

import { isHardware } from "@/lib/catalogue/hardware";

/**
 * Whether a product is quoted rather than priced on the public site.
 *
 * ## The rule today: everything is
 *
 * `CATALOGUE_IS_QUOTE_ONLY` is on, so no price reaches a visitor from any
 * catalogue surface — not a card, not a product page, not a listing, not a
 * filter band, not the structured data a search engine reads. A visitor sees
 * what a product is and a way to ask what it costs.
 *
 * This is a commercial position, not a property of the rows. Licensing prices
 * move with programme, term, quantity and the customer's own agreement, and a
 * figure on a card is a number a buyer will hold you to three months later
 * when none of those are the same. The prices themselves are untouched: they
 * are still on the variants, still what a quotation is priced from, still on
 * orders and invoices and in the admin panel. What changed is who is shown one
 * before there is a quotation.
 *
 * ## Why a constant rather than deleting the code
 *
 * The per-row conditions underneath are the ones that governed before, and
 * they are kept intact so this is one line to reverse. A business that decides
 * to list prices again should not have to reconstruct the rules for which rows
 * could carry one — those rules were right, and hardware in particular must
 * stay quote-only whatever the constant says.
 *
 * ## One function, every surface
 *
 * The same reasoning as `mayShowClientLogo` and `currentCertifications`: a rule
 * a component has to remember is a rule a component will one day forget, and
 * the cost of forgetting this one is a price on a public page that somebody
 * quotes back at you. `scripts/verify/prices.mjs` reads the rendered site and
 * fails on any currency-shaped string in the catalogue, so a surface that
 * skips this function is caught by the gate rather than by a customer.
 */

/**
 * The switch. `true` means the catalogue quotes rather than prices.
 *
 * Flipping it to `false` restores the per-row behaviour below and nothing
 * else — no copy anywhere says "quote only" except through
 * `QUOTE_ONLY_NOTE`, which is the one string to change with it.
 */
export const CATALOGUE_IS_QUOTE_ONLY = true;

/** What a card, a listing and a product page say in place of a price. */
export const QUOTE_ONLY_NOTE =
  "Priced to your requirement — licensing terms, quantity and entitlement all move the figure.";

/** The short form, for a card with no room for the sentence. */
export const QUOTE_ONLY_LABEL = "Price on enquiry";

type PriceableProduct = {
  formFactor?: FormFactor | null;
  purchaseMode?: PurchaseMode;
  variants?: Array<{ listPriceMinor: number; salePriceMinor: number | null }>;
};

/**
 * Whether this product is quoted rather than priced, for a public surface.
 *
 * Takes whatever subset of a product the caller has, so a list query does not
 * have to widen its select to ask.
 */
export function isQuoteOnly(product: PriceableProduct): boolean {
  if (CATALOGUE_IS_QUOTE_ONLY) return true;

  // Hardware is quote-only as a requirement of the business rather than as a
  // property of a row: one mis-imported record, or one price typed into the
  // admin panel to note a cost, and a general price test would put a figure on
  // a public card.
  if (isHardware(product)) return true;
  if (product.purchaseMode === "ENQUIRY") return true;

  const variant = product.variants?.[0];
  if (!variant) return true;
  return (variant.salePriceMinor ?? variant.listPriceMinor) <= 0;
}
