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
 * sentences inside long descriptions. Every replacement is checked for
 * ambiguity first: a phrase that appears in a field where the "after" text is
 * already present is skipped, so the script is safe to run twice.
 */

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
      if (typeof value !== "string" || !/vendor/i.test(value)) continue;

      let next = value;
      for (const [from, to] of REPLACEMENTS) {
        if (next.includes(from)) next = next.split(from).join(to);
      }

      if (next !== value) {
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
      if (typeof value !== "string") continue;
      for (const match of value.matchAll(/.{0,45}vendor.{0,45}/gi)) {
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
