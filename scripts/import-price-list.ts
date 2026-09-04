import { PrismaClient, type VariantAudience } from "@prisma/client";

import { listSheets, readSheet } from "./lib/xlsx";
import {
  FALLBACK_CATEGORY,
  WORKBOOK_SHEETS,
  buildSearchText,
  checkSegmentColumn,
  defaultVariant,
  describe,
  parseSheet,
  plan,
  termLabel,
  type Row,
  type Source,
} from "./lib/price-list";

/**
 * Imports a publisher price list into the catalogue.
 *
 *   npx tsx scripts/import-price-list.ts --workbook ./CHANNEL_PRICE_LIST.xlsx
 *
 *   npx tsx scripts/import-price-list.ts \
 *     --nce ./NCE.xlsx --perpetual ./Perpetual.xlsx --subscription ./Subscription.xlsx
 *
 *   --dry-run          report what would change and write nothing
 *   --archive-missing  archive catalogue products this list no longer contains
 *   --include-est      also import the extended-service-term sheet (see below)
 *
 * Re-runnable. Every product and SKU is keyed deterministically off the source
 * data, so running it again against an updated list changes prices in place
 * rather than creating a second copy of the catalogue.
 *
 * What the rows mean — which columns are read, which are deliberately not, and
 * how a term is arrived at — is `scripts/lib/price-list.ts`. This file is the
 * command line, the report it prints, and the writes.
 *
 * ## The extended-service-term sheet
 *
 * `EST` holds the same products again under titles ending "- Extended Service
 * Term": one-month SKUs a partner uses to run a subscription past its term
 * while a renewal is agreed. They are not something a customer shops for, and
 * importing them would add hundreds of product pages duplicating pages already
 * in the catalogue. Skipped by default, counted in the report, and available
 * behind `--include-est` if that judgement is ever wrong.
 */

const prisma = new PrismaClient();

