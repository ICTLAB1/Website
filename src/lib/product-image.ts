import { safeLocalImage, UPLOAD_DIR } from "@/lib/local-image";

/**
 * Where a product photograph may be loaded from.
 *
 * The same checking as brand logos, from `lib/local-image`, over a different
 * directory. What differs is what a missing one means.
 *
 * ## What fills a gap, and what does not
 *
 * A hardware listing without a picture is a weak listing, and the temptation is
 * to fill the gap with anything — the manufacturer's logo, a render, another
 * model's photograph. Those are all worse than an empty frame, because each
 * shows a buyer something presented as the product they are being quoted for. A
 * procurement officer comparing an EliteBook against a ThinkPad is looking at
 * the picture.
 *
 * A *labelled category illustration* is the one exception, and it is a real
 * one: it does not claim to be the model, it says so on its face, and the
 * business supplied the artwork for exactly this. That mechanism lives in
 * `lib/representative-image.ts`, which explains why the label cannot be
 * detached from the picture. This module still knows nothing about it — its
 * job is only "is this path safe to serve", and the illustrations live under
 * `/products/` like any other committed artwork.
 *
 * A product with neither still gets a labelled placeholder saying so, and the
 * catalogue can be asked which products are in that state — see
 * `scripts/verify/hardware.mjs`. The gap stays visible until artwork fills it.
 */

/** Photographs committed to the repository, served from `public/products/`. */
export const PRODUCT_IMAGE_DIR = "/products/";

/** Photographs uploaded from the admin panel. */
export const PRODUCT_UPLOAD_DIR = UPLOAD_DIR;

/** Returns the path if it is a safe local product image, and null otherwise. */
export function safeProductImage(value: string | null | undefined): string | null {
  return safeLocalImage(value, PRODUCT_IMAGE_DIR);
}
