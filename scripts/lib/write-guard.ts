/**
 * Refuses to write to a database that is not on this machine.
 *
 * ## Why this exists
 *
 * `scripts/import-adobe-price-list.ts` was written to load Adobe's channel
 * Commercial sheet into a development catalogue, and was verified against one:
 * "90 Adobe products, 0 with more than one live default variant", says the
 * commit. It was then run against production, where it published eighty-two
 * products nobody had approved, renamed seven that had been, and replaced
 * their SKUs — which in turn made the migration that prices them add a second
 * variant beside each imported one instead of correcting it. The public site
 * showed two different prices for the same product for several days.
 *
 * Nothing in the script said "not here". It takes a workbook and a database
 * URL and does what it is told, which is the correct behaviour for an import
 * tool and the wrong default for one pointed at a live catalogue by accident.
 *
 * ## Why the host, and not NODE_ENV
 *
 * `prisma/seed.ts` guards on `NODE_ENV === "production"`. That catches the
 * container, which sets it, and misses the case that actually happened: a
 * laptop with a production `DATABASE_URL` in its environment, where
 * `NODE_ENV` is unset and the guard never fires. The database being written
 * to is the thing that matters, so the database being written to is what this
 * looks at.
 *
 * A loopback host passes silently. Anything else — a hostname, an address, or
 * the `db` service name inside the production compose stack — is refused and
 * names the override, so running it deliberately stays one environment
 * variable away and running it by accident is not possible at all.
 */

const LOOPBACK = new Set(["localhost", "127.0.0.1", "::1", "[::1]", ""]);

/** The environment variable that says "yes, that database, I mean it". */
export const OVERRIDE = "IMPORT_ALLOW_REMOTE";

/**
 * Throws unless the configured database is local, or the override is set.
 *
 * @param script how to refer to this script in the message, so the person
 *   reading it does not have to work out which one refused.
 */
export function refuseRemoteDatabase(script: string): void {
  if (process.env[OVERRIDE] === "true") return;

  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(`${script}: DATABASE_URL is not set, so there is nothing to write to.`);
  }

  let host: string;
  try {
    host = new URL(url).hostname;
  } catch {
    /*
     * An unparseable URL is refused rather than assumed local. Prisma accepts
     * some shapes `URL` does not, and "I could not tell" is not a reason to
     * write to it.
     */
    throw new Error(
      `${script}: could not read the host out of DATABASE_URL, so it will not be written to. ` +
        `Set ${OVERRIDE}=true if this is deliberate.`,
    );
  }

  if (LOOPBACK.has(host)) return;

  throw new Error(
    `${script}: DATABASE_URL points at "${host}", which is not this machine. ` +
      `This script writes products, variants and prices straight into the catalogue — ` +
      `run it against a development database, or set ${OVERRIDE}=true if you mean this one.`,
  );
}
