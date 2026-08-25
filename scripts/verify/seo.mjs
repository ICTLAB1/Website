import { chromium } from "playwright";

/**
 * SEO fundamentals, on the rendered page rather than in the metadata helper.
 *
 * `buildMetadata` is correct by construction, but a page that forgets to call
 * it, or a CMS record with an empty description, produces exactly the same
 * source code and a very different page. These read what actually shipped.
 */

const BASE = "http://localhost:3000";
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const page = await (await browser.newContext()).newPage();
const problems = [];

const sitemap = await (await fetch(`${BASE}/sitemap.xml`)).text();
const paths = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname);

const longTitles = [];
const shortDescriptions = [];
const titles = new Map();
const descriptions = new Map();

/*
 * A slug shaped like something a verify suite made.
 *
 * Every suite here creates fixtures and deletes them at the end, and the
 * deletion only happens if the script reaches it — a Playwright timeout throws
 * past it. Two of those fixtures had been sitting in the sitemap for a day when
 * this was written: a `verify-cms-` page published since 21 August, and a
 * `photo-probe-` product live in the catalogue, both submitted to Google as
 * real pages.
 *
 * The suites now sweep their own leftovers at startup, but that only helps for
 * the suite that leaked. This is the check that does not care who leaked it:
 * whatever is in the sitemap is what the site is telling search engines exists,
 * and a fixture has no business being in that list.
 */
const FIXTURE_SLUG = /(^|\/)(verify-|probe-|.*-probe-|test-|fixture-)/;

// Every internal link found on every page, so a page nothing links to shows up.
const inbound = new Map(paths.map((path) => [path, 0]));

/*
 * The primary navigation, in the bytes the server sends.
 *
 * Read with `fetch`, not through the browser, and that is the point: this is
 * what a crawler is given before it decides whether to spend a render budget on
 * the page. The mega-menu panels were mounted only once a panel was open, so
 * the served HTML contained the five top-level links and nothing else — ninety
 * links, the site's whole information architecture, existed only after a hover.
 *
 * The orphan check below would catch a repeat of this eventually, once enough
 * pages fell off the graph. This says which thing broke.
 */
/*
 * The old Wix URLs other sites still link to, and where each must land.
 *
 * Not a guess at what the old site published — a reading of the backlink index
 * on 23 August 2026, listing every URL on this domain that somebody else
 * currently points at. Sixty-five of the hundred and fourteen inbound links
 * were landing on a 404 or on `/products`, which is a listing page and not an
 * answer; Google calls a redirect that lands somewhere unrelated a soft 404 and
 * passes it nothing.
 *
 * These are checked because they are silent when they break. A redirect that
 * stops matching, or a destination that is renamed or unpublished, costs a link
 * somebody else's site earned this business, and nothing on the site would look
 * any different afterwards. The count in each row is how many links ride on it.
 */
