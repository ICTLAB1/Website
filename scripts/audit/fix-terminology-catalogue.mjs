import { PrismaClient } from "@prisma/client";

/**
 * The same terminology fix as `fix-terminology.mjs`, over the catalogue tables.
 *
 * Products, brands, services, FAQs and articles hold prose of their own, and it
 * used the same ambiguous "vendor" — most visibly in the delivery note repeated
 * across 29 products, which told buyers their licences were provisioned "into
 * your tenant or vendor account". The account belongs to the publisher.
 *
 * Substring replacements rather than whole-field ones, because these are
 * sentences inside long descriptions. Safe to run twice: a phrase that has
 * already been replaced no longer matches.
 *
 * Every value is walked, not just the top-level strings. The first version of
 * this script checked `typeof value === "string"` on each column and reported
 * itself clean — while `Service.benefits`, `Service.process` and
 * `Service.technologies` are arrays of strings and JSON objects, so four
 * occurrences on the IT procurement page survived and the script said nothing.
 * A crawl of the rendered site is what found them. Both the rewriter and the
 * reporter below now recurse.
 */

/** Rewrites every string anywhere inside a value, preserving its shape. */
function rewrite(value) {
  if (typeof value === "string") {
    let next = value;
    for (const [from, to] of REPLACEMENTS) {
      if (next.includes(from)) next = next.split(from).join(to);
    }
    return next;
  }
  if (Array.isArray(value)) return value.map(rewrite);
  if (value && typeof value === "object" && !(value instanceof Date)) {
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, rewrite(entry)]));
  }
  return value;
}

/** @type {Array<[string, string]>} */
const REPLACEMENTS = [
  // Software makers.
  ["into your tenant or vendor account", "into your tenant or publisher account"],
  ["assignments in each vendor's admin console", "assignments in each publisher's admin console"],
  [
    "a single vendor covering CRM, accounting, service desk and collaboration",
    "a single publisher covering CRM, accounting, service desk and collaboration",
  ],
  [
    "certified by the software vendors whose applications run on them",
    "certified by the software publishers whose applications run on them",
  ],
  ["one portal per vendor", "one portal per publisher"],

  // Hardware makers.
  [
    "shipped from the vendor or distributor",
    "shipped from the manufacturer or distributor",
  ],
  [
    "standardise a mixed estate on one vendor and one support relationship",
    "standardise a mixed estate on one manufacturer and one support relationship",
  ],
  ["two hardware vendors", "two hardware manufacturers"],
  ["several publishers and hardware vendors", "several publishers and hardware manufacturers"],

  // Companies the customer would otherwise buy from directly.
  ["seven vendor relationships", "seven supplier relationships"],
  ["depend on vendor response", "depend on the publisher's or manufacturer's response"],

  // Catalogue and offer labels.
  ["Multi-vendor sourcing", "Multi-brand sourcing"],
  ["One quotation covering multiple vendors", "One quotation covering multiple brands"],
  ["One point of contact for order status across vendors", "One point of contact for order status across brands"],
  ["rather than per-vendor variation", "rather than per-supplier variation"],
  [
    "We source across the relevant publishers and vendors",
    "We source across the relevant publishers and manufacturers",
  ],
  ["multi-vendor solutions", "multi-brand solutions"],
  ["Can you supply multiple vendors on one purchase order?", "Can you supply multiple brands on one purchase order?"],
];

const prisma = new PrismaClient();

const TABLES = {
  brand: prisma.brand,
  category: prisma.category,
  service: prisma.service,
  faq: prisma.faq,
  blogPost: prisma.blogPost,
  product: prisma.product,
};

let fields = 0;
let rowsWritten = 0;

for (const table of Object.values(TABLES)) {
  for (const row of await table.findMany()) {
    /** @type {Record<string, string>} */
    const update = {};

    for (const [field, value] of Object.entries(row)) {
      if (field === "id" || value instanceof Date) continue;
      if (!/vendor/i.test(JSON.stringify(value) ?? "")) continue;

      const next = rewrite(value);
      if (JSON.stringify(next) !== JSON.stringify(value)) {
        update[field] = next;
        fields += 1;
      }
    }

    if (Object.keys(update).length > 0) {
      await table.update({ where: { id: row.id }, data: update });
      rowsWritten += 1;
    }
  }
}

console.log(`${fields} field(s) rewritten across ${rowsWritten} row(s).`);

// Report anything the replacement list did not cover, so a phrase added later
// cannot slip past unnoticed.
const remaining = [];
for (const [name, table] of Object.entries(TABLES)) {
  for (const row of await table.findMany()) {
    for (const [field, value] of Object.entries(row)) {
      // Serialised, so a string nested inside an array or a JSON object is
      // searched too. Missing those is what let this script lie the first time.
      const text = typeof value === "string" ? value : (JSON.stringify(value) ?? "");
      for (const match of text.matchAll(/.{0,45}vendor.{0,45}/gi)) {
        remaining.push(`${name}.${field} :: …${match[0].replace(/\s+/g, " ")}…`);
      }
    }
  }
}

if (remaining.length) {
  console.log("\nSTILL CONTAINS “vendor”:");
  for (const line of [...new Set(remaining)]) console.log("  " + line);
  process.exitCode = 1;
} else {
  console.log("No occurrences of “vendor” remain in the catalogue tables.");
}

await prisma.$disconnect();
