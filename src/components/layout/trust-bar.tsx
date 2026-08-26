import "server-only";

import Link from "next/link";

import { certificationLogo } from "@/lib/certification-logo";
import { currentCertifications } from "@/lib/queries/certifications";
import { currentPartnerBadges } from "@/components/layout/accreditation-strip";
import { getSiteConfig } from "@/lib/site-config";

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
 *
 * ## The two countries
 *
 * A buyer in the Gulf reading an Indian address has to guess whether this
 * company can invoice them at all, and until now the answer was in the footer.
 * Two words at the end of this band answer it where the question gets asked,
 * and link to the page carrying both addresses in full.
 *
 * Two words is the whole design. A banner reading "Now in the UAE" would be a
 * claim about reach; "India · UAE" states where the offices are and stops,
 * which is the fact — and stays quiet enough to sit under the navigation on
 * every route without turning into furniture nobody reads.
 *
 * It renders only when a second office is actually configured. On a business
 * trading from one country the band goes back to what it was, rather than
 * announcing a single location as though it were a network.
 */
export async function TrustBar() {
  const [certifications, badges, config] = await Promise.all([
    currentCertifications(),
    currentPartnerBadges(),
    getSiteConfig(),
  ]);

  const offices = config.secondaryEntity ? ["India", "UAE"] : [];

  if (certifications.length === 0 && badges.length === 0 && offices.length === 0) return null;

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
      aria-label="Certifications, partner programmes and offices"
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
          /*
            The seals, where a seal exists, and the standard in type where one
            does not.

            An earlier version set all three in type instead. That was the right
            answer for the artwork it had — wide framed ticks that, at any height
            letting their numbers be read, were the largest thing in the band and
            read as three more logos beside the two publisher badges. These are
            round seals of a common diameter: they read as certification marks
            rather than as logos, and they sit quietly at the same height as the
            badges beside them.

            The standard still follows in type. The seal carries the number for
            9001 and 20000-1 but not for 27001, and a reader should not have to
            know which is which to learn what this company is certified against.
          */
          <ul className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
            {certifications.map((certification) => {
              const seal = certificationLogo(certification.standard);
              return (
                <li key={certification.reference} className="flex items-center gap-2">
                  {seal ? (
                    /*
                      No plate and no border: the band is white, which is the
                      ground these are drawn for. Square, so `h-9 w-9` states
                      both dimensions and the browser reserves the space before
                      the file arrives.
                    */
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={seal}
                      alt=""
                      aria-hidden="true"
                      className="h-9 w-9 object-contain sm:h-10 sm:w-10"
                      width={420}
                      height={420}
                      loading="lazy"
                      decoding="async"
                    />
                  ) : null}
                  <span className="text-label font-semibold text-graphite-900">
                    {certification.standard}
                  </span>
                </li>
              );
            })}
          </ul>
        ) : null}

        {/*
          Last in the band, which at the wide breakpoint puts it at the right
          edge — read after the evidence, not in front of it. A link, because
          the useful form of this fact is the two addresses on /contact, and a
          reader who wants it should not have to go hunting in the footer.
        */}
        {offices.length > 0 ? (
          <Link
            href="/contact"
            className="flex items-center gap-2 text-label text-ink-500 transition-colors hover:text-graphite-900"
          >
            <span>Offices</span>
            <span className="font-semibold text-graphite-900">{offices.join(" · ")}</span>
          </Link>
        ) : null}
      </div>
    </section>
  );
}
