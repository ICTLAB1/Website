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
