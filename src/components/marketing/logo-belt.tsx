import Link from "next/link";

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
