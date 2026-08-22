import { safeLocalImage, UPLOAD_DIR } from "@/lib/local-image";

/**
 * Where a product photograph may be loaded from.
 *
 * The same checking as brand logos, from `lib/local-image`, over a different
 * directory. What differs is what a missing one means.
 *
 * ## Why there is no stand-in photograph
 *
 * A hardware listing without a picture is a weak listing, and the temptation is
 * to fill the gap — a generic laptop, the manufacturer's logo, a render. Every
 * one of those is worse than an empty frame, because each shows the buyer
 * something that is not the product they are being quoted for. A procurement
 * officer comparing an EliteBook against a ThinkPad is looking at the picture.
 *
 * So a product with no image gets a labelled placeholder that says so, and the
 * catalogue can be asked which products are in that state — see
 * `scripts/verify/hardware.mjs`. The gap stays visible until a real photograph
 * fills it.
 */

/** Photographs committed to the repository, served from `public/products/`. */
export const PRODUCT_IMAGE_DIR = "/products/";

/** Photographs uploaded from the admin panel. */
export const PRODUCT_UPLOAD_DIR = UPLOAD_DIR;

/** Returns the path if it is a safe local product image, and null otherwise. */
export function safeProductImage(value: string | null | undefined): string | null {
  return safeLocalImage(value, PRODUCT_IMAGE_DIR);
}
