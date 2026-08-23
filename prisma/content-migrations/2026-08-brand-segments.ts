import { brandSegments } from "../seed-data/brand-segments";
import type { ContentMigration } from "./types";

/**
 * Which part of the offer each brand belongs to, on a database already seeded.
 *
 * The brands page groups by this, and an unclassified brand falls into "other"
 * — visible, which is the point, but not where any of these forty belong. Like
 * the seed step it mirrors, this writes unconditionally: the segment is a fact
 * about the company rather than a claim about the relationship, so there is no
 * operator judgement here to talk over.
 */
export const brandSegmentsMigration: ContentMigration = {
  id: "2026-08-brand-segments",
  describe: "the segment each brand is grouped under",

  async apply(prisma) {
    let set = 0;

    for (const [slug, segment] of Object.entries(brandSegments)) {
      const updated = await prisma.brand.updateMany({
        where: { slug, deletedAt: null, segment: null },
        data: { segment },
      });
      set += updated.count;
    }

    const unclassified = await prisma.brand.count({ where: { deletedAt: null, segment: null } });

    return `${set} brand(s) classified, ${unclassified} still unclassified`;
  },
};
