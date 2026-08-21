import "server-only";
import { cache } from "react";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { cached } from "@/lib/queries/cached";
import { tags } from "@/lib/cache";
import { parseBlock, type ParsedBlock } from "@/lib/blocks/schemas";

/** CMS page reads. */

const breadcrumbSchema = z
  .array(z.object({ label: z.string().min(1).max(120), href: z.string().max(500).optional() }))
  .max(6);

/** `breadcrumb` is JSONB; validate before rendering, as with every JSON column. */
export function parseBreadcrumb(value: unknown): Array<{ label: string; href?: string }> {
  const parsed = breadcrumbSchema.safeParse(value);
  return parsed.success ? parsed.data : [];
}

export type CmsPage = {
  slug: string;
  title: string;
  description: string;
  keywords: string[];
  breadcrumb: Array<{ label: string; href?: string }>;
  brandSlug: string | null;
  faqTopic: string | null;
  blocks: ParsedBlock[];
  updatedAt: Date;
};

const loadPage = cached(
  async (slug: string) => {
    return prisma.page.findFirst({
      where: { slug, status: "PUBLISHED", deletedAt: null },
      select: {
        slug: true,
        title: true,
        description: true,
        keywords: true,
        breadcrumb: true,
        faqTopic: true,
        updatedAt: true,
        brand: { select: { slug: true } },
        sections: {
          where: { visible: true },
          orderBy: { displayOrder: "asc" },
          select: { id: true, type: true, data: true },
        },
      },
    });
  },
  ["cms-page"],
  [tags.pages],
  // A short window, because this caches misses as well as hits. An edit made
  // through the admin panel invalidates the tag immediately, but a row written
  // out of band - a migration, a restore, psql - cannot. Without a short
  // window, a page created that way would 404 for the full hour after
  // something first requested the slug and cached its absence.
  60,
);

/**
 * One published page, with every block validated against its type's schema.
 *
 * A block whose payload no longer matches its schema is dropped rather than
 * rendered: the page loses a section instead of returning a 500. Draft and
 * soft-deleted pages are excluded in the query, so an unpublished page is
 * indistinguishable from one that does not exist.
 */
export const getPage = cache(async (slug: string): Promise<CmsPage | null> => {
  const row = await loadPage(slug);
  if (!row) return null;

  return {
    slug: row.slug,
    title: row.title,
    description: row.description,
    keywords: row.keywords,
    breadcrumb: parseBreadcrumb(row.breadcrumb),
    brandSlug: row.brand?.slug ?? null,
    faqTopic: row.faqTopic,
    updatedAt: row.updatedAt,
    blocks: row.sections
      .map((section) => parseBlock({ id: section.id, type: section.type, data: section.data }))
      .filter((block): block is ParsedBlock => block !== null),
  };
});

/** Slugs of every published page, for `generateStaticParams` and the sitemap. */
export const getPublishedPageSlugs = cache(
  cached(
    async () => {
      return prisma.page.findMany({
        where: { status: "PUBLISHED", deletedAt: null },
        select: { slug: true, updatedAt: true },
        orderBy: { slug: "asc" },
      });
    },
    ["cms-page-slugs"],
    [tags.pages],
    60,
  ),
);

/**
 * Slugs of pages the CMS holds but does not serve — drafts and archived pages.
 *
 * The sitemap needs these to avoid advertising a path that 404s. A navigation
 * link outlives the page it points at: unpublishing a page does not remove the
 * menu entry, and the sitemap draws on the navigation as well as on the page
 * list, so without this an archived page stayed listed through its own menu
 * link.
 */
export const getUnservedPageSlugs = cache(
  cached(
    async () => {
      const rows = await prisma.page.findMany({
        where: { OR: [{ status: { not: "PUBLISHED" } }, { deletedAt: { not: null } }] },
        select: { slug: true },
      });
      return rows.map((row) => row.slug);
    },
    ["cms-unserved-page-slugs"],
    [tags.pages],
    60,
  ),
);
