import { chromium, devices } from "playwright";

import { suppressFestiveGreeting } from "./lib/festive.mjs";

/**
 * Core Web Vitals, measured rather than asserted.
 *
 * Lab measurement, on this machine, against whatever is serving on
 * `BASE_URL`. It is not field data: Google ranks on what real users on real
 * connections experience, which lives in Search Console and the Chrome UX
 * Report and is not available from here. What this is good for is a
 * before-and-after on a change made locally, and for catching a regression
 * that a build cannot see.
 *
 * ## A fresh context per page load, and why that is not optional
 *
 * The first version of this reused one browser context across five page
 * loads to save time. It reported a CLS of 0.5981 on four consecutive pages —
 * the same figure each time, on pages with different layouts, against a real
 * threshold of 0.1. It looked exactly like a shared component shifting, and it
 * was a measurement artefact: a fresh context on the same page reported zero
 * shifts and zero CLS.
 *
 * An identical number repeated across different pages is the signature. The
 * cost of the mistake is not a wrong number in a report; it is somebody
 * spending a day hunting a layout shift that does not exist. So every load
 * below gets its own context, and the figure is paid for in wall-clock time.
 *
 * ## What is measured, and what each number is worth
 *
 * **LCP** — largest contentful paint, from the browser's own observer. The
 *   most meaningful of the three in a lab, because it is mostly a property of
 *   the server and the critical path.
 *
 * **CLS** — cumulative layout shift, summed over non-input-driven shifts.
 *   Meaningful in a lab for shifts that happen on load, which is most of them.
 *
 * **TTFB** — time to first byte. Not a Core Web Vital, and the most useful
 *   number here for diagnosis: it separates "the server is slow" from "the
 *   page is heavy", and those have nothing to do with each other.
 *
 * **INP** is deliberately absent. It measures the latency of real
 *   interactions, so there is no honest lab equivalent — a synthetic click on
 *   a chosen element measures that element, not the page. Read it from field
 *   data or not at all.
 *
 * Each page is loaded `RUNS` times. LCP and TTFB report the best run, because
 * a lab figure is a floor rather than an average and the slow runs are this
 * machine's noise. CLS reports the worst, because a shift that happens
 * sometimes is a shift.
 *
 *   node scripts/verify/vitals.mjs
 *   BASE_URL=http://localhost:3000 node scripts/verify/vitals.mjs
 *   VITALS_JSON=before.json node scripts/verify/vitals.mjs
 *   VITALS_BASELINE=before.json node scripts/verify/vitals.mjs
 *
 * Run it against `npm run build && npm run start`, never `next dev`: a
 * development server compiles on demand and its numbers describe the compiler.
 */

const BASE = (process.env.BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const RUNS = Number(process.env.VITALS_RUNS ?? 3);
const SETTLE_MS = Number(process.env.VITALS_SETTLE_MS ?? 3500);

/**
 * One page per template, not one page per URL.
 *
 * There are 250 URLs in the sitemap and five page shapes. Measuring one of
 * each says what a change did; measuring all of them says the same thing
 * slowly.
 */
const PATHS = [
  { path: "/", label: "home" },
  { path: "/products", label: "catalogue" },
  { path: "/products/autocad", label: "product" },
  { path: "/autocad", label: "landing (CMS)" },
  { path: "/blog/autocad-subscription-price-in-india", label: "article" },
  { path: "/brands/microsoft", label: "brand" },
  { path: "/contact", label: "contact" },
];

/** Google's own thresholds. "Needs improvement" sits between the two. */
const BUDGET = {
  lcp: { good: 2500, poor: 4000 },
  cls: { good: 0.1, poor: 0.25 },
  ttfb: { good: 800, poor: 1800 },
};

const verdict = (metric, value) => {
  const b = BUDGET[metric];
  if (value <= b.good) return "good";
  return value <= b.poor ? "needs work" : "poor";
};

async function measure(browser, profile, path) {
  const context = await browser.newContext(
    profile === "mobile"
      ? { ...devices["Pixel 7"] }
      : { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
  );
  // The festive greeting is a modal that opens on load. Left in, it is part of
  // what is measured on every page, and it would mask a real change.
  await suppressFestiveGreeting(context);

  const page = await context.newPage();
  let transferred = 0;
  let requests = 0;
  page.on("response", (response) => {
    requests += 1;
    const length = Number(response.headers()["content-length"] ?? 0);
    if (Number.isFinite(length)) transferred += length;
  });

  await page.addInitScript(() => {
    window.__lcp = 0;
    window.__cls = 0;
    try {
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) window.__lcp = entry.startTime;
      }).observe({ type: "largest-contentful-paint", buffered: true });
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!entry.hadRecentInput) window.__cls += entry.value;
        }
      }).observe({ type: "layout-shift", buffered: true });
    } catch {
      // An engine without these entry types reports zeroes, which the caller
      // can tell apart from a measured zero by the absence of any LCP at all.
    }
  });

  try {
    await page.goto(`${BASE}${path}`, { waitUntil: "load", timeout: 60_000 });
    await page.waitForTimeout(SETTLE_MS);
    const metrics = await page.evaluate(() => {
      const nav = performance.getEntriesByType("navigation")[0];
      return {
        lcp: Math.round(window.__lcp ?? 0),
        cls: Number((window.__cls ?? 0).toFixed(4)),
        ttfb: Math.round(nav?.responseStart ?? 0),
        dom: Math.round(nav?.domContentLoadedEventEnd ?? 0),
      };
    });
    return { ...metrics, kb: Math.round(transferred / 1024), requests };
  } finally {
    await context.close();
  }
}

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const report = { base: BASE, at: new Date().toISOString(), runs: RUNS, profiles: {} };
let failures = 0;

