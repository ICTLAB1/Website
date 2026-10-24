/**
 * The technical SEO `verify:seo` does not cover.
 *
 * `scripts/verify/seo.mjs` is thorough about the things an editor gets wrong —
 * titles, descriptions, canonicals, duplicates, orphans, the old Wix URLs, the
 * fixtures that leak into the sitemap. It asserts exactly one social tag
 * (`og:title`) and one structured-data block (on a single product page), and
 * nothing at all about the sitemap document itself or the ways one page can be
 * reachable at several URLs.
 *
 * Those are the gaps this fills, on the same reasoning the other file states:
 * `buildMetadata` is correct by construction, and a route that forgets to call
 * it compiles, renders, and ships a page with no Open Graph card and no
 * canonical. Only the rendered bytes say which happened.
 *
 * Read-only: `fetch` against a running server, no browser, no writes. It is
 * about ten seconds for the whole sitemap.
 *
 *   node scripts/verify/seo-technical.mjs
 */

const BASE = (process.env.BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");

const results = [];
const check = (label, ok, detail = "") => {
  results.push({ label, ok });
  if (!ok) console.log(`  FAIL  ${label}${detail ? `\n          ${detail}` : ""}`);
};
const section = (name) => console.log(`\n${name}`);

const get = async (path, init) => {
  const response = await fetch(`${BASE}${path}`, {
    headers: { "user-agent": "techzoid-seo-technical" },
    ...init,
  });
  return { status: response.status, headers: response.headers, body: await response.text() };
};

const attr = (html, selector) => {
  const match = new RegExp(`<meta[^>]+${selector}[^>]*>`, "i").exec(html);
  if (!match) return null;
  const content = /content="([^"]*)"/i.exec(match[0]);
  return content ? content[1] : null;
};

// ── the sitemap as a document ─────────────────────────────────────────────
section("The sitemap");

const sitemap = await get("/sitemap.xml");
check("sitemap.xml is served", sitemap.status === 200, `status ${sitemap.status}`);

