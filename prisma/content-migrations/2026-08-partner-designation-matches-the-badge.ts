import type { ContentMigration } from "./types";

/**
 * The homepage eyebrow says the same thing as the badge above it.
 *
 * The trust bar renders `/badges/microsoft-solutions-partner.png` — the
 * official artwork, alt text "Microsoft Solutions Partner" — directly above a
 * hero whose eyebrow read "Microsoft Authorised Partner". One line apart, two
 * names for one relationship, and a procurement officer reads both without
 * scrolling.
 *
 * ## Why this was refused once, and why that was wrong
 *
 * A remediation document asked for exactly this change and it was declined, on
 * the reasoning that "Solutions Partner" is a specific tier in Microsoft's
 * partner programme and swapping one unverified designation for another is not
 * safer than leaving it. That reasoning is sound and it was applied to the
 * wrong facts: the badge was already on the page. The business publishes the
 * Solutions Partner artwork, which is the stronger claim of the two and the one
 * Microsoft actually issues; "Authorised Partner" is the loose paraphrase, and
 * it is the line that does not match anything.
 *
 * So this is not a new claim. It is the text catching up with the badge that
 * was already there — which is what the evidence supported all along and what
 * looking at the rendered page, rather than at the string, would have shown.
 *
 * If the badge is ever wrong, the badge is what to remove; this line follows
 * it, and both should be checked against Partner Center together.
 */

const FROM = "Microsoft Authorised Partner | Registered GeM Seller | Enterprise IT Solutions";
const TO = "Microsoft Solutions Partner | Registered GeM Seller | Enterprise IT Solutions";

export const partnerDesignationMatchesTheBadge: ContentMigration = {
  id: "2026-08-partner-designation-matches-the-badge",
  describe: "the partner designation in the eyebrow matches the badge above it",

  async apply(prisma) {
    const sections = await prisma.pageSection.findMany({ select: { id: true, data: true } });

    for (const section of sections) {
      const data = section.data as Record<string, unknown> | null;
      if (data?.eyebrow !== FROM) continue;

      await prisma.pageSection.update({
        where: { id: section.id },
        data: { data: { ...data, eyebrow: TO } },
      });
      return `the eyebrow now says "Microsoft Solutions Partner", matching the badge in the trust bar`;
    }

    return "the eyebrow has already been changed — left alone";
  },
};
