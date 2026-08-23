/**
 * Partner designations TechZoid holds.
 *
 * Kept as data rather than in the brand seed because it changes on a different
 * clock: a brand's description is written once, a partner designation is
 * renewed, upgraded and occasionally lost. It is also the one part of the brand
 * record that is a claim about a relationship with another company, so it is
 * worth being able to see all of them on one screen.
 *
 * ## What goes in `label`
 *
 * The designation exactly as the programme words it. Where TechZoid holds a
 * named tier, that tier is what belongs here — "Partner" is a placeholder for a
 * designation whose exact programme wording has not been supplied yet, and it
 * is deliberately the weakest claim that is still true.
 *
 * ## What `confirmedAt` means
 *
 * The date somebody at TechZoid confirmed the designation is current. Not the
 * date it was granted, and not a guess. Public display lapses about a year
 * later — see `lib/brand-partner` — so a designation that is not re-confirmed
 * comes down on its own rather than staying up until somebody notices.
 *
 * ## What is not here
 *
 * Any brand TechZoid has not stated a designation for. The catalogue lists
 * forty brands and this list is short on purpose: reselling a product is not a
 * partner designation, and the two must not be allowed to blur.
 */

export type PartnerStatusSeed = {
  slug: string;
  label: string;
  /** ISO date. */
  confirmedAt: string;
  /** Whether the designation is stated publicly. */
  isPublic: boolean;
};

/**
 * Confirmed by TechZoid on 2026-08-23.
 *
 * Six of the brands named. The client also said "and many more"; those are not
 * here, because a designation nobody has named is not a designation this site
 * can state.
 */
export const partnerStatus: PartnerStatusSeed[] = [
  { slug: "hp", label: "Partner", confirmedAt: "2026-08-23", isPublic: true },
  { slug: "cisco", label: "Partner", confirmedAt: "2026-08-23", isPublic: true },
  { slug: "microsoft", label: "Partner", confirmedAt: "2026-08-23", isPublic: true },
  { slug: "adobe", label: "Partner", confirmedAt: "2026-08-23", isPublic: true },
  { slug: "acer", label: "Partner", confirmedAt: "2026-08-23", isPublic: true },
  { slug: "zoho", label: "Partner", confirmedAt: "2026-08-23", isPublic: true },
];
