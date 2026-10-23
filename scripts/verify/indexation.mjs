import { chromium } from "playwright";

/**
 * What is offered for indexing, and on what basis a price is stated.
 *
 * Three rules that are easy to state, invisible when broken, and were each
 * broken in a different way before this file existed:
 *
 * 1. **One purpose per URL.** Nine Microsoft URLs, four of which had titles and
 *    descriptions that were the same claim reworded. Checked as: no two of
 *    these pages share a title, and none shares a description.
 *
 * 2. **Index the landing pages, not the permutations.** Every parameterised
 *    catalogue view was `noindex` — including `/hardware?family=servers`, which
 *    the main menu links to and which is the only route to the servers in this
 *    catalogue. And all of them were `Disallow`ed in robots.txt, so a crawler
 *    could not fetch them to read the `noindex` in the first place.
 *
 * 3. **A price states its basis.** Every human-facing surface says a figure
 *    excludes GST and names the term; the structured data said neither, so the
 *    one surface a search engine reads was the one that did not say.
 */

const BASE = "http://localhost:3000";

const results = [];
const check = (label, ok, detail = "") => {
  results.push({ label, ok });
  console.log(`  ${ok ? "✓" : "✗"} ${label}${ok || !detail ? "" : ` — ${detail}`}`);
};

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const context = await browser.newContext();
const page = await context.newPage();

/** Title, description, canonical and robots, as the document declares them. */
async function meta(path) {
  await page.goto(`${BASE}${path}`, { waitUntil: "load", timeout: 20000 });
  return page.evaluate(() => ({
    title: document.title,
    description: document.querySelector('meta[name="description"]')?.getAttribute("content") ?? "",
    canonical: document.querySelector('link[rel="canonical"]')?.getAttribute("href") ?? "",
    robots: document.querySelector('meta[name="robots"]')?.getAttribute("content") ?? "",
    h1: document.querySelector("h1")?.textContent?.trim() ?? "",
  }));
}

// ── 1. one purpose per URL ─────────────────────────────────────────────────
console.log("\nMicrosoft URLs, one purpose each");

const MICROSOFT = [
  "/microsoft",
  "/microsoft-365",
  "/microsoft-office",
  "/microsoft-office-ltsc",
  "/microsoft-licensing",
  "/microsoft-csp",
  "/brands/microsoft",
];

const microsoft = new Map();
for (const path of MICROSOFT) microsoft.set(path, await meta(path));

for (const [path, entry] of microsoft) {
  check(`${path} is indexable`, !/noindex/i.test(entry.robots), entry.robots);
  check(
    `${path} canonicalises to itself`,
    entry.canonical.endsWith(path),
    `canonical ${entry.canonical}`,
  );
}

/*
 * Compared on the whole string rather than on a similarity score. Two of these
 * differed by one word — "supplied under the licensing programme that fits"
 * against "under the purchasing programme that suits" — and a threshold that
 * caught that would have to be tuned, argued about, and would catch innocent
 * pages. An exact match is the rule that needs no judgement, and a near-miss
 * is caught by the keyword check below instead.
 */
for (const field of ["title", "description"]) {
  const seen = new Map();
  const collisions = [];
  for (const [path, entry] of microsoft) {
    const value = entry[field].trim().toLowerCase();
    if (!value) continue;
    if (seen.has(value)) collisions.push(`${seen.get(value)} and ${path}: "${entry[field]}"`);
    else seen.set(value, path);
  }
  check(`no two Microsoft pages share a ${field}`, collisions.length === 0, collisions[0] ?? "");
}

/*
 * The specific pair that was wrong, asserted by name. The generic rule above
 * would pass if somebody reintroduced the overlap with one word changed, which
 * is exactly how it arrived the first time.
 */
const hub = microsoft.get("/microsoft");
const directory = microsoft.get("/brands/microsoft");
check(
  "the Microsoft hub and the brand directory do not both claim licensing in the title",
  !(/licensing/i.test(hub.title) && /licensing & solutions/i.test(directory.title)),
  `${hub.title} / ${directory.title}`,
);
check(
  "/microsoft-365 names the product in its title",
  /microsoft 365/i.test(microsoft.get("/microsoft-365").title),
  microsoft.get("/microsoft-365").title,
);
check(
  "/microsoft-office is positioned as the comparison",
  /ltsc/i.test(microsoft.get("/microsoft-office").title) &&
    /microsoft 365/i.test(microsoft.get("/microsoft-office").title),
  microsoft.get("/microsoft-office").title,
);

// ── 2. landing pages index, permutations do not ────────────────────────────
console.log("\nCatalogue indexation");

const FAMILIES = ["laptops", "desktops", "servers"];
const familyMeta = new Map();

for (const family of FAMILIES) {
  const entry = await meta(`/hardware?family=${family}`);
  familyMeta.set(family, entry);
  check(`/hardware?family=${family} is indexable`, !/noindex/i.test(entry.robots), entry.robots);
  check(
    `  and canonicalises to itself, not to /hardware`,
    entry.canonical.includes(`family=${family}`),
    `canonical ${entry.canonical}`,
  );
  check(
    `  and its heading is about ${family}, not the whole catalogue`,
    !/commercial computers for business and enterprise/i.test(entry.h1),
    entry.h1,
  );
}

const headings = new Set([...familyMeta.values()].map((entry) => entry.h1));
check("each family has its own heading", headings.size === FAMILIES.length, [...headings].join(" / "));

const titles = new Set([...familyMeta.values()].map((entry) => entry.title));
check("and its own title", titles.size === FAMILIES.length, [...titles].join(" / "));

