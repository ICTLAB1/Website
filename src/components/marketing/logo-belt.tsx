import Link from "next/link";

import { BrandMark } from "@/components/marketing/brand-card";
import { safeBrandLogo } from "@/lib/brand-logo";

export type BeltBrand = {
  slug: string;
  name: string;
  accentColor: string;
  logoUrl?: string | null;
};

/**
 * A belt of brand marks that scrolls continuously.
 *
 * No JavaScript. The movement is one CSS animation on one element, the pause
 * on hover is `animation-play-state`, and a reader who has asked for reduced
 * motion gets the wrapped static row this used to be — see the marquee rules
 * in `globals.css`. A decorative belt that needed a bundle to render would be
 * the wrong trade twice over.
 *
 * ## How the loop is seamless
 *
 * The track holds the same row twice and translates by exactly -50% of its own
 * width, which lands the second copy precisely where the first started. Any
 * other distance leaves a visible jump on every pass, and any other duplication
 * count makes -50% the wrong number.
 *
 * ## Why the second copy is not links
 *
 * It is `aria-hidden`, and an `aria-hidden` subtree containing focusable
 * elements is an axe violation and, worse, a keyboard trap that tabs a reader
 * through twenty-seven brands they have already passed. So the duplicate is
 * built from spans: identical to look at, invisible to assistive technology,
 * unreachable by the tab key.
 */

/**
 * The mark, and the name only where there is no mark.
 *
 * A logo strip that prints the publisher's name beside its logo reads
 * "VMware VMware" for every brand whose artwork is a wordmark, which is most
 * of them. So where a file is on file the mark stands alone and carries the
 * brand's name as its alt text — not a duplicate of anything, and the only
 * accessible name the link has.
 *
 * Where no file is on file the mark is the lettered square, which names
 * nothing, so the word has to be there.
 */
function BeltFace({ brand }: { brand: BeltBrand }) {
  const hasArtwork = safeBrandLogo(brand.logoUrl) !== null;

  return (
    <>
      <BrandMark
        brand={brand}
        size={hasArtwork ? "md" : "sm"}
        alt={hasArtwork ? brand.name : ""}
        eager
      />
      {hasArtwork ? null : brand.name}
    </>
  );
}

export function LogoBelt({
  brands,
  speed = "steady",
  reverse = false,
}: {
  brands: BeltBrand[];
  speed?: "slow" | "steady" | "brisk";
  reverse?: boolean;
}) {
  if (brands.length === 0) return null;

  /*
   * A row narrower than the viewport shows the gap behind it for part of every
   * pass — the animation translates by half the *track*, so a short row simply
   * leaves the screen. Repeating the list until it is comfortably wider than a
   * wide desktop costs nothing: these are the same marks, already in memory,
   * and the browser reuses the decoded image for each one.
   */
  const MIN_ITEMS = 12;
  const repeats = Math.max(1, Math.ceil(MIN_ITEMS / brands.length));
  const row = Array.from({ length: repeats }, () => brands).flat();

  return (
    <div className="belt" data-speed={speed} data-reverse={reverse ? "true" : "false"}>
      <div className="belt__track">
        <ul className="belt__row">
          {row.map((brand, index) => (
            <li key={`${brand.slug}-${index}`}>
              <Link href={`/brands/${brand.slug}`} className="belt__item lift">
                <BeltFace brand={brand} />
              </Link>
            </li>
          ))}
        </ul>

        <ul className="belt__row" aria-hidden="true">
          {row.map((brand, index) => (
            <li key={`echo-${brand.slug}-${index}`}>
              <span className="belt__item">
                <BeltFace brand={brand} />
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
