import type { ContentMigration } from "./types";

/**
 * 3ds Max, ranked against its siblings rather than parked at the bottom.
 *
 * The row was created by `2026-08-ranking-gaps` to catch a search position the
 * old site held and this one had nothing to land on. Filling a gap and ranking
 * a product are different jobs, and only the first was done: it went in at 44,
 * last of the nine Autodesk products, below Civil 3D and the Construction
 * Cloud.
 *
 * The evidence says otherwise, and it is the same evidence that created the
 * row. Search Console has "3ds max license" at position 9.2 on 736 impressions
 * over three months — the strongest demand signal on this brand after AutoCAD
 * and Revit, and better than anything currently ranked above it apart from
 * those two and the collections.
 *
 * 70 puts it fourth of nine, above Maya at 68 and below Fusion 360 at 76.
 *
 * ## What this changes, and what it does not
 *
 * `popularity` orders the catalogue's popular sort, the brand page and search
 * results. It does not decide what links to what: the related-products ring in
 * `lib/queries/catalogue` gives every product the same number of neighbours
 * whatever its score, precisely so a low-ranked product cannot become
 * unreachable. So this is where 3ds Max appears in a list, not whether it
 * appears at all.
 *
 * Written only where the score is still the value this migration expects, so a
 * ranking somebody has since set by hand in the admin panel is left alone and
 * a second run does nothing.
 */

const SLUG = "3ds-max";
const FROM = 44;
const TO = 70;

export const threeDsMaxRanking: ContentMigration = {
  id: "2026-08-3ds-max-ranking",
  describe: "3ds Max ranked from its search demand rather than left last",

  async apply(prisma) {
    const product = await prisma.product.findUnique({
      where: { slug: SLUG },
      select: { id: true, popularity: true },
    });
    if (!product) return "3ds Max is not in this catalogue";
    if (product.popularity === TO) return `3ds Max is already ranked ${TO}`;
    if (product.popularity !== FROM) {
      return `3ds Max is ranked ${product.popularity}, not the ${FROM} this expected — left alone`;
    }

    await prisma.product.update({ where: { id: product.id }, data: { popularity: TO } });
    return `3ds Max moved from ${FROM} to ${TO}`;
  },
};
