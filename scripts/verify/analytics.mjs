/**
 * The Google tags, read out of the document the server actually sends.
 *
 * Everything here is a property of the emitted HTML rather than of the
 * component that emits it, and that distinction is the reason the file exists.
 * The component was correct: consent defaults first, then the loaders. React
 * hoists a script marked `async` into `<head>`, so the shipped page had the
 * loaders at byte 1,838 and the defaults at byte 145,919 — the exact inversion
 * Consent Mode is defined against, invisible in the source and invisible on the
 * page.
 *
 * Run against a production build, because that hoisting is what a production
 * build does.
 */

import { request } from "node:http";

const PORT = 3000;

/*
 * The tag is off on localhost by design, so every request here carries the real
 * host. That is also the only way to test the thing that ships: a page fetched
 * as "localhost" has no tag on it at all and would pass every check below by
 * having nothing to check.
 */
const LIVE_HOST = "www.techzoidtechnologies.com";

const problems = [];
const check = (condition, description) => {
  if (!condition) problems.push(description);
};

/*
 * `node:http` rather than `fetch`, for one reason: `Host` is a forbidden header
 * name to `fetch`, which drops it silently. The first version of this file used
 * `fetch` and reported thirteen failures, every one of them "there is no tag on
 * this page" — because the request arrived as 127.0.0.1, where by design there
 * is not one.
 */
function get(path) {
  return new Promise((resolve, reject) => {
    const call = request(
      { host: "127.0.0.1", port: PORT, path, headers: { Host: LIVE_HOST } },
      (response) => {
        let body = "";
        response.setEncoding("utf8");
        response.on("data", (chunk) => (body += chunk));
        response.on("end", () => resolve({ html: body, headers: response.headers }));
      },
    );
    call.on("error", reject);
    call.end();
  });
}

const { html, headers } = await get("/");

// ─────────────────────────────────────────────── order, which is the whole thing

const at = (needle) => html.indexOf(needle);
const consentDefault = at("consent', 'default'");
const gtagLoader = at("googletagmanager.com/gtag/js?id=");
const gtmLoader = at("googletagmanager.com/gtm.js?id=");
const gtmStart = at("gtm.start");

check(consentDefault >= 0, "no consent default on the page at all");
check(gtagLoader >= 0, "gtag.js is not loaded");
check(gtmLoader >= 0, "gtm.js is not loaded");

check(
  consentDefault >= 0 && gtagLoader > consentDefault,
  "gtag.js is loaded before the consent defaults are set",
);
check(
  consentDefault >= 0 && gtmLoader > consentDefault,
  "gtm.js is loaded before the consent defaults are set",
);
check(
  gtmStart >= 0 && gtmStart > consentDefault,
  "the container is started before the consent defaults are set",
);

/*
 * The mechanism that keeps the order above true. An `async` loader is hoisted
 * out of the body and back in front of the inline script; a deferred one is
 * left where it was written.
 */
const loaderTags = [...html.matchAll(/<script[^>]*googletagmanager\.com[^>]*>/g)].map((m) => m[0]);
check(loaderTags.length === 2, `expected two loader tags, found ${loaderTags.length}`);
for (const tag of loaderTags) {
  check(!/\basync\b/.test(tag), `a loader is marked async and will be hoisted ahead of consent: ${tag}`);
  check(/\bdefer\b/.test(tag), `a loader is neither deferred nor in order: ${tag}`);
  check(/nonce="/.test(tag), `a loader carries no nonce and the policy will refuse it: ${tag}`);
}

// ──────────────────────────────────────────────────────────────── what it denies

for (const type of ["ad_storage", "ad_user_data", "ad_personalization", "analytics_storage"]) {
  check(
    new RegExp(`"${type}":"denied"`).test(html),
    `${type} is not denied by default on a page a visitor has not answered`,
  );
}

/*
 * Google's second Tag Manager snippet, which is deliberately not shipped:
 * Consent Mode is JavaScript, so a frame that fires container tags for a
 * visitor without it fires them for the only people who can never be asked.
 */
check(!html.includes("googletagmanager.com/ns.html"), "the noscript container frame is on the page");

// ─────────────────────────────────────────────────────────────── where it is not

for (const path of ["/login", "/register"]) {
  const page = await get(path);
  check(
    !page.html.includes("googletagmanager.com"),
    `${path} carries a Google tag, and its URL is not analytics' business`,
  );
}

// ──────────────────────────────────────────────────────────────────── the policy

const csp = headers["content-security-policy"] ?? "";
const directive = (name) =>
  csp
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name} `)) ?? "";

check(
  directive("script-src").includes("https://www.googletagmanager.com"),
  "script-src does not allow the host both tags load from",
);
check(
  directive("script-src").includes("'strict-dynamic'"),
  "script-src has no 'strict-dynamic', so a tag published into the container cannot load",
);
check(
  directive("connect-src").includes("https://analytics.google.com"),
  "connect-src blocks the host GA4 posts to",
);
check(
  directive("frame-src").includes("'none'"),
  "frame-src is open on an ordinary request; only a tag debugging session may widen it",
);

// ───────────────────────────────────────────────────────────────────────── report

if (problems.length > 0) {
  console.error(`\nAnalytics: ${problems.length} problem(s).\n`);
  for (const problem of problems) console.error(`  ✗ ${problem}`);
  process.exit(1);
}

console.log("Analytics: consent defaults precede both loaders, tags stay off the signed-in paths,");
console.log("and the policy allows exactly what they need.");
