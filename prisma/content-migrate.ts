/**
 * Applies pending content migrations.
 *
 * `prisma migrate deploy` brings the database's *structure* up to the code.
 * This brings its *content* up to the code, for the changes that were written
 * as migrations because they had to reach a database that already has rows.
 *
 * Run by the container entrypoint on every start, before the server binds a
 * port — so a deploy is the only action an operator takes, and nothing serves
 * a page in the middle of the change.
 *
 * ## Modes
 *
 *   (none)       apply everything not yet recorded
 *   --baseline   record everything as applied, without running it
 *   --status     list what has and has not been applied, and change nothing
 *
 * `--baseline` is for a database that was just seeded. The seed already writes
 * the current content, so running the migrations over it would be work with no
 * effect — and, worse, would leave a log that reads as though a fresh install
 * needed correcting.
 */
import { PrismaClient } from "@prisma/client";

import { contentMigrations } from "./content-migrations";

const prisma = new PrismaClient();

const mode = process.argv[2] ?? "";

async function main() {
  const applied = new Set(
    (await prisma.contentMigration.findMany({ select: { id: true } })).map((row) => row.id),
  );

  if (mode === "--status") {
    for (const migration of contentMigrations) {
      const mark = applied.has(migration.id) ? "applied" : "PENDING";
      console.log(`  ${mark.padEnd(8)} ${migration.id} — ${migration.describe}`);
    }
    return;
  }

  const pending = contentMigrations.filter((migration) => !applied.has(migration.id));

  if (pending.length === 0) {
    console.log("  content is up to date");
    return;
  }

  if (mode === "--baseline") {
    await prisma.contentMigration.createMany({
      data: pending.map((migration) => ({
        id: migration.id,
        summary: "baselined: this database was seeded with the content already in it",
      })),
      skipDuplicates: true,
    });
    console.log(`  ${pending.length} migration(s) baselined on a freshly seeded database`);
    return;
  }

  for (const migration of pending) {
    console.log(`  ${migration.id} — ${migration.describe}`);

    /*
     * Recorded in the same transaction as nothing at all: the migration does
     * its own writes, and only if it returns is it marked applied. A migration
     * that throws leaves no record, so the next start tries it again — which is
     * why each one has to be safe to run twice.
     */
    const summary = await migration.apply(prisma);
    await prisma.contentMigration.create({ data: { id: migration.id, summary } });

    console.log(`    ${summary}`);
  }
}

try {
  await main();
} catch (error) {
  console.error(`  content migration failed: ${error instanceof Error ? error.message : error}`);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
