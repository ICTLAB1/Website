/**
 * Imports commercial hardware models from a manufacturer data file.
 *
 *     npx tsx scripts/import-hardware.ts data/hardware/hp.json --images data/hardware/images
 *     npx tsx scripts/import-hardware.ts data/hardware/hp.json --dry-run
 *     npx tsx scripts/import-hardware.ts data/hardware/hp.json --archive-missing
 *
 * The file format is documented in `data/hardware/README.md`, beside an example.
 *
 * ## Why an importer rather than a seed
 *
 * A hardware catalogue is not written once. Manufacturers refresh their ranges
 * two or three times a year, models are discontinued, and the specification on
 * a page today is not the one that was there in March. So the catalogue is
 * something a file is imported into repeatedly — re-runnable, matching on the
 * manufacturer's part number, and able to say what it would change before it
 * changes it.
 *
 * ## What it refuses
 *
 * **Consumer and gaming ranges.** Pavilion, OMEN, IdeaPad, Legion, Aspire,
 * Nitro, Predator and the rest are refused by name, per brand, whatever the
 * file says. This catalogue is a business one, and the failure mode it is
 * guarding against is not malice — it is a data feed that quietly includes the
 * whole product line, and nobody noticing until a buyer asks why a gaming
 * laptop is listed under government procurement.
 *
 * **Prices.** There is no price field in the format, and the importer writes a
 * zero-priced enquiry-only variant regardless of what a file contains. A
 * manufacturer feed carries MRP and promotional pricing; none of it belongs on
 * a B2B quotation catalogue, and the safest way to keep it out is to have
 * nowhere to put it.
 *
 * **Models with no source URL.** A specification with no provenance cannot be
 * re-checked, and six months on nobody can tell whether a figure came from the
 * manufacturer or from somebody's memory.
 */
import { readFileSync, existsSync, copyFileSync, mkdirSync } from "node:fs";
import { basename, extname, join } from "node:path";

import { PrismaClient, type FormFactor, type Prisma } from "@prisma/client";
import { z } from "zod";

import { detectImage } from "../src/lib/image-bytes";

const prisma = new PrismaClient();

// ─────────────────────────────────────────────────────────────── the format

const FORM_FACTORS = [
  "LAPTOP",
  "MOBILE_WORKSTATION",
  "DESKTOP_TOWER",
  "DESKTOP_SFF",
  "DESKTOP_MINI",
  "DESKTOP_WORKSTATION",
  "ALL_IN_ONE",
] as const;

const specSchema = z.object({
  label: z.string().trim().min(1).max(60),
  value: z.string().trim().min(1).max(400),
});

const modelSchema = z.object({
  /** The manufacturer's own model name, as written on its page. */
  name: z.string().trim().min(3).max(160),
  /** "EliteBook", "ThinkPad T", "TravelMate P". */
  series: z.string().trim().min(1).max(60),
  formFactor: z.enum(FORM_FACTORS),
  /** The manufacturer's part number. Unique within a brand; used to match. */
  partNumber: z.string().trim().min(2).max(60),
  /** One or two sentences, written for this site — not the manufacturer's copy. */
  shortDescription: z.string().trim().min(20).max(400),
  /** A few paragraphs, likewise written rather than copied. */
  description: z.string().trim().min(40).max(4000),
  /** Security, manageability, durability — what makes the range commercial. */
  businessFeatures: z.array(z.string().trim().min(3).max(200)).max(20).default([]),
  specifications: z.array(specSchema).max(40).default([]),
  /** A filename inside the `--images` directory. */
  image: z.string().trim().min(1).max(120).optional(),
  /** The manufacturer's page for this model. Required; see the note above. */
  sourceUrl: z.string().trim().url().max(500),
  /**
   * Discontinued models stay in the file and stop being listed, rather than
   * being deleted — which is what keeps somebody from re-adding one next year
   * from a reseller page that still shows it.
   */
  status: z.enum(["ACTIVE", "DISCONTINUED"]).default("ACTIVE"),
});

