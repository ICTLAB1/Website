import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import type { FormFactor, Prisma, PrismaClient } from "@prisma/client";
import { z } from "zod";

/**
 * Commercial hardware, as data files, and the one function that writes them.
 *
 * ## Why this lives under `prisma/` rather than beside the importer
 *
 * Because it has to reach three places, and only one of them is a developer's
 * terminal:
 *
 *   - `scripts/import-hardware.ts`, for loading a new line card by hand;
 *   - the seed, so a database created tomorrow has the catalogue;
 *   - a content migration, so the database already serving gets it on deploy.
 *
 * `prisma/` is what the container image copies, so this is where the data can
 * be read from all three. Leaving it in `data/` meant the catalogue existed on
 * the machine that imported it and nowhere else — which is the same failure the
 * content-migration mechanism was built to end.
 *
 * ## The format
 *
 * Documented in `README.md` beside this file, with a worked example. The schema
 * below is the enforcement: a file that does not match is rejected field by
 * field rather than half-imported.
 */

const optionalText = (max: number, min = 1) =>
  z
    .string()
    .trim()
    .min(min)
    .max(max)
    .nullish()
    .transform((value) => value ?? undefined);

const FORM_FACTORS = [
  "LAPTOP",
  "MOBILE_WORKSTATION",
  "DESKTOP_TOWER",
  "DESKTOP_SFF",
  "DESKTOP_MINI",
  "DESKTOP_WORKSTATION",
  "ALL_IN_ONE",
  "TOWER_SERVER",
  "RACK_SERVER",
] as const;

const specSchema = z.object({
  label: z.string().trim().min(1).max(60),
  value: z.string().trim().min(1).max(400),
});

const configurationSchema = z.object({
  partNumber: optionalText(60, 2),
  alsoOrderedAs: z
    .array(z.string().trim().min(2).max(60))
    .max(6)
    .nullish()
    .transform((value) => value ?? []),
  processor: z.string().trim().min(2).max(160),
  memory: z.string().trim().min(1).max(120),
  storage: z.string().trim().min(1).max(240),
  graphics: optionalText(200),
  operatingSystem: optionalText(160),
  /** Servers: the RAID card, where the source names one. */
  raidController: optionalText(200),
  /** Servers: iDRAC, iLO and the like. */
  systemManagement: optionalText(160),
  opticalDrive: optionalText(60),
  /**
   * 120 characters, not 40. A workstation says "700W"; a server says "Dual
   * hot-plug redundant (1+1), 1400W, mixed mode", and truncating that would
   * lose the redundancy — which is the half of it a buyer is choosing.
   */
  powerSupply: optionalText(120),
  warranty: z.string().trim().min(2).max(120),
  note: optionalText(200),
});

const modelSchema = z.object({
  name: z.string().trim().min(3).max(160),
  series: z.string().trim().min(1).max(60),
  formFactor: z.enum(FORM_FACTORS),
  shortDescription: z.string().trim().min(20).max(400),
  description: z.string().trim().min(40).max(4000),
  businessFeatures: z
    .array(z.string().trim().min(3).max(200))
    .max(20)
    .nullish()
    .transform((value) => value ?? []),
  specifications: z
    .array(specSchema)
    .max(40)
    .nullish()
    .transform((value) => value ?? []),
  configurations: z.array(configurationSchema).min(1).max(60),
  /** The public path of a photograph committed to `public/products/`. */
  image: optionalText(200),
  sourceUrl: z
    .string()
    .trim()
    .url()
    .max(500)
    .nullish()
    .transform((value) => value ?? undefined),
  status: z.enum(["ACTIVE", "DISCONTINUED"]).default("ACTIVE"),
});

export const hardwareFileSchema = z.object({
  brand: z.string().trim().min(1).max(60),
  category: z.string().trim().min(1).max(60),
  source: z.string().trim().min(8).max(300),
  checkedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  models: z.array(modelSchema).min(1).max(500),
});

export type HardwareFile = z.infer<typeof hardwareFileSchema>;
export type HardwareModel = HardwareFile["models"][number];

/**
 * Ranges that are not business ranges, by brand.
 *
 * Matched as whole words against the model name and the series, so "Pavilion"
 * is caught and "ProBook" is not caught by "Pro". Refused rather than warned
 * about: a warning in a log is a thing nobody reads, and a consumer laptop
 * listed for government procurement is a thing everybody sees.
 */
export const CONSUMER_RANGES: Record<string, string[]> = {
  hp: ["Pavilion", "Envy", "OMEN", "Victus", "Chromebook", "Stream"],
  lenovo: ["IdeaPad", "IdeaCentre", "Legion", "LOQ", "Yoga Slim", "Chromebook"],
  acer: ["Aspire", "Nitro", "Predator", "Swift", "Spin", "Chromebook"],
};

