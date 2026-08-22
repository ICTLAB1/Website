import "server-only";
import { cache } from "react";

import { prisma } from "@/lib/db";
import { cached } from "@/lib/queries/cached";
import { tags } from "@/lib/cache";
import {
  FORM_FACTORS,
  familyOf,
  formFactorLabel,
  formFactorSlug,
  type HardwareFamily,
} from "@/lib/catalogue/hardware";
import { productListSelect, type ProductListItem } from "@/lib/queries/catalogue";

/**
 * Reads for the hardware catalogue.
 *
 * Every one of these counts what is actually in the catalogue rather than
 * listing what could be. A navigation entry for a manufacturer with nothing
 * under it, or a "shop by type" tile leading to an empty page, is the kind of
 * detail that tells a procurement officer the site is a shopfront rather than a
 * catalogue — so nothing here is declared, and each list empties itself when its
 * products go.
 */

/** Manufacturers with at least one commercial model listed. */
export const getHardwareBrands = cache(
  cached(
    async () => {
      const groups = await prisma.product.groupBy({
        by: ["brandId"],
        where: { status: "ACTIVE", deletedAt: null, formFactor: { not: null } },
        _count: { _all: true },
      });
      if (groups.length === 0) return [];

      const brands = await prisma.brand.findMany({
        where: { id: { in: groups.map((group) => group.brandId) }, deletedAt: null },
        orderBy: { displayOrder: "asc" },
        select: { id: true, slug: true, name: true, logoUrl: true },
      });

      return brands.map((brand) => ({
        slug: brand.slug,
        name: brand.name,
        logoUrl: brand.logoUrl,
        count: groups.find((group) => group.brandId === brand.id)?._count._all ?? 0,
      }));
    },
    ["hardware-brands"],
    [tags.catalogue, tags.brands],
  ),
);

/** Form factors present in the catalogue, in the enum's own order. */
export const getHardwareFormFactors = cache(
  cached(
    async () => {
      const groups = await prisma.product.groupBy({
        by: ["formFactor"],
        where: { status: "ACTIVE", deletedAt: null, formFactor: { not: null } },
        _count: { _all: true },
      });

      return FORM_FACTORS.map((value) => ({
        value: formFactorSlug(value),
        label: formFactorLabel(value),
        family: familyOf(value),
        count: groups.find((group) => group.formFactor === value)?._count._all ?? 0,
      })).filter((entry) => entry.count > 0);
    },
    ["hardware-form-factors"],
    [tags.catalogue],
  ),
);

/** Whether the catalogue holds any hardware at all. */
export const hasHardware = cache(
  cached(
    async () =>
      (await prisma.product.count({
        where: { status: "ACTIVE", deletedAt: null, formFactor: { not: null } },
      })) > 0,
    ["hardware-present"],
    [tags.catalogue],
  ),
);

/**
 * A manufacturer's commercial models, grouped by series.
 *
 * Series rather than a flat list, because that is the shape of the decision on
 * a brand page: somebody arrives at Lenovo knowing they want a ThinkPad and
 * needs to see which ones there are, not an alphabetical run of forty models
 * from three families.
 */
export const getBrandHardware = cache(
  cached(
    async (brandSlug: string) => {
      const products = await prisma.product.findMany({
        where: {
          status: "ACTIVE",
          deletedAt: null,
          formFactor: { not: null },
          brand: { slug: brandSlug },
        },
        select: productListSelect,
        orderBy: [{ series: "asc" }, { popularity: "desc" }, { name: "asc" }],
        // A brand page is a shop window, not the catalogue; the listing at
        // /hardware is where an exhaustive view lives, and it paginates.
        take: 60,
      });

      const families = new Map<HardwareFamily, Map<string, ProductListItem[]>>();

      for (const product of products) {
        if (!product.formFactor) continue;
        const family = familyOf(product.formFactor);
        // "Other" rather than dropping the model: a record with no series is
        // incomplete, and hiding it makes the gap invisible to whoever could
        // fix it.
        const series = product.series ?? "Other models";

        const bySeries = families.get(family) ?? new Map<string, ProductListItem[]>();
        bySeries.set(series, [...(bySeries.get(series) ?? []), product]);
        families.set(family, bySeries);
      }

      return [...families.entries()].map(([family, bySeries]) => ({
        family,
        series: [...bySeries.entries()].map(([name, items]) => ({ name, items })),
      }));
    },
    ["brand-hardware"],
    [tags.catalogue],
  ),
);

/** A short row of models for the homepage. */
export const getFeaturedHardware = cache(
  cached(
    async (take: number = 4) =>
      prisma.product.findMany({
        where: { status: "ACTIVE", deletedAt: null, formFactor: { not: null } },
        select: productListSelect,
        orderBy: [{ featured: "desc" }, { popularity: "desc" }, { name: "asc" }],
        take,
      }),
    ["hardware-featured"],
    [tags.catalogue],
  ),
);
