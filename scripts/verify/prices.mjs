import { chromium } from "playwright";

/**
 * The public catalogue's price policy, read from the rendered site rather
 * than the source.
 *
 * The policy today: a software licence shows an indicative price, marked
 * "Tentative price" and repeated in a longer disclaimer, on every surface
 * that lists it — a card, a listing, a comparison, the product page, and the
 * structured data a search engine reads. Hardware shows none, ever, on any
 * surface, regardless of the software policy: that is a standing rule of the
 * business rather than a property this file's own constant controls — see
 * `lib/catalogue/quote-only`. And nowhere does a price come with a "Buy now"
 * — direct card purchase from the catalogue stays off even though the figure
 * that would justify one is back on the page.
 *
 * A rule stated once in `lib/catalogue/quote-only` is only as good as the
 * last component that remembered to call it, so this reads the rendered
 * pages rather than the source: a surface that disagrees with the policy
 * fails here, whatever it looks like in the code.
 *
 * ## What is deliberately not checked
 *
 * The account area, the admin panel, a quotation and an order all show
 * prices and must — a figure has been agreed by the time a customer sees
 * those. Only the public catalogue is covered.
 */

const BASE = process.env.BASE ?? "http://localhost:3000";
const results = [];
const check = (name, ok, detail = "") => {
  const result = { name, ok: Boolean(ok), detail };
  results.push(result);
  console.log(`  ${result.ok ? "✓" : "✗"} ${result.name}${result.ok || !result.detail ? "" : ` — ${result.detail}`}`);
};

/**
 * Money, in any of the forms this site can render it.
 *
 * The word boundaries are load-bearing. Without the one before `Rs` this once
 * matched "…for architecture and interio<b>rs 2</b> products…" on the
 * homepage and reported a price that was two ordinary words.
 */
const MONEY =
  /₹|\bRs\.?\s?\d|\bINR\s?\d|\$\s?\d|US\$|\bAED\s?\d|\bMRP\b|excl\. GST|incl\. GST/i;

/** A discount claim — "5% off" or "Save 5%" — which is a price claim of its own. */
const DISCOUNT = /\b\d{1,2}%\s*off\b|\bsave\s+\d{1,2}%/i;

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();

const text = async () => (await page.locator("body").innerText()).replace(/\s+/g, " ");

/**
 * A product slug for each catalogue, taken from the catalogue rather than
 * hard-coded — the seed data changes, and a fixture that quietly stopped
 * resolving used to fail every check downstream of it as a broken layout
 * rather than as "the fixture no longer exists".
 */
async function firstLinkedProduct(listingPath) {
  await page.goto(`${BASE}${listingPath}`, { waitUntil: "load" });
  return page.locator('a[href^="/products/"]').first().getAttribute("href");
}

const firstSoftwareProduct = await firstLinkedProduct("/products");
const firstHardwareProduct = await firstLinkedProduct("/hardware");

/*
 * Software: a price, marked tentative, on every surface that lists one.
 */
const SOFTWARE_SURFACES = [
  ["the catalogue", "/products"],
  ["the catalogue, filtered by brand", "/products?brand=microsoft"],
  ["the homepage", "/"],
  ["a brand page", "/brands/microsoft"],
  ["a landing page", "/microsoft-365"],
  ...(firstSoftwareProduct ? [["a product page", firstSoftwareProduct]] : []),
];

for (const [name, path] of SOFTWARE_SURFACES) {
  await page.goto(`${BASE}${path}`, { waitUntil: "load" });
  const body = await text();
  check(`a price appears on ${name}`, MONEY.test(body), "no currency-shaped string found");
  check(
    `and it is marked tentative on ${name}`,
    /tentative price/i.test(body),
    "no \"Tentative price\" wording found",
  );
}

/*
 * Hardware: none, ever — the rule this file existed to protect before
 * software prices came back, and it must not have loosened in the process.
 * `scripts/verify/hardware.mjs` covers this in far more depth; this is the
 * general gate's own check that the two files have not drifted apart.
 */
const HARDWARE_SURFACES = [
  ["the hardware catalogue", "/hardware"],
  ["a hardware brand page", "/brands/dell"],
  ...(firstHardwareProduct ? [["a hardware product page", firstHardwareProduct]] : []),
];

for (const [name, path] of HARDWARE_SURFACES) {
  await page.goto(`${BASE}${path}`, { waitUntil: "load" });
  const body = await text();
  const found = MONEY.exec(body);
  check(`no price on ${name}`, found === null, found ? `found "${found[0]}"` : "");
}

