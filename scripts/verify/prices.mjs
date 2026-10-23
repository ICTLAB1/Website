import { chromium } from "playwright";

/**
 * The public catalogue's price policy, read from the rendered site rather
 * than the source.
 *
 * The policy today: every product shows an indicative price wherever one is
 * recorded, marked "Tentative price" and repeated in a longer disclaimer, on
 * every surface that lists it — a card, a listing, a comparison, the product
 * page, and the structured data a search engine reads. A product with no
 * price recorded says so instead, rather than leaving a blank where a figure
 * goes. Hardware is no longer excluded: it was, as a standing rule of the
 * business, until the business asked for a price on every listing — see
 * `lib/catalogue/quote-only` for what that gave up. And nowhere does a price
 * come with a "Buy now": direct card purchase from the catalogue stays off
 * even though the figure that would justify one is back on the page.
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

/*
 * The page's own content, not the chrome around it.
 *
 * `main` rather than `body` because the header carries a currency selector
 * once an administrator sets a dollar or dirham rate, and its first option
 * reads "₹ INR". Scanning the whole body therefore found a rupee sign on every
 * page the moment multi-currency display was switched on, and reported a price
 * on pages that have none. The rules below are about what the page says a
 * thing costs, which is content; the selector is navigation.
 */
const content = (p) => (p.locator("main").count().then((n) => (n > 0 ? p.locator("main") : p.locator("body"))));
const text = async () => (await (await content(page)).innerText()).replace(/\s+/g, " ");

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
 * Hardware: a price if there is one, and the quote label if there is not.
 *
 * This read "no price on a hardware surface, ever" until the business asked
 * for a price on every listing. The assertion has to change with the policy,
 * and the way it was passing is the reason to be careful about how.
 *
 * It passed on the day the policy changed — all 37 checks did — because no
 * hardware product in the catalogue has a price yet, so "no price here" was
 * true for a reason that had nothing to do with the rule it claimed to be
 * testing. An absolute that holds only while a column is empty is not a
 * protection; it is a trap set for whoever fills the column, and it would have
 * failed the gate on the first hardware price entered.
 *
 * So the invariant is the pairing rather than the absence: a surface showing a
 * figure also says the figure is tentative, and a surface showing none says it
 * is quoted. Both halves are asserted on every surface, which holds whether
 * the catalogue has hardware prices in it or not — and keeps meaning the same
 * thing when it does.
 */
const HARDWARE_SURFACES = [
  ["the hardware catalogue", "/hardware"],
  ["a hardware brand page", "/brands/dell"],
  ...(firstHardwareProduct ? [["a hardware product page", firstHardwareProduct]] : []),
];

for (const [name, path] of HARDWARE_SURFACES) {
  await page.goto(`${BASE}${path}`, { waitUntil: "load" });
  const body = await text();
  const priced = MONEY.test(body);

  if (priced) {
    check(
      `${name} shows a price, and marks it tentative`,
      /tentative price/i.test(body),
      'a figure with no "Tentative price" wording beside it',
    );
  } else {
    check(
      `${name} shows no price, and says the price is quoted`,
      /price on enquiry|priced to your requirement|request a quote|quoted/i.test(body),
      "no figure and nothing saying one is quoted — a blank where a price goes",
    );
  }
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

/*
 * The hardware page's structured data has to agree with its own visible text.
 *
 * This asserted "no price reaches a hardware product page's structured data",
 * which was the third absolute in this file satisfied by an empty column. It
 * would also have been wrong in a way that mattered: the product page used to
 * exclude hardware from its offer by name, so once prices were entered a
 * hardware page would have shown a figure to a shopper and none to a search
 * engine. The surfaces disagreeing is the defect; the absence of a price is
 * not.
 */
if (firstHardwareProduct) {
  await page.goto(`${BASE}${firstHardwareProduct}`, { waitUntil: "load" });
  const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
  const inMarkup = blocks.some((block) => /"(price|lowPrice|highPrice)"/.test(block));
  const onPage = MONEY.test((await text()).replace(/\s+/g, " "));

  check(
    onPage
      ? "a priced hardware page offers the same price to a search engine"
      : "an unpriced hardware page offers no price to a search engine either",
    inMarkup === onPage,
    `page ${onPage ? "shows" : "shows no"} price, markup ${inMarkup ? "carries" : "carries no"} price`,
  );
}

/*
 * A discount claim is a price claim, so it tracks the same rule as the visible
 * price rather than one of its own: a saving may be claimed where a price is
 * shown, and nowhere else.
 *
 * "Never on hardware" was the rule here, and like the surface checks above it
 * was being satisfied by an empty column rather than by anything the code
 * does. What it is really protecting against is a saving advertised on a row
 * whose price nobody can see — "Save 5%" with no figure beside it is a claim a
 * reader cannot check and a discount off nothing.
 */
for (const [name, path] of HARDWARE_SURFACES) {
  await page.goto(`${BASE}${path}`, { waitUntil: "load" });
  const body = await text();
  const found = DISCOUNT.exec(body);
  if (found && !MONEY.test(body)) {
    check(`no discount claim without a price on ${name}`, false, `found "${found[0]}" and no figure`);
  } else {
    check(`any discount claim on ${name} sits beside a price`, true);
  }
}

/*
 * The price filter and sort exist where there are prices to use them on, and
 * only there. It used to read `filters.kind !== "hardware"` before the whole
 * catalogue went quote-only, came back after, and must still say the same
 * thing rather than the version that briefly disabled it everywhere.
 */
await page.goto(`${BASE}/products`, { waitUntil: "load" });
const softwareListing = await (await content(page)).innerText();
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

/*
 * The hardware catalogue, whichever state its data is in.
 *
 * Asserted as a pairing for the same reason as the surfaces above: "no price
 * filter on /hardware" was true only while no hardware carried a price, and
 * the controls are now gated on whether the listed rows have prices rather
 * than on which catalogue this is. So the controls and the figures have to
 * agree — a band over a listing with no figures is a control that cannot do
 * anything, and a listing with figures and no way to sort them is a catalogue
 * that has prices and pretends otherwise.
 */
await page.goto(`${BASE}/hardware`, { waitUntil: "load" });
const hardwareListing = await (await content(page)).innerText();
const hardwarePriced = MONEY.test(hardwareListing.replace(/\s+/g, " "));
const hardwareFilter = /under\s*₹|price range|price band/i.test(hardwareListing);
const hardwareSort = /price: low to high|price: high to low/i.test(hardwareListing);

check(
  hardwarePriced
    ? "the hardware catalogue shows prices, and offers a price filter"
    : "the hardware catalogue shows no prices, and offers no price filter",
  hardwarePriced === hardwareFilter,
  `prices ${hardwarePriced ? "shown" : "absent"}, filter ${hardwareFilter ? "present" : "absent"}`,
);
check(
  hardwarePriced ? "and a price sort" : "and no price sort",
  hardwarePriced === hardwareSort,
  `prices ${hardwarePriced ? "shown" : "absent"}, sort ${hardwareSort ? "present" : "absent"}`,
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