const fileSchema = z.object({
  /** The brand slug this file belongs to, e.g. `hp`. Must already exist. */
  brand: z.string().trim().min(1).max(60),
  /** The category slug these models go under. Must already exist. */
  category: z.string().trim().min(1).max(60),
  /** When the manufacturer's pages were last read, as YYYY-MM-DD. */
  checkedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  models: z.array(modelSchema).min(1).max(500),
});

type Model = z.infer<typeof modelSchema>;

/**
 * Ranges that are not business ranges, by brand.
 *
 * Matched as whole words against the model name and the series, so "Pavilion"
 * is caught and "ProBook" is not caught by "Pro". Refusing rather than warning:
 * a warning in a log is a thing nobody reads, and a consumer laptop listed for
 * government procurement is a thing everybody sees.
 */
const CONSUMER_RANGES: Record<string, string[]> = {
  hp: ["Pavilion", "Envy", "OMEN", "Victus", "Chromebook", "Stream"],
  lenovo: ["IdeaPad", "IdeaCentre", "Legion", "LOQ", "Yoga Slim", "Chromebook"],
  acer: ["Aspire", "Nitro", "Predator", "Swift", "Spin", "Chromebook"],
};

function consumerRangeIn(brandSlug: string, model: Model): string | null {
  const ranges = CONSUMER_RANGES[brandSlug.toLowerCase()] ?? [];
  const haystack = `${model.series} ${model.name}`;

  for (const range of ranges) {
    const pattern = new RegExp(`\\b${range.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
    if (pattern.test(haystack)) return range;
  }
  return null;
}

// ────────────────────────────────────────────────────────────────── helpers

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/**
 * The search haystack, built the same way the seed builds it.
 *
 * Inlined rather than imported because `lib/search-text` is `server-only`. The
 * fields differ from software: a hardware buyer searches for a series and a
 * part number, and both have to be in here for `ThinkPad T14` and a part number
 * pasted out of a tender document to find the same model.
 */
function buildSearchText(input: {
  name: string;
  brandName: string;
  categoryName: string;
  series: string;
  partNumber: string;
  formFactor: string;
  shortDescription: string;
}): string {
  return [
    input.name,
    input.brandName,
    input.categoryName,
    input.series,
    input.partNumber,
    input.formFactor.replace(/_/g, " "),
    input.shortDescription,
  ]
    .join(" ")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 2000);
}

/**
 * Copies a manufacturer photograph into `public/products/`.
 *
 * Committed to the repository rather than written to a runtime directory,
 * because `public/` is copied into the container image at build time — a file
 * placed there on a running server disappears at the next deploy. Catalogue
 * artwork arrives with a data drop and belongs in the same commit as the data.
 *
 * Validated by its own bytes on the way in. A feed that hands over an HTML
 * error page named `elitebook.jpg` is not a hypothetical; it is what a
 * rate-limited download looks like.
 */
function placeImage(
  sourceDir: string | null,
  fileName: string | undefined,
  slug: string,
  { write }: { write: boolean },
): { url: string } | { error: string } {
  if (!fileName) return { error: "no image named in the file" };
  if (!sourceDir) return { error: "no --images directory given" };

  const source = join(sourceDir, basename(fileName));
  if (!existsSync(source)) return { error: `image not found: ${basename(fileName)}` };

  const buffer = readFileSync(source);
  const kind = detectImage(buffer);
  if (!kind) return { error: `not an image: ${basename(fileName)}` };
  if (kind.extension === "svg") {
    // A photograph is not a vector. An SVG here means the feed handed over an
    // icon or a placeholder, which is exactly the thing this catalogue must not
    // show in place of a product.
    return { error: `${basename(fileName)} is an SVG, not a photograph` };
  }

  const extension = extname(source).toLowerCase() === ".jpeg" ? ".jpg" : extname(source).toLowerCase();
  const name = `${slug}${extension}`;

  // A dry run does everything but the copy, so `--dry-run` reports the same
  // missing and malformed images the real run would — a rehearsal that skipped
  // the checks would be no rehearsal at all.
  if (write) {
    const targetDir = join(process.cwd(), "public", "products");
    mkdirSync(targetDir, { recursive: true });
    copyFileSync(source, join(targetDir, name));
  }
  return { url: `/products/${name}` };
}

// ──────────────────────────────────────────────────────────────────── main

const [, , filePath, ...rest] = process.argv;
const dryRun = rest.includes("--dry-run");
const archiveMissing = rest.includes("--archive-missing");
const imagesIndex = rest.indexOf("--images");
const imagesDir = imagesIndex >= 0 ? (rest[imagesIndex + 1] ?? null) : null;

if (!filePath) {
  console.error("Usage: tsx scripts/import-hardware.ts <file.json> [--images <dir>] [--dry-run] [--archive-missing]");
  process.exit(1);
}

const parsed = fileSchema.safeParse(JSON.parse(readFileSync(filePath, "utf8")));
if (!parsed.success) {
  console.error(`${filePath} does not match the expected format:\n`);
  for (const issue of parsed.error.issues) {
    console.error(`  ${issue.path.join(".") || "(root)"} — ${issue.message}`);
  }
  process.exit(1);
}

const file = parsed.data;

const brand = await prisma.brand.findUnique({
  where: { slug: file.brand },
  select: { id: true, name: true, slug: true },
});
if (!brand) {
  console.error(`No brand with slug "${file.brand}". Create it first, in the admin panel or the seed.`);
  process.exit(1);
}

const category = await prisma.category.findUnique({
  where: { slug: file.category },
  select: { id: true, name: true },
});
if (!category) {
  console.error(`No category with slug "${file.category}". Create it first.`);
  process.exit(1);
}

console.log(`\n${brand.name} → ${category.name}`);
console.log(`  ${file.models.length} model(s) in ${basename(filePath)}, checked ${file.checkedOn}`);
if (dryRun) console.log("  DRY RUN — nothing will be written\n");

const refused: string[] = [];
const missingImages: string[] = [];
let created = 0;
let updated = 0;
let archived = 0;

const seenSlugs = new Set<string>();

for (const model of file.models) {
  const consumerRange = consumerRangeIn(brand.slug, model);
  if (consumerRange) {
    refused.push(`${model.name} — ${consumerRange} is a consumer range`);
    continue;
  }

  const slug = slugify(`${brand.slug}-${model.name}`);
  seenSlugs.add(slug);

  const image = placeImage(imagesDir, model.image, slug, { write: !dryRun });
  if ("error" in image) missingImages.push(`${model.name} — ${image.error}`);

  const searchText = buildSearchText({
    name: model.name,
    brandName: brand.name,
    categoryName: category.name,
    series: model.series,
    partNumber: model.partNumber,
    formFactor: model.formFactor,
    shortDescription: model.shortDescription,
  });

  const data = {
    name: model.name,
    shortDescription: model.shortDescription,
    description: model.description,
    brandId: brand.id,
    categoryId: category.id,
    // A discontinued model stops being listed but keeps its page and its
    // record; see the note on `status` in the format above.
    status: model.status === "DISCONTINUED" ? ("ARCHIVED" as const) : ("ACTIVE" as const),
    availability:
      model.status === "DISCONTINUED" ? ("DISCONTINUED" as const) : ("MADE_TO_ORDER" as const),
    // Quote-only, always. Hardware never carries a public price.
    purchaseMode: "ENQUIRY" as const,
    features: model.businessFeatures,
    compatibility: [],
    keywords: [model.series, model.partNumber, brand.name],
    series: model.series,
    formFactor: model.formFactor as FormFactor,
    partNumber: model.partNumber,
    sourceUrl: model.sourceUrl,
    sourceCheckedAt: new Date(`${file.checkedOn}T00:00:00.000Z`),
    searchText,
    ...("url" in image ? { imageUrl: image.url } : {}),
  } satisfies Partial<Prisma.ProductUncheckedCreateInput>;

  if (dryRun) {
    const exists = await prisma.product.findUnique({ where: { slug }, select: { id: true } });
    if (exists) updated += 1;
    else created += 1;
    continue;
  }

  const existing = await prisma.product.findUnique({ where: { slug }, select: { id: true } });

  const product = await prisma.product.upsert({
    where: { slug },
    create: { slug, ...data },
    /*
     * `imageUrl` is only in `data` when this run placed one, so a run without
     * `--images` refreshes the specifications and leaves the photograph alone.
     * Anything else would blank the artwork every time somebody corrected a
     * description.
     */
    update: data,
    select: { id: true },
  });

  // Specifications are replaced wholesale: they come from one source, in one
  // order, and merging them by label would leave a removed row behind for ever.
  await prisma.productSpec.deleteMany({ where: { productId: product.id } });
  if (model.specifications.length > 0) {
    await prisma.productSpec.createMany({
      data: model.specifications.map((spec, index) => ({
        productId: product.id,
        label: spec.label,
        value: spec.value,
        displayOrder: index,
      })),
    });
  }

  /*
   * One variant, priced at zero, so the model can be added to an enquiry.
   *
   * Zero is not a price here — `purchaseMode: ENQUIRY` and the card's own
   * hardware check both suppress any figure — it is the absence of one. The
   * variant exists because the enquiry basket, quotations and orders are all
   * built on variants, and a model with none of them could be looked at but
   * never asked about.
   */
  await prisma.productVariant.upsert({
    where: { sku: model.partNumber },
    create: {
      productId: product.id,
      sku: model.partNumber,
      name: "As configured",
      licenceType: "HARDWARE",
      seats: 1,
      isDefault: true,
      listPriceMinor: 0,
      currency: "INR",
    },
    update: { productId: product.id, name: "As configured", listPriceMinor: 0 },
  });

  if (existing) updated += 1;
  else created += 1;
}

if (archiveMissing && !dryRun) {
  /*
   * Models this brand still lists that the file no longer names.
   *
   * Archived rather than deleted, because a product is referenced by every
   * enquiry, quotation and order that ever included it. Off by default: a
   * partial file — one brand's laptops, say — would otherwise archive that
   * brand's desktops on the first run.
   */
  const stale = await prisma.product.findMany({
    where: {
      brandId: brand.id,
      formFactor: { not: null },
      status: "ACTIVE",
      slug: { notIn: [...seenSlugs] },
    },
    select: { id: true, name: true },
  });

  for (const product of stale) {
    await prisma.product.update({
      where: { id: product.id },
      data: { status: "ARCHIVED", availability: "DISCONTINUED" },
    });
    console.log(`  archived: ${product.name}`);
  }
  archived = stale.length;
}

// ───────────────────────────────────────────────────────────────── report

console.log(`\n  ${created} created, ${updated} updated${archived ? `, ${archived} archived` : ""}`);

if (refused.length > 0) {
  console.log(`\n  ${refused.length} refused as consumer or gaming ranges:`);
  for (const line of refused) console.log(`    ${line}`);
}

if (missingImages.length > 0) {
  console.log(`\n  ${missingImages.length} model(s) without a photograph:`);
  for (const line of missingImages) console.log(`    ${line}`);
  console.log(
    "\n  These list with a placeholder frame rather than a stand-in picture, and\n" +
      "  `npm run verify:hardware` reports them. A photograph that is not the\n" +
      "  product is worse than none.",
  );
}

if (!dryRun) {
  console.log(
    "\n  The site serves its catalogue from a cache with a one-hour life, so a\n" +
      "  running deployment keeps showing the old listing until it restarts:\n" +
      "    docker compose -f docker-compose.prod.yml restart app",
  );
}

await prisma.$disconnect();
