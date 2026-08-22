import "server-only";
import { prisma } from "@/lib/db";
import { cached } from "@/lib/queries/cached";
import { tags } from "@/lib/cache";
import { productListSelect, type ProductListItem } from "@/lib/queries/catalogue";
import { getFaqsByBrandSlug, getFaqsByTopic } from "@/lib/queries/content";
import type { ParsedBlock } from "@/lib/blocks/schemas";

/**
 * Resolves the live data a page's blocks need.
 *
 * Blocks store references — a product slug, a brand slug, "featured" — never
 * copies. That is what keeps a marketing page honest: the price on a landing
 * page is the catalogue price because it is read from the catalogue at render
 * time, not transcribed into the page when someone wrote it.
 *
 * Everything is gathered in one pass per page so a page with several product
 * blocks issues a handful of queries rather than one per block.
 */

export type ResolvedBlockData = {
  products: Map<string, ProductListItem[]>;
  collections: Map<string, unknown[]>;
  faqs: Map<string, Array<{ question: string; answer: string }>>;
  counts: {
    productCount: number;
    skuCount: number;
    brandCount: number;
    categoryCount: number;
  };
};

const getCounts = cached(
  async () => {
    const [productCount, skuCount, brandCount, categoryCount] = await Promise.all([
      prisma.product.count({ where: { status: "ACTIVE", deletedAt: null } }),
      prisma.productVariant.count({ where: { deletedAt: null } }),
      prisma.brand.count({ where: { deletedAt: null } }),
      prisma.category.count({ where: { deletedAt: null } }),
    ]);
    return { productCount, skuCount, brandCount, categoryCount };
  },
  ["block-counts"],
  [tags.catalogue, tags.brands, tags.categories],
);

async function productsFor(
  block: Extract<ParsedBlock, { type: "PRODUCT_GRID" }>,
): Promise<ProductListItem[]> {
  const base = { status: "ACTIVE" as const, deletedAt: null };

  switch (block.data.source) {
    case "manual": {
      const slugs = block.data.slugs.filter(Boolean);
      if (slugs.length === 0) return [];
      const rows = await prisma.product.findMany({
        where: { ...base, slug: { in: slugs } },
        select: productListSelect,
      });
      // Preserve the order the author chose, which `in` does not guarantee.
      return slugs
        .map((slug) => rows.find((row) => row.slug === slug))
        .filter((row): row is ProductListItem => row !== undefined);
    }
    case "featured":
      return prisma.product.findMany({
        where: { ...base, featured: true },
        orderBy: { popularity: "desc" },
        take: block.data.limit,
        select: productListSelect,
      });
    case "popular":
      return prisma.product.findMany({
        where: base,
        orderBy: { popularity: "desc" },
        take: block.data.limit,
        select: productListSelect,
      });
    case "brand":
      if (!block.data.ref) return [];
      return prisma.product.findMany({
        where: { ...base, brand: { slug: block.data.ref } },
        orderBy: { popularity: "desc" },
        take: block.data.limit,
        select: productListSelect,
      });
    case "category":
      if (!block.data.ref) return [];
      return prisma.product.findMany({
        where: {
          ...base,
          OR: [
            { category: { slug: block.data.ref } },
            { category: { parent: { slug: block.data.ref } } },
          ],
        },
        orderBy: { popularity: "desc" },
        take: block.data.limit,
        select: productListSelect,
      });
  }
}

