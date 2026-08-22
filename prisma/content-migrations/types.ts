import type { PrismaClient } from "@prisma/client";

/**
 * One content change, applied to a database that already holds content.
 *
 * See the `ContentMigration` model in `schema.prisma` for why these exist at
 * all. In short: the seed runs only on an empty database, so a release that
 * changes seeded copy reaches a live site as new code and old rows.
 *
 * The rules a migration has to follow:
 *
 * - **It runs once.** The runner records it and never offers it again, which is
 *   what stops it undoing an edit someone made in the admin panel afterwards.
 * - **It is safe to run twice anyway.** Records are lost, containers are
 *   restored from backups, and a migration that only works the first time is a
 *   migration that will one day be run a second time by someone in a hurry.
 * - **It touches only what it says it touches.** Products, prices, orders,
 *   enquiries and accounts are business records, not content; nothing here
 *   goes near them.
 * - **It reports in a sentence.** The summary is stored and printed, and is
 *   the answer to "did this deploy change anything?".
 */
export type ContentMigration = {
  /**
   * A name, chosen by hand. It is read by a person looking at a deploy log and
   * wondering what happened, so it should say what changed rather than when.
   */
  id: string;

  /** One line, printed before the migration runs. */
  describe: string;

  /** Returns what it did, in a sentence, for the log and for the record. */
  apply: (prisma: PrismaClient) => Promise<string>;
};
