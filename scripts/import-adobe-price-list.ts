import { PrismaClient } from "@prisma/client";

import { buildSearchText } from "./lib/price-list";
import {
  FALLBACK_CATEGORY,
  defaultVariant,
  describe,
  parseCommercialSheet,
  plan,
} from "./lib/adobe-price-list";

/**
 * Imports Adobe's channel Commercial price list into the catalogue.
 *
 *   npx tsx scripts/import-adobe-price-list.ts --workbook ./CHANNEL_PRICE_LIST.xlsx
 *
 *   --dry-run   report what would change and write nothing
 *
 * Commercial segment only — the sheet also carries Education, CC Standard and
 * NCO tabs, none of which this script reads. Re-runnable: every SKU is keyed
 * deterministically off the row's own fields (see `skuFor` in
 * `lib/adobe-price-list.ts`), so running it again against an updated list
 * changes prices in place.
 *
 * What the rows mean is `scripts/lib/adobe-price-list.ts`. This file is the
 * command line, the report, and the writes.
 */

const prisma = new PrismaClient();

/**
 * The eight Adobe products already in the catalogue, hand-priced before this
 * import existed, mapped to the Commercial-sheet family that is now their
 * real successor. Where a name changed — Adobe renamed "Creative Cloud All
 * Apps" to "Creative Cloud Pro" in 2025 — the mapping says so rather than
 * leaving it to be rediscovered by a slug that quietly stopped matching.
 *
 * `adobe-creative-cloud-single-app-teams` is deliberately absent: this list
 * has no single bundled "any one app" family any more, only named apps
 * (`Photoshop for teams`, `Illustrator for teams`, ...), and guessing which
 * one it meant would be inventing a fact this file does not state. It is
 * left as it was.
 */
const EXISTING_SLUG_BY_FAMILY: Record<string, string> = {
  "Photoshop for teams": "adobe-photoshop-teams",
  "Acrobat Pro for teams": "adobe-acrobat-pro-teams",
  "Acrobat Standard for teams": "adobe-acrobat-standard-teams",
  "Creative Cloud Pro for teams": "adobe-creative-cloud-all-apps-teams",
  "Creative Cloud All Apps - Edition 4 for enterprise": "adobe-creative-cloud-enterprise",
  "Premiere for teams": "adobe-premiere-pro-teams",
  "Illustrator for teams": "adobe-illustrator-teams",
};


