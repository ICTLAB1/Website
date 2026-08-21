import { PrismaClient } from "@prisma/client";

/**
 * Removes the duplicated product listing from the home page.
 *
 * The page carried two product grids: "Popular products" sourced from
 * `popular`, and four sections later "Featured products" sourced from
 * `featured`. Two different sources, two different headings — and, as it turns
 * out, the same six products in the same order, because every product flagged
 * as featured also happens to be in the top six by popularity. A visitor
 * scrolling the home page met Microsoft 365 Business Standard, Creative Cloud,
 * AutoCAD, Business Premium, Acrobat Pro and Revit twice.
 *
 * The "Popular" grid is the one kept. Its claim is checkable — these are the
 * licences most often quoted, and the ordering comes from the data rather than
 * from an editorial flag — and it sits higher, right after the categories.
 * "Featured" said the same thing with less behind it.
 *
 * The brand strip under the hero and the brand grid lower down are left alone.
 * They also show the same rows, but they are not the same section twice: the
 * strip is a wordmark bar establishing which brands are carried, the grid is a
 * browsable section that now states the commercial relationship outright. The
 * strip's caption is rewritten here so that it, too, says which way the
 * relationship runs rather than leaving a row of other companies' names to
 * imply it.
 *
 * Safe to run twice.
 */

const prisma = new PrismaClient();

const home = await prisma.page.findUnique({
  where: { slug: "" },
  select: { id: true, sections: { select: { id: true, type: true, displayOrder: true, data: true } } },
});

if (!home) {
  console.log("No home page found.");
  process.exit(1);
}

const featured = home.sections.find(
  (section) => section.type === "PRODUCT_GRID" && section.data?.source === "featured",
);

if (featured) {
  const popular = home.sections.find(
    (section) => section.type === "PRODUCT_GRID" && section.data?.source === "popular",
  );

  if (!popular) {
    // Removing the duplicate must never leave the page with no products on it.
    console.log("Refusing to remove the featured grid: there is no popular grid to keep.");
    process.exit(1);
  }

  await prisma.pageSection.delete({ where: { id: featured.id } });
  console.log(`Removed the duplicate "Featured products" grid (position ${featured.displayOrder}).`);
} else {
  console.log("No duplicate product grid to remove.");
}

const strip = home.sections.find(
  (section) =>
    section.type === "COLLECTION_GRID" &&
    section.data?.kind === "brands" &&
    section.data?.layout === "strip",
);

const CAPTION = "Authorised to resell licensing from";

if (strip && strip.data.heading !== CAPTION) {
  await prisma.pageSection.update({
    where: { id: strip.id },
    data: { data: { ...strip.data, heading: CAPTION } },
  });
  console.log(`Brand strip caption: "${strip.data.heading}" → "${CAPTION}"`);
} else {
  console.log("Brand strip caption already correct.");
}

await prisma.$disconnect();
