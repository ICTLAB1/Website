import "server-only";
import { cache } from "react";
import { cached } from "@/lib/queries/cached";
import { tags } from "@/lib/cache";
import type { Availability, FormFactor, LicenceType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { publicVariantWhere } from "@/lib/catalogue/audience";
import type { HardwareFamily } from "@/lib/catalogue/hardware";
import {
  FORM_FACTORS,
  formFactorLabel,
  formFactorsIn,
  formFactorSlug,
  parseFormFactor,
} from "@/lib/catalogue/hardware";

/**
 * Catalogue reads.
 *
 * All filtering happens in the database with indexed columns and parameterised
 * Prisma queries - there is no raw string interpolation anywhere in this file,
 * so user-supplied filter values cannot alter query structure.
 */

export const PAGE_SIZE = 12;

export type SortOption =
  | "relevance"
  | "popular"
  | "price-asc"
  | "price-desc"
  | "name-asc"
  | "newest";

export type CatalogueFilters = {
  q?: string;
  brand?: string[];
  category?: string[];
  licenceType?: string[];
  availability?: string[];
  /** Form-factor slugs: `laptop`, `desktop-sff`. Hardware only. */
  formFactor?: string[];
  /** Manufacturer families: `EliteBook`, `ThinkPad T`. Hardware only. */
  series?: string[];
  /**
   * `laptops` or `desktops` — the two groupings the navigation is built from.
   *
   * A coarser cut than the form-factor facet, and the one a menu can express:
   * "business desktops" means towers, small form factors, mini PCs and
   * all-in-ones, and a menu item cannot list four query parameters. The
   * mapping lives in `lib/catalogue/hardware` so the menu and the filter agree.
   */
  family?: HardwareFamily;
  /**
   * Restricts the whole listing to hardware, or to software.
   *
   * Set by the route rather than by a visitor: `/hardware` is the hardware
   * catalogue and `/products` is everything. It is a separate concept from the
   * form-factor facet, which narrows within hardware.
   */
  kind?: "hardware" | "software";
  minPriceMinor?: number;
  maxPriceMinor?: number;
  sort?: SortOption;
  page?: number;
};

const LICENCE_TYPES: LicenceType[] = [
  "SUBSCRIPTION_ANNUAL",
  "SUBSCRIPTION_MONTHLY",
  "PERPETUAL",
  "VOLUME",
  "CSP",
  "OEM",
  "EDUCATION",
  "MAINTENANCE",
];

const AVAILABILITIES: Availability[] = [
  "IN_STOCK",
  "MADE_TO_ORDER",
  "ON_REQUEST",
  "DISCONTINUED",
];

/** Discards any value the client supplies that is not a known enum member. */
function asLicenceTypes(values: string[] | undefined): LicenceType[] {
  if (!values?.length) return [];
  return values.filter((value): value is LicenceType =>
    (LICENCE_TYPES as string[]).includes(value),
  );
}

function asAvailabilities(values: string[] | undefined): Availability[] {
  if (!values?.length) return [];
  return values.filter((value): value is Availability =>
    (AVAILABILITIES as string[]).includes(value),
  );
}

export const productListSelect = {
  id: true,
  slug: true,
  name: true,
  shortDescription: true,
  availability: true,
  purchaseMode: true,
  featured: true,
  popularity: true,
  createdAt: true,
  // Hardware, and null on everything else. Selected unconditionally because
  // every grid on the site renders both kinds and a card that had to be told
  // which it was holding would be told wrongly somewhere.
  series: true,
  formFactor: true,
  imageUrl: true,
  brand: { select: { slug: true, name: true, accentColor: true } },
  category: { select: { slug: true, name: true } },
  variants: {
    where: publicVariantWhere,
    orderBy: [{ isDefault: "desc" }, { listPriceMinor: "asc" }],
    select: {
      id: true,
      sku: true,
      name: true,
      licenceType: true,
      termMonths: true,
      seats: true,
      currency: true,
      listPriceMinor: true,
      salePriceMinor: true,
      gstRatePercent: true,
      isDefault: true,
    },
  },
} satisfies Prisma.ProductSelect;

export type ProductListItem = Prisma.ProductGetPayload<{ select: typeof productListSelect }>;

function buildWhere(filters: CatalogueFilters): Prisma.ProductWhereInput {
  const where: Prisma.ProductWhereInput = {
    status: "ACTIVE",
    deletedAt: null,
  };

  const term = filters.q?.trim().toLowerCase();
  if (term) {
    // `searchText` is a denormalised lowercase haystack maintained on write.
    where.searchText = { contains: term };
  }

  if (filters.brand?.length) where.brand = { slug: { in: filters.brand } };

  /*
   * Hardware is "has a form factor", not "is under the hardware category".
   * A category tree can be reorganised from the admin panel by someone with no
   * reason to know a filter depends on its shape; a form factor is a property
   * of the product itself and cannot be rearranged out from under this.
   */
  if (filters.kind === "hardware") where.formFactor = { not: null };
  if (filters.kind === "software") where.formFactor = null;

  // Narrows within hardware, so it never overrides a software restriction — a
  // form factor and "software only" together describe nothing, and silently
  // resolving that in favour of the facet would list hardware on a page whose
  // route said it would not.
  const formFactors = filters.formFactor
    ?.map((slug) => parseFormFactor(slug))
    .filter((value): value is FormFactor => value !== null);

  if (formFactors?.length && filters.kind !== "software") {
    where.formFactor = { in: formFactors };
  } else if (filters.family && filters.kind !== "software") {
    // The narrower facet wins when both are set: somebody who has clicked
    // "Mini PC" inside "Business desktops" wants mini PCs.
    where.formFactor = { in: formFactorsIn(filters.family) };
  }

  /*
   * Each filter that needs alternatives becomes its own AND group.
   *
   * Not a shared `where.OR`. Two filters writing into one OR array turn an
   * intersection into a union — pick a category and a series and you would get
   * everything in the category *plus* everything in the series, which reads as
   * a filter that widened the results. Separate groups keep it "category AND
   * series", each satisfied by any of its own alternatives.
   */
  const groups: Prisma.ProductWhereInput[] = [];

  if (filters.category?.length) {
    // Matching a parent category must also return everything beneath it.
    groups.push({
      OR: [
        { category: { slug: { in: filters.category } } },
        { category: { parent: { slug: { in: filters.category } } } },
      ],
    });
  }

  if (filters.series?.length) {
    // Series arrive as slugs because everything in the query string does, and
    // are matched case-insensitively against the manufacturer's own spelling.
    groups.push({
      OR: filters.series.map((slug) => ({
        series: { equals: slug.replace(/-/g, " "), mode: "insensitive" as const },
      })),
    });
  }

  if (groups.length) where.AND = groups;

  const licenceTypes = asLicenceTypes(filters.licenceType);
  const availabilities = asAvailabilities(filters.availability);
  if (availabilities.length) where.availability = { in: availabilities };

  /*
   * Restricted prices never satisfy a filter.
   *
   * Without the audience clause, filtering "under ₹5,000" would return a
   * product whose only match is an academic rate — a result the visitor cannot
   * buy at, listed under a price band it does not belong to for them.
   */
  const variantConditions: Prisma.ProductVariantWhereInput = { ...publicVariantWhere };
  const baseConditionCount = Object.keys(variantConditions).length;
  if (licenceTypes.length) variantConditions.licenceType = { in: licenceTypes };

  const hasMin = typeof filters.minPriceMinor === "number" && filters.minPriceMinor > 0;
  const hasMax = typeof filters.maxPriceMinor === "number" && filters.maxPriceMinor > 0;
  if (hasMin || hasMax) {
    variantConditions.listPriceMinor = {
      ...(hasMin ? { gte: filters.minPriceMinor } : {}),
      ...(hasMax ? { lte: filters.maxPriceMinor } : {}),
      // Products quoted on request carry a zero placeholder price; a price
      // filter should exclude them rather than treat them as free.
      gt: 0,
    };
  }

  // Only when a real filter was added: the base clause on its own would also
  // drop every product priced solely for a restricted audience, which belongs
  // in the catalogue even though its price is not shown.
  if (Object.keys(variantConditions).length > baseConditionCount) {
    where.variants = { some: variantConditions };
  }

  return where;
}

function buildOrderBy(sort: SortOption | undefined): Prisma.ProductOrderByWithRelationInput[] {
  switch (sort) {
    case "price-asc":
      return [{ variants: { _count: "desc" } }, { name: "asc" }];
    case "price-desc":
      return [{ name: "asc" }];
    case "name-asc":
      return [{ name: "asc" }];
    case "newest":
      return [{ createdAt: "desc" }];
    case "popular":
      return [{ popularity: "desc" }, { name: "asc" }];
    default:
      return [{ featured: "desc" }, { popularity: "desc" }, { name: "asc" }];
  }
}

/** Cheapest effective variant price, or null when the product is quote-only. */
export function lowestPriceMinor(product: ProductListItem): number | null {
  const prices = product.variants
    .map((variant) =>
      variant.salePriceMinor != null &&
      variant.salePriceMinor > 0 &&
      variant.salePriceMinor < variant.listPriceMinor
        ? variant.salePriceMinor
        : variant.listPriceMinor,
    )
    .filter((price) => price > 0);
  return prices.length ? Math.min(...prices) : null;
}

export async function listProducts(filters: CatalogueFilters): Promise<{
  items: ProductListItem[];
  total: number;
  page: number;
  totalPages: number;
}> {
  const page = Math.max(1, Math.floor(filters.page ?? 1));
  const where = buildWhere(filters);

  const priceSort = filters.sort === "price-asc" || filters.sort === "price-desc";

  if (priceSort) {
    // Price lives on the variant, so ordering by "cheapest variant" cannot be
    // expressed directly. Fetch the matching set, sort in memory, then page.
    // The catalogue is bounded (low thousands), so this stays inexpensive; if
    // it grows, add a denormalised `lowestPriceMinor` column to Product.
    const [all, total] = await Promise.all([
      prisma.product.findMany({ where, select: productListSelect, take: 2000 }),
      prisma.product.count({ where }),
    ]);
    const sorted = [...all].sort((a, b) => {
      const priceA = lowestPriceMinor(a) ?? Number.MAX_SAFE_INTEGER;
      const priceB = lowestPriceMinor(b) ?? Number.MAX_SAFE_INTEGER;
      if (priceA === priceB) return a.name.localeCompare(b.name);
      return filters.sort === "price-asc" ? priceA - priceB : priceB - priceA;
    });
    const start = (page - 1) * PAGE_SIZE;
    return {
      items: sorted.slice(start, start + PAGE_SIZE),
      total,
      page,
      totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    };
  }

  const [items, total] = await Promise.all([
    prisma.product.findMany({
      where,
      select: productListSelect,
      orderBy: buildOrderBy(filters.sort),
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.product.count({ where }),
  ]);

  return { items, total, page, totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}

/**
 * Facet counts, scoped to the catalogue being looked at.
 *
 * The scope matters more than it sounds. Counted across everything, the
 * hardware listing would offer "Subscription annual (38)" and a price band,
 * both of which return nothing there — and a facet whose count does not match
 * what clicking it returns is worse than a missing facet, because the visitor
 * concludes the search is broken rather than that the range is empty.
 */
async function getFacetsUncached(kind?: "hardware" | "software") {
  const scope: Prisma.ProductWhereInput = {
    status: "ACTIVE",
    deletedAt: null,
    ...(kind === "hardware" ? { formFactor: { not: null } } : {}),
    ...(kind === "software" ? { formFactor: null } : {}),
  };

  const [brandGroups, categories, licenceGroups, formFactorGroups, seriesGroups] = await Promise.all([
    prisma.product.groupBy({
      by: ["brandId"],
      where: scope,
      _count: { _all: true },
    }),
    prisma.category.findMany({
      where: { deletedAt: null, parentId: null },
      orderBy: { displayOrder: "asc" },
      select: {
        slug: true,
        name: true,
        _count: { select: { products: { where: scope } } },
        children: {
          where: { deletedAt: null },
          orderBy: { displayOrder: "asc" },
          select: {
            slug: true,
            name: true,
            _count: { select: { products: { where: scope } } },
          },
        },
      },
    }),
    prisma.productVariant.groupBy({
      by: ["licenceType"],
      // Restricted prices are excluded so a facet count matches the number of
      // results clicking it actually returns.
      where: { ...publicVariantWhere, product: scope },
      _count: { _all: true },
    }),
    /*
     * Hardware facets, counted from the catalogue rather than declared.
     *
     * A filter for a field nothing carries is a dead end that makes the
     * catalogue look broken, so these lists are empty until products with the
     * values exist, and the panel renders nothing for an empty list. Adding a
     * form factor to the enum therefore does not add an unusable filter — the
     * first product with it does.
     */
    prisma.product.groupBy({
      by: ["formFactor"],
      where: { ...scope, formFactor: { not: null } },
      _count: { _all: true },
    }),
    prisma.product.groupBy({
      by: ["series"],
      where: { ...scope, series: { not: null } },
      _count: { _all: true },
      orderBy: { series: "asc" },
    }),
  ]);

  const brands = await prisma.brand.findMany({
    where: { deletedAt: null },
    orderBy: { displayOrder: "asc" },
    select: { id: true, slug: true, name: true },
  });

  return {
    brands: brands.map((brand) => ({
      slug: brand.slug,
      name: brand.name,
      count: brandGroups.find((group) => group.brandId === brand.id)?._count._all ?? 0,
    })),
    categories: categories.map((category) => ({
      slug: category.slug,
      name: category.name,
      count:
        category._count.products +
        category.children.reduce((sum, child) => sum + child._count.products, 0),
      children: category.children.map((child) => ({
        slug: child.slug,
        name: child.name,
        count: child._count.products,
      })),
    })),
    licenceTypes: licenceGroups
      // HARDWARE is not a licence; see the note on the enum member. Offering it
      // beside "Perpetual" and "CSP" would invite a buyer to filter licensing by
      // a value that means the opposite.
      .filter((group) => group.licenceType !== "HARDWARE")
      .map((group) => ({ value: group.licenceType, count: group._count._all }))
      .sort((a, b) => b.count - a.count),
    formFactors: FORM_FACTORS.map((value) => ({
      value: formFactorSlug(value),
      label: formFactorLabel(value),
      count: formFactorGroups.find((group) => group.formFactor === value)?._count._all ?? 0,
    })).filter((facet) => facet.count > 0),
    series: seriesGroups
      .filter((group): group is typeof group & { series: string } => Boolean(group.series))
      .map((group) => ({
        value: group.series.toLowerCase().replace(/\s+/g, "-"),
        label: group.series,
        count: group._count._all,
      })),
  };
}

const getProductBySlugUncached = async (slug: string) => {
  return prisma.product.findFirst({
    where: { slug, status: "ACTIVE", deletedAt: null },
    include: {
      brand: true,
      category: { include: { parent: true } },
      variants: {
        where: publicVariantWhere,
        orderBy: [{ isDefault: "desc" }, { listPriceMinor: "asc" }],
      },
      faqs: { orderBy: { displayOrder: "asc" } },
      // Empty on software. Ordered here so the page never has to sort a list
      // whose order is the manufacturer's, not alphabetical — "Processor"
      // belongs above "Warranty" because that is how a spec sheet reads.
      specs: { orderBy: [{ displayOrder: "asc" }, { label: "asc" }] },
    },
  });
};

/**
 * A single product, tagged both catalogue-wide and per slug so that saving one
 * product refreshes its own page precisely without discarding every other
 * cached product.
 */
export const getProductBySlug = cache(
  cached(getProductBySlugUncached, ["product-by-slug"], [tags.catalogue]),
);

/**
 * The neighbours of a product in its category, then in its brand.
 *
 * ## Why this is a ring and not a top-four
 *
 * It used to take the four most popular siblings, ordered `featured desc,
 * popularity desc`, which reads as the obvious thing and quietly produces a
 * star: the same four products are related to *everything* in the category, and
 * a product outside that four is nobody's neighbour. Nothing on the site links
 * to it. `windows-11-pro-upgrade` was the case that surfaced it — sole member
 * of its category, so the fallback ran, and the brand's top four did not
 * include it. It sat in the sitemap reachable from no page on the site, which
 * is a URL submitted to Google with no internal signal that it matters at all.
 *
 * Twenty-two more products had exactly two inbound links for the same reason,
 * one bad edit away from the same state.
 *
 * So the order stays — it is a sensible order, and the first neighbour shown is
 * still a good one — but the window slides. Each product takes the `limit`
 * siblings that follow it in that order, wrapping past the end. Every product
 * then has `limit` outbound neighbours and is the neighbour of `limit` others,
 * so in any category of two or more nothing can be left unlinked. The ring is
 * deterministic, so the same page renders the same neighbours between deploys
 * and the link graph does not churn.
 *
 * Ordering is by id where popularity ties, so two products with the same score
 * cannot swap places between queries and break the ring.
 */
async function neighbourRing(
  productId: string,
  where: { categoryId: string } | { brandId: string },
  limit: number,
  exclude: string[],
): Promise<ProductListItem[]> {
  // Ids only: the ring has to be computed over the whole set, and the whole set
  // is what we do not want to hydrate.
  const ring = await prisma.product.findMany({
    where: { status: "ACTIVE", deletedAt: null, ...where },
    select: { id: true },
    orderBy: [{ featured: "desc" }, { popularity: "desc" }, { id: "asc" }],
  });

  const at = ring.findIndex((row) => row.id === productId);
  // A brand ring does not contain the product when the product's own category
  // already supplied some neighbours; starting at its position in the category
  // order is meaningless there, so start at the top.
  const from = at === -1 ? 0 : at + 1;

  const skip = new Set([productId, ...exclude]);
  const picked: string[] = [];
  for (let step = 0; step < ring.length && picked.length < limit; step += 1) {
    const candidate = ring[(from + step) % ring.length]?.id;
    if (!candidate || skip.has(candidate)) continue;
    skip.add(candidate);
    picked.push(candidate);
  }
  if (picked.length === 0) return [];

  const rows = await prisma.product.findMany({
    where: { id: { in: picked } },
    select: productListSelect,
  });
  // `in` does not preserve order, and the order is the whole point.
  const byId = new Map(rows.map((row) => [row.id, row]));
  return picked.map((id) => byId.get(id)).filter((row) => row !== undefined);
}

export async function getRelatedProducts(
  productId: string,
  categoryId: string,
  brandId: string,
  limit = 4,
): Promise<ProductListItem[]> {
  const sameCategory = await neighbourRing(productId, { categoryId }, limit, []);
  if (sameCategory.length >= limit) return sameCategory;

  const sameBrand = await neighbourRing(
    productId,
    { brandId },
    limit - sameCategory.length,
    sameCategory.map((product) => product.id),
  );
  return [...sameCategory, ...sameBrand];
}

export async function getFeaturedProducts(limit = 8): Promise<ProductListItem[]> {
  return prisma.product.findMany({
    where: { status: "ACTIVE", deletedAt: null, featured: true },
    select: productListSelect,
    orderBy: [{ popularity: "desc" }],
    take: limit,
  });
}

export async function getPopularProducts(limit = 8): Promise<ProductListItem[]> {
  return prisma.product.findMany({
    where: { status: "ACTIVE", deletedAt: null },
    select: productListSelect,
    orderBy: [{ popularity: "desc" }],
    take: limit,
  });
}

/** Resolves basket SKUs to live catalogue rows. Unknown SKUs are simply absent. */
export async function resolveVariantsBySku(skus: string[]) {
  if (skus.length === 0) return [];
  return prisma.productVariant.findMany({
    where: {
      sku: { in: skus },
      deletedAt: null,
      product: { status: "ACTIVE", deletedAt: null },
    },
    include: {
      product: {
        select: {
          id: true,
          slug: true,
          name: true,
          purchaseMode: true,
          brand: { select: { name: true, slug: true } },
        },
      },
    },
  });
}

/**
 * Facet counts for the catalogue sidebar.
 *
 * Aggregates across the whole catalogue, so it is cached under the catalogue
 * tag rather than recomputed per request. At several thousand products these
 * grouped counts are the most expensive query on the page, and they only move
 * when the catalogue, its brands or its categories do.
 */
export const getFacets = cache(
  cached(getFacetsUncached, ["catalogue-facets"], [tags.catalogue, tags.brands, tags.categories]),
);

export const getAllProductSlugs = cache(async () => {
  return prisma.product.findMany({
    where: { status: "ACTIVE", deletedAt: null },
    select: { slug: true, updatedAt: true },
    orderBy: { name: "asc" },
  });
});
