import { chromium } from "playwright";
import { createRequire } from "node:module";
import { firstPurchasableSku } from "./lib/live-sku.mjs";

const require = createRequire(import.meta.url);
const axePath = require.resolve("axe-core/axe.min.js");
const axeSource = require("node:fs").readFileSync(axePath, "utf8");

const BASE = "http://localhost:3000";

// Discovered, not hardcoded — see lib/live-sku.mjs.
const BUY_SKU = await firstPurchasableSku(BASE);

const PAGES = [
  "/", "/products", "/products/microsoft-365-business-standard", "/brands/microsoft",
  "/microsoft-365", "/services/cybersecurity", "/enterprise", "/enquiry",
  "/contact", "/blog", "/login", "/register", "/search", "/privacy",
  // /support carries the FAQ accordion, and /terms the legal effective dates.
  // Both were rebuilt in this pass; neither was being audited before.
  "/support", "/terms", "/about",
  // The sector index and one sector page. The index carries the filter chips
  // and sixteen cards; the sector page is the template all sixteen share, so
  // auditing one audits the shape of all of them.
  "/industries", "/industries/aec",
  `/buy?sku=${encodeURIComponent(BUY_SKU)}`, "/buy/confirmed?ref=ORD-2026-ABC123",
];

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const findings = [];

for (const path of PAGES) {
  for (const width of [390, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: 900 } });
    const page = await context.newPage();
    await page.goto(`${BASE}${path}`, { waitUntil: "load", timeout: 20000 });
    await page.waitForTimeout(300);

    // Scroll the whole page so every reveal has fired, then wait for the
    // transitions to finish. Auditing mid-fade measures contrast against a
    // partially transparent element, which is a property of the animation
    // rather than of the design - the settled state is what a reader sees.
    await page.evaluate(async () => {
      const step = window.innerHeight * 0.8;
      for (let y = 0; y < document.body.scrollHeight; y += step) {
        window.scrollTo(0, y);
        await new Promise((resolve) => setTimeout(resolve, 90));
      }
      window.scrollTo(0, 0);
    });
    await page.waitForFunction(
      () =>
        [...document.querySelectorAll(".reveal")].every(
          (el) => Number(getComputedStyle(el).opacity) > 0.99,
        ),
      undefined,
      { timeout: 5000 },
    ).catch(() => {});
    await page.waitForTimeout(200);
    await page.addScriptTag({ content: axeSource });

    const results = await page.evaluate(async () => {
      // @ts-expect-error injected at runtime
      return await window.axe.run(document, {
        runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "best-practice"] },
      });
    });

    for (const violation of results.violations) {
      findings.push({
        path, width, id: violation.id, impact: violation.impact,
        help: violation.help, count: violation.nodes.length,
        sample: violation.nodes[0]?.html?.slice(0, 120) ?? "",
      });
    }
    await context.close();
  }
}
await browser.close();

if (findings.length === 0) {
  console.log(`No accessibility violations across ${PAGES.length} pages × 2 widths.`);
} else {
  const grouped = new Map();
  for (const f of findings) {
    const key = `${f.id}|${f.impact}|${f.help}`;
    if (!grouped.has(key)) grouped.set(key, { ...f, paths: new Set() });
    grouped.get(key).paths.add(`${f.path}@${f.width}`);
  }
  console.log(`${grouped.size} distinct violation types:\n`);
  for (const g of [...grouped.values()].sort((a) => (a.impact === "critical" ? -1 : 1))) {
    console.log(`[${g.impact}] ${g.id} — ${g.help}`);
    console.log(`   on: ${[...g.paths].slice(0, 5).join(", ")}${g.paths.size > 5 ? ` (+${g.paths.size - 5})` : ""}`);
    console.log(`   e.g. ${g.sample}\n`);
  }
  process.exit(1);
}