/*
 * The other half. A family *with* another filter beside it is a permutation of
 * the landing page, and must not compete with it.
 */
const PERMUTATIONS = [
  "/hardware?family=servers&sort=price-asc",
  "/hardware?brand=dell",
  "/hardware?form=RACK_SERVER",
  "/products?category=software",
  "/products?sort=price-asc",
  "/products?licence=PERPETUAL",
];

for (const path of PERMUTATIONS) {
  const entry = await meta(path);
  check(`${path} is noindex`, /noindex/i.test(entry.robots), entry.robots || "(no robots meta)");
}

const base = await meta("/products");
check("but /products itself is indexable", !/noindex/i.test(base.robots), base.robots);

/*
 * robots.txt must not block what the meta tags are deciding. A `Disallow`
 * stops the crawl, so the `noindex` above is never read and the canonical
 * never followed — the two directives do not stack, the robots rule disables
 * the meta rule.
 */
await page.goto(`${BASE}/robots.txt`, { waitUntil: "load" });
const robots = await page.locator("body").innerText();

/*
 * Read as "no Disallow line mentions a query string". Simpler than listing the
 * six patterns that used to be here and checking each one: any rule carrying a
 * `?` is blocking a parameterised URL, which is the whole category this must
 * not do, and a new one somebody adds later is caught without being enumerated.
 */
const disallowsAQuery = robots
  .split("\n")
  .map((line) => line.trim())
  .filter((line) => /^Disallow:/i.test(line) && line.includes("?"));

check(
  "no robots.txt rule disallows a parameterised URL",
  disallowsAQuery.length === 0,
  disallowsAQuery.join(" | "),
);

check(
  "robots.txt still disallows the transactional paths",
  ["/admin", "/account", "/api/", "/login"].every((path) => robots.includes(`Disallow: ${path}`)),
  robots,
);

// ── 3. a price states its basis ────────────────────────────────────────────
console.log("\nPrice basis in structured data");

await page.goto(`${BASE}/products/microsoft-365-business-standard`, { waitUntil: "load" });

const [product, visible] = await Promise.all([
  page.evaluate(() => {
    for (const script of document.querySelectorAll('script[type="application/ld+json"]')) {
      try {
        const parsed = JSON.parse(script.textContent ?? "");
        if (parsed?.["@type"] === "Product") return parsed;
      } catch {
        /* a block that is not JSON is a different test's problem */
      }
    }
    return null;
  }),
  page.locator("main").innerText(),
]);

check("the product page emits a Product block", product !== null);

if (product) {
  const aggregate = product.offers;
  check("with an aggregate offer", aggregate?.["@type"] === "AggregateOffer", JSON.stringify(aggregate)?.slice(0, 80));
  check(
    "that says the range excludes GST",
    aggregate?.valueAddedTaxIncluded === false,
    `valueAddedTaxIncluded: ${aggregate?.valueAddedTaxIncluded}`,
  );

  const prices = (aggregate?.offers ?? []).map((offer) => Number(offer.price));
  /*
   * At least one, not more than one.
   *
   * This asserted `> 1` because every plan carried an annual and a monthly
   * line. `2026-10-microsoft-price-list` archived the monthly ones — "annual
   * prices only" was the instruction, and it also removed a comparison defect
   * where a monthly instalment sat beside an annual total — so a correct page
   * now has exactly one offer and this read as a failure. What the check is
   * actually for is that the block names the variants rather than collapsing
   * them to a single figure, and the per-offer assertions below are what
   * establish that; this one only has to catch an empty list.
   */
  check("and names the priced variants", prices.length >= 1, `${prices.length} offers`);
  check(
    "with a high price as well as a low one, where they differ",
    Math.max(...prices) === Math.min(...prices) || Number(aggregate?.highPrice) === Math.max(...prices),
    `lowPrice ${aggregate?.lowPrice}, highPrice ${aggregate?.highPrice}, actual ${Math.min(...prices)}–${Math.max(...prices)}`,
  );

  for (const offer of aggregate?.offers ?? []) {
    const spec = offer.priceSpecification;
    check(
      `${offer.sku} states its price basis`,
      spec?.["@type"] === "UnitPriceSpecification" && spec.valueAddedTaxIncluded === false,
      JSON.stringify(spec)?.slice(0, 120) ?? "(none)",
    );
    check(
      `  and the same figure as the offer`,
      Number(spec?.price) === Number(offer.price),
      `offer ${offer.price}, spec ${spec?.price}`,
    );
    check(
      `  and a reference quantity`,
      Number(spec?.referenceQuantity?.value) > 0,
      JSON.stringify(spec?.referenceQuantity) ?? "(none)",
    );
    /*
     * Each structured price has to appear on the page. A figure a search engine
     * shows beside a result and a buyer cannot find when they arrive is the
     * worst outcome of all of this, and it is the one nobody checks by eye.
     */
    const formatted = Number(offer.price).toLocaleString("en-IN", { maximumFractionDigits: 0 });
    check(
      `  and appears on the page as ₹${formatted}`,
      visible.includes(formatted),
      `₹${formatted} not found in the rendered page`,
    );
  }
}

check(
  "the page says the price is tentative and GST-exclusive",
  /tentative price, excluding gst/i.test(visible),
  visible.slice(0, 120),
);

await browser.close();

const failed = results.filter((result) => !result.ok).length;
console.log(`\n${results.length - failed}/${results.length} indexation and price-basis checks passed`);
process.exit(failed ? 1 : 0);
