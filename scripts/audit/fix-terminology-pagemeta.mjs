import { PrismaClient } from "@prisma/client";

/**
 * The terminology fix, over the page records themselves.
 *
 * `Page.title`, `description` and `keywords` are SEO metadata rather than
 * blocks, so the block sweep never saw them — and a page description is exactly
 * the text a search engine quotes. Same substitution rules as the block and
 * catalogue passes; idempotent for the same reason.
 */

const REPLACEMENTS = [
  ["from multiple vendors into a single", "from multiple publishers and manufacturers into a single"],
  ["Multi-vendor sourcing", "Multi-brand sourcing"],
  ["multi-vendor sourcing", "multi-brand sourcing"],
  ["procurement explainers and vendor comparisons", "procurement explainers and brand comparisons"],
];

const prisma = new PrismaClient();
let changed = 0;

for (const page of await prisma.page.findMany({
  select: { id: true, slug: true, title: true, description: true, keywords: true },
})) {
  const update = {};

  for (const field of ["title", "description"]) {
    let next = page[field];
    for (const [from, to] of REPLACEMENTS) next = next.split(from).join(to);
    if (next !== page[field]) update[field] = next;
  }

  const keywords = page.keywords.map((keyword) =>
    REPLACEMENTS.reduce((value, [from, to]) => value.split(from).join(to), keyword),
  );
  if (keywords.some((keyword, index) => keyword !== page.keywords[index])) update.keywords = keywords;

  if (Object.keys(update).length > 0) {
    await prisma.page.update({ where: { id: page.id }, data: update });
    console.log(`  ${page.slug || "(home)"}: ${Object.keys(update).join(", ")}`);
    changed += 1;
  }
}

const left = await prisma.page.findMany({
  where: {
    OR: [
      { title: { contains: "vendor", mode: "insensitive" } },
      { description: { contains: "vendor", mode: "insensitive" } },
      { keywords: { has: "vendor" } },
    ],
  },
  select: { slug: true },
});

console.log(`${changed} page record(s) updated.`);
if (left.length) {
  console.log("STILL CONTAINS “vendor”: " + left.map((p) => p.slug || "(home)").join(", "));
  process.exitCode = 1;
}

await prisma.$disconnect();