const baseline = process.env.VITALS_BASELINE
  ? JSON.parse(await (await import("node:fs/promises")).readFile(process.env.VITALS_BASELINE, "utf8"))
  : null;

for (const profile of ["mobile", "desktop"]) {
  console.log(`\n${profile}  (${RUNS} runs per page, fresh browser context each)`);
  console.log(
    `${"page".padEnd(16)}${"LCP".padEnd(16)}${"CLS".padEnd(14)}${"TTFB".padEnd(16)}${"KB".padEnd(7)}reqs`,
  );
  report.profiles[profile] = {};

  for (const { path, label } of PATHS) {
    const runs = [];
    for (let run = 0; run < RUNS; run += 1) {
      try {
        runs.push(await measure(browser, profile, path));
      } catch (error) {
        console.log(`${label.padEnd(16)}ERROR  ${String(error.message).split("\n")[0]}`);
      }
    }
    if (runs.length === 0) {
      failures += 1;
      continue;
    }

    // Best LCP and TTFB, worst CLS. See the note at the top of the file.
    const result = {
      lcp: Math.min(...runs.map((r) => r.lcp)),
      cls: Math.max(...runs.map((r) => r.cls)),
      ttfb: Math.min(...runs.map((r) => r.ttfb)),
      kb: Math.max(...runs.map((r) => r.kb)),
      requests: Math.max(...runs.map((r) => r.requests)),
    };
    report.profiles[profile][path] = result;

    const prior = baseline?.profiles?.[profile]?.[path];
    const delta = (key, unit = "") => {
      if (!prior || typeof prior[key] !== "number") return "";
      const change = result[key] - prior[key];
      if (Math.abs(change) < (key === "cls" ? 0.005 : 1)) return "  =";
      const sign = change > 0 ? "+" : "";
      return `  ${sign}${key === "cls" ? change.toFixed(3) : Math.round(change)}${unit}`;
    };

    console.log(
      label.padEnd(16) +
        `${result.lcp}ms ${verdict("lcp", result.lcp)}`.padEnd(16) +
        `${result.cls} ${verdict("cls", result.cls)}`.padEnd(14) +
        `${result.ttfb}ms ${verdict("ttfb", result.ttfb)}`.padEnd(16) +
        String(result.kb).padEnd(7) +
        result.requests +
        delta("lcp", "ms") +
        delta("cls") +
        delta("ttfb", "ms"),
    );
  }
}

if (process.env.VITALS_JSON) {
  const { writeFile } = await import("node:fs/promises");
  await writeFile(process.env.VITALS_JSON, `${JSON.stringify(report, null, 2)}\n`);
  console.log(`\nwritten to ${process.env.VITALS_JSON}`);
}

await browser.close();

/*
 * A failed load is a failure; a slow page is a number.
 *
 * This deliberately does not exit non-zero on a budget miss. A lab figure on
 * a shared machine moves by more than the gap between "good" and "needs work",
 * so a threshold here would fail on a busy afternoon and get commented out —
 * which is worse than having no gate, because then nobody reads the numbers
 * either.
 */
if (failures > 0) {
  console.log(`\n${failures} page(s) could not be measured at all`);
  process.exit(1);
}
console.log("\nLab figures on this machine. Field data (Search Console, CrUX) is what ranks.");