const RECLAIMED = [
  ["/product-page/microsoft-365-business-standard-annual-subscription", "/products/microsoft-365-business-standard", 10],
  ["/product-page/microsoft-365-business-basic-annual-subscription", "/products/microsoft-365-business-basic", 10],
  ["/product-page/m365-business-premium-annual-license", "/products/microsoft-365-business-premium", 7],
  ["/post/why-your-business-needs-a-microsoft-office-365-license", "/microsoft-365", 6],
  ["/product-page/autodesk-civil-3d-business-license", "/products/autodesk-civil-3d", 5],
  ["/product-page/adobeacrobatprodc1yearsubscription", "/products/adobe-acrobat-pro-teams", 4],
  ["/post/where-can-i-buy-a-subscription-for-professional-office-software-bundles-in-india", "/microsoft-365", 4],
  ["/group/techzoid-technologie-group/discussion/be30586d-6eda-4d46-9e63-9360fe5c166e", "/blog", 3],
  ["/product-page/autodesk-autocad-lt-1-year-subscription", "/autocad", 2],
  ["/product-page/autocad-lt-business-license", "/autocad", 0],
  ["/product-page/autodesk-revit-business-license", "/products/revit", 1],
  ["/product-page/autocad-business-license", "/products/autocad", 1],
  ["/product-page/adobe-creative-cloud-all-apps", "/products/adobe-creative-cloud-all-apps-teams", 1],
  ["/post/windows-11-in-2026-still-worth-buying-or-already-outdated", "/products/windows-11-pro-upgrade", 1],
  ["/post/top-5-reasons-businesses-should-upgrade-to-windows-11-pro-in-2025", "/products/windows-11-pro-upgrade", 1],
  /*
   * The three below are not linked by anybody — they rank. Every keyword this
   * domain holds in India sits on a `/product-page/*` URL that no longer
   * exists, so these carry search positions rather than links, and the count
   * column is monthly search volume instead. Losing one of these redirects
   * loses a position that took years to earn.
   */
  ["/product-page/windows-11-pro-business-license", "/products/windows-11-pro-upgrade", 0],
  /*
   * And the six Merchant Center named, which were falling through the
   * catch-all onto `/products` — a listing page, which is the soft-404 pattern
   * this whole table exists to avoid. None of the six is in the catalogue, so
   * each goes to the page that is honestly about the subject.
   */
];

let reclaimed = 0;
for (const [legacy, expected, links] of RECLAIMED) {
  /*
   * Followed by hand rather than with `redirect: "follow"`, so the number of
   * hops is visible.
   *
   * A chain still lands on the right page and still passes a destination
   * check, which is why one can sit there for months: every hop loses a little
   * more of the link's value, and a feed or a crawler that refuses to follow
   * more than one sees a redirect rather than a product. One hop, or it is a
   * fault.
   */
  let current = legacy;
  let hops = 0;
  let status = 0;
  for (; hops < 5; hops += 1) {
    const response = await fetch(BASE + current, { redirect: "manual" });
    status = response.status;
    const location = response.headers.get("location");
    if (!location) break;
    current = new URL(location, BASE).pathname;
  }

  if (status === 200 && current === expected) {
    reclaimed += links;
    if (hops > 1) {
      problems.push(`${legacy} reaches ${expected} in ${hops} hops; a legacy URL must redirect once`);
    }
  } else {
    problems.push(
      `${legacy} carries ${links} inbound link(s) and lands on ${current} (${status}), not ${expected}`,
    );
  }
}

/*
 * None of them may land on the catalogue listing.
 *
 * That is what the catch-all does with anything not named above, and it is
 * what put six URLs into a Merchant Center report: a redirect to a listing
 * page answers a different question from the one the visitor asked, and Google
 * scores it as a soft 404 rather than as a redirect.
 */
const dumped = RECLAIMED.filter(([, expected]) => expected === "/products");
for (const [legacy] of dumped) {
  problems.push(`${legacy} is listed as redirecting to the generic catalogue listing`);
}

