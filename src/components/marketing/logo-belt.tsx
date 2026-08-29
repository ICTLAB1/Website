import Link from "next/link";

import { Reveal } from "@/components/motion/reveal";

export type BeltItem = {
  /** Stable within one belt; the belt repeats items, so it is not a React key. */
  key: string;
  name: string;
  /**
   * The mark, already validated by the caller.
   *
   * Validated *there* rather than here because the two sources have different
   * rules — brand artwork lives under `/brands/`, customer artwork under
   * `/clients/`, and a customer with no artwork must not appear at all. Taking
   * a checked path means this component has one job and cannot be the place a
   * check is forgotten.
   */
  logo: string | null;
  /** Where the mark leads, or null for a mark that is not a link. */
  href: string | null;
  /** Backs the lettered fallback. Unused where `logo` is set. */
  accentColor: string;
};

/**
 * A belt of marks that scrolls continuously.
 *
 * No JavaScript. The movement is one CSS animation on one element, the pause
 * on hover is `animation-play-state`, and a reader who has asked for reduced
 * motion gets a wrapped static row — see the marquee rules in `globals.css`.
 * A decorative belt that needed a bundle to render would be the wrong trade
 * twice over.
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
 * through every mark they have already passed. So the duplicate is built from
 * spans: identical to look at, invisible to assistive technology, unreachable
 * by the tab key.
 */

/**
 * The mark, and the name only where there is no mark.
 *
 * A logo strip that prints the organisation's name beside its logo reads
 * "VMware VMware" for every mark that is a wordmark, which is most of them. So
 * where there is artwork the mark stands alone and carries the name as its alt
 * text — not a duplicate of anything, and the only accessible name a linked
 * item has.
 *
 * Where there is no artwork the mark is a lettered square, which names
 * nothing, so the word has to be there. Only brands ever reach that branch:
 * a customer with no logo never leaves the query.
 */
function BeltFace({ item }: { item: BeltItem }) {
  if (item.logo) {
    return (
      /*
       * `next/image` would want a width and a height for a 32px mark that is
       * already local, already tiny, and usually an SVG — which the optimiser
       * passes through untouched anyway.
       */
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={item.logo}
        alt={item.name}
        className="h-8 w-auto max-w-[6.5rem] shrink-0 object-contain"
        /*
         * Eager, against the lazy default everywhere else on the site. The
         * marks off the right-hand edge are seconds from sliding into view
         * under their own power, and deferring them means a reader watches
         * empty chips fill in as they arrive — which reads as a broken page
         * rather than a lazy one.
         */
        loading="eager"
        decoding="async"
      />
    );
  }

  return (
    <>
      <span
        aria-hidden="true"
        className="inline-grid h-5 w-5 shrink-0 place-items-center rounded-[--radius-sm] text-label font-bold text-white"
        style={{ backgroundColor: item.accentColor }}
      >
        {item.name.charAt(0)}
      </span>
      {item.name}
    </>
  );
}

/**
 * The same marks, standing still.
 *
 * A wall rather than a belt whenever there are few enough to take in at once,
 * which for a row of logos is somewhere around a dozen. Below that a belt is
 * actively worse: with eight marks the track spends most of every pass showing
 * the gap between the end of the row and the start of its copy, and a reader
 * who looks up at the wrong moment sees a half-empty strip.
 *
 * Equal cells, `object-contain`, and a fixed mark height: publishers' and
 * institutions' marks have wildly different aspect ratios, and the only way a
 * row of them reads as a set is if the *cell* is uniform and the artwork is
 * fitted inside it untouched. Nothing here stretches, crops or recomposes a
 * mark.
 */
export function LogoWall({
  items,
  desaturate = false,
}: {
  items: BeltItem[];
  desaturate?: boolean;
}) {
  if (items.length === 0) return null;

  return (
    <div className="container-page">
      <ul
        /*
          Five across at the widest, not six.
          `object-contain` cannot distort a mark, but it can only make one as
          tall as the cell is wide allows: a 6:1 wordmark capped at 160px of
          width renders 27px tall beside a square emblem at 48px, and the eye
          reads that as the wordmark being smaller rather than wider. A wider
          cell narrows the gap. It cannot close it — that is the arithmetic of
          putting a 6:1 mark beside a 1:1 one — which is why the brand artwork
          in this repository is normalised to a common height before it is
          committed. See public/brands/README.md.
        */
        className="grid grid-cols-2 gap-px overflow-hidden rounded-[--radius-lg] border border-line bg-line sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
        data-desaturate={desaturate ? "true" : "false"}
      >
        {items.map((item, index) => (
          <li key={item.key} className="bg-white">
            {/*
              Staggered, capped. Each cell arrives 60ms after the one before it
              up to a quarter of a second, so the wall assembles rather than
              appearing — and the last mark is not still arriving after the
              reader has moved on.
            */}
            <Reveal delay={Math.min(index * 60, 240)}>
              <WallCell item={item} />
            </Reveal>
          </li>
        ))}
      </ul>
    </div>
  );
}

function WallCell({ item }: { item: BeltItem }) {
  const face = item.logo ? (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      src={item.logo}
      alt={item.name}
      className="logo-wall__mark h-12 w-auto max-w-[12rem] object-contain"
      loading="lazy"
      decoding="async"
    />
  ) : (
    <span className="text-meta font-medium text-ink-700">{item.name}</span>
  );

  const shell = "logo-wall__cell flex h-28 items-center justify-center px-5 py-4";

  /*
   * Linked only where there is somewhere to go. A customer's mark leads
   * nowhere by design — it is evidence of a relationship, not an advertisement
   * for the customer — so most cells here are not anchors, and making them all
   * anchors "for consistency" would put an empty target under every mark.
   */
  return item.href ? (
    <Link href={item.href} className={shell}>
      {face}
    </Link>
  ) : (
    <span className={shell}>{face}</span>
  );
}

export function LogoBelt({
  items,
  speed = "steady",
  reverse = false,
}: {
  items: BeltItem[];
  speed?: "slow" | "steady" | "brisk";
  reverse?: boolean;
}) {
  if (items.length === 0) return null;

  /*
   * A row narrower than the viewport shows the gap behind it for part of every
   * pass — the animation translates by half the *track*, so a short row simply
   * leaves the screen. Repeating the list until it is comfortably wider than a
   * wide desktop costs nothing: these are the same marks, already in memory,
   * and the browser reuses the decoded image for each one.
   */
  const MIN_ITEMS = 12;
  const repeats = Math.max(1, Math.ceil(MIN_ITEMS / items.length));
  const row = Array.from({ length: repeats }, () => items).flat();

  return (
    <div className="belt" data-speed={speed} data-reverse={reverse ? "true" : "false"}>
      <div className="belt__track">
        <ul className="belt__row">
          {row.map((item, index) => (
            <li key={`${item.key}-${index}`}>
              {item.href ? (
                <Link href={item.href} className="belt__item lift">
                  <BeltFace item={item} />
                </Link>
              ) : (
                <span className="belt__item">
                  <BeltFace item={item} />
                </span>
              )}
            </li>
          ))}
        </ul>

        <ul className="belt__row" aria-hidden="true">
          {row.map((item, index) => (
            <li key={`echo-${item.key}-${index}`}>
              <span className="belt__item">
                <BeltFace item={item} />
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
