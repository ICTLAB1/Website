import { cn } from "@/lib/utils";

/**
 * The TechZoid brand lockup.
 *
 * ## This used to be drawn, and is now the artwork
 *
 * Until the brand files existed, this file built an approximation out of type
 * and three SVG arcs — the only honest option when nobody had supplied a logo.
 * The real one is nothing like it: bevelled letterforms, circuit traces running
 * through the Z, and a five-blade aperture in place of the O. An approximation
 * of a logo is a different logo, so the drawing is gone.
 *
 * ## Two files, because one cannot work on both grounds
 *
 * The supplied lockup's letterforms are near-black. On the charcoal footer they
 * disappear. The reversed variant lifts only the neutral dark pixels towards
 * white and leaves the aperture and the orange ampersand exactly as they are —
 * so it is the same mark, not a recoloured one. Both are derived from the
 * single supplied master; see `public/brand/README.md`.
 *
 * ## Why an `<img>` and not `next/image`
 *
 * The optimiser wants an intrinsic size for artwork that is already local,
 * already sized for its slot, and served from the same origin. What matters for
 * layout stability is the fixed height below, which is here regardless. The
 * width is `auto` so the lockup keeps its own proportions rather than being
 * squeezed by a container.
 */

/*
 * Two cuts of the same lockup.
 *
 * The supplied master carries the strapline beneath the wordmark. At the size
 * a header allows — 44 px of vertical space — that strapline renders about five
 * pixels tall: not small, illegible, and it drags the wordmark down with it to
 * make room. So navigation gets the wordmark alone, which is what a brand kit
 * would call the compact lockup, and the full one is available where there is
 * room for it to be read.
 *
 * Cut from the master rather than re-set as type: the letterforms are bevelled
 * and the Z carries circuit traces, neither of which can be reproduced with a
 * font.
 */
/** Wordmark and aperture, no strapline. For headers and anywhere tight. */
const WORDMARK_LIGHT = "/brand-assets/techzoid-wordmark.png";
const WORDMARK_DARK = "/brand-assets/techzoid-wordmark-reversed.png";

/** The full lockup including the strapline. Needs ~80 px of height to read. */
const LOCKUP_LIGHT = "/brand-assets/techzoid-logo.png";
const LOCKUP_DARK = "/brand-assets/techzoid-logo-reversed.png";

/** The aperture alone, square and centred. Favicons, app icons, avatars. */
export const BRAND_ICON = "/brand-assets/techzoid-icon.png";

export function BrandLogo({
  onDark = false,
  withStrapline = false,
  className,
}: {
  /** True on the charcoal footer, where the near-black letterforms vanish. */
  onDark?: boolean;
  /**
   * Include the strapline. Only worth it above roughly 80 px of height —
   * below that it is a grey smear that makes the wordmark smaller for nothing.
   */
  withStrapline?: boolean;
  className?: string;
}) {
  const src = withStrapline
    ? onDark
      ? LOCKUP_DARK
      : LOCKUP_LIGHT
    : onDark
      ? WORDMARK_DARK
      : WORDMARK_LIGHT;
  return (
    /*
     * `alt=""` and `aria-hidden`: the accessible name is supplied by the link
     * that wraps this (`components/layout/logo.tsx`), which says "TechZoid —
     * home". An alt here as well would make a screen reader announce the
     * company name twice for one control.
     *
     * The tagline is part of the artwork rather than separate text, which is
     * how the master was supplied. It is decorative either way — the words are
     * on the about page, in prose, where they can be read.
     */
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      aria-hidden="true"
      className={cn("h-11 w-auto max-w-full object-contain object-left", className)}
      // The intrinsic size of whichever cut is being used, so the browser
      // reserves the right box before the file arrives and the header does not
      // jump as it loads.
      width={2167}
      height={withStrapline ? 725 : 314}
      decoding="async"
    />
  );
}
