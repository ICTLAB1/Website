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
 * So the fixture is discovered instead of assumed. It used to be discovered by
 * looking for a `/buy?sku=` link on the catalogue, which was the neatest
 * possible definition of "purchasable": a SKU the site itself was offering to
 * sell. Making the catalogue quote-only removed those links — see
 * `lib/catalogue/quote-only` — and with them the only way to find a fixture
 * this way. The route did not go anywhere: `/buy` still serves any SKU whose
 * product permits direct purchase and carries a price, and the accessibility
 * and responsive suites still have to audit it. It simply has no inbound link
 * any more.
 *
 * So the search moved one step back: take SKUs off product pages and ask the
 * buy route itself which of them it will serve. That is a slower question than
 * reading a link, but it is the same question, and it is asked of the route
 * that answers it rather than of a page that used to advertise the answer.
 */

/** How many product pages to look at before giving up. */
const PRODUCTS_TO_TRY = 12;

async function productPaths(base) {
  const response = await fetch(`${base}/products?sort=popular`);
  if (!response.ok) {
    throw new Error(`Cannot reach the catalogue to pick a test SKU (HTTP ${response.status}).`);
  }
  const html = await response.text();
  const paths = new Set();
  for (const match of html.matchAll(/href="(\/products\/[a-z0-9-]+)"/g)) {
    paths.add(match[1]);
  }
  return [...paths].slice(0, PRODUCTS_TO_TRY);
}

/**
 * Every SKU rendered on a product page.
 *
 * The variant panel prints each one in a monospaced element — the SKU column of
 * the option list and the SKU row of the detail grid. Reading the rendered
 * page rather than an API keeps this suite black-box, like the rest of them.
 */
function skusOn(html) {
  const skus = new Set();
  for (const match of html.matchAll(/font-mono[^>]*>([A-Za-z0-9][A-Za-z0-9._-]{2,63})</g)) {
    skus.add(match[1]);
  }
  return [...skus];
}

export async function firstPurchasableSku(base) {
  for (const path of await productPaths(base)) {
    const response = await fetch(`${base}${path}`);
    if (!response.ok) continue;

    for (const sku of skusOn(await response.text())) {
      // The buy route is the authority: it serves a SKU only when the product
      // permits direct purchase and the price is real. Anything it 404s on
      // would have failed the audit for a reason that is not a layout fault.
      const buy = await fetch(`${base}/buy?sku=${encodeURIComponent(sku)}`);
      if (buy.ok) return sku;
    }
  }

  throw new Error(
    `No SKU the buy route will serve, across the first ${PRODUCTS_TO_TRY} products. ` +
      "Either every product is enquiry-only or zero-priced, or the buy route has changed.",
  );
}
