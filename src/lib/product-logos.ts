/**
 * Product artwork that is a wide lockup, not a square icon.
 *
 * Most product images are small square marks, shown at 20 to 32 pixels beside
 * the product name. A lockup — a mark above or beside a wordmark — is
 * illegible at that size, so it is shown on its own band on a card and in the
 * large panel on the product page instead.
 */
const WIDE_LOGOS: ReadonlySet<string> = new Set([
  "/products/microsoft-365.png",
]);

export function isWideLogo(imageUrl: string | null | undefined): boolean {
  return Boolean(imageUrl && WIDE_LOGOS.has(imageUrl));
}