const locs = [...sitemap.body.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
check("it lists URLs", locs.length > 0, `${locs.length} entries`);

/*
 * A duplicate is not harmless. Two entries for one page is the sitemap telling
 * a crawler the page is two pages, which is the same signal a missing canonical
 * sends and costs the same consolidation.
 */
const seen = new Map();
const duplicates = [];
for (const loc of locs) {
  if (seen.has(loc)) duplicates.push(loc);
  seen.set(loc, true);
}
check("no URL is listed twice", duplicates.length === 0, duplicates.slice(0, 5).join(", "));

const origin = new URL(BASE).origin;
const foreign = locs.filter((loc) => {
  try {
    return new URL(loc).origin !== origin;
  } catch {
    return true;
  }
});
check("every URL is absolute and on this origin", foreign.length === 0, foreign.slice(0, 5).join(", "));

const trailing = locs.filter((loc) => new URL(loc).pathname !== "/" && loc.endsWith("/"));
check("none carries a trailing slash the site does not use", trailing.length === 0, trailing.slice(0, 5).join(", "));

const lastmods = [...sitemap.body.matchAll(/<lastmod>([^<]+)<\/lastmod>/g)].map((m) => m[1]);
const badDates = lastmods.filter((value) => Number.isNaN(Date.parse(value)));
check("every lastmod is a date", badDates.length === 0, badDates.slice(0, 5).join(", "));

const future = lastmods.filter((value) => Date.parse(value) > Date.now() + 86_400_000);
check("and none is in the future", future.length === 0, future.slice(0, 3).join(", "));

// 50,000 URLs or 50 MB is the protocol's limit for one file.
check("it is within the 50,000-URL limit", locs.length < 50_000, `${locs.length}`);

const robots = await get("/robots.txt");
check("robots.txt is served", robots.status === 200, `status ${robots.status}`);
check(
  "and points at the sitemap",
  robots.body.includes("/sitemap.xml"),
  "no Sitemap: line naming sitemap.xml",
);

// ── one page can be one URL ───────────────────────────────────────────────
section("Duplicate URL forms");

/*
 * Every one of these is a second address for a page that already has one. A
 * crawler that finds both has to decide which is canonical, and the answer it
 * picks is not always the one in the sitemap.
 */
const DUPLICATE_FORMS = [
  ["/about/", "/about", "a trailing slash"],
  ["/products/", "/products", "a trailing slash on a listing"],
];

for (const [path, expected, what] of DUPLICATE_FORMS) {
  const response = await get(path, { redirect: "manual" });
  const location = response.headers.get("location");
  const landed = location ? new URL(location, BASE).pathname : null;
  check(
    `${what} redirects to ${expected}`,
    (response.status === 301 || response.status === 308) && landed === expected,
    `${path} answered ${response.status}${landed ? ` to ${landed}` : ""}`,
  );
}

/*
 * A hard 404, not a soft one. The status is the whole of it: a missing page
 * that answers 200 with "could not be found" is a page the index keeps and
 * shows, and no meta tag undoes that. Nothing here asks the 404 page to carry
 * `noindex` — a 404 status already removes it, and asserting a belt as well as
 * braces would be a failing check about nothing.
 */
const missing = await get("/this-page-does-not-exist-" + Date.now());
check("an unknown path answers 404, not 200", missing.status === 404, `status ${missing.status}`);
check(
  "and the 404 page is not a blank shell",
  /could not be found/i.test(missing.body),
  "the not-found page rendered no copy",
);

// ── the social card, on every page in the sitemap ─────────────────────────
section("Open Graph and Twitter, across the sitemap");

const paths = locs.map((loc) => new URL(loc).pathname);
const socialProblems = [];
const jsonLdProblems = [];
const langProblems = [];
let ogImage = null;

for (const path of paths) {
  const page = await get(path);
  if (page.status !== 200) {
    socialProblems.push(`${path}: status ${page.status}`);
    continue;
  }
  const html = page.body;

  const required = {
    "og:description": attr(html, 'property="og:description"'),
    "og:url": attr(html, 'property="og:url"'),
    "og:type": attr(html, 'property="og:type"'),
    "og:site_name": attr(html, 'property="og:site_name"'),
    "og:image": attr(html, 'property="og:image"'),
    "twitter:card": attr(html, 'name="twitter:card"'),
    "twitter:title": attr(html, 'name="twitter:title"'),
    "twitter:description": attr(html, 'name="twitter:description"'),
  };
  const absent = Object.entries(required)
    .filter(([, value]) => !value)
    .map(([key]) => key);
  if (absent.length > 0) socialProblems.push(`${path}: no ${absent.join(", ")}`);

  if (required["og:image"]) {
    ogImage ??= required["og:image"];
    // A scraper is not a browser; several fetch the attribute as given.
    if (!/^https?:\/\//.test(required["og:image"])) {
      socialProblems.push(`${path}: og:image is relative — "${required["og:image"]}"`);
    }
  }
  if (required["og:url"]) {
    const declared = new URL(required["og:url"]).pathname;
    if (declared !== path) socialProblems.push(`${path}: og:url says ${declared}`);
  }

  if (!/<html[^>]+lang="[a-z]{2}(-[A-Za-z]{2})?"/i.test(html)) langProblems.push(path);

  for (const block of html.matchAll(
    /<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g,
  )) {
    try {
      JSON.parse(block[1]);
    } catch (error) {
      jsonLdProblems.push(`${path}: ${String(error).slice(0, 60)}`);
    }
  }
}

check(
  `every page in the sitemap carries a full social card (${paths.length} pages)`,
  socialProblems.length === 0,
  socialProblems.slice(0, 8).join("\n          "),
);
check("every page declares a document language", langProblems.length === 0, langProblems.slice(0, 5).join(", "));
check("every JSON-LD block parses", jsonLdProblems.length === 0, jsonLdProblems.slice(0, 5).join("\n          "));

if (ogImage) {
  const card = await fetch(ogImage);
  check("the social card image is served", card.ok, `status ${card.status} for ${ogImage}`);
  check(
    "and is a raster, which the scrapers require",
    /^image\/(png|jpeg|webp)/.test(card.headers.get("content-type") ?? ""),
    `content-type ${card.headers.get("content-type")}`,
  );
}

// ── the machine-readable summary ──────────────────────────────────────────
section("Agent and crawler files");

const llms = await get("/llms.txt");
check("llms.txt is served", llms.status === 200, `status ${llms.status}`);
/*
 * `text/markdown` or `text/plain`, both of which a reader renders as text.
 * The route serves markdown, which is what llmstxt.org's examples are; this
 * check exists to catch it being served as `text/html` or downloaded as an
 * attachment, not to pick between the two correct answers.
 */
check(
  "as text rather than markup",
  /^text\/(plain|markdown)/.test(llms.headers.get("content-type") ?? ""),
  `content-type ${llms.headers.get("content-type")}`,
);

const failed = results.filter((result) => !result.ok).length;
console.log(`\n${results.length - failed}/${results.length} technical SEO checks passed`);
process.exit(failed ? 1 : 0);
