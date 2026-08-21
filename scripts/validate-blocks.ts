import { PrismaClient } from "@prisma/client";
import { parseBlock } from "../src/lib/blocks/schemas";

/** Confirms every stored block still validates against its type's schema. */
async function main() {
  const prisma = new PrismaClient();
  const rows = await prisma.pageSection.findMany({
    select: { id: true, type: true, data: true, page: { select: { slug: true } } },
  });

  const bad = rows.filter((row) => parseBlock({ id: row.id, type: row.type, data: row.data }) === null);
  console.log(`  ${rows.length - bad.length}/${rows.length} blocks valid`);
  for (const row of bad.slice(0, 10)) {
    console.log("   INVALID:", row.page.slug, row.type, JSON.stringify(row.data).slice(0, 140));
  }

  await prisma.$disconnect();
  process.exit(bad.length > 0 ? 1 : 0);
}

void main();
