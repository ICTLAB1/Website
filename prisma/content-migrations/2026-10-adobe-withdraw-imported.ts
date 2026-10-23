import { ADOBE_ENTRIES } from "./2026-10-adobe-price-list";
import type { ContentMigration } from "./types";

/**
 * Puts the Adobe catalogue back to the twenty-four products the business
 * approved, and gives each of them one price instead of two.
 *
 * ## What was on the live site
 *
 * A hundred and six Adobe products, of which eighty-two nobody asked for.
 * `scripts/import-adobe-price-list.ts` — written in an earlier phase of this
 * audit to read Adobe's channel Commercial sheet — had been run against the
 * production database. It did what it was built to do, and the result was
 * wrong for this site in four separate ways:
 *
 *   - It published Adobe's own ESP figures with no margin on them, so the
 *     imported rows undercut the business's prices: "Adobe After Effects for
 *     Teams" existed twice, at ₹36,674 and at ₹50,280.
 *   - It renamed the seven products it recognised to the sheet's family names
 *     and replaced their SKUs, so Creative Cloud All Apps became "Creative
 *     Cloud Pro for Teams" at ₹97,874 — losing the ₹1,07,000 the business
 *     named directly.
 *   - It prefixed "Adobe " to families that already began with it, giving
 *     "Adobe Adobe Express for Teams".
 *   - It carried figures that are not annual licence prices at all. "Acrobat
 *     Sign Solutions for Business" was published at ₹97 a year.
 *
 * ## Why both halves are one migration
 *
 * `2026-10-adobe-price-list` matched a variant by SKU, which is correct when a
 * row is where it left it. The import had moved the SKU, so the lookup missed,
 * so that migration added a *second* live variant beside the imported one
 * rather than correcting it. The card renders the default variant and the
 * product page renders the priced one, which is how `/products/
 * adobe-photoshop-teams` came to show ₹50,280 while its own card showed
 * ₹36,674 — and why the live assertions passed throughout: they read product
 * pages.
 *
 * So withdrawing the extra products and collapsing the double variants are the
 * same defect seen from two sides, and splitting them would leave the site
 * correct in one place and contradictory in the other for however long sat
 * between the two deploys.
 *
 * ## Archived, not deleted
 *
 * `status: ARCHIVED` with `deletedAt` set, the same as
 * `2026-10-merge-duplicate-servers`. Nothing is destroyed. A quotation or an
 * order may reference an imported variant, and a document that cannot be
 * reprinted is a worse outcome than a row nobody can select. It also means
 * this is reversible by hand if any of the eighty-two turns out to be wanted:
 * the record, its copy and its price history are all still there.
 *
 * The fourteen withdrawn URLs that duplicate a surviving product are
 * redirected to it in `next.config.ts`. The rest are left to 404, which is the
 * honest answer for a product that is not sold: a redirect to something else
 * answers a question the visitor did not ask.
 *
 * ## It runs once, and is safe to run twice
 *
 * Every step is stated as an end condition rather than a change — this name,
 * this one live variant, everything else archived — so a second run finds
 * nothing to do and says so.
 */

/**
 * The two Adobe products that are not in the supplied price list.
 *
 * They were seeded before it existed and the business never sent a figure for
 * either, so they are approved products with prices that come from somewhere
 * else. Listed here rather than added to `ADOBE_ENTRIES`, because that list is
 * "what the business priced in October" and these are not that.
 */
const SEEDED_ADOBE: Array<{ slug: string; name: string; sku: string }> = [
  {
    slug: "adobe-creative-cloud-single-app-teams",
    name: "Adobe Creative Cloud Single App for Teams",
    sku: "ADB-CC-SINGLE-TEAM-A1",
  },
  {
    slug: "adobe-creative-cloud-enterprise",
    name: "Adobe Creative Cloud for Enterprise",
    sku: "ADB-CC-ENT",
  },
];

/** Every Adobe product that belongs on the site, and the SKU its price is on. */
const APPROVED = new Map<string, { name: string; sku: string }>([
  ...ADOBE_ENTRIES.map(
    (entry) => [entry.slug, { name: entry.name, sku: entry.sku }] as const,
  ),
  ...SEEDED_ADOBE.map((entry) => [entry.slug, { name: entry.name, sku: entry.sku }] as const),
]);

