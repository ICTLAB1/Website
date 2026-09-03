import "server-only";
import { prisma } from "@/lib/db";
import { cached } from "@/lib/queries/cached";
import { tags } from "@/lib/cache";
import { mayShowClientLogo } from "@/lib/client-logo";

/**
 * The customer logos that may be shown, in display order.
 *
 * The permission rule is applied here in one place rather than in each caller,
 * for the same reason the certification query filters expiry: a rule a page
 * has to remember is a rule a page will one day forget, and forgetting this
 * one puts somebody else's trademark on the internet.
 *
 * The `published` condition is pushed into SQL so the common case does not
 * read rows it will discard; `mayShowClientLogo` then re-checks every row it
 * returns, including the artwork path, so the decision and the query cannot
 * drift apart.
 */
export const publishedClientLogos = cached(
  async () => {
    const rows = await prisma.clientLogo.findMany({
      where: {
        deletedAt: null,
        published: true,
        NOT: { logoUrl: null },
      },
      orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
      select: {
        name: true,
        logoUrl: true,
        website: true,
        sector: true,
        published: true,
      },
    });

    return rows.filter(mayShowClientLogo);
  },
  ["published-client-logos"],
  [tags.clientLogos],
);
