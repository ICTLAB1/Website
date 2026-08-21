import { PrismaClient } from "@prisma/client";

/**
 * Brings five page descriptions under the length a search result will show.
 *
 * Google renders roughly 155–160 characters of a meta description on desktop
 * and less on mobile. These five ran to 181–184, so each lost its final clause
 * to an ellipsis — and in every case that clause was the one naming what the
 * page is actually for. Shortened by cutting, not by rewording: the sentence
 * that survives is the one that was already there.
 *
 * Safe to run twice.
 */

const DESCRIPTIONS = {
  "": "Microsoft, Adobe, Autodesk, Zoho and enterprise technology from one procurement partner. Consolidated quotations, GST invoicing and licence management.",
  about:
    "An enterprise technology procurement partner, consolidating software licensing, cloud and IT solutions from many publishers into one commercial relationship.",
  enterprise:
    "One procurement partner for your technology stack: multi-brand sourcing, one consolidated quotation, one purchase order, GST invoicing and managed renewals.",
  zoho: "Zoho CRM, Books, Desk, Workplace, Mail and Zoho One licensing, with the data migration, workflow configuration and onboarding that decide whether it is adopted.",
};

const prisma = new PrismaClient();
let changed = 0;

for (const [slug, description] of Object.entries(DESCRIPTIONS)) {
  if (description.length > 160) {
    console.log(`  ${slug || "(home)"}: replacement is itself ${description.length} characters`);
    process.exitCode = 1;
    continue;
  }

  const page = await prisma.page.findUnique({ where: { slug }, select: { id: true, description: true } });
  if (!page) {
    console.log(`  ${slug || "(home)"}: no such page`);
    continue;
  }
  if (page.description === description) continue;

  await prisma.page.update({ where: { id: page.id }, data: { description } });
  console.log(`  ${slug || "(home)"}: ${page.description.length} → ${description.length} characters`);
  changed += 1;
}

console.log(`${changed} description(s) shortened.`);
await prisma.$disconnect();
