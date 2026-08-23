/**
 * Whether a partner designation may be stated publicly, and in what words.
 *
 * One function, used by every surface that could print one, because a partner
 * claim is not a piece of marketing copy — it is a statement about a
 * relationship with another company, which that company can be asked to
 * confirm. Getting it wrong is not a typo; it is a misrepresentation, and in
 * most partner agreements a breach of the agreement itself.
 *
 * Three conditions, all required:
 *
 *   1. There is a designation on file. Never composed in code from the brand
 *      name, because "HP" plus the word "Partner" is a sentence HP did not
 *      write.
 *   2. Somebody here has confirmed it. A field an administrator filled in is a
 *      claim; a field an administrator filled in and dated is a claim somebody
 *      stands behind.
 *   3. It has been deliberately published. Off by default, so filling in the
 *      designation for internal reference does not put it on the website as a
 *      side effect.
 *
 * The partner reference is deliberately not part of the public shape at all. A
 * buyer verifies a partner designation with the manufacturer, and printing an
 * identifier next to the claim only makes the claim look verified.
 */

export type PartnerFields = {
  partnerLabel?: string | null;
  partnerConfirmedAt?: Date | string | null;
  partnerPublic?: boolean | null;
};

/** The designation to print, or null if none may be printed. */
export function publicPartnerLabel(brand: PartnerFields | null | undefined): string | null {
  if (!brand) return null;
  if (!brand.partnerPublic) return null;
  if (!brand.partnerConfirmedAt) return null;

  const label = brand.partnerLabel?.trim();
  if (!label) return null;

  // A designation is a short phrase. Anything longer is a paragraph that has
  // been put in the wrong field, and a badge is the wrong place for it.
  return label.length <= 60 ? label : null;
}

/**
 * How stale a confirmation may be before it stops being one.
 *
 * Partner programmes are renewed annually and tiers move. A designation
 * confirmed two years ago is not evidence of anything today, so the claim
 * lapses on its own rather than staying up until somebody notices.
 */
export const CONFIRMATION_VALID_DAYS = 400;

/** Whether the confirmation is recent enough to still count. */
export function partnerConfirmationCurrent(
  brand: PartnerFields | null | undefined,
  now: Date = new Date(),
): boolean {
  if (!brand?.partnerConfirmedAt) return false;
  const confirmed = new Date(brand.partnerConfirmedAt);
  if (Number.isNaN(confirmed.getTime())) return false;
  const age = (now.getTime() - confirmed.getTime()) / (1000 * 60 * 60 * 24);
  return age >= 0 && age <= CONFIRMATION_VALID_DAYS;
}

/** The label to print, once staleness is taken into account. */
export function currentPartnerLabel(
  brand: PartnerFields | null | undefined,
  now: Date = new Date(),
): string | null {
  if (!partnerConfirmationCurrent(brand, now)) return null;
  return publicPartnerLabel(brand);
}
