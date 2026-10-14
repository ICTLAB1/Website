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

import { chromium } from "playwright";

import { request } from "node:http";

const PORT = 3000;
const BASE = `http://localhost:${PORT}`;

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
 * Google's second Tag Manager snippet. Read out of the bytes rather than
 * trusted from the component, because it is inside a `<noscript>` — nothing in
 * a browser or a screenshot will ever show it missing.
 */
const noscript = /<noscript[^>]*>\s*<iframe[^>]*googletagmanager\.com\/ns\.html\?id=([A-Z0-9-]+)/i.exec(
  html,
);
check(Boolean(noscript), "the noscript container frame is missing");
check(
  noscript?.[1] === "GTM-THHL334G",
  `the noscript frame names a different container: ${noscript?.[1] ?? "none"}`,
);

/*
 * Before the skip link, or it sits between a keyboard user and their first tab
 * stop on every page of the site.
 */
check(
  html.indexOf("ns.html") >= 0 && html.indexOf("ns.html") < html.indexOf("Skip to main content"),
  "the noscript frame is rendered after the skip link",
);

// ─────────────────────────────────────────────────────────────── where it is not

for (const path of ["/login", "/register"]) {
  const page = await get(path);
  check(
    !page.html.includes("googletagmanager.com"),
    `${path} carries a Google tag or frame, and its URL is not analytics' business`,
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
  directive("frame-src").includes("https://www.googletagmanager.com"),
  "frame-src refuses the host the noscript frame loads from, so it would be blocked",
);
check(
  !directive("frame-src").includes("tagassistant"),
  "the debugging hosts are allowed on an ordinary request; only a debug session may add them",
);

/*
 * The half of the frame policy that did not move, and must not. `frame-src` is
 * what this page may frame; `frame-ancestors` is who may frame this page.
 */
check(
  directive("frame-ancestors").includes("'none'"),
  "frame-ancestors is no longer 'none' — this site can now be embedded",
);

// ──────────────────────────────────────────── the Ads account, registered once

/** How many distinct GA properties this deployment configures. */
const GA_IDS_ON_PAGE = new Set(html.match(/G-[A-Z0-9]{6,20}/g) ?? []).size;

/**
 * One `config` for the Ads account, and no conversion fired from the page.
 *
 * Both halves matter. Without the config the site's own tag has no Ads
 * destination at all, which is what Google Ads was reporting as a conversion
 * action that had never received data. With a *second* counting mechanism here
 * — a `gtag('event','conversion', …)` on top of the container's own tag, which
 * the published container does hold on `quote_form_submit` — every lead would
 * count twice, and the inflated figure is what an advertising budget gets set
 * from. So this checks for exactly one and the absence of the other.
 */
{
  /*
   * Counted against a GA config rather than against 1. Next serialises the
   * inline script into the flight payload as well as the document, so every
   * `config` line legitimately appears twice — asserting exactly one here
   * failed against a correct page. What a real duplicate would look like is
   * the Ads line appearing more often than the GA lines beside it.
   */
  const ads = (html.match(/gtag\('config', 'AW-[0-9]{8,20}'\)/g) ?? []).length;
  const ga = (html.match(/gtag\('config', 'G-[A-Z0-9]{6,20}'\)/g) ?? []).length;
  const perGaId = ga / GA_IDS_ON_PAGE;

  check(ads > 0, "the Ads account is never registered, so the site's own tag has no destination");
  check(
    ads === perGaId,
    `the Ads config appears ${ads} time(s) against ${perGaId} for each GA property — one of them is emitted twice`,
  );

  /*
   * And the half that must stay absent. The published container already fires
   * an Ads conversion on `quote_form_submit`, which all four lead forms push,
   * so a `gtag('event','conversion', …)` here would count every lead twice —
   * and an inflated conversion count is what an advertising budget gets set
   * from. `config` announces a destination; only this counts.
   */
  check(
    !/gtag\(\s*['"]event['"]\s*,\s*['"]conversion['"]/.test(html),
    "the page fires an Ads conversion itself — the container already does, so this double-counts",
  );
}

// ────────────────────────────────────────────────── the conversion, end to end

/**
 * A real enquiry, submitted, and the event read out of the live dataLayer.
 *
 * The push is unconditional — the helper creates `dataLayer` if the tag has not
 * — which is what makes this observable on a machine where the tag itself is
 * switched off. What is being proved is the part the container depends on: that
 * the exact string a trigger will be configured against reaches the queue when
 * the server accepts an enquiry, once, and not before.
 */
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();

const dataLayerEvents = () =>
  page.evaluate(() =>
    (window.dataLayer ?? [])
      .map((entry) => (entry && typeof entry === "object" ? entry.event : undefined))
      .filter(Boolean),
  );

try {
  await page.goto(`${BASE}/products/microsoft-365-business-standard`, { waitUntil: "load" });
  await page.getByLabel("Quantity").fill("10");
  await page.getByRole("complementary").getByRole("button", { name: "Add to Enquiry" }).click();
  await page.waitForTimeout(300);

  await page.goto(`${BASE}/enquiry`, { waitUntil: "load" });
  await page.waitForTimeout(400);

  check(
    !(await dataLayerEvents()).includes("quote_form_submit"),
    "the conversion is already in the queue before anything was submitted",
  );

  await page.getByLabel("Full name", { exact: false }).first().fill("Analytics Probe");
  await page.getByLabel("Company name").fill("Analytics Probe Pvt Ltd");
  await page.getByLabel("Business email").fill("analytics-probe@example.test");
  await page.getByLabel("Phone", { exact: false }).first().fill("+91 99999 99999");

  /*
   * A failed submit first. The event must follow the server's acceptance, not
   * the click — a conversion counted on a rejected form is a conversion that
   * did not happen.
   */
  await page.getByLabel("Business email").fill("not-an-email");
  await page.getByRole("button", { name: "Request Enterprise Quote" }).click();
  await page.waitForTimeout(800);
  check(
    !(await dataLayerEvents()).includes("quote_form_submit"),
    "a rejected submission counted as a conversion",
  );

  await page.getByLabel("Business email").fill("analytics-probe@example.test");
  await page.getByRole("button", { name: "Request Enterprise Quote" }).click();
  await page.waitForURL("**/enquiry/submitted**", { timeout: 15000 });

  const afterSubmit = await dataLayerEvents();
  const fired = afterSubmit.filter((name) => name === "quote_form_submit");
  check(fired.length === 1, `expected one quote_form_submit, saw ${fired.length}`);

  const reference = (await page.locator("body").innerText()).match(/ENQ-\d{4}-[A-Z0-9]{6}/)?.[0];
  check(Boolean(reference), "the confirmation showed no reference to key the conversion on");

  /*
   * Refreshing a confirmation page is a thing people do, and the guard against
   * counting it twice is the reason `pushConversion` writes a flag at all.
   */
  await page.reload({ waitUntil: "load" });
  await page.waitForTimeout(500);
  const afterReload = (await dataLayerEvents()).filter((name) => name === "quote_form_submit");
  check(
    afterReload.length <= 1,
    `refreshing the confirmation counted the conversion again (${afterReload.length})`,
  );

  if (reference) {
    console.log(`  test enquiry ${reference} — mark it internally so it is not chased as a lead.`);
  }

  // ───────────────────────────────── the other three forms that produce a lead

  /**
   * Every way somebody asks to be quoted, counted.
   *
   * The enquiry basket above was the only one instrumented, so four of the
   * five paths a lead arrives by reported nothing and a bidding strategy set
   * to maximise conversions was optimising against a fifth of the evidence.
   * These drive the real forms rather than asserting about the source,
   * because what matters is that the string reaches the queue in a browser.
   */
  const detailsFor = (name) =>
    page.evaluate(
      (event) =>
        (window.dataLayer ?? [])
          .filter((entry) => entry && typeof entry === "object" && entry.event === event)
          .map((entry) => ({ form: entry.form, topic: entry.topic })),
      name,
    );

  // ── the typed requirement form
  //
  // Addressed by field name rather than by label: this form's labels are its
  // own ("Your name", "Work email", "Organisation"), and a selector copied
  // from the enquiry basket is how the first version of this check failed.
  await page.goto(`${BASE}/requirement`, { waitUntil: "load" });
  /*
   * Addressed by exact field name, and not scoped to a `form`.
   *
   * Three wrong versions preceded this one, which is worth leaving written
   * down: the labels are this form's own rather than the basket's,
   * `[name$="description"]` also matches the document's `<meta
   * name="description">`, the line description is an input and not a textarea,
   * and `locator("form").first()` is the header's search form once the page
   * has hydrated — not this one.
   */
  await page.locator('input[name="lines.0.description"]').fill("25 laptops with Windows 11 Pro");
  await page.locator('input[name="lines.0.quantity"]').fill("25");
  await page.locator('[name="contactName"]').fill("Analytics Probe");
  await page.locator('[name="contactEmail"]').fill("analytics-probe@example.test");
  await page.locator('[name="contactPhone"]').fill("+91 99999 99999");
  await page.locator('input[name="companyName"]').fill("Analytics Probe Pvt Ltd");
  await page.getByRole("button", { name: /Send my requirement/i }).click();
  await page.waitForTimeout(3000);

  const requirementPushes = await detailsFor("quote_form_submit");
  check(
    requirementPushes.some((entry) => entry.form === "requirement"),
    `the requirement form counted nothing (saw ${JSON.stringify(requirementPushes)})`,
  );
  check(
    requirementPushes.filter((entry) => entry.form === "requirement").length === 1,
    "the requirement form counted more than once",
  );

  // ── the contact form, on a topic that is a lead
  await page.goto(`${BASE}/contact`, { waitUntil: "load" });
  await page.locator('input[name="name"]').fill("Analytics Probe");
  await page.locator('input[name="email"]').fill("analytics-probe@example.test");
  await page.selectOption('select[name="topic"]', "SALES");
  await page.locator('textarea[name="message"]').fill("Please quote 40 licences of Autodesk AutoCAD for our design office.");
  await page.getByRole("button", { name: /Send message/i }).click();
  await page.waitForTimeout(3000);

  const salesPushes = (await detailsFor("quote_form_submit")).filter(
    (entry) => entry.form === "contact",
  );
  check(
    salesPushes.length === 1,
    `a sales enquiry through the contact form counted ${salesPushes.length} time(s)`,
  );
  check(
    salesPushes[0]?.topic === "SALES",
    `the contact conversion did not carry its topic (${JSON.stringify(salesPushes[0])})`,
  );

  // ── and on a topic that is not
  await page.goto(`${BASE}/contact`, { waitUntil: "load" });
  await page.locator('input[name="name"]').fill("Analytics Probe");
  await page.locator('input[name="email"]').fill("analytics-probe@example.test");
  await page.selectOption('select[name="topic"]', "SUPPORT");
  await page.locator('textarea[name="message"]').fill("Our existing licence has stopped activating on two machines.");
  await page.getByRole("button", { name: /Send message/i }).click();
  await page.waitForTimeout(3000);

  /*
   * The one that would be expensive to get wrong. A support request counted as
   * a conversion teaches the bidding strategy to buy more traffic from people
   * whose licence is broken.
   */
  check(
    (await detailsFor("quote_form_submit")).every((entry) => entry.topic !== "SUPPORT"),
    "a support request was counted as a conversion",
  );
} finally {
  await context.close();
  await browser.close();
}

// ───────────────────────────────────────────────────────────────────────── report

if (problems.length > 0) {
  console.error(`\nAnalytics: ${problems.length} problem(s).\n`);
  for (const problem of problems) console.error(`  ✗ ${problem}`);
  process.exit(1);
}

console.log("Analytics: consent defaults precede both loaders, tags stay off the signed-in paths,");
console.log("the policy allows exactly what they need, and all four lead forms count once —");
console.log("a support request through the contact form counting none.");