const homeHtml = await (await fetch(`${BASE}/`)).text();
const primaryNav = homeHtml.match(/<nav aria-label="Primary"[\s\S]*?<\/nav>/)?.[0] ?? "";
const primaryLinks = [...primaryNav.matchAll(/href="\/[^"]*"/g)].length;
if (primaryLinks < 30) {
  problems.push(
    `the primary navigation ships only ${primaryLinks} links in the served HTML — ` +
      `menu panels must be rendered and hidden, not mounted on open`,
  );
}

for (const path of paths) {
  await page.goto(BASE + path, { waitUntil: "domcontentloaded", timeout: 30000 });

  if (FIXTURE_SLUG.test(path)) {
    problems.push(`${path}: a verify-suite fixture is in the sitemap`);
  }

  /*
   * Counted from the served HTML, not from the route table.
   *
   * The distinction matters: this site's entire header mega-menu used to be
   * mounted only once a panel was open, so ninety links a reader could see
   * were absent from every byte the server sent. Fifteen brand pages and two
   * product pages were reachable from nothing a crawler could read, while
   * looking perfectly well linked in the source.
   */
  for (const href of await page.evaluate(() =>
    [...document.querySelectorAll("a[href^='/']")].map((a) => a.getAttribute("href")),
  )) {
    let target = href.split("#")[0].split("?")[0];
    if (target.length > 1 && target.endsWith("/")) target = target.slice(0, -1);
    if (target !== path && inbound.has(target)) inbound.set(target, inbound.get(target) + 1);
  }

  const meta = await page.evaluate(() => ({
    title: document.title,
    description: document.querySelector('meta[name="description"]')?.getAttribute("content") ?? "",
    canonical: document.querySelector('link[rel="canonical"]')?.getAttribute("href") ?? "",
    robots: document.querySelector('meta[name="robots"]')?.getAttribute("content") ?? "",
    h1: [...document.querySelectorAll("h1")].map((h) => h.textContent.trim()),
    ogTitle: document.querySelector('meta[property="og:title"]')?.getAttribute("content") ?? "",
  }));

  if (!meta.title) problems.push(`${path}: no title`);

  /*
   * Two thresholds, because there are two different faults.
   *
   * A search result shows roughly sixty characters, so anything past that is
   * truncated. For most pages that is worth fixing — and fixing the title
   * template alone (thirty-six characters of boilerplate on every page) took
   * forty pages under the limit. But an article headline is allowed to be
   * long: "Microsoft 365 Business Premium: the security you may already be
   * paying for" says what it is in its first thirty characters, and cutting it
   * to fit would make the page worse to serve a preview. Those are listed, not
   * failed.
   *
   * Past ninety, the subject itself is at risk of being cut, which is a fault
   * again whatever wrote it.
   */
  if (meta.title.length > 90) {
    problems.push(`${path}: title is ${meta.title.length} characters`);
  } else if (meta.title.length > 60) {
    longTitles.push(`${path}: ${meta.title.length} characters`);
  }
  /*
   * Descriptions get the same two-threshold treatment as titles, for the same
   * reason: one length is a fault and the other is a judgement.
   *
   * Google shows about 155 characters. Past 180 the sentence is being cut
   * mid-clause whatever wrote it, which is a fault. Between 160 and 180 it is
   * merely tight, and under 70 it is leaving the result looking thin — both
   * worth a list and neither worth failing a build over, because a short
   * accurate description beats a padded one and padding is what a hard failure
   * would encourage. These are the constraints: descriptions must not invent
   * capability to reach a character count.
   */
  if (!meta.description) problems.push(`${path}: no meta description`);
  else if (meta.description.length > 180) {
    problems.push(`${path}: description is ${meta.description.length} characters`);
  } else if (meta.description.length < 70 || meta.description.length > 160) {
    shortDescriptions.push(`${path}: ${meta.description.length} characters`);
  }
  if (!meta.canonical) problems.push(`${path}: no canonical URL`);
  if (!meta.ogTitle) problems.push(`${path}: no og:title`);

  // Exactly one h1. Zero leaves the page with no stated subject; more than one
  // means two competing subjects.
  if (meta.h1.length !== 1) problems.push(`${path}: ${meta.h1.length} h1 elements`);

  // A page in the sitemap that tells robots not to index it is a contradiction:
  // one of the two is wrong, and both are ours.
  if (/\bnoindex\b/.test(meta.robots)) {
    problems.push(`${path}: listed in the sitemap but marked noindex`);
  }

  // Duplicates confuse a search engine about which page to rank.
  if (titles.has(meta.title)) problems.push(`${path}: shares its title with ${titles.get(meta.title)}`);
  else titles.set(meta.title, path);

  if (descriptions.has(meta.description)) {
    problems.push(`${path}: shares its description with ${descriptions.get(meta.description)}`);
  } else descriptions.set(meta.description, path);

  // The canonical must point at this page, not at another one.
  if (meta.canonical && new URL(meta.canonical).pathname !== path) {
    problems.push(`${path}: canonical points at ${new URL(meta.canonical).pathname}`);
  }
}

await browser.close();

/*
 * A product page's picture, and whether it is claimed as the product's own.
 *
 * `image` is a required property of Google's Product type: without it there is
 * no product rich result at all — no picture, no price, no availability beside
 * the search result. So it has to be declared when there is a photograph.
 *
 * And it must be absent when there is not. Where no photograph exists the page
 * draws a category illustration under a notice saying it is not the model
 * supplied; declaring that as `image` tells a crawler the opposite of what the
 * page tells a reader. Both directions are asserted, because checking only the
 * first is how the illustration ends up in there as a "fix".
 *
 * The product's own figure is found by its alt text, which `ProductPhoto`
 * writes as the product name — and suffixes when the picture is an
 * illustration. An earlier version looked for any `<img>` at all and flagged
 * eleven pages whose only pictures were the site wordmark and two partner
 * badges.
 */
const undeclared = [];
const overclaimed = [];
const productPaths = paths.filter((entry) => entry.startsWith("/products/"));

for (const path of productPaths) {
  const html = await (await fetch(`${BASE}${path}`)).text();

  let node = null;
  for (const match of html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)) {
    const parsed = JSON.parse(match[1].replaceAll("\\u003c", "<"));
    if (parsed["@type"] === "Product") node = parsed;
  }
  if (!node?.name) continue;

  const figure = [...html.matchAll(/<img\b[^>]*\salt="([^"]*)"[^>]*>/g)]
    .map((match) => match[1])
    .find((alt) => alt.startsWith(node.name));

  // The suffix `ProductPhoto` adds is the page's own statement that what it is
  // showing depicts the category rather than the model.
  const isIllustration = Boolean(figure?.includes("representative image"));

  if (node.image && (isIllustration || !figure)) overclaimed.push(path);
  if (!node.image && figure && !isIllustration) undeclared.push(path);
}

