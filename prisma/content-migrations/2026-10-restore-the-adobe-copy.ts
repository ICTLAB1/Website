import { adobeProducts } from "../seed-data/products-adobe";
import type { ContentMigration } from "./types";

/**
 * Gives the seven hijacked Adobe products their own words back.
 *
 * `2026-10-adobe-withdraw-imported` restored the names and the prices and
 * stopped there, which turned out to be half the repair. The channel-sheet
 * import did not only rename the products it recognised: it overwrote their
 * copy with a generated sentence, emptied their feature and compatibility
 * lists, replaced their keywords with the first six words of the sheet's own
 * family name, and set their licensing, delivery and support notes to null.
 *
 * So the live card still read
 *
 *     Adobe Creative Cloud Pro for Teams from Adobe, available as an annual
 *     commitment. Prices exclude GST.
 *
 * under a heading that by then said "All Apps" — the sheet's name for the
 * product surviving in a description the rename could not reach. The live
 * diagnostics caught it, by looking for that name anywhere on the brand page
 * rather than only in the headings, which is the reason that check was written
 * the loose way round.
 *
 * ## Restored from the seed, which is where the copy lives
 *
 * `prisma/seed-data/products-adobe.ts` holds what these records said before
 * the import: the hand-written description, the feature list, the
 * compatibility notes, the per-named-user licensing note. That file is the
 * source, so this reads it rather than restating it — the alternative is a
 * second copy of seven products' marketing text that drifts from the first.
 *
 * ## What is deliberately not restored
 *
 * **Availability.** The seed says `IN_STOCK` for these. Forty unverified
 * stock claims are an open finding in this audit, and a licence that is
 * provisioned on order is not stock in any case; the import's
 * `MADE_TO_ORDER` is the more honest of the two, so whatever is on the record
 * stays. Re-asserting a stock position nobody has checked, as a side effect of
 * a copy repair, is exactly the sort of quiet claim this audit exists to stop.
 *
 * **Purchase mode and prices.** Prices are
 * `2026-10-adobe-withdraw-imported`'s business and were settled there.
 * `purchaseMode` governs a direct-purchase route that `DIRECT_PURCHASE_ENABLED`
 * turns off site-wide, so changing it would move nothing a visitor can see.
 *
 * ## Field by field, and only where it differs
 *
 * Every product is compared against the seed and written only if something has
 * actually changed, so the count in the summary is the number of records the
 * import had damaged rather than the number it looked at — and a second run
 * reports none.
 */

/**
 * The same haystack `src/lib/search-text.ts` builds, inlined for the same
 * reason `2026-10-adobe-withdraw-imported` inlines it: a migration is handed a
 * client and does not reach into `src/`, which carries `server-only` and its
 * own.
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

const same = (a: string[], b: string[]) =>
  a.length === b.length && a.every((value, index) => value === b[index]);

export const restoreTheAdobeCopy: ContentMigration = {
  id: "2026-10-restore-the-adobe-copy",
  describe: "restores the hand-written copy the Adobe price-list import overwrote",

  async apply(prisma) {
    let restored = 0;
    const missing: string[] = [];

    for (const seed of adobeProducts) {
      const product = await prisma.product.findUnique({
        where: { slug: seed.slug },
        select: {
          id: true,
          name: true,
          shortDescription: true,
          description: true,
          features: true,
          compatibility: true,
          keywords: true,
          licensingNotes: true,
          deliveryNotes: true,
          supportNotes: true,
          categoryId: true,
          brand: { select: { name: true } },
          variants: { where: { deletedAt: null }, select: { sku: true } },
        },
      });
      if (!product) {
        missing.push(seed.slug);
        continue;
      }

      const category = await prisma.category.findUnique({
        where: { slug: seed.category },
        select: { id: true, name: true },
      });

      const unchanged =
        product.shortDescription === seed.shortDescription &&
        product.description === seed.description &&
        same(product.features, seed.features) &&
        same(product.compatibility, seed.compatibility) &&
        same(product.keywords, seed.keywords) &&
        product.licensingNotes === seed.licensingNotes &&
        product.deliveryNotes === seed.deliveryNotes &&
        product.supportNotes === seed.supportNotes &&
        (category === null || product.categoryId === category.id);
      if (unchanged) continue;

      await prisma.product.update({
        where: { id: product.id },
        data: {
          shortDescription: seed.shortDescription,
          description: seed.description,
          features: seed.features,
          compatibility: seed.compatibility,
          keywords: seed.keywords,
          licensingNotes: seed.licensingNotes,
          deliveryNotes: seed.deliveryNotes,
          supportNotes: seed.supportNotes,
          ...(category ? { categoryId: category.id } : {}),
          /*
           * The haystack folds in the description and the keywords, both of
           * which just changed, so it is rebuilt here rather than left holding
           * the import's wording — a product findable only under a name the
           * site no longer uses is the same defect one search box along.
           */
          searchText: haystack([
            product.name,
            product.brand.name,
            category?.name,
            seed.shortDescription,
            ...seed.keywords,
            ...product.variants.map((variant) => variant.sku),
          ]),
        },
      });
      restored += 1;
    }

    const parts = [
      `restored the copy on ${restored} Adobe product${restored === 1 ? "" : "s"}`,
    ];
    if (missing.length > 0) parts.push(`not found: ${missing.join(", ")}`);
    return parts.join(", ");
  },
};
