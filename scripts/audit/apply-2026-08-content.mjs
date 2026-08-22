import { PrismaClient } from "@prisma/client";
import { pathToFileURL } from "node:url";
import { join } from "node:path";
import { register } from "node:module";

/**
 * Brings a running deployment's content up to the current seed.
 *
 * ## Why this has to exist
 *
 * The container seeds only when the database has no pages. That is the right
 * behaviour — a redeploy must never overwrite copy someone edited in the admin
 * panel — and it has a consequence that is easy to miss: **a release which adds
 * seeded content reaches a live site as new code and old rows.**
 *
 * That is exactly what happened. The homepage gained an "Our experience" strip,
 * an "Industries we serve" list, a certifications section and a hardware grid;
 * three ISO certificates were recorded; thirty-two brands were added; and About
 * moved to the front of the menu. Every one of those is a row. Deploying the
 * code changed the type scale and the hero and the icons — all code — and none
 * of the content, so the site came back looking new and reporting the same
 * missing sections.
 *
 * ## What it does
 *
 * Reconciles four things against the seed, and nothing else:
 *
 *   1. the home page's sections, replaced wholesale
 *   2. certifications, upserted by standard and certificate number
 *   3. brands, created where absent — existing rows are left alone
 *   4. the header menu's order
 *
 * ## What it deliberately does not do
 *
 * It does not touch products, prices, enquiries, orders, users or any page
 * other than the home page. It does not overwrite a brand that already exists,
 * because that brand's copy may have been edited. Re-running it is safe.
 */

// The seed data is TypeScript; tsx is already a dependency for `db:seed`.
register("tsx/esm", pathToFileURL("./"));

const prisma = new PrismaClient();

const { pageSeeds, navigationSeeds } = await import(
  pathToFileURL(join(process.cwd(), "prisma/seed-data/pages.ts")).href
);
const { brands } = await import(
  pathToFileURL(join(process.cwd(), "prisma/seed-data/brands.ts")).href
);
const { certifications } = await import(
  pathToFileURL(join(process.cwd(), "prisma/seed-data/certifications.ts")).href
);

let changed = 0;

// ─────────────────────────────────────────────────────── 1. the home page
{
  const seed = pageSeeds.find((page) => page.slug === "");
  if (!seed) throw new Error("No home page in the seed data.");

  const page = await prisma.page.findUnique({ where: { slug: "" }, select: { id: true } });
  if (!page) {
    console.log("  no home page in this database — skipping sections");
  } else {
    /*
     * Replaced rather than merged.
     *
     * The sections were renumbered when the new ones were inserted, so matching
     * old rows to new ones by position would pair the wrong blocks together.
     * The home page is entirely seed-authored, so replacing it loses nothing —
     * and this is the one page for which that is true, which is why the script
     * touches no other.
     */
    const before = await prisma.pageSection.count({ where: { pageId: page.id } });
    await prisma.pageSection.deleteMany({ where: { pageId: page.id } });
    await prisma.pageSection.createMany({
      data: seed.sections.map((section) => ({
        pageId: page.id,
        type: section.type,
        displayOrder: section.displayOrder,
        visible: section.visible,
        data: section.data,
      })),
    });
    console.log(`  home page: ${before} sections replaced with ${seed.sections.length}`);
    changed += 1;

    // The hero copy and the page's own metadata changed alongside the blocks.
    await prisma.page.update({
      where: { id: page.id },
      data: { title: seed.title, description: seed.description, keywords: seed.keywords },
    });
  }
}

// ──────────────────────────────────────────────────── 2. certifications
for (const certification of certifications) {
  const data = {
    title: certification.title,
    issuer: certification.issuer,
    verifyUrl: certification.verifyUrl,
    scope: certification.scope,
    issuedAt: new Date(`${certification.issuedAt}T00:00:00.000Z`),
    expiresAt: certification.expiresAt
      ? new Date(`${certification.expiresAt}T00:00:00.000Z`)
      : null,
    displayOrder: certification.displayOrder,
  };
  await prisma.certification.upsert({
    where: {
      standard_reference: {
        standard: certification.standard,
        reference: certification.reference,
      },
    },
    create: { ...data, standard: certification.standard, reference: certification.reference },
    update: data,
  });
}
console.log(`  certifications: ${certifications.length} present`);

// ─────────────────────────────────────────────────────────── 3. brands
{
  const existing = new Set(
    (await prisma.brand.findMany({ select: { slug: true } })).map((brand) => brand.slug),
  );

  const added = brands.filter((brand) => !existing.has(brand.slug));
  for (const brand of added) {
    await prisma.brand.create({
      data: {
        slug: brand.slug,
        name: brand.name,
        tagline: brand.tagline,
        summary: brand.summary,
        description: brand.description,
        logoText: brand.logoText,
        accentColor: brand.accentColor,
        displayOrder: brand.displayOrder,
        featured: brand.featured,
      },
    });
  }
  console.log(`  brands: ${added.length} added, ${existing.size} left untouched`);
  if (added.length > 0) changed += 1;
}

// ────────────────────────────────────────────────── 4. header menu order
{
  let moved = 0;
  for (const item of navigationSeeds) {
    if (item.menu !== "HEADER" || item.parentKey !== null) continue;
    const row = await prisma.navigationItem.findFirst({
      where: { menu: "HEADER", parentId: null, label: item.label },
      select: { id: true, displayOrder: true },
    });
    if (!row || row.displayOrder === item.displayOrder) continue;
    await prisma.navigationItem.update({
      where: { id: row.id },
      data: { displayOrder: item.displayOrder },
    });
    moved += 1;
  }
  console.log(`  header menu: ${moved} item(s) reordered`);
  if (moved > 0) changed += 1;
}

await prisma.$disconnect();

console.log(
  changed > 0
    ? "\nContent updated. Restart the app so it stops serving the cached pages:\n  docker compose -f docker-compose.prod.yml restart app"
    : "\nNothing to change — this database already matches the seed.",
);