for (const path of overclaimed) {
  problems.push(`${path}: declares an image the page does not show as a photograph`);
}
for (const path of undeclared) {
  problems.push(`${path}: shows a photograph the Product schema does not declare`);
}

console.log(
  `Product images: ${productPaths.length} product page(s); ` +
    `${overclaimed.length} overclaiming, ${undeclared.length} with an undeclared photograph.`,
);

/*
 * The retired shop, which must be Gone rather than merely missing.
 *
 * These are products the previous site sold and this one does not, with no page
 * here that answers the question the URL asks. A brand page is not that answer:
 * it is a consolation, and Google scores a redirect to one as a soft 404 — which
 * is what put six of them into a Merchant Center report while looking, from the
 * outside, like working redirects.
 *
 * 410 rather than 404, because 404 means "ask again some time" and a crawler
 * will, for months. The prefixes are covered too: an unlisted URL under any of
 * them must not fall through to a listing page, which is the failure this
 * replaces.
 */
/*
 * Two URLs left this list on 25 August 2026, and why matters more than the
 * edit.
 *
 * `microsoft-visual-studio-enterprise` and `microsoft-visio-plan-1` were on it
 * because the catalogue sold neither, and a 410 is the right answer for a page
 * nothing replaces. Then a live check of Google's results found them at 13 and
 * 10 in India — the two most valuable positions this domain holds — and a 410
 * is a request to forget a URL, which means forgetting the position with it.
 *
 * Both products now exist and both URLs redirect to them, which is what the
 * check below asserts. The rest of this list is unchanged: those URLs really do
 * answer nothing, and pretending otherwise with a redirect to a brand page
 * would earn a soft 404 rather than a ranking.
 */
const RECOVERED = [
  ["/product-page/microsoft-visual-studio-enterprise", "/products/visual-studio-enterprise"],
  ["/product-page/microsoft-visio-plan-1", "/products/visio-plan-1"],
  ["/product-page/autodesk-fusion-360-business-license", "/products/fusion-360"],
];

