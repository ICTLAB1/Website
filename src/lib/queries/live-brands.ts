import { prisma } from "@/lib/db";
import { tags } from "@/lib/cache";
import { BRAND_GUIDES } from "@/lib/content/guides";
import { cached } from "@/lib/queries/cached";

/**
 * Brands that have a page worth visiting: a published product, or a written hub page.
 *
 * Every other brand row exists so the site can say "we can source it, ask us". A page for such a
 * brand has nothing to say, so it returns 404 and nothing links to it: a page that is
 * noindexed but still linked keeps being crawled, which is the cost this avoids. The day a
 * brand gets its first product it becomes live and every link to it reappears with no edit.
 */
export const getLiveBrandSlugs = cached(
  async (): Promise<string[]> => {
    const rows = await prisma.brand.findMany({
      where: {
        deletedAt: null,
        OR: [{ products: { some: { status: "ACTIVE", deletedAt: null } } }, { slug: { in: Object.keys(BRAND_GUIDES) } }],
      },
      select: { slug: true },
    });
    return rows.map((row) => row.slug);
  },
  ["live-brand-slugs-v1"],
  [tags.catalogue, tags.brands],
);
