import type { FormFactor } from "@prisma/client";

import { safeProductImage } from "@/lib/product-image";
import { REPRESENTATIVE_IMAGE_BADGE, resolveProductPhoto } from "@/lib/representative-image";

/**
 * A product photograph, a labelled category illustration, or an honest gap.
 *
 * ## The frame is fixed, the picture is not
 *
 * Manufacturers photograph a laptop at 16:10, a tower at 3:4 and an all-in-one
 * at whatever suits the screen. Dropped into a grid unmanaged, that is a row of
 * cards of different heights and a page that jumps as each image arrives. So
 * the frame has a fixed aspect ratio and the image is contained inside it —
 * never cropped to fill. A laptop with its lid cut off is not a better card
 * than a laptop with white space around it.
 *
 * `object-contain` is the whole reason this is a component and not a class
 * name: `object-cover` looks better on a hero photograph and is exactly wrong
 * here, and that is the mistake somebody makes at 6pm.
 *
 * ## Three states, and why the middle one is safe
 *
 * A model with its own photograph shows it, unlabelled. A model without one
 * shows the illustration for its form factor **with a corner badge reading
 * "Representative image"**, and a model whose form factor has no illustration
 * keeps the labelled empty frame.
 *
 * The badge is rendered here rather than by the caller, and the source is
 * resolved here rather than being passed in, so that the two cannot come apart.
 * A caller cannot obtain the illustration without the badge, and cannot
 * suppress the badge without also losing the picture. That is the whole
 * safeguard: `lib/representative-image.ts` explains the rest.
 *
 * The badge is the short form. The full disclaimer belongs on the page — see
 * `RepresentativeImageNotice` — because a corner label cannot carry it and a
 * card is not where somebody reads terms.
 */
export function ProductPhoto({
  src,
  formFactor,
  alt,
  ratio = "4/3",
  sizes = "(min-width: 1024px) 22rem, (min-width: 640px) 45vw, 90vw",
  priority = false,
}: {
  src: string | null | undefined;
  /**
   * The product's form factor, which chooses the illustration when there is no
   * photograph. Omitted means "no illustration" — a caller that does not know
   * the form factor gets the empty frame rather than a guess.
   */
  formFactor?: FormFactor | null;
  /** The product's name. Never "product image" — that tells a listener nothing. */
  alt: string;
  ratio?: "4/3" | "16/10";
  sizes?: string;
  /** True only for the one image above the fold on a product page. */
  priority?: boolean;
}) {
  const resolved = resolveProductPhoto({ imageUrl: src, formFactor });
  const safe = safeProductImage(resolved.src);
  const representative = safe !== null && resolved.representative;
  const frame =
    ratio === "16/10"
      ? "aspect-[16/10] w-full overflow-hidden rounded-[--radius-md] bg-white"
      : "aspect-[4/3] w-full overflow-hidden rounded-[--radius-md] bg-white";

  if (!safe) {
    return (
      <div
        className={`${frame} flex items-center justify-center border border-dashed border-line-strong bg-surface-muted`}
      >
        <span className="px-4 text-center text-label leading-relaxed text-ink-500">
          Photograph to follow
        </span>
      </div>
    );
  }

  return (
    <div className={`${frame} relative`}>
      {/*
        Plain `<img>` rather than `next/image`. The optimiser needs an intrinsic
        width and height it cannot know for artwork supplied per model, and its
        real benefit — resizing remote hero images — does not apply to catalogue
        photographs that are already local and already small. What matters for
        layout shift is the fixed frame above, which is here regardless.
      */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={safe}
        // The alt text says what the picture is, not only which product it sits
        // beside. A screen reader user is entitled to the same caveat a sighted
        // reader gets from the badge, and they get it in the same breath as the
        // name rather than from a paragraph further down the page.
        alt={representative ? `${alt} — representative image of this product type` : alt}
        sizes={sizes}
        className="h-full w-full object-contain"
        loading={priority ? "eager" : "lazy"}
        decoding={priority ? "sync" : "async"}
        fetchPriority={priority ? "high" : "auto"}
      />
      {representative ? (
        <span
          // aria-hidden: the alt text above already carries this, and a screen
          // reader announcing it twice is noise rather than clarity.
          aria-hidden="true"
          className="absolute bottom-1.5 right-1.5 rounded-[--radius-sm] bg-graphite-900/75 px-1.5 py-0.5 text-[10px] font-medium leading-tight tracking-wide text-white"
        >
          {REPRESENTATIVE_IMAGE_BADGE}
        </span>
      ) : null}
    </div>
  );
}