const RETIRED = [
  "/product-page/3ds-max-business-license",
  "/product-page/autodesk-vault-business-license",
  "/product-page/inventor-business-license",
  "/product-page/microsoft-365-apps-for-business-annual-subscription",
  "/product-page/microsoft-project-plan-1",
  "/product-page/microsoft-project-plan-3",
  "/product-page/microsoft-sharepoint-online-plan-2",
  "/product-page/microsoft-visio-plan-2",
  "/product-page/microsoft-visual-studio-professional",
  "/product-page/microsoft-windows-10-pro-64-bit-system-builder-oem",
  "/product-page/buycoreldrawgraphicssuite2025lifetimelicense",
  // The prefixes, probed with a slug that never existed.
  "/product-page/nothing-was-ever-here",
  "/service-page/nothing-was-ever-here",
  "/blog/categories/nothing-was-ever-here",
  "/post/nothing-was-ever-here",
  "/shop-1",
];

let gone = 0;
for (const path of RETIRED) {
  const response = await fetch(BASE + path, { redirect: "manual" });
  if (response.status === 410) gone += 1;
  else problems.push(`${path}: answered ${response.status}, not 410 Gone`);
}
console.log(`Retired URLs: ${gone} of ${RETIRED.length} answer 410 Gone.`);

/*
 * And the ones that rank: a permanent redirect to a page that answers the
 * query, not a 410 and not a soft 404 into a listing.
 */
let recovered = 0;
for (const [path, destination] of RECOVERED) {
  const response = await fetch(`${BASE}${path}`, { redirect: "manual" });
  const location = response.headers.get("location") ?? "";
  if (response.status === 301 && new URL(location, BASE).pathname === destination) {
    recovered += 1;
  } else {
    problems.push(
      `${path}: answered ${response.status} to ${location || "nowhere"}, not 301 to ${destination}`,
    );
  }

  // The destination has to exist, or the redirect is a 404 with extra steps.
  const landed = await fetch(`${BASE}${destination}`);
  if (landed.status !== 200) problems.push(`${destination}: answered ${landed.status}, not 200`);
}
console.log(`Ranking URLs: ${recovered} of ${RECOVERED.length} redirect to a page that answers.`);

/*
 * A page in the sitemap that nothing links to.
 *
 * This is a failure, not a note. Submitting a URL to Google while giving it no
 * path from any other page says two contradictory things about whether the page
 * matters, and the sitemap loses either way: internal links are how a crawler
 * decides what a site considers important, and a page with none has been told
 * to rank on nothing. A reader is worse off still — they cannot reach it at all
 * without guessing the URL.
 *
 * Either link it or take it out of the sitemap. Both are fine; the silence is
 * not.
 */
const orphans = [...inbound].filter(([, count]) => count === 0).map(([path]) => path);
for (const path of orphans) {
  problems.push(`${path}: in the sitemap, linked from no page on the site`);
}

if (longTitles.length) {
  console.log(`${longTitles.length} title(s) over 60 characters, so truncated in a search result:`);
  for (const line of longTitles) console.log("  " + line);
  console.log("");
}

if (shortDescriptions.length) {
  console.log(`${shortDescriptions.length} description(s) outside the 70–160 character window:`);
  for (const line of shortDescriptions) console.log("  " + line);
  console.log("");
}

// One inbound link is not an error, but it is the population orphans come from:
// delete the page that links it and it becomes one silently.
const weak = [...inbound].filter(([, count]) => count > 0 && count <= 2);
if (weak.length) {
  console.log(`${weak.length} page(s) reachable from only one or two others:`);
  for (const [path, count] of weak) console.log(`  ${path}: ${count}`);
  console.log("");
}

if (problems.length) {
  console.log("PROBLEMS:");
  for (const problem of problems) console.log("  " + problem);
  process.exit(1);
}
console.log(
  `SEO: title, description, canonical, og:title, single h1, no duplicates, no fixture slugs ` +
    `and an inbound link for every one of ${paths.length} pages.`,
);
console.log(
  `Legacy URLs: ${reclaimed} inbound links across ${RECLAIMED.length} old Wix paths still land ` +
    `on the page they were about.`,
);
