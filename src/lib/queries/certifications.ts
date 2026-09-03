import "server-only";

import { cache } from "react";

import { prisma } from "@/lib/db";
import { cached } from "@/lib/queries/cached";
import { tags } from "@/lib/cache";

/**
 * The certifications this company currently holds.
 *
 * One query for both places that show them — the bar under the navigation and
 * the strip in the footer. Two copies of "which certificates are current" is
 * two chances to disagree, and the one that would go stale is the one nobody
 * looks at while editing.
 *
 * Expiry is filtered here rather than by the caller. A certificate is a claim
 * about a period, and showing a lapsed one on every page of the site would be
 * the most thorough possible way to make a false statement.
 */
export const currentCertifications = cache(
  cached(
    async () =>
      prisma.certification.findMany({
        where: { OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
        orderBy: [{ displayOrder: "asc" }, { standard: "asc" }],
        /*
         * The certificate number is not fetched. It was, and it was rendered
         * in the footer strip; the owner asked for the numbers off the site,
         * and a field still travelling to the page turns up in the RSC payload
         * whether or not anything prints it — which is View Source away from
         * being published. `id` is the key instead.
         */
        select: { id: true, standard: true, title: true },
      }),
    ["current-certifications"],
    [tags.certifications],
  ),
);