/**
 * The same haystack `src/lib/search-text.ts` builds, inlined.
 *
 * A migration does not import from `src/` — that was settled in e5e669f for
 * the import scripts and holds here for the same reason: `src/lib/db` carries
 * `server-only` and its own client, and a migration is handed one. The rule
 * this duplicates is "name, brand, category, description, keywords, live
 * SKUs, lowercased", which is stable enough to restate; the alternative is a
 * product that keeps its old name in search for ever.
 */
function haystack(parts: Array<string | null | undefined>): string {
  return parts
    .filter((part): part is string => Boolean(part))
    .join(" ")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 2000);
}

export const adobeWithdrawImported: ContentMigration = {
  id: "2026-10-adobe-withdraw-imported",
  describe:
    "Withdraws the Adobe products imported from the channel price list, and leaves each approved product with one live price",

  async apply(prisma) {
    const brand = await prisma.brand.findFirst({
      where: { slug: "adobe" },
      select: { id: true, name: true },
    });
    if (!brand) return "no Adobe brand record — nothing to do";

    const now = new Date();
    let renamed = 0;
    let collapsed = 0;
    let withdrawn = 0;
    const missing: string[] = [];

    const products = await prisma.product.findMany({
      where: { brandId: brand.id, deletedAt: null },
      select: {
        id: true,
        slug: true,
        name: true,
        shortDescription: true,
        keywords: true,
        category: { select: { name: true } },
        variants: { select: { id: true, sku: true, deletedAt: true, isDefault: true } },
      },
    });

    for (const product of products) {
      const approved = APPROVED.get(product.slug);

      /*
       * Not one of ours. Archived whole, variants included — a live variant on
       * an archived product is invisible on the site but still answers a
       * `findUnique` by SKU, which is exactly the trap that produced the
       * double prices this migration exists to clear.
       */
      if (!approved) {
        await prisma.productVariant.updateMany({
          where: { productId: product.id, deletedAt: null },
          data: { deletedAt: now, isDefault: false },
        });
        await prisma.product.update({
          where: { id: product.id },
          data: { status: "ARCHIVED", deletedAt: now },
        });
        withdrawn += 1;
        continue;
      }

      /*
       * The priced variant, live and default; every other one archived.
       *
       * `deletedAt: null` on the keeper rather than "leave it alone": the
       * import archived some of these when it installed its own default, and
       * a product whose only approved variant is archived shows no price at
       * all.
       */
      const keeper = product.variants.find((variant) => variant.sku === approved.sku);
      if (!keeper) {
        missing.push(product.slug);
      } else {
        const others = product.variants.filter(
          (variant) => variant.id !== keeper.id && variant.deletedAt === null,
        );
        if (others.length > 0) {
          await prisma.productVariant.updateMany({
            where: { id: { in: others.map((variant) => variant.id) } },
            data: { deletedAt: now, isDefault: false },
          });
          collapsed += others.length;
        }
        if (keeper.deletedAt !== null || !keeper.isDefault) {
          await prisma.productVariant.update({
            where: { id: keeper.id },
            data: { deletedAt: null, isDefault: true },
          });
        }
      }

      /*
       * The name the business approved, and the haystack that goes with it.
       * Rebuilt whether or not the name changed, because the live SKU set just
       * did: a product found by a SKU nobody can order is a dead search result.
       */
      const liveSkus = product.variants
        .filter((variant) => variant.sku === approved.sku)
        .map((variant) => variant.sku);

      if (product.name !== approved.name) renamed += 1;

      await prisma.product.update({
        where: { id: product.id },
        data: {
          name: approved.name,
          searchText: haystack([
            approved.name,
            brand.name,
            product.category?.name,
            product.shortDescription,
            ...product.keywords,
            ...liveSkus,
          ]),
        },
      });
    }

    const parts = [
      `withdrew ${withdrawn} imported Adobe product${withdrawn === 1 ? "" : "s"}`,
      `archived ${collapsed} duplicate variant${collapsed === 1 ? "" : "s"}`,
      `restored ${renamed} product name${renamed === 1 ? "" : "s"}`,
      `kept ${APPROVED.size - missing.length} approved product${APPROVED.size - missing.length === 1 ? "" : "s"}`,
    ];
    if (missing.length > 0) {
      parts.push(`no approved variant found for ${missing.join(", ")}`);
    }
    return parts.join(", ");
  },
};
