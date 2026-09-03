import type { ContentMigration } from "./types";

import { ORGANISATION_ARTWORK_SOURCE, organisationSeeds } from "../seed-data/organisations";

/**
 * Nine organisation emblems, on file and not on the site.
 *
 * The artwork arrived; the permissions did not. Each row is created with its
 * mark, `published` off and `permissionConfirmedAt` empty — which is what keeps
 * every one of them off the public page until somebody records who authorised
 * it and when.
 *
 * That is not caution for its own sake. `lib/client-logo` was built to want
 * three things before releasing a mark, and a migration that filled in a date
 * nobody had checked would defeat the only mechanism standing between a
 * supplier's marketing page and somebody else's trademark. The business has
 * said the permissions are held; the evidence for each one is a fact only
 * somebody who can produce it should be entering.
 *
 * `permissionReference` records what is actually known — where the files came
 * from and what was done to them — so whoever finishes the record can see what
 * they are finishing.
 *
 * Existing rows are left completely alone. If somebody has already published
 * one, this must not quietly unpublish it.
 */
export const organisationLogos: ContentMigration = {
  id: "2026-08-organisation-logos",
  describe: "nine organisation emblems, on file and unpublished",

  async apply(prisma) {
    let created = 0;

    for (const organisation of organisationSeeds) {
      const existing = await prisma.clientLogo.findUnique({
        where: { id: organisation.id },
        select: { id: true },
      });
      if (existing) continue;

      await prisma.clientLogo.create({
        data: {
          id: organisation.id,
          name: organisation.name,
          logoUrl: organisation.logoUrl,
          sector: organisation.sector,
          displayOrder: organisation.displayOrder,
          permissionReference: ORGANISATION_ARTWORK_SOURCE,
          // Both deliberately absent. Together they are the reason nothing
          // here appears on the site.
          permissionConfirmedAt: null,
          published: false,
        },
      });
      created += 1;
    }

    if (created === 0) return "the organisation emblems are already on file";

    return (
      `${created} organisation emblem(s) on file, none published — ` +
      "each needs a confirmed permission date and a deliberate publish before it appears"
    );
  },
};
