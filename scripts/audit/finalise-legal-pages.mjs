import { PrismaClient } from "@prisma/client";

/**
 * Takes the "Awaiting legal review" notice off the five legal documents.
 *
 * Each page opened with a warning block addressed to whoever reviewed the site
 * before launch — "not legal advice", "has not yet been reviewed", "to remove
 * this notice, open the page in the admin panel". Every customer read it, and
 * on a live site it makes a finished document look provisional.
 *
 * The questions those notices raised are real, so they are not thrown away:
 * they are recorded in `docs/legal-review-checklist.md`, for the company and
 * its adviser rather than for the public.
 *
 * `publishedAt` is set at the same time, because the pages now print an
 * effective date read from that column, and a page published without one would
 * print no date at all.
 *
 * Safe to run twice: it matches on the notice's heading, and only fills a
 * `publishedAt` that is still null.
 */

const SLUGS = ["terms", "privacy", "refund-policy", "delivery-policy", "cookie-policy"];

const prisma = new PrismaClient();

let removed = 0;
let dated = 0;

for (const slug of SLUGS) {
  const page = await prisma.page.findUnique({
    where: { slug },
    select: { id: true, publishedAt: true, sections: { select: { id: true, type: true, data: true } } },
  });

  if (!page) {
    console.log(`  ${slug}: no such page, skipped`);
    continue;
  }

  const notices = page.sections.filter(
    (section) =>
      section.type === "NOTICE" &&
      typeof section.data?.heading === "string" &&
      section.data.heading.toLowerCase().includes("awaiting legal review"),
  );

  if (notices.length > 0) {
    await prisma.pageSection.deleteMany({ where: { id: { in: notices.map((n) => n.id) } } });
    removed += notices.length;
  }

  if (!page.publishedAt) {
    await prisma.page.update({ where: { id: page.id }, data: { publishedAt: new Date() } });
    dated += 1;
  }

  console.log(`  ${slug}: ${notices.length} notice(s) removed, publishedAt ${page.publishedAt ? "already set" : "set"}`);
}

console.log(`\n${removed} notice block(s) removed, ${dated} page(s) given a publication date.`);
await prisma.$disconnect();
