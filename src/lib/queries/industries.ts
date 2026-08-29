import "server-only";
import { prisma } from "@/lib/db";
import { cached } from "@/lib/queries/cached";
import { tags } from "@/lib/cache";

const industrySelect = {
  slug: true,
  name: true,
  summary: true,
  icon: true,
  solutions: true,
} as const;

const industryPageSelect = {
  ...industrySelect,
  description: true,
  brandSlugs: true,
  serviceSlugs: true,
  categorySlugs: true,
} as const;

/** Every published sector, in display order. */
export const publishedIndustries = cached(
  async () =>
    prisma.industry.findMany({
      where: { published: true, deletedAt: null },
      orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
      select: industrySelect,
    }),
  ["published-industries"],
  [tags.industries],
);

/**
 * One sector by slug, with the long copy the detail page needs.
 *
 * Unpublished and archived rows return null rather than rendering, so a sector
 * taken down disappears from its own URL as well as from the grid — the
 * alternative is a page that nothing links to and Google still holds.
 */
export const industryBySlug = (slug: string) =>
  cached(
    async () =>
      prisma.industry.findFirst({
        where: { slug, published: true, deletedAt: null },
        select: industryPageSelect,
      }),
    ["industry", slug],
    [tags.industries],
  )();

/** Every published slug, for `generateStaticParams` and the sitemap. */
export const industrySlugs = cached(
  async () => {
    const rows = await prisma.industry.findMany({
      where: { published: true, deletedAt: null },
      orderBy: [{ displayOrder: "asc" }],
      select: { slug: true },
    });
    return rows.map((row) => row.slug);
  },
  ["industry-slugs"],
  [tags.industries],
);
