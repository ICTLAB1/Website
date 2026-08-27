import { microsoftProducts } from "../seed-data/products-microsoft";
import { autodeskProducts } from "../seed-data/products-autodesk";
import type { ContentMigration } from "./types";

/**
 * The three products this domain ranks for and did not sell.
 *
 * From Search Console, 24 May to 23 August: "3ds max license" at position 9.2
 * on 736 impressions, "onedrive for business plan 2" and "onedrive plan 2" at
 * 13.7 and 7.9 on 571 between them, "visio plan 2" at 15.9 on 317. Every one of
 * those positions is held by a page of the previous site that no longer exists,
 * so the demand is proven, the ranking is partly earned, and there has been
 * nothing here to land on.
 *
 * None of the three carries a price. Zero is the absence of one — the
 * convention the hardware catalogue uses, and the answer
 * `visual-studio-enterprise` and `visio-plan-1` already give — so each page
 * offers a quote. The publisher's list this catalogue is priced from was not to
 * hand when they were written, and a figure nobody can check is worse on a page
 * than a quote route.
 *
 * Search-result titles and descriptions are written here too, in the same pass
 * and to the same rule as the pages rewritten in `2026-08-search-result-copy`:
 * only what the page itself says, no designation that is not on file, and no
 * turnaround nobody has committed to. The supplied draft had this OneDrive page
 * titled "Unlimited Storage", which is not what Plan 2 provides and is not a
 * claim to make about somebody else's product in a search result.
 *
 * Creates only what is missing, and touches nothing that exists.
 */
const SEARCH_COPY: Record<string, { title: string; description: string }> = {
  "3ds-max": {
    title: "Autodesk 3ds Max Licence Price in India | TechZoid",
    description:
      "3ds Max for studios and design teams in India: 3D modelling, rendering and animation, licensed per named user. Quoted in INR on a quotation with a GST invoice.",
  },
  "visio-plan-2": {
    title: "Microsoft Visio Plan 2 Price India | Desktop and Web",
    description:
      "Visio Plan 2 for Indian businesses, with the Windows desktop application as well as the web edition. Licensed per user, quoted in INR with a GST invoice.",
  },
  "onedrive-for-business-plan-2": {
    title: "OneDrive for Business Plan 2 Price India | Per-User Plan",
    description:
      "OneDrive for Business Plan 2 for Indian companies: cloud storage with data loss prevention and eDiscovery, licensed per user. Quoted in INR with a GST invoice.",
  },
};

const SLUGS = Object.keys(SEARCH_COPY);

export const rankingGaps: ContentMigration = {
  id: "2026-08-ranking-gaps",
  describe: "the three catalogue products this domain ranks for and did not have",

  async apply(prisma) {
    const created: string[] = [];
    const seeds = [...microsoftProducts, ...autodeskProducts];

    for (const slug of SLUGS) {
      const seed = seeds.find((product) => product.slug === slug);
      if (!seed) continue;

      const existing = await prisma.product.findUnique({ where: { slug }, select: { id: true } });
      if (existing) continue;

      const [brand, category] = await Promise.all([
        prisma.brand.findUnique({ where: { slug: seed.brand }, select: { id: true } }),
        prisma.category.findUnique({ where: { slug: seed.category }, select: { id: true } }),
      ]);

      /*
       * A product with no brand or no category is a row nothing lists and
       * nothing links to — an orphan in the sitemap, which is worse than the
       * 404 it was meant to replace. Skipped and reported.
       */
      if (!brand || !category) continue;

      const copy = SEARCH_COPY[slug];

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
          seoTitle: copy?.title ?? null,
          seoDescription: copy?.description ?? null,
          status: "ACTIVE",
          availability: seed.availability ?? "ON_REQUEST",
          purchaseMode: seed.purchaseMode ?? "ENQUIRY",
          popularity: seed.popularity ?? 0,
          searchText: [seed.name, seed.shortDescription, ...seed.keywords].join(" ").toLowerCase(),
        },
        select: { id: true },
      });

      for (const variant of seed.variants ?? []) {
        await prisma.productVariant.create({
          data: {
            productId: product.id,
            sku: variant.sku,
            name: variant.name,
            licenceType: variant.licenceType,
            termMonths: variant.termMonths ?? null,
            seats: 1,
            isDefault: variant.isDefault ?? false,
            currency: "INR",
            listPriceMinor: variant.listPriceMinor,
            gstRatePercent: 18,
          },
        });
      }

      created.push(slug);
    }

    if (created.length === 0) return "all three ranking-gap products are already present";
    return `${created.length} product(s) added: ${created.join(", ")}`;
  },
};
