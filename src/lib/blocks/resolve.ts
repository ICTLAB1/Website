import "server-only";
import { prisma } from "@/lib/db";
import { cached } from "@/lib/queries/cached";
import { tags } from "@/lib/cache";
import { productListSelect, type ProductListItem } from "@/lib/queries/catalogue";
import { getFaqsByBrandSlug, getFaqsByTopic } from "@/lib/queries/content";
import { publishedTestimonials } from "@/lib/queries/reviews";
import { publishedClientLogos } from "@/lib/queries/client-logos";
import { publishedIndustries } from "@/lib/queries/industries";
import type { ParsedBlock } from "@/lib/blocks/schemas";

/** One row as `publishedTestimonials` returns it. */
export type PublishedTestimonial = Awaited<ReturnType<typeof publishedTestimonials>>[number];

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
  /**
   * Testimonials per block. Read here rather than in the component for the
   * same reason as products and FAQs — the renderer is synchronous, and a
   * block that fetched its own data would fetch it once per render.
   */
  testimonials: Map<string, PublishedTestimonial[]>;
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

/**
 * The products a comparison names, in the order it names them.
 *
 * Its own function rather than a call into `productsFor`, because the ordering
 * rule is different and it matters: a grid renders whatever the author listed,
 * while a comparison must put the subject first and the alternatives after it —
 * a comparison whose columns silently reordered would still read as a
 * comparison and say something else.
 *
 * Missing rows are dropped, as they are for a grid. A named product may have
 * been archived since the page was written, and the renderer says so rather
 * than showing a column with a hole in it.
 */
async function comparisonFor(
  block: Extract<ParsedBlock, { type: "PRICE_COMPARISON" }>,
): Promise<ProductListItem[]> {
  const slugs = [block.data.ourSlug, ...block.data.againstSlugs].filter(Boolean);
  if (slugs.length === 0) return [];

  const rows = await prisma.product.findMany({
    where: { status: "ACTIVE", deletedAt: null, slug: { in: slugs } },
    select: productListSelect,
  });

  return slugs
    .map((slug) => rows.find((row) => row.slug === slug))
    .filter((row): row is ProductListItem => row !== undefined);
}

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
        /*
         * The issuer, the validity dates and the verification address are not
         * selected. They are still on the record and still editable, but the
         * owner asked for them off the site — and a field that is not fetched
         * cannot be put back on a page by an edit that was not thinking about
         * that decision. The row's id is the key, so the
         * number need not travel either.
         */
        select: { id: true, standard: true, title: true, scope: true },
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

/**
 * The marks a marquee rides.
 *
 * `withLogo` filters on the column rather than trusting `displayOrder` to have
 * put the illustrated brands first, because the belt's whole premise is
 * artwork: a brand with no file on file renders the lettered wordmark, and a
 * strip of moving coloured initials is not a logo strip, it is a bug that
 * looks like a decision.
 *
 * Nothing here can widen a partner claim. The rows carry a name, a slug and a
 * mark; the heading above them is authored copy, and what a brand relationship
 * may be *called* publicly is decided in `lib/brand-partner`, not by which
 * brands happen to have a PNG.
 */
async function marqueeFor(
  block: Extract<ParsedBlock, { type: "LOGO_MARQUEE" }>,
): Promise<unknown[]> {
  /*
   * Customers are not brands and do not come from the same table. The query is
   * the only one entitled to release a customer's mark — it applies the
   * permission rule itself — so this branch hands the whole decision to it
   * rather than assembling a `where` clause here that could drift from it.
   */
  if (block.data.source === "clients") {
    const clients = await publishedClientLogos();
    return clients.slice(0, block.data.limit);
  }

  const select = { slug: true, name: true, accentColor: true, logoUrl: true };
  const base = { deletedAt: null };

  if (block.data.source === "manual") {
    const slugs = block.data.slugs.filter(Boolean);
    if (slugs.length === 0) return [];
    const rows = await prisma.brand.findMany({
      where: { ...base, slug: { in: slugs } },
      select,
    });
    // The author's order, which `in` does not preserve.
    return slugs
      .map((slug) => rows.find((row) => row.slug === slug))
      .filter((row) => row !== undefined);
  }

  return prisma.brand.findMany({
    where: block.data.source === "withLogo" ? { ...base, NOT: { logoUrl: null } } : base,
    orderBy: { displayOrder: "asc" },
    take: block.data.limit,
    select,
  });
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
  const testimonials = new Map<string, PublishedTestimonial[]>();

  // Both STAT_BAR and a hero carrying statistics can request live counts.
  const needsCounts = blocks.some(
    (block) =>
      (block.type === "STAT_BAR" && block.data.items.some((item) => item.source !== "literal")) ||
      (block.type === "HERO" && block.data.stats.some((item) => item.source !== "literal")),
  );

  await Promise.all([
    ...blocks.map(async (block) => {
      if (block.type === "PRODUCT_GRID") products.set(block.id, await productsFor(block));
      else if (block.type === "PRICE_COMPARISON") products.set(block.id, await comparisonFor(block));
      else if (block.type === "COLLECTION_GRID") collections.set(block.id, await collectionFor(block));
      else if (block.type === "LOGO_MARQUEE") collections.set(block.id, await marqueeFor(block));
      else if (block.type === "INDUSTRY_GRID")
        collections.set(block.id, (await publishedIndustries()).slice(0, block.data.limit));
      else if (block.type === "FAQ") faqs.set(block.id, await faqsFor(block, page));
      else if (block.type === "TESTIMONIALS") {
        /*
         * Both sources read the same published-and-consented set; "featured"
         * simply narrows it. Nothing here can reach a quote without a consent
         * date, because `publishedTestimonials` will not return one.
         */
        const all = await publishedTestimonials();
        const chosen = block.data.source === "featured" ? all.slice(0, block.data.limit) : all;
        testimonials.set(block.id, chosen.slice(0, block.data.limit));
      }
    }),
  ]);

  return {
    products,
    collections,
    faqs,
    testimonials,
    counts: needsCounts
      ? await getCounts()
      : { productCount: 0, skuCount: 0, brandCount: 0, categoryCount: 0 },
  };
}