/*
 * No "Buy now" reaches the catalogue while direct purchase is off.
 *
 * Showing a price and accepting a card for it are different decisions —
 * `DIRECT_PURCHASE_ENABLED` in `lib/catalogue/quote-only` — and this is the
 * check that the second one actually stayed off when the first came back on.
 * `/buy` itself is untouched and still serves an eligible SKU directly; the
 * point here is that nothing in the catalogue links to it.
 */
for (const [name, path] of [...SOFTWARE_SURFACES, ...HARDWARE_SURFACES]) {
  await page.goto(`${BASE}${path}`, { waitUntil: "load" });
  const buyLinks = await page.locator('a[href^="/buy?"]').count();
  check(`no "Buy now" link on ${name}`, buyLinks === 0, `${buyLinks} found`);
}

/*
 * Structured data, separately from the visible text.
 *
 * A price can be absent from the page and present in the JSON-LD, or the
 * reverse — present on the page and quietly missing from the one surface a
 * search engine actually reads. Checked in both directions, against whichever
 * kind of product page each fixture happens to be.
 */
if (firstSoftwareProduct) {
  await page.goto(`${BASE}${firstSoftwareProduct}`, { waitUntil: "load" });
  const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
  const withPrice = blocks.filter((block) => /"(price|lowPrice|highPrice)"/.test(block));
  check(
    "a software product page's structured data carries a price",
    withPrice.length > 0,
    `${blocks.length} block(s), none with a price`,
  );
  check("the product page still emits structured data", blocks.length > 0, `${blocks.length} blocks`);
}

if (firstHardwareProduct) {
  await page.goto(`${BASE}${firstHardwareProduct}`, { waitUntil: "load" });
  const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
  const offending = blocks.filter((block) => /"(price|lowPrice|highPrice)"/.test(block));
  check(
    "no price reaches a hardware product page's structured data",
    offending.length === 0,
    offending[0]?.slice(0, 120) ?? "",
  );
}

/*
 * A discount claim is a price claim. It must track the same rule as the
 * visible price rather than a rule of its own: allowed on a software row with
 * a real saving, never on hardware.
 *
 * Not asserted as present on software — whether any row currently has a real
 * saving is a property of the seed data, not of the policy — but if this ever
 * regresses to "no discount claim anywhere", the earlier check above (`a
 * price appears on…`) is not what would catch it, so this stays a distinct
 * assertion on the hardware side at least.
 */
for (const [name, path] of HARDWARE_SURFACES) {
  await page.goto(`${BASE}${path}`, { waitUntil: "load" });
  const body = await text();
  const found = DISCOUNT.exec(body);
  check(`no discount claim on ${name}`, found === null, found ? `found "${found[0]}"` : "");
}

/*
 * The price filter and sort exist where there are prices to use them on, and
 * only there. It used to read `filters.kind !== "hardware"` before the whole
 * catalogue went quote-only, came back after, and must still say the same
 * thing rather than the version that briefly disabled it everywhere.
 */
await page.goto(`${BASE}/products`, { waitUntil: "load" });
const softwareListing = await page.locator("body").innerText();
check(
  "the software catalogue offers a price filter",
  /price \(excl\. gst\)|price\b/i.test(softwareListing) && /under\s*₹/i.test(softwareListing),
  "no price band found",
);
check(
  "and a price sort",
  /price: low to high/i.test(softwareListing),
  "no price sort option found",
);

await page.goto(`${BASE}/hardware`, { waitUntil: "load" });
const hardwareListing = await page.locator("body").innerText();
check(
  "the hardware catalogue offers no price filter",
  !/under\s*₹|price range|price band/i.test(hardwareListing),
);
check(
  "and no price sort",
  !/price: low to high|price: high to low/i.test(hardwareListing),
);

/*
 * The page has to say what it is doing, whichever way the policy points.
 * A hardware page still routes to an enquiry; a software page still names the
 * way to firm the tentative figure up.
 */
if (firstHardwareProduct) {
  await page.goto(`${BASE}${firstHardwareProduct}`, { waitUntil: "load" });
  const body = await text();
  check(
    "a hardware product page says the price is quoted",
    /request a quote|on enquiry/i.test(body),
    body.slice(0, 120),
  );
  const enquiry = await page.locator('a[href="/enquiry"], button', { hasText: /enquiry|quote/i }).count();
  check("and offers a way to ask for one", enquiry > 0, `${enquiry} controls`);
}

if (firstSoftwareProduct) {
  await page.goto(`${BASE}${firstSoftwareProduct}`, { waitUntil: "load" });
  const body = await text();
  check(
    "a software product page names the enquiry route",
    /request enterprise pricing|enquiry|quotation/i.test(body),
    body.slice(0, 120),
  );
}

await browser.close();

const failed = results.filter((result) => !result.ok).length;
console.log(`\n${results.length - failed}/${results.length} price checks passed`);
process.exit(failed ? 1 : 0);
