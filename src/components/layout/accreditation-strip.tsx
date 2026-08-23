import "server-only";

import { cache } from "react";

import { prisma } from "@/lib/db";
import { cached } from "@/lib/queries/cached";
import { tags } from "@/lib/cache";
import { currentPartnerBadge, currentPartnerLabel } from "@/lib/brand-partner";

/**
 * The partner programme badges this business holds, on every page.
 *
 * Beside the certification strip rather than merged into it, because they
 * answer different questions. A certification is an independent body's
 * statement about how this company works; a partner badge is a publisher's
 * statement about its relationship with it. A buyer weighs them differently and
 * the site should not blur them into one row of logos.
 *
 * Only brands whose designation may currently be stated appear here, and only
 * those with issued artwork on file — see `lib/brand-partner`. A brand recorded
 * with the placeholder designation "Partner" and no badge shows nothing at all,
 * which is correct: this strip is the evidence, not the claim.
 */
const currentBadges = cache(
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
    ["footer-partner-badges"],
    [tags.brands],
  ),
);

export async function AccreditationStrip() {
  const badges = await currentBadges();
  if (badges.length === 0) return null;

  return (
    <div className="border-t border-graphite-800">
      <div className="container-page flex flex-wrap items-center gap-x-6 gap-y-4 py-5">
        <p className="text-label font-semibold uppercase tracking-[0.12em] text-graphite-400">
          Partner programmes
        </p>
        <ul className="flex flex-wrap items-center gap-4">
          {badges.map((brand) => (
            <li key={brand.slug}>
              {/*
                On white, because that is how these badges are issued and how
                their programmes require them to be shown. Reversing one out or
                tinting it to suit a dark footer is the kind of alteration every
                one of these agreements prohibits.
              */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={brand.badge}
                alt={`${brand.name} ${brand.label}`}
                className="h-12 w-auto rounded-[--radius-sm] bg-white px-3 py-2 object-contain"
                loading="lazy"
                decoding="async"
              />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
