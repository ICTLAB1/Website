import "server-only";
import { cache } from "react";
import type { Availability, LicenceType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

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
  brand: { select: { slug: true, name: true, accentColor: true } },
  category: { select: { slug: true, name: true } },
  variants: {
    where: { deletedAt: null },
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

  if (filters.category?.length) {
    // Matching a parent category must also return everything beneath it.
    where.OR = [
      { category: { slug: { in: filters.category } } },
      { category: { parent: { slug: { in: filters.category } } } },
    ];
  }

  const licenceTypes = asLicenceTypes(filters.licenceType);
  const availabilities = asAvailabilities(filters.availability);
  if (availabilities.length) where.availability = { in: availabilities };

  const variantConditions: Prisma.ProductVariantWhereInput = { deletedAt: null };
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

  if (Object.keys(variantConditions).length > 1) {
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

/** Facet counts for the catalogue sidebar, computed against the active filters. */
export async function getFacets() {
  const [brandGroups, categories, licenceGroups] = await Promise.all([
    prisma.product.groupBy({
      by: ["brandId"],
      where: { status: "ACTIVE", deletedAt: null },
      _count: { _all: true },
    }),
    prisma.category.findMany({
      where: { deletedAt: null, parentId: null },
      orderBy: { displayOrder: "asc" },
      select: {
        slug: true,
        name: true,
        _count: { select: { products: { where: { status: "ACTIVE", deletedAt: null } } } },
        children: {
          where: { deletedAt: null },
          orderBy: { displayOrder: "asc" },
          select: {
            slug: true,
            name: true,
            _count: { select: { products: { where: { status: "ACTIVE", deletedAt: null } } } },
          },
        },
      },
    }),
    prisma.productVariant.groupBy({
      by: ["licenceType"],
      where: { deletedAt: null, product: { status: "ACTIVE", deletedAt: null } },
      _count: { _all: true },
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
      .map((group) => ({ value: group.licenceType, count: group._count._all }))
      .sort((a, b) => b.count - a.count),
  };
}

export const getProductBySlug = cache(async (slug: string) => {
  return prisma.product.findFirst({
    where: { slug, status: "ACTIVE", deletedAt: null },
    include: {
      brand: true,
      category: { include: { parent: true } },
      variants: {
        where: { deletedAt: null },
        orderBy: [{ isDefault: "desc" }, { listPriceMinor: "asc" }],
      },
      faqs: { orderBy: { displayOrder: "asc" } },
    },
  });
});

export async function getRelatedProducts(
  productId: string,
  categoryId: string,
  brandId: string,
  limit = 4,
): Promise<ProductListItem[]> {
  const sameCategory = await prisma.product.findMany({
    where: { status: "ACTIVE", deletedAt: null, categoryId, id: { not: productId } },
    select: productListSelect,
    orderBy: [{ featured: "desc" }, { popularity: "desc" }],
    take: limit,
  });
  if (sameCategory.length >= limit) return sameCategory;

  const seen = new Set([productId, ...sameCategory.map((product) => product.id)]);
  const sameBrand = await prisma.product.findMany({
    where: { status: "ACTIVE", deletedAt: null, brandId, id: { notIn: [...seen] } },
    select: productListSelect,
    orderBy: [{ popularity: "desc" }],
    take: limit - sameCategory.length,
  });
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

export const getAllProductSlugs = cache(async () => {
  return prisma.product.findMany({
    where: { status: "ACTIVE", deletedAt: null },
    select: { slug: true, updatedAt: true },
    orderBy: { name: "asc" },
  });
});
