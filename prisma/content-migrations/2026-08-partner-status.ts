import { partnerStatus } from "../seed-data/partner-status";
import type { ContentMigration } from "./types";

/**
 * The partner designations TechZoid confirmed.
 *
 * Only writes a brand that has no designation on file. A label somebody has
 * already set — a specific programme tier, say, entered from the admin panel —
 * is left exactly as it is, because this migration knows less about the
 * relationship than whoever typed that did.
 */
export const partnerStatusMigration: ContentMigration = {
  id: "2026-08-partner-status",
  describe: "partner designations for the brands TechZoid named",

  async apply(prisma) {
    let set = 0;
    let skipped = 0;

    for (const entry of partnerStatus) {
      const brand = await prisma.brand.findFirst({
        where: { slug: entry.slug, deletedAt: null },
        select: { id: true, partnerLabel: true },
      });

      if (!brand) {
        skipped += 1;
        continue;
      }

      if (brand.partnerLabel && brand.partnerLabel.trim().length > 0) {
        skipped += 1;
        continue;
      }

      await prisma.brand.update({
        where: { id: brand.id },
        data: {
          partnerLabel: entry.label,
          partnerConfirmedAt: new Date(entry.confirmedAt),
          partnerPublic: entry.isPublic,
        },
      });
      set += 1;
    }

    return `${set} designation(s) set, ${skipped} left alone`;
  },
};
