import "server-only";
import { cache } from "react";
import { prisma } from "@/lib/db";
import { cached } from "@/lib/queries/cached";
import { tags } from "@/lib/cache";

/**
 * Brands, services, articles and FAQ reads shared across the public site.
 *
 * Each read is wrapped in `cached()` under the tags it depends on, so a write
 * that invalidates a tag refreshes every page that used the data — not only the
 * pages a mutation happened to name. The outer React `cache()` deduplicates
 * within a single render; the inner `cached()` persists across requests.
 *
 * Reads that are already cheap and highly specific (a grouped count for one
 * brand, related posts for one article) are left uncached: they are only
 * reached from a page that is itself cached by the tags above.
 */

export const getBrands = cache(
  cached(
    async () => {
      return prisma.brand.findMany({
        where: { deletedAt: null },
        orderBy: { displayOrder: "asc" },
        // The partner reference is internal. Omitted at the query rather than
        // at the component, so it cannot reach a client component's payload by
        // somebody passing the row one level further down than expected.
        omit: { partnerReference: true },
        include: {
          _count: { select: { products: { where: { status: "ACTIVE", deletedAt: null } } } },
        },
      });
    },
    ["brands-all"],
    // Depends on the catalogue too: the product count changes when products do.
    [tags.brands, tags.catalogue],
  ),
);

export const getBrandBySlug = cache(
  cached(
    async (slug: string) => {
      return prisma.brand.findFirst({
        where: { slug, deletedAt: null },
        omit: { partnerReference: true },
        include: { faqs: { orderBy: { displayOrder: "asc" } } },
      });
    },
    ["brand-by-slug"],
    [tags.brands, tags.faqs],
  ),
);

/**
 * What this brand's catalogue rows actually are: licences, machines, or both.
 *
 * Written for the brand page's title and meta description, which used to say
 * "{Brand} Licensing & Solutions" for all forty brands — including Lenovo, Acer
 * and Intel, who do not license anything to anybody. A page title is a claim,
 * and that one was wrong on a third of these pages.
 *
 * This counts rows in the catalogue rather than reading `BrandSegment`, which
 * is a note about where a brand sits in the market and not a statement about
 * what is listed. The count is: if there are licences here, "licensing" is a
 * true word for this page; if there are machines, so is "hardware".
 */
export const getBrandCatalogueShape = cache(
  cached(
    async (brandId: string) => {
      const [licences, hardware] = await Promise.all([
        prisma.product.count({
          where: { brandId, status: "ACTIVE", deletedAt: null, formFactor: null },
        }),
        prisma.product.count({
          where: { brandId, status: "ACTIVE", deletedAt: null, formFactor: { not: null } },
        }),
      ]);
      return { licences, hardware };
    },
    ["brand-catalogue-shape"],
    [tags.catalogue],
  ),
);

/** Categories that actually contain products for a given brand. */
export async function getBrandCategories(brandId: string) {
  const grouped = await prisma.product.groupBy({
    by: ["categoryId"],
    where: { brandId, status: "ACTIVE", deletedAt: null },
    _count: { _all: true },
  });
  if (grouped.length === 0) return [];

  const categories = await prisma.category.findMany({
    where: { id: { in: grouped.map((group) => group.categoryId) } },
    select: { id: true, slug: true, name: true, summary: true },
    orderBy: { displayOrder: "asc" },
  });

  return categories.map((category) => ({
    ...category,
    count: grouped.find((group) => group.categoryId === category.id)?._count._all ?? 0,
  }));
}

export const getServices = cache(
  cached(
    async () => {
      return prisma.service.findMany({
        where: { published: true, deletedAt: null },
        orderBy: { displayOrder: "asc" },
      });
    },
    ["services-all"],
    [tags.services],
  ),
);

export const getServiceBySlug = cache(
  cached(
    async (slug: string) => {
      return prisma.service.findFirst({
        where: { slug, published: true, deletedAt: null },
        include: { faqs: { orderBy: { displayOrder: "asc" } } },
      });
    },
    ["service-by-slug"],
    [tags.services, tags.faqs],
  ),
);

export type ServiceProcessStep = { step: number; title: string; description: string };

/** `process` is stored as JSON; validate its shape before rendering. */
export function parseProcess(value: unknown): ServiceProcessStep[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (entry): entry is ServiceProcessStep =>
      typeof entry === "object" &&
      entry !== null &&
      typeof (entry as ServiceProcessStep).step === "number" &&
      typeof (entry as ServiceProcessStep).title === "string" &&
      typeof (entry as ServiceProcessStep).description === "string",
  );
}

export const getPublishedPosts = cache(
  cached(
    async (options: { limit?: number; category?: string } = {}) => {
      return prisma.blogPost.findMany({
        where: {
          status: "PUBLISHED",
          deletedAt: null,
          publishedAt: { lte: new Date() },
          ...(options.category ? { category: options.category } : {}),
        },
        orderBy: { publishedAt: "desc" },
        take: options.limit,
        select: {
          slug: true,
          title: true,
          excerpt: true,
          category: true,
          tags: true,
          readMinutes: true,
          publishedAt: true,
          updatedAt: true,
        },
      });
    },
    ["posts-published"],
    [tags.posts],
    // Shorter window than the default: a post scheduled for a future date must
    // appear without waiting for someone to publish something else.
    300,
  ),
);

export const getPostBySlug = cache(
  cached(
    async (slug: string) => {
      return prisma.blogPost.findFirst({
        where: { slug, status: "PUBLISHED", deletedAt: null, publishedAt: { lte: new Date() } },
        include: { author: { select: { name: true } } },
      });
    },
    ["post-by-slug"],
    [tags.posts],
    300,
  ),
);

export async function getPostCategories() {
  const grouped = await prisma.blogPost.groupBy({
    by: ["category"],
    where: { status: "PUBLISHED", deletedAt: null },
    _count: { _all: true },
    orderBy: { category: "asc" },
  });
  return grouped.map((group) => ({ name: group.category, count: group._count._all }));
}

export async function getRelatedPosts(slug: string, category: string, limit = 3) {
  return prisma.blogPost.findMany({
    where: {
      status: "PUBLISHED",
      deletedAt: null,
      slug: { not: slug },
      publishedAt: { lte: new Date() },
    },
    orderBy: [{ category: category ? "asc" : "desc" }, { publishedAt: "desc" }],
    take: limit,
    select: {
      slug: true,
      title: true,
      excerpt: true,
      category: true,
      readMinutes: true,
      publishedAt: true,
    },
  });
}

export const getFaqsByTopic = cache(
  cached(
    async (topic: string) => {
      return prisma.faq.findMany({
        where: { topic },
        orderBy: { displayOrder: "asc" },
        select: { question: true, answer: true },
      });
    },
    ["faqs-by-topic"],
    [tags.faqs],
  ),
);

/**
 * FAQs attached to a brand.
 *
 * The landing route previously hand-rolled this Prisma call, which meant it was
 * the one FAQ read with no caching and no shared definition.
 */
export const getFaqsByBrandSlug = cache(
  cached(
    async (brandSlug: string) => {
      return prisma.faq.findMany({
        where: { brand: { slug: brandSlug } },
        orderBy: { displayOrder: "asc" },
        select: { question: true, answer: true },
      });
    },
    ["faqs-by-brand"],
    [tags.faqs, tags.brands],
  ),
);
