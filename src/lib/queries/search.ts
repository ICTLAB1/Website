import "server-only";
import { prisma } from "@/lib/db";
import { publicVariantWhere } from "@/lib/catalogue/audience";

/**
 * Site-wide search across products, brands, services and articles.
 *
 * Matching uses parameterised Prisma `contains` filters against indexed
 * columns; the query string is never concatenated into SQL.
 *
 * `contains` emits `LIKE '%term%'`, which no B-tree can serve. `Product` and
 * `Faq` therefore carry trigram (GIN) indexes — see the
 * `20260821070000_search_trigram_index` migration for the measurements. Brands
 * and services are bounded by the business and are left to scan.
 */

export type SearchResult = {
  type: "product" | "brand" | "service" | "article" | "faq";
  title: string;
  subtitle: string;
  href: string;
  badge?: string;
};

/** Strips characters that add nothing to matching and caps the length. */
export function normaliseQuery(raw: string | null | undefined): string {
  return (raw ?? "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s.+#-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 100);
}

export async function searchProducts(term: string, limit = 8) {
  if (!term) return [];
  return prisma.product.findMany({
    where: {
      status: "ACTIVE",
      deletedAt: null,
      // `searchText` already folds in every SKU (see src/lib/search-text.ts),
      // so this single indexed predicate covers SKU lookups too. There used to
      // be a second `variants.some.sku` clause beside it; it joined to
      // `ProductVariant` and could not use the trigram index, and checking all
      // 75 SKUs in the catalogue found it returned nothing the haystack missed.
      searchText: { contains: term },
    },
    select: {
      slug: true,
      name: true,
      shortDescription: true,
      popularity: true,
      formFactor: true,
      brand: { select: { name: true } },
      variants: {
        where: publicVariantWhere,
        orderBy: [{ isDefault: "desc" }],
        take: 1,
        select: { sku: true, listPriceMinor: true, salePriceMinor: true, currency: true },
      },
    },
    orderBy: [{ popularity: "desc" }, { name: "asc" }],
    take: limit,
  });
}

export async function searchAll(term: string): Promise<{
  products: SearchResult[];
  brands: SearchResult[];
  services: SearchResult[];
  articles: SearchResult[];
  faqs: SearchResult[];
  total: number;
}> {
  if (!term) {
    return { products: [], brands: [], services: [], articles: [], faqs: [], total: 0 };
  }

  const [products, brands, services, articles, faqs] = await Promise.all([
    searchProducts(term, 12),
    prisma.brand.findMany({
      where: {
        deletedAt: null,
        OR: [{ name: { contains: term, mode: "insensitive" } }, { summary: { contains: term, mode: "insensitive" } }],
      },
      select: { slug: true, name: true, tagline: true },
      take: 6,
    }),
    prisma.service.findMany({
      where: {
        published: true,
        deletedAt: null,
        OR: [
          { name: { contains: term, mode: "insensitive" } },
          { summary: { contains: term, mode: "insensitive" } },
          { category: { contains: term, mode: "insensitive" } },
        ],
      },
      select: { slug: true, name: true, summary: true, category: true },
      take: 8,
    }),
    prisma.blogPost.findMany({
      where: {
        status: "PUBLISHED",
        deletedAt: null,
        OR: [
          { title: { contains: term, mode: "insensitive" } },
          { excerpt: { contains: term, mode: "insensitive" } },
          { category: { contains: term, mode: "insensitive" } },
          { tags: { has: term } },
        ],
      },
      select: { slug: true, title: true, excerpt: true, category: true },
      orderBy: { publishedAt: "desc" },
      take: 8,
    }),
    prisma.faq.findMany({
      where: {
        OR: [
          { question: { contains: term, mode: "insensitive" } },
          { answer: { contains: term, mode: "insensitive" } },
        ],
      },
      select: {
        question: true,
        answer: true,
        topic: true,
        product: { select: { slug: true } },
        brand: { select: { slug: true } },
        service: { select: { slug: true } },
      },
      take: 6,
    }),
  ]);

  const productResults: SearchResult[] = products.map((product) => ({
    type: "product",
    title: product.name,
    subtitle: product.shortDescription,
    href: `/products/${product.slug}`,
    badge: product.brand.name,
  }));

  const brandResults: SearchResult[] = brands.map((brand) => ({
    type: "brand",
    title: brand.name,
    subtitle: brand.tagline ?? "",
    href: `/brands/${brand.slug}`,
    badge: "Brand",
  }));

  const serviceResults: SearchResult[] = services.map((service) => ({
    type: "service",
    title: service.name,
    subtitle: service.summary,
    href: `/services/${service.slug}`,
    badge: service.category,
  }));

  const articleResults: SearchResult[] = articles.map((post) => ({
    type: "article",
    title: post.title,
    subtitle: post.excerpt,
    href: `/blog/${post.slug}`,
    badge: post.category,
  }));

  const faqResults: SearchResult[] = faqs.map((faq) => ({
    type: "faq",
    title: faq.question,
    subtitle: faq.answer.slice(0, 160),
    href: faq.product
      ? `/products/${faq.product.slug}#faq`
      : faq.brand
        ? `/brands/${faq.brand.slug}#faq`
        : faq.service
          ? `/services/${faq.service.slug}#faq`
          : "/support",
    badge: "FAQ",
  }));

  return {
    products: productResults,
    brands: brandResults,
    services: serviceResults,
    articles: articleResults,
    faqs: faqResults,
    total:
      productResults.length +
      brandResults.length +
      serviceResults.length +
      articleResults.length +
      faqResults.length,
  };
}
