/**
 * Loads a manufacturer's line card into the catalogue.
 *
 *     npx tsx scripts/import-hardware.ts prisma/seed-data/hardware/hp-workstations.json
 *     npx tsx scripts/import-hardware.ts <file> --dry-run
 *     npx tsx scripts/import-hardware.ts <file> --images ~/hp-photos
 *     npx tsx scripts/import-hardware.ts <file> --archive-missing
 *
 * The format lives in `prisma/seed-data/hardware/README.md`, with an example
 * beside it, and the writing itself lives in `prisma/seed-data/hardware` — this
 * file is the command-line way in, not the logic. The same function runs from
 * the seed, so a new database has the catalogue, and from a content migration,
 * so the database already serving gets it on the next deploy.
 *
 * ## What --images does, and why it is separate
 *
 * Copies photographs into `public/products/` and validates each by its own
 * leading bytes — a feed that hands over an HTML error page named
 * `elitebook.jpg` is not a hypothetical; it is what a rate-limited download
 * looks like. It is an authoring step rather than part of the import because
 * `public/` is copied into the container image at build time: a file placed
 * there on a running server disappears at the next deploy, so catalogue artwork
 * belongs in the same commit as the data.
 */
import { readFileSync, existsSync, copyFileSync, mkdirSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";

import { PrismaClient } from "@prisma/client";

import { detectImage } from "../src/lib/image-bytes";
import { applyHardwareFile, hardwareFileSchema } from "../prisma/seed-data/hardware";

const prisma = new PrismaClient();

const [, , filePath, ...rest] = process.argv;
const dryRun = rest.includes("--dry-run");
const archiveMissing = rest.includes("--archive-missing");
const imagesIndex = rest.indexOf("--images");
const imagesDir = imagesIndex >= 0 ? (rest[imagesIndex + 1] ?? null) : null;

if (!filePath) {
  console.error(
    "Usage: tsx scripts/import-hardware.ts <file.json> [--images <dir>] [--dry-run] [--archive-missing]",
  );
  process.exit(1);
}

const raw = JSON.parse(readFileSync(filePath, "utf8")) as Record<string, unknown>;
const parsed = hardwareFileSchema.safeParse(raw);
if (!parsed.success) {
  console.error(`${filePath} does not match the expected format:\n`);
  for (const issue of parsed.error.issues) {
    console.error(`  ${issue.path.join(".") || "(root)"} — ${issue.message}`);
  }
  process.exit(1);
}

const file = parsed.data;
const imageProblems: string[] = [];

/*
 * Photographs, placed before the models are written.
 *
 * The file names a source filename; what gets stored is the public path, and
 * the file is rewritten with it. That write-back is deliberate: the path is
 * what the seed and the content migration will use on machines that never see
 * the photograph folder, so it has to be committed alongside the data rather
 * than recomputed from a directory that only existed on one laptop.
 */
if (imagesDir) {
  const targetDir = join(process.cwd(), "public", "products");
  if (!dryRun) mkdirSync(targetDir, { recursive: true });

  for (const model of file.models) {
    if (!model.image) continue;
    const source = join(imagesDir, basename(model.image));

    if (!existsSync(source)) {
      imageProblems.push(`${model.name} — not found: ${basename(model.image)}`);
      continue;
    }

    const buffer = readFileSync(source);
    const kind = detectImage(buffer);
    if (!kind) {
      imageProblems.push(`${model.name} — not an image: ${basename(model.image)}`);
      continue;
    }
    if (kind.extension === "svg") {
      // A photograph is not a vector. An SVG here means the feed handed over an
      // icon or a placeholder, which is the thing this catalogue must not show
      // in place of a product.
      imageProblems.push(`${model.name} — ${basename(model.image)} is an SVG, not a photograph`);
      continue;
    }

    const stem = model.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    const name = `${stem}.${kind.extension}`;

    if (!dryRun) copyFileSync(source, join(targetDir, name));
    model.image = `/products/${name}`;
  }

  if (!dryRun) {
    writeFileSync(filePath, `${JSON.stringify({ ...raw, models: file.models }, null, 1)}\n`);
    console.log(`  photograph paths written back into ${basename(filePath)}`);
  }
}

console.log(`\n${file.brand} → ${file.category}`);
console.log(`  ${file.models.length} model(s) in ${basename(filePath)}, checked ${file.checkedOn}`);
console.log(`  source: ${file.source}`);

if (dryRun) {
  console.log("  DRY RUN — nothing will be written\n");
  for (const model of file.models) {
    const exists = await prisma.product.findFirst({
      where: { name: model.name },
      select: { id: true },
    });
    console.log(
      `  ${exists ? "update" : "create"}  ${model.name} — ${model.configurations.length} build(s)`,
    );
  }
} else {
  const result = await applyHardwareFile(prisma, file);

  console.log(
    `\n  ${result.created} model(s) created, ${result.updated} updated, ${result.configurations} configuration(s)`,
  );

  if (result.refused.length > 0) {
    console.log(`\n  ${result.refused.length} refused as consumer or gaming ranges:`);
    for (const line of result.refused) console.log(`    ${line}`);
  }

  if (result.withoutPhotograph.length > 0) {
    console.log(`\n  ${result.withoutPhotograph.length} model(s) without a photograph:`);
    for (const line of result.withoutPhotograph) console.log(`    ${line}`);
    console.log(
      "\n  These list with a labelled empty frame rather than a stand-in picture,\n" +
        "  and `npm run verify:hardware` reports them. A photograph that is not\n" +
        "  the product is worse than none.",
    );
  }

  if (archiveMissing) {
    /*
     * Models this brand still lists that the file no longer names.
     *
     * Archived rather than deleted, because a product is referenced by every
     * enquiry, quotation and order that ever included it. Off by default: a
     * partial file — one brand's laptops, say — would otherwise archive that
     * brand's desktops on the first run.
     */
    const brand = await prisma.brand.findUnique({
      where: { slug: file.brand },
      select: { id: true },
    });

    const stale = brand
      ? await prisma.product.findMany({
          where: {
            brandId: brand.id,
            formFactor: { not: null },
            status: "ACTIVE",
            slug: { notIn: result.slugs },
          },
          select: { id: true, name: true },
        })
      : [];

    for (const product of stale) {
      await prisma.product.update({
        where: { id: product.id },
        data: { status: "ARCHIVED", availability: "DISCONTINUED" },
      });
      console.log(`  archived: ${product.name}`);
    }
  }

  console.log(
    "\n  Commit the file. It reaches a running site on the next deploy, through\n" +
      "  the content migration that applies these — nothing to run on the server.",
  );
}

if (imageProblems.length > 0) {
  console.log(`\n  ${imageProblems.length} photograph problem(s):`);
  for (const line of imageProblems) console.log(`    ${line}`);
}

await prisma.$disconnect();
