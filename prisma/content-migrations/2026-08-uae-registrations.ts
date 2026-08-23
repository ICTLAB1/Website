import type { ContentMigration } from "./types";

/**
 * The UAE branch's registration numbers, and the strapline.
 *
 * All three were supplied by the business. They live in `SiteSettings` so they
 * can be corrected from the admin panel without a deploy, and they are written
 * here because a value typed into one environment's panel exists only in that
 * environment — these have to be on the letterhead the moment the deploy
 * finishes, not when somebody remembers to type them.
 *
 * The registration numbers are stored with the label its jurisdiction uses
 * beside each one. "42287" printed under an address tells a reader nothing;
 * "Business License: 42287" is the thing a customer's finance team can check.
 *
 * The strapline moves the same way and for the same reason: it was
 * environment-only, so rewording the one line of copy most likely to be
 * reworded needed a server login.
 *
 * ## Why each field refuses to overwrite
 *
 * Anything already stored is left alone, field by field rather than all or
 * nothing. The panel exists so a person can decide these; a migration that
 * replaced a later correction with the value written here would undo it
 * silently, during a deploy, which is the worst moment to discover it.
 */
const TAGLINE = "Connect, Communicate & Collaborate";
const REGISTRATION = { label: "Business License", value: "42287" };
const TAX = { label: "Tax Registration Number", value: "105122230300001" };

export const uaeRegistrations: ContentMigration = {
  id: "2026-08-uae-registrations",
  describe: "the UAE branch's licence and TRN, and the strapline",

  async apply(prisma) {
    const existing = await prisma.siteSettings.findUnique({
      where: { id: "singleton" },
      select: {
        tagline: true,
        secondaryEntityRegistrationLabel: true,
        secondaryEntityRegistrationNo: true,
        secondaryEntityTaxLabel: true,
        secondaryEntityTaxNo: true,
      },
    });

    const data: Record<string, string> = {};
    const written: string[] = [];

    if (!existing?.tagline?.trim()) {
      data.tagline = TAGLINE;
      written.push("strapline");
    }
    if (!existing?.secondaryEntityRegistrationNo?.trim()) {
      data.secondaryEntityRegistrationLabel = REGISTRATION.label;
      data.secondaryEntityRegistrationNo = REGISTRATION.value;
      written.push("business licence");
    }
    if (!existing?.secondaryEntityTaxNo?.trim()) {
      data.secondaryEntityTaxLabel = TAX.label;
      data.secondaryEntityTaxNo = TAX.value;
      written.push("tax registration number");
    }

    if (written.length === 0) return "all three are already set — left alone";

    await prisma.siteSettings.upsert({
      where: { id: "singleton" },
      create: { id: "singleton", ...data },
      update: data,
    });

    return `set the ${written.join(", ")}`;
  },
};
