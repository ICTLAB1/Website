
/**
 * Whether a product is quoted rather than priced on the public site.
 *
 * ## The rule today: a price if there is one, for everything
 *
 * `CATALOGUE_IS_QUOTE_ONLY` is off, and every product — software or hardware —
 * shows an indicative price wherever one is recorded: on a card, on the
 * product page, in the structured data, with a disclaimer that the figure is
 * subject to confirmation, alongside GST and the term it applies to. A written
 * quotation still fixes the number: nothing here makes a price binding, and
 * nothing here re-enables a card checkout — see `DIRECT_PURCHASE_ENABLED`
 * below, which is the separate decision that controls that.
 *
 * ## Hardware used to be excluded, and no longer is
 *
 * It was quote-only regardless of this constant, on the reasoning that HP,
 * Dell and HPE configurations are priced against a specification a buyer
 * chooses rather than from a catalogue figure — a standing rule of this
 * business from before this file existed. The business has since asked for a
 * price on every listing, and that instruction cannot be met by a rule that
 * hides prices which exist.
 *
 * Two things follow, and both are worth knowing rather than discovering.
 *
 * The reasoning behind the old rule has not stopped being true: a hardware
 * price is only meaningful against a configuration. What answers it now is the
 * disclaimer every price carries, the same one the software prices rely on —
 * not the absence of the figure.
 *
 * And the rule was a guard as well as a policy. It meant a mis-imported record
 * or a supplier cost typed into the admin panel could not reach a public card.
 * That protection is gone by instruction. What remains is that the figure has
 * to be written to a price field rather than a cost field, and that no price
 * on this site is presented as an offer capable of acceptance.
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
 * The condition underneath governed before the catalogue went quote-only and
 * governs again now that it has come back off — a row with no usable price.
 * Keeping it as
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
 * `false` restores the behaviour below: a product shows its price if it has
 * one, and the quote label if it does not. Flipping this alone does not
 * restore direct card purchase — see `DIRECT_PURCHASE_ENABLED`.
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

/*
 * Only the variants now. `formFactor` and `purchaseMode` were read when the
 * decision turned on what kind of product this was; they are kept as optional
 * and ignored so that callers passing a wider product object — there are
 * several, each with a different select — do not all have to change.
 */
type PriceableProduct = {
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

  /*
   * One question now: is there a price to show?
   *
   * This used to ask three, and two of them were about what kind of product it
   * was rather than what was known about it. Hardware was quote-only
   * unconditionally, and so was any row whose `purchaseMode` was ENQUIRY — so
   * a product with a perfectly good list price in the database showed "Price
   * on enquiry" because of its classification. Four did exactly that: both
   * Windows Server 2025 editions and both SQL Server 2022 editions carried
   * prices nobody could see.
   *
   * The business asked for a price on every listing. That cannot be answered
   * by a rule that hides prices which exist, so the classification rules are
   * gone and the only test left is the honest one. The practical effect is
   * that a figure entered in the admin panel appears on the site, for any
   * product, with no code change — which is what "every listing has a price"
   * needs, because 48 of the 88 active products have no price anywhere in the
   * database today and no rule here can conjure one.
   *
   * ## What was given up, stated plainly
   *
   * The hardware rule was a guard as well as a policy: it meant that one
   * mis-imported record, or one figure typed into the admin panel to note a
   * supplier cost, could not put a price on a public card. That protection is
   * gone, deliberately and on instruction. Two things still stand between a
   * stray figure and a customer — it has to be written to `listPriceMinor` or
   * `salePriceMinor`, which are the price fields and not a cost field, and
   * every price on the site carries `TENTATIVE_PRICE_NOTE` saying the figure
   * is confirmed on a written quotation before any order is placed.
   *
   * A hardware product with no price still shows the quote label, because the
   * alternative is a card with a blank where a price goes, which reads as a
   * page that failed to load.
   */
  const prices = (product.variants ?? []).map(
    (variant) => variant.salePriceMinor ?? variant.listPriceMinor,
  );

  /*
   * Any variant, not the first one. `variants[0]` was the old test, and it
   * would hide a whole product's pricing because one configuration happened
   * to be sorted first and happened to be unpriced. No product in the
   * catalogue is in that state today — it was checked — but the old rule made
   * it harmless and this one makes it matter, so it is answered here rather
   * than left to be discovered.
   */
  return !prices.some((price) => price > 0);
}
