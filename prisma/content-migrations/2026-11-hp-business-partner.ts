import type { ContentMigration } from "./types";

/**
 * HP's designation, now worded as the programme words it and shown with the
 * badge HP issued.
 *
 * HP was recorded as the placeholder "Partner" — the weakest claim that is
 * still true — until the programme's own wording was supplied. The business has
 * now supplied the HP Business Partner badge, the same way it supplied the
 * Microsoft and Adobe ones, so the record is brought up to match it and the
 * confirmation date is renewed.
 *
 * It changes the brand only while it still holds the placeholder and no badge.
 * If an administrator has already set a different label or badge, that is a
 * decision and is left alone.
 */
export const hpBusinessPartner: ContentMigration = {
  id: "2026-11-hp-business-partner",
  describe: "HP designation worded as the programme words it, with its badge",

  async apply(prisma) {
    const updated = await prisma.brand.updateMany({
      where: { slug: "hp", partnerLabel: "Partner", partnerBadgeUrl: null },
      data: {
        partnerLabel: "Business Partner",
        partnerBadgeUrl: "/badges/hp-business-partner.png",
        partnerConfirmedAt: new Date("2026-11-22T00:00:00Z"),
        partnerPublic: true,
      },
    });
    return updated.count > 0
      ? "HP recorded as Business Partner with its badge"
      : "HP partner record was already set up — left alone";
  },
};
