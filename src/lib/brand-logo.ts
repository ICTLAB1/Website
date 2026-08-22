import { safeLocalImage, UPLOAD_DIR } from "@/lib/local-image";

/**
 * Where a publisher's logo may be loaded from.
 *
 * The checking lives in `lib/local-image`, shared with product photographs
 * because they are the same class of input under a different name. What is
 * specific to a logo is the directory and the fallback.
 *
 * A brand with no artwork on file keeps the styled wordmark it has always had.
 * That is a fallback, not a failure — this business does not hold every
 * publisher's logo, and inventing one is not an option.
 */

/** Artwork committed to the repository, served from `public/brands/`. */
export const BRAND_LOGO_DIR = "/brands/";

/** Artwork uploaded from the admin panel. */
export const BRAND_UPLOAD_DIR = UPLOAD_DIR;

/** Returns the path if it is a safe local brand logo, and null otherwise. */
export function safeBrandLogo(value: string | null | undefined): string | null {
  return safeLocalImage(value, BRAND_LOGO_DIR);
}