async function collectionFor(
  block: Extract<ParsedBlock, { type: "COLLECTION_GRID" }>,
): Promise<unknown[]> {
  const take = block.data.limit;

  switch (block.data.kind) {
    case "brands":
      return prisma.brand.findMany({
        where: { deletedAt: null },
        orderBy: { displayOrder: "asc" },
        take,
        select: {
          slug: true,
          name: true,
          tagline: true,
          accentColor: true,
          logoUrl: true,
          _count: { select: { products: { where: { status: "ACTIVE", deletedAt: null } } } },
        },
      });
    case "categories":
      return prisma.category.findMany({
        where: { deletedAt: null, featured: true },
        orderBy: { displayOrder: "asc" },
        take,
        select: {
          slug: true,
          name: true,
          summary: true,
          icon: true,
          _count: { select: { products: { where: { status: "ACTIVE", deletedAt: null } } } },
        },
      });
    case "services":
      // Featured only, matching the `categories` rule above: a grid on a
      // landing page is a curated selection, and the full list has its own
      // index page.
      return prisma.service.findMany({
        where: { published: true, deletedAt: null, featured: true },
        orderBy: { displayOrder: "asc" },
        take,
        select: { slug: true, name: true, summary: true, category: true },
      });
    case "certifications":
      /*
       * Expired certificates are not returned.
       *
       * The whole reason these are rows rather than page copy: a certificate
       * lapses on a date, and a claim in a paragraph does not know that. The
       * filter is here, in the one place every page reads them from, so no
       * page can display a lapsed one by forgetting to check.
       *
       * A null expiry is shown — some certificates carry none — which is why
       * the column is nullable rather than defaulted to a date nobody checked.
       */
      return prisma.certification.findMany({
        where: { OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
        orderBy: [{ displayOrder: "asc" }, { standard: "asc" }],
        take,
        select: {
          standard: true,
          title: true,
          reference: true,
          issuer: true,
          verifyUrl: true,
          scope: true,
          issuedAt: true,
          expiresAt: true,
        },
      });
    case "postCategories": {
      // Grouped rather than listed: the chip carries the article count, so the
      // aggregate is the whole payload.
      const groups = await prisma.blogPost.groupBy({
        by: ["category"],
        where: { status: "PUBLISHED", deletedAt: null, publishedAt: { lte: new Date() } },
        _count: { _all: true },
        orderBy: { category: "asc" },
      });
      return groups
        .slice(0, take)
        .map((group) => ({ name: group.category, count: group._count._all }));
    }
    case "posts":
      return prisma.blogPost.findMany({
        where: { status: "PUBLISHED", deletedAt: null, publishedAt: { lte: new Date() } },
        orderBy: { publishedAt: "desc" },
        take,
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
}

async function faqsFor(
  block: Extract<ParsedBlock, { type: "FAQ" }>,
  page: { brandSlug: string | null; faqTopic: string | null },
): Promise<Array<{ question: string; answer: string }>> {
  switch (block.data.source) {
    case "manual":
      return block.data.items;
    case "brand": {
      const slug = block.data.ref ?? page.brandSlug;
      return slug ? getFaqsByBrandSlug(slug) : [];
    }
    case "topic": {
      const topic = block.data.ref ?? page.faqTopic;
      return topic ? getFaqsByTopic(topic) : [];
    }
    case "page": {
      // Whatever the page itself is attached to, plus any inline items.
      const [brand, topic] = await Promise.all([
        page.brandSlug ? getFaqsByBrandSlug(page.brandSlug) : Promise.resolve([]),
        page.faqTopic ? getFaqsByTopic(page.faqTopic) : Promise.resolve([]),
      ]);
      return [...block.data.items, ...topic, ...brand];
    }
  }
}

export async function resolveBlocks(
  blocks: ParsedBlock[],
  page: { brandSlug: string | null; faqTopic: string | null },
): Promise<ResolvedBlockData> {
  const products = new Map<string, ProductListItem[]>();
  const collections = new Map<string, unknown[]>();
  const faqs = new Map<string, Array<{ question: string; answer: string }>>();

  // Both STAT_BAR and a hero carrying statistics can request live counts.
  const needsCounts = blocks.some(
    (block) =>
      (block.type === "STAT_BAR" && block.data.items.some((item) => item.source !== "literal")) ||
      (block.type === "HERO" && block.data.stats.some((item) => item.source !== "literal")),
  );

  await Promise.all([
    ...blocks.map(async (block) => {
      if (block.type === "PRODUCT_GRID") products.set(block.id, await productsFor(block));
      else if (block.type === "COLLECTION_GRID") collections.set(block.id, await collectionFor(block));
      else if (block.type === "FAQ") faqs.set(block.id, await faqsFor(block, page));
    }),
  ]);

  return {
    products,
    collections,
    faqs,
    counts: needsCounts
      ? await getCounts()
      : { productCount: 0, skuCount: 0, brandCount: 0, categoryCount: 0 },
  };
}