async function main() {
  const args = process.argv.slice(2);
  const flag = (name: string) => {
    const index = args.indexOf(`--${name}`);
    return index >= 0 ? args[index + 1] : undefined;
  };
  const dryRun = args.includes("--dry-run");
  const workbook = flag("workbook");

  if (!workbook) {
    console.error("Nothing to import. Pass --workbook.");
    process.exit(1);
  }

  const { rows, ignoredColumns } = parseCommercialSheet(workbook);
  console.log(`commercial     ${rows.length} rows from ${workbook} [Commercial]`);
  if (ignoredColumns.length > 0) {
    console.log(`Not read: ${ignoredColumns.join(", ")} — cost columns stay out of the catalogue.`);
  }

  const { products, skipped, collapsed } = plan(rows);
  const variantCount = products.reduce((sum, product) => sum + product.variants.length, 0);
  console.log(`\nPlanned: ${products.length} products, ${variantCount} licence options.`);

  const approvalProducts = products.filter((product) => product.requiresApproval).length;
  console.log(`${approvalProducts} product(s) carry at least one "Approval Required from Adobe" line — imported enquiry-only.`);

  const byCategory = new Map<string, number>();
  for (const product of products) byCategory.set(product.categorySlug, (byCategory.get(product.categorySlug) ?? 0) + 1);
  console.log("\nCategories:");
  for (const [slug, count] of [...byCategory].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${String(count).padStart(5)}  ${slug}${slug === FALLBACK_CATEGORY ? "  (fallback)" : ""}`);
  }

  if (collapsed.length > 0) {
    console.log(`\n${collapsed.length} licence option(s) had more than one ESP under the same description — the highest was kept:`);
    for (const entry of collapsed.slice(0, 10)) {
      console.log(`  ${entry.family} — ${entry.prices.join(", ")}`);
    }
    if (collapsed.length > 10) console.log(`  … and ${collapsed.length - 10} more.`);
  }

  if (skipped.length > 0) {
    console.log(`\nNot imported (${skipped.length}):`);
    const reasons = new Map<string, number>();
    for (const entry of skipped) reasons.set(entry.why, (reasons.get(entry.why) ?? 0) + 1);
    for (const [why, count] of [...reasons].sort((a, b) => b[1] - a[1])) {
      console.log(`  ${String(count).padStart(5)}  ${why}`);
    }
  }

  if (dryRun) {
    console.log("\n--dry-run: nothing written.");
    console.log("\nSample of what would be created:");
    for (const product of products.slice(0, 5)) {
      console.log(`\n  ${product.name}  (/products/${product.slug}, ${product.categorySlug})${product.requiresApproval ? "  [enquiry-only]" : ""}`);
      for (const variant of product.variants.slice(0, 6)) {
        console.log(`    ${variant.sku}  ${variant.name}  ₹${(variant.listPriceMinor / 100).toLocaleString("en-IN")}`);
      }
      if (product.variants.length > 6) console.log(`    … and ${product.variants.length - 6} more option(s).`);
    }
    await prisma.$disconnect();
    return;
  }

  const brand = await prisma.brand.findUnique({ where: { slug: "adobe" } });
  if (!brand) throw new Error("No 'adobe' brand. Seed the catalogue first.");

  const categories = await prisma.category.findMany({ select: { id: true, slug: true, name: true } });
  const categoryId = new Map(categories.map((category) => [category.slug, category.id]));
  const categoryName = new Map(categories.map((category) => [category.id, category.name]));
  const fallbackId = categoryId.get(FALLBACK_CATEGORY);
  if (!fallbackId) throw new Error(`No '${FALLBACK_CATEGORY}' category. Seed the catalogue first.`);

  let created = 0;
  let updated = 0;
  let archivedVariants = 0;

  for (const product of products) {
    const copy = describe(product);
    const resolvedCategoryId = categoryId.get(product.categorySlug) ?? fallbackId;
    const keywords = ["adobe", ...product.name.toLowerCase().split(/\s+/).slice(0, 6)];
    // A family that is one of the eight pre-existing hand-priced products
    // writes to that product's own slug, so this import updates it in place
    // rather than creating a second listing beside it under a new address.
    const targetSlug = EXISTING_SLUG_BY_FAMILY[product.rawFamily] ?? product.slug;
    const data = {
      name: product.name,
      brandId: brand.id,
      categoryId: resolvedCategoryId,
      shortDescription: copy.short,
      description: copy.long,
      status: "ACTIVE" as const,
      availability: "MADE_TO_ORDER" as const,
      purchaseMode: product.requiresApproval ? ("ENQUIRY" as const) : ("BOTH" as const),
      features: [],
      compatibility: [],
      keywords,
      licensingNotes: null,
      deliveryNotes: null,
      supportNotes: null,
      deletedAt: null,
      searchText: buildSearchText({
        name: product.name,
        brandName: brand.name,
        categoryName: categoryName.get(resolvedCategoryId) ?? "",
        shortDescription: copy.short,
        keywords,
        skus: product.variants.map((variant) => variant.sku),
      }),
    };

    const existing = await prisma.product.findUnique({ where: { slug: targetSlug }, select: { id: true } });
    const record = existing
      ? await prisma.product.update({ where: { id: existing.id }, data })
      : await prisma.product.create({ data: { ...data, slug: targetSlug } });

    if (existing) updated += 1;
    else created += 1;

    const defaultSku = defaultVariant(product.variants)?.sku;

    // Every variant this product already has — including ones about to be
    // archived below — loses isDefault first, so the single upsert that sets
    // it true on defaultSku is the only source of truth. Without this, an
    // old default that gets archived (deletedAt set, isDefault left alone)
    // keeps flagging true beside the new live default.
    await prisma.productVariant.updateMany({
      where: { productId: record.id, isDefault: true },
      data: { isDefault: false },
    });

    for (const variant of product.variants) {
      const variantData = {
        productId: record.id,
        name: variant.name,
        licenceType: variant.licenceType,
        audience: "COMMERCIAL" as const,
        termMonths: variant.termMonths,
        seats: 1,
        isDefault: variant.sku === defaultSku,
        currency: "INR",
        listPriceMinor: variant.listPriceMinor,
        salePriceMinor: null,
        gstRatePercent: 18,
        deletedAt: null,
      };
      await prisma.productVariant.upsert({
        where: { sku: variant.sku },
        create: { ...variantData, sku: variant.sku },
        update: variantData,
      });
    }

    const archived = await prisma.productVariant.updateMany({
      where: {
        productId: record.id,
        deletedAt: null,
        sku: { notIn: product.variants.map((variant) => variant.sku) },
      },
      data: { deletedAt: new Date(), isDefault: false },
    });
    archivedVariants += archived.count;
  }

  console.log(`\nWritten: ${created} new products, ${updated} updated.`);
  if (archivedVariants > 0) {
    console.log(`Archived ${archivedVariants} licence option(s) these products no longer offer.`);
  }

  console.log("\nThe running site is still serving its cached catalogue. Restart it to publish:");
  console.log("  cd deploy && docker compose -f docker-compose.prod.yml restart app");

  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});
