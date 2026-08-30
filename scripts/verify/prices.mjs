import { chromium } from "playwright";

/**
 * No price reaches a visitor from the catalogue.
 *
 * The business quotes rather than lists. `lib/catalogue/quote-only` is where
 * that decision lives and every surface asks it — but a rule expressed in one
 * function is only as good as the last component that remembered to call it,
 * and the ways a price can arrive are many: a card, a listing, a filter band,
 * a comparison, a basket line, a JSON-LD offer a search engine reads and
 * prints beside the result.
 *
 * So this reads the rendered site rather than the source. A surface that
 * bypasses the rule fails here, whatever it looks like in the code.
 *
 * ## What is deliberately not checked
 *
 * The account area, the admin panel, a quotation and an order all show prices
 * and must: a figure has been agreed by the time a customer sees those, and a
 * checkout that hid the amount before taking payment would be a worse problem
 * than the one this suite exists for. Only the public catalogue is covered.
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
 * The same expression the hardware suite uses. Deliberately broad: a false
 * positive costs a minute of reading, a false negative puts a figure in front
 * of a buyer who will hold you to it.
 *
 * The word boundaries are load-bearing. Without the one before `Rs` this
 * matched "…for architecture and interio<b>rs 2</b> products…" on the homepage
 * and reported a price that was two ordinary words. Broad is right; "broad
 * enough to match inside any word ending in r" is not, and the hardware suite
 * carried the same latent bug until this found it.
 */
const MONEY =
  /₹|\bRs\.?\s?\d|\bINR\s?\d|\$\s?\d|US\$|\bAED\s?\d|\bMRP\b|excl\. GST|incl\. GST/i;

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();

const text = async () => (await page.locator("body").innerText()).replace(/\s+/g, " ");

/** A product slug to open, taken from the catalogue rather than hard-coded. */
await page.goto(`${BASE}/products`, { waitUntil: "load" });
const firstProduct = await page
  .locator('a[href^="/products/"]')
  .first()
  .getAttribute("href");

const SURFACES = [
  ["the catalogue", "/products"],
  ["the catalogue, filtered by brand", "/products?brand=microsoft"],
  ["the hardware catalogue", "/hardware"],
  ["the homepage", "/"],
  ["a brand page", "/brands/microsoft"],
  ["a landing page", "/microsoft-365"],
  ["search results", "/search?q=microsoft"],
  ...(firstProduct ? [["a product page", firstProduct]] : []),
];

for (const [name, path] of SURFACES) {
  await page.goto(`${BASE}${path}`, { waitUntil: "load" });
  const body = await text();
  const found = MONEY.exec(body);
  check(`no price on ${name}`, found === null, found ? `found "${found[0]}"` : "");
}

/*
 * Structured data separately from the visible text.
 *
 * A price can be absent from the page and present in the JSON-LD, and that is
 * the copy a search engine reads and prints as a number beside the result —
 * the one surface nobody thinks to check because nobody looks at it.
 */
if (firstProduct) {
  await page.goto(`${BASE}${firstProduct}`, { waitUntil: "load" });
  const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
  const offending = blocks.filter((block) => /"(price|lowPrice|highPrice)"/.test(block));
  check(
    "no price reaches the structured data either",
    offending.length === 0,
    offending[0]?.slice(0, 120) ?? "",
  );
  check("the product page still emits structured data", blocks.length > 0, `${blocks.length} blocks`);
}

/*
 * The page has to say what it is doing.
 *
 * Removing the number and leaving a blank is worse than a price: a buyer
 * cannot tell whether the product is free, unavailable, or something they
 * should ask about. Every product page has to offer the way forward.
 */
if (firstProduct) {
  const body = await text();
  check(
    "a product page says the price is on enquiry",
    /price on enquiry|quoted|on enquiry|request a quote/i.test(body),
    body.slice(0, 120),
  );
  const enquiry = await page.locator('a[href="/enquiry"], button', { hasText: /enquiry|quote/i }).count();
  check("and offers a way to ask for one", enquiry > 0, `${enquiry} controls`);
}

/*
 * The filter cannot offer a band there is no price to fall into.
 */
await page.goto(`${BASE}/products`, { waitUntil: "load" });
const bands = await page.locator("body").innerText();
check("the catalogue offers no price filter", !/under\s*₹|price range|price band/i.test(bands));

await browser.close();

const failed = results.filter((result) => !result.ok).length;
console.log(`\n${results.length - failed}/${results.length} price checks passed`);
process.exit(failed ? 1 : 0);
