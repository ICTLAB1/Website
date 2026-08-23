import "server-only";

import { currentCertifications } from "@/lib/queries/certifications";
import { currentPartnerBadges } from "@/components/layout/accreditation-strip";

/**
 * Certifications and partner badges, in one band under the navigation.
 *
 * ## Why the badges moved here from the footer
 *
 * A publisher's badge is issued as finished artwork on a light ground, and the
 * programme agreements behind them prohibit reversing one out, tinting it or
 * putting it on a colour it was not drawn for. In a charcoal footer the only
 * lawful way to show one is to sit it on a white plate — which is what this
 * used to do, and it looked like two stickers taped to the bottom of the page.
 *
 * The band under the header is white, so the plates are gone: the Microsoft
 * badge has a transparent ground and disappears into the page, and the Adobe
 * badge keeps the light grey chip that is part of its own artwork. Neither is
 * altered, which is the constraint, and neither is boxed, which was the
 * problem.
 *
 * It is also simply the better place for them. A buyer weighing up an unfamiliar
 * supplier does it in the first few seconds; evidence at the bottom of the page
 * is evidence most readers never reach.
 *
 * ## Why they are still labelled separately
 *
 * A certification is an independent body's statement about how this company
 * works. A partner badge is a publisher's statement about its relationship with
 * it. A buyer weighs those differently, so they share a band but not a heading
 * — the point of putting them together is economy of space, not blurring them
 * into one undifferentiated row of logos.
 */
export async function TrustBar() {
  const [certifications, badges] = await Promise.all([
    currentCertifications(),
    currentPartnerBadges(),
  ]);

  if (certifications.length === 0 && badges.length === 0) return null;

  return (
    /*
     * A landmark, not a bare div.
     *
     * This band sits between the header and `<main>`, which leaves it outside
     * every landmark on the page — content a screen reader user navigating by
     * region skips over entirely, and an axe-core "region" violation on every
     * page of the site.
     *
     * A named `section` rather than an `aside`. Both satisfy the rule, but
     * `aside` is the complementary role, and pages here already use it for
     * their own sidebars — a second one site-wide makes "the complementary
     * landmark" ambiguous on every page that has a summary panel.
     */
    <section
      aria-label="Certifications and partner programmes"
      className="border-b border-line bg-white"
    >
      <div className="container-page flex flex-wrap items-center justify-center gap-x-10 gap-y-3 py-3 lg:justify-between">
        {/*
          Badges first, and first in the source too.

          They are the half a reader recognises without reading — two marks they
          already know, against three standards numbers they have to parse. Put
          second they also wrapped to their own line at 1440px and sat orphaned
          under the certifications, which read as an afterthought.
        */}
        {badges.length > 0 ? (
          <ul className="flex flex-wrap items-center justify-center gap-x-7 gap-y-3">
            {badges.map((brand) => (
              <li key={brand.slug} className="flex items-center">
                {/*
                  No plate, no padding, no rounded corner and no background.
                  The band is already white, which is the ground these badges
                  are drawn for, so anything added here would be a box around
                  artwork that does not need one.

                  Sized by height with `w-auto`, so a badge of any aspect ratio
                  keeps its proportions — the Microsoft mark is nearly four
                  times as wide as it is tall and the Adobe one is half that.
                  Large enough that the words inside the artwork can be read,
                  which is the whole point of showing the badge rather than
                  writing the designation out.
                */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={brand.badge}
                  alt={`${brand.name} ${brand.label}`}
                  className="h-9 w-auto object-contain sm:h-10"
                  loading="lazy"
                  decoding="async"
                />
              </li>
            ))}
          </ul>
        ) : null}

        {certifications.length > 0 ? (
          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1">
            <p className="text-label font-semibold uppercase tracking-[0.1em] text-ink-500">
              Certified
            </p>
            <ul className="flex flex-wrap items-center gap-x-5 gap-y-1">
              {certifications.map((certification) => (
                <li key={certification.reference} className="flex items-baseline gap-1.5">
                  <span className="text-label font-semibold text-graphite-900">
                    {certification.standard}
                  </span>
                  {/*
                    The scope, above 1536px only.

                    Three standards with their scopes spelled out run to about
                    nine hundred pixels, which is what pushed the badges onto a
                    second row on an ordinary laptop. The standard numbers alone
                    are the signal; anyone who wants the scope and the
                    certificate number has the strip in the footer, where a
                    reader who means to verify one has gone looking for exactly
                    that.
                  */}
                  <span className="hidden text-label text-ink-500 2xl:inline">
                    {certification.title}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </section>
  );
}
