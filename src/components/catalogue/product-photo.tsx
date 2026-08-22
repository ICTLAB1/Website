import { safeProductImage } from "@/lib/product-image";

/**
 * A product photograph, or an honest gap where one should be.
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
 * ## When there is no photograph
 *
 * A labelled frame saying so. Not a generic laptop, not the manufacturer's
 * logo, not a render — each of those shows a buyer something that is not the
 * product being quoted, which is worse than showing nothing. The gap is
 * supposed to be visible; `scripts/verify/hardware.mjs` fails the build if a
 * listed model is in this state.
 */
export function ProductPhoto({
  src,
  alt,
  ratio = "4/3",
  sizes = "(min-width: 1024px) 22rem, (min-width: 640px) 45vw, 90vw",
  priority = false,
}: {
  src: string | null | undefined;
  /** The product's name. Never "product image" — that tells a listener nothing. */
  alt: string;
  ratio?: "4/3" | "16/10";
  sizes?: string;
  /** True only for the one image above the fold on a product page. */
  priority?: boolean;
}) {
  const safe = safeProductImage(src);
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
    <div className={frame}>
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
        alt={alt}
        sizes={sizes}
        className="h-full w-full object-contain"
        loading={priority ? "eager" : "lazy"}
        decoding={priority ? "sync" : "async"}
        fetchPriority={priority ? "high" : "auto"}
      />
    </div>
  );
}
