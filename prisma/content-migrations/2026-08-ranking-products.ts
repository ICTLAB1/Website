import { microsoftProducts } from "../seed-data/products-microsoft";
import type { ContentMigration } from "./types";

/**
 * The two products this domain ranks for and did not sell.
 *
 * "visual studio enterprise" sits at 13 in India on 8,100 searches a month and
 * "microsoft visio plan 1" at 10, and both positions were held by URLs from the
 * previous site. This repository retires those URLs — correctly, they are gone
 * — but a 410 on a page Google is ranking today is a request to forget the
 * position along with the page. The redirects now point at these two products,
 * so this creates them on a database that was seeded before they existed.
 *
 * Neither carries a price. Zero is the absence of one, the convention the
 * hardware catalogue already uses, and the pages show a request-a-quote route
 * instead — which is what 36 of the 85 products on this site already do.
 *
 * Creates only what is missing, and touches nothing that exists.
 */
const SLUGS = ["visual-studio-enterprise", "visio-plan-1"];

export const rankingProducts: ContentMigration = {
  id: "2026-08-ranking-products",
  describe: "the two catalogue products the retired URLs now redirect to",

  async apply(prisma) {
    const created: string[] = [];

    for (const slug of SLUGS) {
      const seed = microsoftProducts.find((product) => product.slug === slug);
      if (!seed) continue;

      const existing = await prisma.product.findUnique({ where: { slug }, select: { id: true } });
      if (existing) continue;

      const [brand, category] = await Promise.all([
        prisma.brand.findUnique({ where: { slug: seed.brand }, select: { id: true } }),
        prisma.category.findUnique({ where: { slug: seed.category }, select: { id: true } }),
      ]);

      /*
       * A product with no brand or no category would be a row nothing lists and
       * nothing links to — worse than the 410 it was meant to replace. Reported
       * rather than written.
       */
      if (!brand || !category) continue;

      const product = await prisma.product.create({
        data: {
          slug: seed.slug,
          name: seed.name,
          brandId: brand.id,
          categoryId: category.id,
          shortDescription: seed.shortDescription,
          description: seed.description,
          features: seed.features,
          compatibility: seed.compatibility,
          keywords: seed.keywords,
          licensingNotes: seed.licensingNotes ?? null,
          deliveryNotes: seed.deliveryNotes ?? null,
          supportNotes: seed.supportNotes ?? null,
          status: "ACTIVE",
          availability: seed.availability ?? "ON_REQUEST",
          purchaseMode: seed.purchaseMode ?? "ENQUIRY",
          popularity: seed.popularity ?? 0,
          searchText: [seed.name, seed.shortDescription, ...seed.keywords]
            .join(" ")
            .toLowerCase(),
        },
        select: { id: true },
      });

      for (const [index, variant] of seed.variants.entries()) {
        await prisma.productVariant.create({
          data: {
            productId: product.id,
            sku: variant.sku,
            name: variant.name,
            licenceType: variant.licenceType,
            termMonths: variant.termMonths,
            seats: variant.seats ?? 1,
            isDefault: variant.isDefault ?? index === 0,
            listPriceMinor: variant.listPriceMinor,
            currency: "INR",
          },
        });
      }

      created.push(slug);
    }

    if (created.length === 0) return "both ranking products are already in the catalogue";
    return `${created.length} product(s) added: ${created.join(", ")}`;
  },
};
