import { certifications } from "../seed-data/certifications";
import type { ContentMigration } from "./types";

/**
 * Two government registrations, supplied by the business as certificate
 * PDFs: Udyam (MSME) Registration and DPIIT's Startup India recognition.
 *
 * Scoped to just these two rather than re-running `homepageAndCertifications`
 * for all five — the three ISO rows it already wrote may since have been
 * edited in the admin panel, and this migration has no business overwriting
 * that edit to re-assert a value that migration already established.
 */
const NEW_STANDARDS = ["Udyam Registration", "Startup India"];

export const govtRegistrationCertificates: ContentMigration = {
  id: "2026-09-govt-registration-certificates",
  describe: "record the Udyam and Startup India registration certificates",

  async apply(prisma) {
    let created = 0;
    let already = 0;

    for (const certification of certifications) {
      if (!NEW_STANDARDS.includes(certification.standard)) continue;

      const existing = await prisma.certification.findUnique({
        where: {
          standard_reference: {
            standard: certification.standard,
            reference: certification.reference,
          },
        },
        select: { id: true },
      });

      if (existing) {
        already += 1;
        continue;
      }

      await prisma.certification.create({
        data: {
          standard: certification.standard,
          title: certification.title,
          reference: certification.reference,
          issuer: certification.issuer,
          verifyUrl: certification.verifyUrl,
          scope: certification.scope,
          issuedAt: new Date(`${certification.issuedAt}T00:00:00.000Z`),
          expiresAt: certification.expiresAt
            ? new Date(`${certification.expiresAt}T00:00:00.000Z`)
            : null,
          displayOrder: certification.displayOrder,
        },
      });
      created += 1;
    }

    const parts = [`${created} certificate(s) recorded`];
    if (already > 0) parts.push(`${already} already present`);
    return parts.join(", ");
  },
};
