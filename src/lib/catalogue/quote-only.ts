import type { FormFactor, PurchaseMode } from "@prisma/client";

import { isHardware } from "@/lib/catalogue/hardware";

/**
 * Whether a product is quoted rather than priced on the public site.
 *
 * ## The rule today: hardware only, plus the per-row exceptions
 *
 * `CATALOGUE_IS_QUOTE_ONLY` is off. Software licences show an indicative price
 * — on a card, on the product page, in the structured data — with a
 * disclaimer that the figure is subject to confirmation, alongside GST and
 * the term it applies to. A written quotation still fixes the number: nothing
 * here makes a price binding, and nothing here re-enables a card checkout —
 * see `DIRECT_PURCHASE_ENABLED` below, which is the separate decision that
 * controls that.
 *
 * Hardware stays quote-only regardless of this constant. That was true when
 * the whole catalogue went quote-only and it did not change back with this
 * flag: HP, Dell and HPE configurations are priced against a specification a
 * buyer chooses, not a catalogue figure, and it has been a standing rule of
 * this business from before any of this file existed that no hardware price
 * is shown in public. `isHardware(product)` below is unconditional.
 *
 * This was on once before — briefly, catalogue-wide — on the reasoning that
 * licensing prices move with programme, term, quantity and the customer's own
 * agreement, so a figure on a card is a number a buyer holds you to three
 * months later when none of those are the same. That reasoning still applies
 * to the number itself, which is why every surface that shows one also shows
 * the disclaimer: the figure is indicative, not an offer capable of
 * acceptance, and it is confirmed on a written quotation before an order is
 * placed. The business decided the qualifying disclaimer is enough and asked
 * for prices back; this is that decision, not a reversal of the reasoning
 * behind it.
 *
 * ## Why a constant rather than deleting the code
 *
 * The per-row conditions underneath governed before the catalogue went
 * quote-only and they govern again now that it has come back off — hardware,
 * an enquiry-only purchase mode, a row with no usable price. Keeping them as
 * a function this flag sits in front of, rather than inlining a price check
 * everywhere, is what let this reverse in one place instead of a search for
 * every surface that had learned to hide a price.
 *
 * ## One function, every surface
 *
 * The same reasoning as `mayShowClientLogo` and `currentCertifications`: a
 * rule a component has to remember is a rule a component will one day forget.
 * `scripts/verify/prices.mjs` reads the rendered site and asserts the current
 * policy in both directions — a price and its disclaimer on a software
 * surface, none on a hardware one — so a surface that disagrees with this
 * function is caught by the gate rather than by a customer.
 */

/**
 * The switch. `true` means the catalogue quotes rather than prices.
 *
 * `false` restores the per-row behaviour below: hardware and enquiry-only
 * rows stay quote-only, everything else shows its price. Flipping this alone
 * does not restore direct card purchase — see `DIRECT_PURCHASE_ENABLED`.
 */
export const CATALOGUE_IS_QUOTE_ONLY = false;

/**
 * Whether a priced software product may be bought by card without a
 * quotation first.
 *
 * Separate from `CATALOGUE_IS_QUOTE_ONLY` on purpose: showing a price and
 * accepting a card for it are two different decisions, and the business asked
 * for the first without the second. Every eligible SKU still routes to
 * "Request Enterprise Pricing"; `/buy` remains reachable directly and Stripe
 * still settles quotation-raised orders on `/account/orders` — this constant
 * only controls whether a catalogue surface links to it.
 *
 * `false` today. Setting it `true` restores the "Buy now" button on the
 * product page and the card exactly as they rendered before direct purchase
 * was retired, with no other change needed: the eligibility rules
 * (`purchaseMode`, `isDirectlyPurchasable`, a real price) were never removed.
 */
export const DIRECT_PURCHASE_ENABLED = false;

/** What a card, a listing and a product page say in place of a price. */
export const QUOTE_ONLY_NOTE =
  "Priced to your requirement — licensing terms, quantity and entitlement all move the figure.";

/** The short form, for a card with no room for the sentence. */
export const QUOTE_ONLY_LABEL = "Price on enquiry";

/**
 * The disclaimer a priced surface carries beside its figure.
 *
 * One sentence, reused everywhere a price is shown, so the wording cannot
 * drift between a card and a product page the way two hand-written captions
 * would. It says two things and only two: the number can still move, and a
 * written quotation is what fixes it — which is also what `/terms` says about
 * catalogue prices, so this is consistent with the contract rather than a
 * separate claim beside it.
 */
export const TENTATIVE_PRICE_NOTE =
  "Tentative price, subject to confirmation. Final pricing is fixed on a written quotation before any order is placed.";

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
