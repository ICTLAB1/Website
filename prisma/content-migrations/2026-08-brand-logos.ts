import { brands } from "../seed-data/brands";
import type { ContentMigration } from "./types";

/**
 * Points the brands at the logo files this repository now holds.
 *
 * Only brands with no logo set are touched. An administrator who has already
 * uploaded a publisher's own artwork from the panel has, by definition, a
 * better file than the one committed here: uploads come from the publisher's
 * brand-assets programme, where the current variant and the rules for using it
 * live. Overwriting that with a bundled icon would be a downgrade applied
 * silently, on a deploy, to a page nobody was looking at.
 */
export const brandLogos: ContentMigration = {
  id: "2026-08-brand-logos",
  describe: "attach the committed logo files to their brands",

  async apply(prisma) {
    const withArtwork = brands.filter(
      (brand): brand is typeof brand & { logoUrl: string } => Boolean(brand.logoUrl),
    );

    let set = 0;
    let kept = 0;

    for (const brand of withArtwork) {
      const { count } = await prisma.brand.updateMany({
        // `logoUrl: null` is the condition, not just a filter for tidiness: it
        // is what makes an administrator's upload survive this migration.
        where: { slug: brand.slug, logoUrl: null },
        data: { logoUrl: brand.logoUrl },
      });

      if (count > 0) set += 1;
      else kept += 1;
    }

    return `${set} brand logo(s) set, ${kept} already had one or were absent`;
  },
};
