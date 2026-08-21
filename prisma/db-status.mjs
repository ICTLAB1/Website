/**
 * Tiny database probe used by the container entrypoint.
 *
 * With no argument: exits 0 if the database is reachable, non-zero otherwise —
 * which is how the entrypoint waits for Postgres without needing `pg_isready`
 * or a psql client in the image.
 *
 * With `pages`: prints how many CMS pages exist, or `0` if the table is not
 * there yet. That is what decides whether a fresh container should seed.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({ log: [] });

try {
  await prisma.$queryRaw`SELECT 1`;

  if (process.argv[2] === "pages") {
    // The table does not exist before the first migration, and a failure to
    // count must read as "empty" rather than as an error — otherwise a first
    // run would decline to seed.
    const count = await prisma.page.count().catch(() => 0);
    console.log(String(count));
  }

  process.exitCode = 0;
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
