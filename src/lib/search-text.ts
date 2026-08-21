import "server-only";
import { prisma } from "@/lib/db";

/**
 * Maintenance of `Product.searchText`.
 *
 * `searchText` is a denormalised lowercase haystack holding the product name,
 * its brand and category names, its keywords and every one of its SKUs. It is
 * what makes catalogue search a single indexed column scan instead of a join
 * across four tables.
 *
 * Because it copies data owned by other rows, it goes stale whenever any of
 * those change. Every write path that can invalidate it lives here, so a new
 * one cannot be added without seeing the others:
 *
 *  - the product itself is saved            -> buildSearchText
 *  - one of its variants is saved (SKU)     -> rebuildProductSearchText
 *  - a brand or category is renamed         -> rebuildSearchTextForBrand /
 *                                              rebuildSearchTextForCategory
 */

function normalise(parts: Array<string | null | undefined>): string {
  return parts
    .filter((part): part is string => Boolean(part))
    .join(" ")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 2000);
}

/** Builds the haystack for a product that may not exist yet. */
export async function buildSearchText(input: {
  name: string;
  brandId: string;
  categoryId: string;
  keywords: string[];
  shortDescription: string;
  productId?: string;
}): Promise<string> {
  const [brand, category, variants] = await Promise.all([
    prisma.brand.findUnique({ where: { id: input.brandId }, select: { name: true } }),
    prisma.category.findUnique({ where: { id: input.categoryId }, select: { name: true } }),
    input.productId
      ? prisma.productVariant.findMany({
          where: { productId: input.productId, deletedAt: null },
          select: { sku: true },
        })
      : Promise.resolve([]),
  ]);

  return normalise([
    input.name,
    brand?.name,
    category?.name,
    input.shortDescription,
    ...input.keywords,
    ...variants.map((variant) => variant.sku),
  ]);
}

/**
 * Rebuilds one existing product's haystack from its current related rows.
 * Used after a variant changes, where the product's own fields are untouched
 * but its SKU list is not.
 */
export async function rebuildProductSearchText(productId: string): Promise<void> {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: {
      name: true,
      shortDescription: true,
      keywords: true,
      brand: { select: { name: true } },
      category: { select: { name: true } },
      variants: { where: { deletedAt: null }, select: { sku: true } },
    },
  });
  if (!product) return;

  await prisma.product.update({
    where: { id: productId },
    data: {
      searchText: normalise([
        product.name,
        product.brand.name,
        product.category.name,
        product.shortDescription,
        ...product.keywords,
        ...product.variants.map((variant) => variant.sku),
      ]),
    },
  });
}

/**
 * Rebuilds every product attached to a brand or category.
 *
 * Renaming "Microsoft" to "Microsoft Corporation" would otherwise leave every
 * one of its products findable only under the old name. Brands and categories
 * are small in number and rarely renamed, so a straightforward loop is
 * appropriate; it is chunked so a large catalogue cannot hold one transaction
 * open across thousands of rows.
 */
async function rebuildFor(where: { brandId: string } | { categoryId: string }): Promise<number> {
  const products = await prisma.product.findMany({ where, select: { id: true } });

  for (const product of products) {
    await rebuildProductSearchText(product.id);
  }

  return products.length;
}

export function rebuildSearchTextForBrand(brandId: string): Promise<number> {
  return rebuildFor({ brandId });
}

export function rebuildSearchTextForCategory(categoryId: string): Promise<number> {
  return rebuildFor({ categoryId });
}
