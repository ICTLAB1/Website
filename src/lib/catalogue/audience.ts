import type { VariantAudience } from "@prisma/client";

/**
 * Who a price is for, and which prices the public may see.
 *
 * Publisher price lists carry the same SKU several times at different figures:
 * a commercial rate, an academic rate, a non-profit rate. They are not
 * alternatives a buyer chooses between — they are entitlements, and an
 * organisation either qualifies or does not.
 *
 * That matters more than it sounds. A "from ₹1,954" on a product page taken
 * from an academic row is a price almost every visitor cannot have, and the
 * ratios are not small: an education rate can be an eighth of the commercial
 * one. Publishing the cheapest row would misprice the entire catalogue in the
 * customer's favour and in the business's imagination.
 *
 * So one rule, defined once here and applied at every read.
 */

/**
 * The audiences a visitor may see priced on the public site.
 *
 * Non-profit rates are deliberately absent: they are held for sales to quote
 * once eligibility is established, not shown to everyone who lands on a page.
 * Adding an audience here publishes it everywhere at once — catalogue, product
 * pages, search, price filters and the "from" price — which is the point.
 */
export const PUBLIC_AUDIENCES: VariantAudience[] = ["COMMERCIAL", "EDUCATION"];

/**
 * The audiences that may be bought without a person in the loop.
 *
 * Only the commercial rate. Everything else is a price somebody has to be
 * entitled to, and this site has no way to establish entitlement — so an
 * academic SKU can be seen, compared and enquired about, but not checked out.
 * Selling one to a buyer who does not qualify is a licence the publisher will
 * not honour and a refund this business would have to fund.
 */
export const DIRECTLY_PURCHASABLE_AUDIENCES: VariantAudience[] = ["COMMERCIAL"];

/** The Prisma fragment for a public variant read. */
export const publicVariantWhere = {
  deletedAt: null,
  audience: { in: PUBLIC_AUDIENCES },
} as const;

export function isDirectlyPurchasable(audience: VariantAudience): boolean {
  return DIRECTLY_PURCHASABLE_AUDIENCES.includes(audience);
}

const LABELS: Record<VariantAudience, string> = {
  COMMERCIAL: "Commercial",
  EDUCATION: "Education",
  NON_PROFIT: "Non-profit",
};

export function audienceLabel(audience: VariantAudience): string {
  return LABELS[audience];
}

/**
 * What to tell a visitor looking at a restricted price.
 *
 * Stated as a condition of purchase rather than as a warning, because it is
 * one — and stated at all, because a price with no eligibility note beside it
 * reads as an offer.
 */
export function audienceNote(audience: VariantAudience): string | null {
  switch (audience) {
    case "EDUCATION":
      return "Academic pricing. Available to qualifying educational institutions; eligibility is confirmed with the publisher before the licence is issued.";
    case "NON_PROFIT":
      return "Non-profit pricing. Available to qualifying charities and non-profits; eligibility is confirmed with the publisher before the licence is issued.";
    default:
      return null;
  }
}
