import { cn } from "@/lib/utils";

/**
 * The TechZoid brand lockup.
 *
 * Drawn as vector geometry rather than shipped as an image file: it stays crisp
 * at any size, costs no network request, and — the part that matters most here —
 * the wordmark and the counter of the O are painted in `currentColor`, so the
 * same component sits correctly on the light header and on the dark footer
 * without a second asset.
 *
 * The three arcs keep their brand colours in both themes. They carry the
 * identity; the letterforms carry the contrast.
 *
 * This is the one file that is deliberately specific to the operating company.
 * Everything else about the site reads its identity from configuration, but a
 * logo is artwork, not data — replacing it means replacing this file.
 */

const ARC_BLUE = "#2F7DD1";
const ARC_AMBER = "#F2A33C";
const ARC_TEAL = "#2BB3A3";

/**
 * The circular mark alone — three arcs turning around a ring.
 *
 * Sized in `em` so it scales with whatever type it sits beside, which is what
 * keeps the lockup aligned when the wordmark changes size.
 */
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      className={cn("h-[1em] w-[1em]", className)}
      role="presentation"
      aria-hidden="true"
      focusable="false"
    >
      <g fill="none" strokeLinecap="round" strokeWidth="10">
        <path d="M10.22 45.82A40 40 0 0 1 58.32 10.87" stroke={ARC_BLUE} />
        <path d="M73.51 17.64A40 40 0 0 1 79.73 76.77" stroke={ARC_AMBER} />
        <path d="M66.27 86.54A40 40 0 0 1 11.96 62.36" stroke={ARC_TEAL} />
      </g>
      {/* The counter of the O. `currentColor` so it inverts with the wordmark. */}
      <circle cx="50" cy="50" r="20" fill="none" stroke="currentColor" strokeWidth="9" />
    </svg>
  );
}

/**
 * Wordmark and mark together.
 *
 * "TECHZOID" is set as text rather than outlined paths so it stays selectable,
 * searchable and readable to a screen reader, and so it reflows with the user's
 * own font settings instead of being frozen at one size.
 *
 * The mark replaces the O, which means the accessible name has to be supplied
 * separately — the visible letters spell "TECHZ" and "ID" with a graphic
 * between them.
 */
export function BrandLogo({
  showTagline = true,
  className,
}: {
  /** The strapline under the wordmark. Dropped where vertical space is tight. */
  showTagline?: boolean;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex min-w-0 flex-col", className)}>
      <span
        aria-hidden="true"
        className="flex items-center text-[1.35rem] font-extrabold leading-none tracking-[-0.01em]"
      >
        <span>TECHZ</span>
        {/* Optically tightened: the mark is a circle and reads wider than an O. */}
        <BrandMark className="mx-[0.015em] text-[1.12em]" />
        <span>ID</span>
      </span>

      {showTagline ? (
        <span
          aria-hidden="true"
          className="mt-1 hidden truncate font-serif text-[10.5px] italic leading-none tracking-[0.005em] opacity-70 min-[420px]:block"
        >
          Connect, Communicate &amp; Collaborate
        </span>
      ) : null}
    </span>
  );
}
