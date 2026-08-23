import "server-only";

import { cache } from "react";

import { prisma } from "@/lib/db";
import { cached } from "@/lib/queries/cached";
import { tags } from "@/lib/cache";
import { currentPartnerBadge, currentPartnerLabel } from "@/lib/brand-partner";

/**
 * The partner programme badges this business may currently show.
 *
 * Only brands whose designation may be stated appear here, and only those with
 * issued artwork on file — see `lib/brand-partner`. A brand recorded with the
 * placeholder designation "Partner" and no badge shows nothing at all, which is
 * correct: a badge is the evidence, not the claim.
 *
 * Rendered by `components/layout/trust-bar`, in the white band under the
 * navigation. It used to have its own component here, in the charcoal footer,
 * where the only lawful way to show artwork drawn for a light ground was to sit
 * it on a white plate — see that file for why that is gone.
 */
export const currentPartnerBadges = cache(
  cached(
    async () => {
      const brands = await prisma.brand.findMany({
        where: { deletedAt: null, partnerPublic: true, partnerBadgeUrl: { not: null } },
        orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
        select: {
          slug: true,
          name: true,
          partnerLabel: true,
          partnerConfirmedAt: true,
          partnerPublic: true,
          partnerBadgeUrl: true,
        },
      });

      /*
       * Staleness is decided here rather than in SQL. The rule lives in one
       * module and is applied by one function; a second copy of "confirmed
       * within four hundred days" written as a WHERE clause is a copy that
       * will disagree with the first one eventually.
       */
      return brands
        .map((brand) => ({
          slug: brand.slug,
          name: brand.name,
          label: currentPartnerLabel(brand),
          badge: currentPartnerBadge(brand),
        }))
        .filter((brand): brand is { slug: string; name: string; label: string; badge: string } =>
          Boolean(brand.label && brand.badge),
        );
    },
    ["partner-badges"],
    [tags.brands],
  ),
);
