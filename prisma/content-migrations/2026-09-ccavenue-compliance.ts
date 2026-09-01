import type { Prisma } from "@prisma/client";

import type { ContentMigration } from "./types";

/**
 * CCAvenue's onboarding review named a real gap: the terms, privacy and
 * refund pages each carry a grievance-redressal panel, and each of those
 * panels was built with `fields: "grievance"` — deliberately, at the time,
 * because the legal entity name already appeared once on the page itself and
 * a second, database-driven copy of it felt redundant.
 *
 * It was not redundant to a reviewer, or to CCAvenue's crawler, checking each
 * legal page independently for the registered name rather than reading three
 * pages as a set. The three pages already say "the company operating this
 * website" and point to `/about` for who that is; that is not the same as
 * the page stating it. Widening the field selection to `"all"` puts the
 * registered legal name, GSTIN, CIN and registered address directly on the
 * same panel that already carries the grievance officer's details — the
 * identity block `CompanyInfoBlock` already renders, entirely from
 * `getSiteConfig()`, with nothing invented here.
 *
 * The heading is corrected alongside the field, from "Grievance redressal" to
 * "Company details and grievance redressal" — the old heading over the wider
 * set of fields would have undersold what the panel now shows.
 */

type Edit = { slug: string; order: number; fromFields: string; toFields: string; toHeading: string };

const EDITS: Edit[] = [
  { slug: "privacy", order: 14, fromFields: "grievance", toFields: "all", toHeading: "Company details and grievance redressal" },
  { slug: "refund-policy", order: 11, fromFields: "grievance", toFields: "all", toHeading: "Company details and grievance redressal" },
  { slug: "terms", order: 21, fromFields: "grievance", toFields: "all", toHeading: "Company details and grievance redressal" },
];

export const ccavenueCompliance: ContentMigration = {
  id: "2026-09-ccavenue-compliance",
  describe: "widen the legal pages' company-info panel to show the registered entity name",

  async apply(prisma) {
    let changed = 0;
    let already = 0;
    let left = 0;
    let missing = 0;

    for (const edit of EDITS) {
      const section = await prisma.pageSection.findFirst({
        where: { page: { slug: edit.slug }, displayOrder: edit.order, type: "COMPANY_INFO" },
        select: { id: true, data: true },
      });

      if (!section) {
        missing += 1;
        continue;
      }

      const data = (section.data ?? {}) as Record<string, unknown>;

      if (data.fields === edit.toFields) {
        already += 1;
        continue;
      }
      if (data.fields !== edit.fromFields) {
        // An administrator has changed this panel since — a heading or field
        // selection they chose is not this migration's to override.
        left += 1;
        continue;
      }

      await prisma.pageSection.update({
        where: { id: section.id },
        data: {
          data: { ...data, fields: edit.toFields, heading: edit.toHeading } as Prisma.InputJsonValue,
        },
      });
      changed += 1;
    }

    const parts = [`${changed} panel(s) widened to show the registered entity name`];
    if (already > 0) parts.push(`${already} already current`);
    if (left > 0) parts.push(`${left} edited since and left alone`);
    if (missing > 0) parts.push(`${missing} not found`);
    return parts.join(", ");
  },
};