export function consumerRangeIn(brandSlug: string, model: HardwareModel): string | null {
  const ranges = CONSUMER_RANGES[brandSlug.toLowerCase()] ?? [];
  const haystack = `${model.series} ${model.name}`;

  for (const range of ranges) {
    const pattern = new RegExp(`\\b${range.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
    if (pattern.test(haystack)) return range;
  }
  return null;
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/**
 * The search haystack.
 *
 * Built here rather than imported from `lib/search-text`, which is
 * `server-only` and therefore unavailable to the seed and to a command-line
 * script. The fields differ from software anyway: a hardware buyer searches for
 * a series and a part number, and both have to be in here for `ThinkPad T14`
 * and a number pasted out of a tender document to find the same model.
 */
function searchTextFor(input: {
  name: string;
  brandName: string;
  categoryName: string;
  series: string;
  partNumbers: string[];
  formFactor: string;
  shortDescription: string;
}): string {
  return [
    input.name,
    input.brandName,
    input.categoryName,
    input.series,
    ...input.partNumbers,
    input.formFactor.replace(/_/g, " "),
    input.shortDescription,
  ]
    .join(" ")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 2000);
}

/** A path under `/products/`, or null. Mirrors `lib/product-image`. */
function safeImagePath(value: string | undefined): string | null {
  if (!value) return null;
  if (!value.startsWith("/products/")) return null;
  if (value.includes("..") || value.includes("//") || value.includes("?")) return null;
  return /^\/products\/[A-Za-z0-9][A-Za-z0-9._-]*\.(png|jpg|jpeg|webp|avif)$/i.test(value)
    ? value
    : null;
}

export type ApplyResult = {
  created: number;
  updated: number;
  configurations: number;
  refused: string[];
  withoutPhotograph: string[];
  slugs: string[];
};

/**
 * Writes one file's models into the database. Re-runnable.
 *
 * Never writes a price: every configuration becomes a zero-priced,
 * enquiry-only variant whatever the source contained. Manufacturer feeds carry
 * MRP and promotional pricing, and the safest way to keep it off a quotation
 * catalogue is to have nowhere to put it.
 */
export async function applyHardwareFile(
  prisma: PrismaClient,
  file: HardwareFile,
): Promise<ApplyResult> {
  const result: ApplyResult = {
    created: 0,
    updated: 0,
    configurations: 0,
    refused: [],
    withoutPhotograph: [],
    slugs: [],
  };

  const brand = await prisma.brand.findUnique({
    where: { slug: file.brand },
    select: { id: true, name: true, slug: true },
  });
  if (!brand) throw new Error(`No brand with slug "${file.brand}".`);

  const category = await prisma.category.findUnique({
    where: { slug: file.category },
    select: { id: true, name: true },
  });
  if (!category) throw new Error(`No category with slug "${file.category}".`);

  const checkedAt = new Date(`${file.checkedOn}T00:00:00.000Z`);

  for (const model of file.models) {
    const consumerRange = consumerRangeIn(brand.slug, model);
    if (consumerRange) {
      result.refused.push(`${model.name} — ${consumerRange} is a consumer range`);
      continue;
    }

    /*
     * The brand prefixes the slug only when the name does not already carry it.
     * A line card names a model "HP Z2 G1i Tower Workstation", and prefixing
     * unconditionally produced `/products/hp-hp-z2-g1i-…`.
     */
    /*
     * Checked against the slug as well as the name.
     *
     * "Dell PowerEdge R770" does not start with "Dell Technologies", which is
     * the brand's name, so a name test alone produced
     * `/products/dell-dell-poweredge-r770`. The slug is the shorter, commoner
     * form a model name actually carries.
     */
    const lower = model.name.toLowerCase();
    const alreadyPrefixed =
      lower.startsWith(`${brand.name.toLowerCase()} `) || lower.startsWith(`${brand.slug} `);
    const slug = slugify(alreadyPrefixed ? model.name : `${brand.slug}-${model.name}`);
    result.slugs.push(slug);

    const partNumbers = model.configurations.flatMap((configuration) =>
      [configuration.partNumber, ...configuration.alsoOrderedAs].filter(
        (value): value is string => Boolean(value),
      ),
    );

    const image = safeImagePath(model.image);
    if (!image) result.withoutPhotograph.push(model.name);

    const data = {
      name: model.name,
      shortDescription: model.shortDescription,
      description: model.description,
      brandId: brand.id,
      categoryId: category.id,
      status: model.status === "DISCONTINUED" ? ("ARCHIVED" as const) : ("ACTIVE" as const),
      availability:
        model.status === "DISCONTINUED" ? ("DISCONTINUED" as const) : ("MADE_TO_ORDER" as const),
      // Quote-only, always.
      purchaseMode: "ENQUIRY" as const,
      features: model.businessFeatures,
      compatibility: [],
      keywords: [model.series, brand.name, ...partNumbers].slice(0, 30),
      series: model.series,
      formFactor: model.formFactor as FormFactor,
      // Only where every build shares one; with several it belongs per build.
      partNumber: partNumbers.length === 1 ? (partNumbers[0] ?? null) : null,
      sourceUrl: model.sourceUrl ?? null,
      sourceCheckedAt: checkedAt,
      searchText: searchTextFor({
        name: model.name,
        brandName: brand.name,
        categoryName: category.name,
        series: model.series,
        partNumbers,
        formFactor: model.formFactor,
        shortDescription: model.shortDescription,
      }),
      // Only when the file names one, so a re-import that corrects a
      // description does not blank a photograph somebody uploaded since.
      ...(image ? { imageUrl: image } : {}),
    } satisfies Partial<Prisma.ProductUncheckedCreateInput>;

    const existing = await prisma.product.findUnique({ where: { slug }, select: { id: true } });
    const product = await prisma.product.upsert({
      where: { slug },
      create: { slug, ...data },
      update: data,
      select: { id: true },
    });

    // Replaced wholesale: they come from one source in one order, and merging
    // by label would leave a removed row behind for ever.
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
     * A line card can list the same part number twice — a stock build and a
     * modified one — and they are different machines. The number stays on both
     * rows, because it is what a purchase order will carry; only the site's
     * internal key differs.
     */
    const claimed = new Set<string>();
    const keyFor = (configuration: (typeof model.configurations)[number], position: number) => {
      if (configuration.partNumber && !claimed.has(configuration.partNumber)) {
        claimed.add(configuration.partNumber);
        return configuration.partNumber;
      }
      if (configuration.partNumber) claimed.add(configuration.partNumber);
      return `${slug}-c${position + 1}`;
    };

    const keys: string[] = [];
    let position = 0;
    for (const configuration of model.configurations) {
      const sku = keyFor(configuration, position);
      keys.push(sku);

      const build = {
        productId: product.id,
        name: [configuration.processor, configuration.memory, configuration.storage]
          .join(" · ")
          .slice(0, 200),
        licenceType: "HARDWARE" as const,
        seats: 1,
        isDefault: position === 0,
        // Zero is the absence of a price, not a price.
        listPriceMinor: 0,
        currency: "INR",
        partNumber: configuration.partNumber ?? null,
        processor: configuration.processor,
        memory: configuration.memory,
        storage: configuration.storage,
        graphics: configuration.graphics,
        operatingSystem: configuration.operatingSystem ?? null,
        raidController: configuration.raidController ?? null,
        systemManagement: configuration.systemManagement ?? null,
        opticalDrive: configuration.opticalDrive ?? null,
        powerSupply: configuration.powerSupply ?? null,
        warranty: configuration.warranty,
        configNote:
          [
            configuration.note,
            configuration.alsoOrderedAs.length > 0
              ? `Also ordered as ${configuration.alsoOrderedAs.join(", ")}`
              : null,
          ]
            .filter(Boolean)
            .join(" · ") || null,
      };

      await prisma.productVariant.upsert({
        where: { sku },
        create: { sku, ...build },
        update: build,
      });
      position += 1;
    }

    /*
     * Builds the file no longer lists are retired, not deleted: an enquiry,
     * quotation or order that included one still points at it, and deleting
     * the row underneath a historical document breaks the document.
     */
    await prisma.productVariant.updateMany({
      where: { productId: product.id, sku: { notIn: keys }, deletedAt: null },
      data: { deletedAt: new Date() },
    });
    await prisma.productVariant.updateMany({
      where: { productId: product.id, sku: { in: keys }, deletedAt: { not: null } },
      data: { deletedAt: null },
    });

    result.configurations += model.configurations.length;
    if (existing) result.updated += 1;
    else result.created += 1;
  }

  return result;
}

/**
 * Every hardware file shipped with the application, parsed and validated.
 *
 * Read from disk rather than imported, so adding a manufacturer's line card is
 * dropping a file in this directory — no import to remember, and no way for a
 * file to sit here being silently ignored. `example.json` is documentation and
 * is skipped by name.
 */
export function hardwareFiles(): Array<{ name: string; file: HardwareFile }> {
  const here = dirname(fileURLToPath(import.meta.url));

  return readdirSync(here)
    .filter((name) => name.endsWith(".json") && name !== "example.json")
    .sort()
    .map((name) => {
      const parsed = hardwareFileSchema.safeParse(
        JSON.parse(readFileSync(join(here, name), "utf8")),
      );
      if (!parsed.success) {
        const detail = parsed.error.issues
          .slice(0, 5)
          .map((issue) => `${issue.path.join(".") || "(root)"} — ${issue.message}`)
          .join("; ");
        throw new Error(`${name} does not match the hardware file format: ${detail}`);
      }
      return { name, file: parsed.data };
    });
}
