import "server-only";
import { logger } from "@/lib/logger";

/**
 * Wraps a `generateStaticParams` that reads the database.
 *
 * A production build runs without a database, and should. A container image is
 * built before the database it will eventually talk to exists — that is the
 * normal shape of a deployment, not an unusual one — so a build that needs a
 * live database to succeed is a build that cannot be made into an image.
 *
 * Returning an empty list means nothing of that route is prerendered. Every URL
 * then renders on its first request and is cached under its tag from that point
 * on, which is exactly what already happens for a page created in the admin
 * panel after the build. The visitor-facing difference is one cold request per
 * URL, once.
 *
 * When a database *is* reachable at build time — a developer running
 * `npm run build` locally — the list comes back and those pages are prerendered
 * as before. So this costs nothing where it is not needed.
 *
 * Deliberately catches everything rather than sniffing for a Prisma
 * connection error. Any failure to enumerate paths should degrade to
 * "prerender none of them", never to a failed build: the pages work either way.
 */
export async function prerenderParams<T>(
  route: string,
  load: () => Promise<T[]>,
): Promise<T[]> {
  try {
    return await load();
  } catch (error) {
    logger.warn("prerender_skipped", {
      route,
      reason: error instanceof Error ? error.message.split("\n")[0] : String(error),
    });
    return [];
  }
}
