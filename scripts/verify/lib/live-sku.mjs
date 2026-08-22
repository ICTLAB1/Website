/**
 * A SKU that can actually be bought right now.
 *
 * The suites used to hardcode `MS-M365-BS-A1`, a sample SKU from the seed
 * data. Importing the real Microsoft price list replaced the sample products,
 * the SKU stopped resolving, and every viewport of the buy page began failing
 * on a 404 — a true failure, but reported as a broken layout rather than as
 * "the fixture no longer exists", which took longer to read than it should
 * have.
 *
 * So the fixture is discovered instead of assumed: the catalogue is asked for
 * a purchasable SKU, which is by definition one the site is currently willing
 * to sell. A catalogue with nothing purchasable in it is itself worth failing
 * on, so that case throws rather than skipping quietly.
 */
export async function firstPurchasableSku(base) {
  const response = await fetch(`${base}/products?sort=popular`);
  if (!response.ok) {
    throw new Error(`Cannot reach the catalogue to pick a test SKU (HTTP ${response.status}).`);
  }

  const html = await response.text();
  const match = html.match(/\/buy\?sku=([A-Za-z0-9._-]+)/);
  if (!match) {
    throw new Error(
      "No purchasable SKU on the catalogue. Either every product is enquiry-only or the buy route has changed.",
    );
  }

  return decodeURIComponent(match[1]);
}