async function main() {
  const args = process.argv.slice(2);
  const flag = (name: string) => {
    const index = args.indexOf(`--${name}`);
    return index >= 0 ? args[index + 1] : undefined;
  };
  const dryRun = args.includes("--dry-run");
  const archiveMissing = args.includes("--archive-missing");
  const includeEst = args.includes("--include-est");

  const workbook = flag("workbook");
  const singles: Array<[Source, string | undefined]> = [
    ["nce", flag("nce")],
    ["perpetual", flag("perpetual")],
    ["subscription", flag("subscription")],
  ];

  if (!workbook && !singles.some(([, path]) => path)) {
    console.error(
      "Nothing to import. Pass --workbook, or at least one of --nce, --perpetual, --subscription.",
    );
    process.exit(1);
  }

  /** Every sheet to read, as (source, file, sheet name or undefined). */
  const sheets: Array<[Source, string, string | undefined]> = [];

  if (workbook) {
    const names = listSheets(workbook);
    const unknown = names.filter((name) => !(name.toUpperCase() in WORKBOOK_SHEETS));
    if (unknown.length > 0) {
      console.error(`\n${workbook} has sheets this script does not recognise: ${unknown.join(", ")}.`);
      console.error("Nothing has been read. Name them, or remove them, before importing.");
      process.exit(1);
    }
    for (const name of names) {
      const source = WORKBOOK_SHEETS[name.toUpperCase()] as Source;
      if (source === "est" && !includeEst) {
        const rowCount = readSheet(workbook, name).length - 1;
        console.log(
          `est           ${rowCount} rows on the "${name}" sheet, not imported — extended service terms\n` +
            `              duplicate products already in the catalogue. Pass --include-est to import them.`,
        );
        continue;
      }
      sheets.push([source, workbook, name]);
    }
  }

  for (const [source, path] of singles) if (path) sheets.push([source, path, undefined]);

  const rows: Row[] = [];
  const ignored = new Set<string>();

  for (const [source, path, sheetName] of sheets) {
    const parsed = parseSheet(path, source, sheetName);
    for (const column of parsed.ignoredColumns) ignored.add(column);

    if (parsed.badTerms.length > 0) {
      console.error(`\nThe ${source} sheet states terms this script cannot read:`);
      for (const line of parsed.badTerms.slice(0, 5)) console.error(`  ${line}`);
      console.error(`\n${parsed.badTerms.length} affected. Nothing has been written.`);
      process.exit(1);
    }

    if (!parsed.hasTermColumn) {
      const suspect = checkSegmentColumn(parsed.rows, source);
      if (suspect.length > 0) {
        console.error(`\nThe segment column in the ${source} list does not determine the price.`);
        console.error("This usually means the export changed shape. Sample:");
        for (const line of suspect.slice(0, 5)) console.error(`  ${line}`);
        console.error(`\n${suspect.length} affected. Nothing has been written.`);
        process.exit(1);
      }
    }

    console.log(
      `${source.padEnd(13)} ${parsed.rows.length} rows from ${path}${sheetName ? ` [${sheetName}]` : ""}`,
    );
    rows.push(...parsed.rows);
  }

  if (ignored.size > 0) {
    console.log(`\nRead: ERP only.`);
    console.log(`Not read: ${[...ignored].join(", ")} — cost columns stay out of the catalogue.`);
  }

  const { products, skipped } = plan(rows);
  const variantCount = products.reduce((sum, product) => sum + product.variants.length, 0);

  console.log(`\nPlanned: ${products.length} products, ${variantCount} licence options.`);

  const byAudience = new Map<VariantAudience, number>();
  const byTerm = new Map<string, number>();
  for (const product of products) {
    for (const variant of product.variants) {
      byAudience.set(variant.audience, (byAudience.get(variant.audience) ?? 0) + 1);
      const label = `${termLabel(variant.termMonths)}${variant.billedMonthly ? ", billed monthly" : ""}`;
      byTerm.set(label, (byTerm.get(label) ?? 0) + 1);
    }
  }
  for (const [audience, count] of byAudience) console.log(`  ${audience.padEnd(11)} ${count}`);
  console.log("\nTerms:");
  for (const [label, count] of [...byTerm].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${String(count).padStart(5)}  ${label}`);
  }

  /*
   * Where the products landed. Worth printing every run: the mapping is a list
   * of keyword rules, and the way it fails is not an error but a quiet drift of
   * everything into the fallback category, which nobody notices from a total.
   */
  const byCategory = new Map<string, number>();
  for (const product of products) {
    byCategory.set(product.categorySlug, (byCategory.get(product.categorySlug) ?? 0) + 1);
  }
  console.log("\nCategories:");
  for (const [slug, count] of [...byCategory].sort((a, b) => b[1] - a[1])) {
    console.log(
      `  ${String(count).padStart(5)}  ${slug}${slug === FALLBACK_CATEGORY ? "  (fallback)" : ""}`,
    );
  }

  if (skipped.length > 0) {
    console.log(`\nNot imported (${skipped.length}):`);
    const reasons = new Map<string, number>();
    for (const entry of skipped) {
      const key = entry.why.replace(/[\d.]{2,}/g, "…");
      reasons.set(key, (reasons.get(key) ?? 0) + 1);
    }
    for (const [why, count] of [...reasons].sort((a, b) => b[1] - a[1])) {
      console.log(`  ${String(count).padStart(5)}  ${why}`);
    }
  }

  if (dryRun) {
    console.log("\n--dry-run: nothing written.");
    console.log("\nSample of what would be created:");
    for (const product of products.slice(0, 3)) {
      console.log(`\n  ${product.name}  (/products/${product.slug}, ${product.categorySlug})`);
      for (const variant of product.variants.slice(0, 6)) {
        console.log(
          `    ${variant.sku}  [${variant.partNumber}]  ${variant.name}  ₹${(variant.listPriceMinor / 100).toLocaleString("en-IN")}`,
        );
      }
    }
    await prisma.$disconnect();
    return;
  }

  const brand = await prisma.brand.findUnique({ where: { slug: "microsoft" } });
  if (!brand) throw new Error("No 'microsoft' brand. Seed the catalogue first.");

  const categories = await prisma.category.findMany({
    select: { id: true, slug: true, name: true },
  });
  const categoryId = new Map(categories.map((category) => [category.slug, category.id]));
  const categoryName = new Map(categories.map((category) => [category.id, category.name]));
  const fallbackId = categoryId.get(FALLBACK_CATEGORY);
  if (!fallbackId) throw new Error(`No '${FALLBACK_CATEGORY}' category. Seed the catalogue first.`);

  const importedSlugs = new Set(products.map((product) => product.slug));
  let created = 0;
  let updated = 0;
  let archivedVariants = 0;

  for (const product of products) {
    const copy = describe(product);
    const resolvedCategoryId = categoryId.get(product.categorySlug) ?? fallbackId;
    const keywords = ["microsoft", ...product.name.toLowerCase().split(/\s+/).slice(0, 6)];
    const data = {
      name: product.name,
      brandId: brand.id,
      categoryId: resolvedCategoryId,
      shortDescription: copy.short,
      description: copy.long,
      status: "ACTIVE" as const,
      availability: "MADE_TO_ORDER" as const,
      // A product with no commercial price cannot be bought without somebody
      // establishing entitlement, so it is enquiry-only rather than half-open.
      purchaseMode: product.variants.some((variant) => variant.audience === "COMMERCIAL")
        ? ("BOTH" as const)
        : ("ENQUIRY" as const),
      features: [],
      compatibility: [],
      keywords,
      licensingNotes: null,
      deliveryNotes: null,
      supportNotes: null,
      deletedAt: null,
      // Written here rather than rebuilt afterwards: the SKUs are already in
      // hand, and a rebuild round-trip per product to fetch them back would be
      // slower than the whole rest of the import.
      searchText: buildSearchText({
        name: product.name,
        brandName: brand.name,
        categoryName: categoryName.get(resolvedCategoryId) ?? "",
        shortDescription: copy.short,
        keywords,
        skus: product.variants.map((variant) => variant.sku),
      }),
    };

    const existing = await prisma.product.findUnique({
      where: { slug: product.slug },
      select: { id: true },
    });

    const record = existing
      ? await prisma.product.update({ where: { id: existing.id }, data })
      : await prisma.product.create({ data: { ...data, slug: product.slug } });

    if (existing) updated += 1;
    else created += 1;

    const defaultSku = defaultVariant(product.variants)?.sku;

    for (const variant of product.variants) {
      const variantData = {
        productId: record.id,
        name: variant.name,
        licenceType: variant.licenceType,
        audience: variant.audience,
        termMonths: variant.termMonths,
        seats: 1,
        isDefault: variant.sku === defaultSku,
        currency: "INR",
        listPriceMinor: variant.listPriceMinor,
        salePriceMinor: null,
        gstRatePercent: 18,
        partNumber: variant.partNumber,
        deletedAt: null,
      };
      await prisma.productVariant.upsert({
        where: { sku: variant.sku },
        create: { ...variantData, sku: variant.sku },
        update: variantData,
      });
    }

    /*
     * Options that were in this product last time and are not in the list now
     * are archived, not deleted: a past order line still points at them.
     */
    const archived = await prisma.productVariant.updateMany({
      where: {
        productId: record.id,
        deletedAt: null,
        sku: { notIn: product.variants.map((variant) => variant.sku) },
      },
      data: { deletedAt: new Date() },
    });
    archivedVariants += archived.count;
  }

  console.log(`\nWritten: ${created} new products, ${updated} updated.`);
  if (archivedVariants > 0) {
    console.log(
      `Archived ${archivedVariants} licence options these products no longer offer at that term.`,
    );
  }

  if (archiveMissing) {
    const stale = await prisma.product.updateMany({
      where: { brandId: brand.id, deletedAt: null, slug: { notIn: [...importedSlugs] } },
      data: { deletedAt: new Date() },
    });

    // And their licence options. Archiving only the product leaves live SKUs
    // beneath an archived one — unreachable from the public site, which filters
    // on the product, but present in every count and confusing to read back.
    const staleVariants = await prisma.productVariant.updateMany({
      where: { deletedAt: null, product: { brandId: brand.id, deletedAt: { not: null } } },
      data: { deletedAt: new Date() },
    });

    console.log(
      `Archived ${stale.count} products absent from this list, and ${staleVariants.count} of their licence options.`,
    );
  }

  /*
   * The running site will not show any of this until it is restarted.
   *
   * Catalogue pages are cached against tags, and tags are invalidated from
   * inside a server action — which a command-line script is not. So the write
   * lands in the database and the site carries on serving the prices and counts
   * it cached beforehand. Saying so here is the difference between a confusing
   * hour and a thirty-second restart.
   */
  console.log("\nThe running site is still serving its cached catalogue. Restart it to publish:");
  console.log("  cd deploy && docker compose -f docker-compose.prod.yml restart app");

  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});
