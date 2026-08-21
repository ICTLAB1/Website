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
const titles = new Map();
const descriptions = new Map();

for (const path of paths) {
  await page.goto(BASE + path, { waitUntil: "domcontentloaded", timeout: 30000 });

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
  if (!meta.description) problems.push(`${path}: no meta description`);
  else if (meta.description.length > 180) {
    problems.push(`${path}: description is ${meta.description.length} characters`);
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

if (longTitles.length) {
  console.log(`${longTitles.length} title(s) over 60 characters, so truncated in a search result:`);
  for (const line of longTitles) console.log("  " + line);
  console.log("");
}

if (problems.length) {
  console.log("PROBLEMS:");
  for (const problem of problems) console.log("  " + problem);
  process.exit(1);
}
console.log(`SEO: title, description, canonical, og:title, single h1 and no duplicates across ${paths.length} pages.`);
