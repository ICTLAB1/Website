import { chromium } from "playwright";

/**
 * Walks the whole public site and checks what a visitor would actually see.
 *
 * The unit tests scan source and seed files. They cannot see content that lives
 * in the database and reaches the page through the CMS, and they cannot see a
 * link that resolves to a 404. This does both, against the rendered site, which
 * is the only place the two halves meet.
 *
 * Four questions per page:
 *
 *   Does it load, without a server error and without anything on the console?
 *   Does every internal link on it resolve?
 *   Does it describe the business relationship the right way round?
 *   Does it leak anything a visitor should never see — a configuration warning,
 *   an environment variable name, draft or placeholder text?
 */

const BASE = "http://localhost:3000";

/**
 * Language that must never reach a visitor.
 *
 * Each entry is here because it was on the site: the footer told everyone which
 * settings were unpopulated, the legal pages opened with a note to their own
 * reviewer, and a grid of other companies' logos was headed "Vendors we supply".
 */
const FORBIDDEN = [
  { pattern: /configuration required/i, why: "configuration warning" },
  { pattern: /not configured/i, why: "configuration warning" },
  { pattern: /before this site goes live/i, why: "pre-launch language" },
  { pattern: /awaiting legal review/i, why: "draft legal document" },
  { pattern: /this deployment/i, why: "deployment language" },
  { pattern: /\b(?:COMPANY|SMTP|SEED|AUTH|MAIL|DATABASE)_[A-Z][A-Z0-9_]{2,}\b/, why: "environment variable name" },
  { pattern: /\bvendors?\b/i, why: "ambiguous supplier terminology" },
  { pattern: /\bTECHZID\b/i, why: "misspelt company name" },
  { pattern: /lorem ipsum/i, why: "placeholder text" },
  { pattern: /\b(?:TODO|FIXME)\b/, why: "developer note" },
  { pattern: /\bplaceholder\b/i, why: "placeholder text" },
];

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await context.newPage();

const problems = [];
const consoleErrors = [];

page.on("console", (message) => {
  if (message.type() === "error") consoleErrors.push(message.text());
});
page.on("pageerror", (error) => consoleErrors.push(String(error)));

/**
 * Two collections, because the two questions have very different costs.
 *
 * `queue` holds URLs to open in a browser and read. Links are queued exactly as
 * written, never with the query string stripped: `/buy` without a `?sku=` is a
 * 404 by design, and stripping the query invented that link and then reported
 * it as broken. But at most `VARIANTS_PER_PATH` are taken for any one path —
 * the catalogue links to itself under every combination of brand, category,
 * licence type, price and sort, and following all of them turned a 130-page
 * crawl into a combinatorial one that had not finished after ten minutes. Two
 * variants prove the page renders with filters applied; the hundredth does not.
 *
 * `hrefs` holds every internal link as written, and each is checked for its
 * status code with a plain request. That is what actually answers "is this link
 * broken", it covers the variants the crawl skipped, and it costs milliseconds.
 */
const VARIANTS_PER_PATH = 2;

const queue = [];
const seen = new Set();
const variants = new Map();
const hrefs = new Set();

function enqueue(href) {
  const url = href.split("#")[0];
  if (!url.startsWith("/") || seen.has(url)) return;

  hrefs.add(url);
  seen.add(url);

  const path = url.split("?")[0];
  const taken = variants.get(path) ?? 0;
  if (taken >= VARIANTS_PER_PATH) return;
  variants.set(path, taken + 1);
  queue.push(url);
}

const sitemap = await (await fetch(`${BASE}/sitemap.xml`)).text();
for (const match of sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)) {
  enqueue(new URL(match[1]).pathname);
}
console.log(`sitemap lists ${queue.length} paths`);
enqueue("/");

/**
 * Paths that are supposed to redirect or require a session. Visiting them is
 * still worthwhile — a 500 behind a login is still a 500 — but their content is
 * the account area rather than public copy.
 */
const isPrivate = (path) => path.startsWith("/account") || path.startsWith("/admin");

let checked = 0;

while (queue.length > 0) {
  const path = queue.shift();
  consoleErrors.length = 0;

  const response = await page.goto(BASE + path, { waitUntil: "load", timeout: 30000 });
  const status = response?.status() ?? 0;
  checked += 1;

  if (status >= 400) {
    problems.push(`${path}: HTTP ${status}`);
    continue;
  }

  for (const error of consoleErrors) {
    problems.push(`${path}: console error — ${error.slice(0, 160)}`);
  }

  /*
   * Body text only. Script and style contents are not what a visitor reads, and
   * JSON-LD legitimately repeats the copy that is already being checked.
   *
   * Both `innerText` and `textContent`, because they disagree in a way that hid
   * a real defect: `innerText` is what a page *looks* like — it inserts
   * whitespace at layout boundaries — while `textContent` is what a copy-paste
   * or a search engine's extractor actually gets. The wordmark rendered two
   * adjacent spans reading "TECHZ" and "ID" with a graphic between them, so
   * `innerText` produced "TECHZ ID" and sailed past the check for the very
   * typo it exists to catch, while `textContent` said "TECHZID".
   */
  const text = await page.evaluate(() => {
    const clone = document.body.cloneNode(true);
    for (const node of clone.querySelectorAll("script, style, noscript")) node.remove();
    return `${clone.innerText}\n${clone.textContent}`;
  });

  if (!isPrivate(path)) {
    for (const { pattern, why } of FORBIDDEN) {
      const found = pattern.exec(text);
      if (found) problems.push(`${path}: ${why} — "${found[0]}"`);
    }
  }

  // Internal links, queued so the crawl reaches pages the sitemap does not list.
  const links = await page.evaluate(() =>
    [...document.querySelectorAll("a[href]")]
      .map((a) => a.getAttribute("href"))
      .filter((href) => href && !/^(?:https?:|mailto:|tel:|#)/.test(href)),
  );
  for (const href of links) enqueue(href);
}

console.log(`crawled ${checked} pages, collected ${hrefs.size} distinct internal links`);

await browser.close();

/**
 * Every link, exactly as written.
 *
 * The crawl above only opened distinct paths, so a link carrying a query string
 * that 500s — a bad filter value, a sort key nothing handles — would never have
 * been requested. Checked in batches so several hundred links take seconds.
 */
const links = [...hrefs];
const BATCH = 12;

for (let index = 0; index < links.length; index += BATCH) {
  const batch = links.slice(index, index + BATCH);
  const statuses = await Promise.all(
    batch.map(async (href) => {
      try {
        const response = await fetch(BASE + href, { redirect: "follow" });
        return [href, response.status];
      } catch (error) {
        return [href, String(error)];
      }
    }),
  );

  for (const [href, status] of statuses) {
    if (status !== 200) problems.push(`link ${href}: HTTP ${status}`);
  }
}

// A crawl that reached almost nothing would otherwise pass in silence.
if (checked < 40) problems.push(`only ${checked} pages crawled; the crawl did not reach the site`);

if (problems.length) {
  console.log("\nPROBLEMS:");
  for (const problem of [...new Set(problems)]) console.log("  " + problem);
  process.exit(1);
}
console.log(`No broken links, console errors, leaked configuration or reversed terminology across ${checked} pages.`);
