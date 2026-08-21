import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";

/**
 * Captures the visible text of a set of pages.
 *
 * Run before a content migration and again after; the diff is what proves the
 * move lost nothing. Reduced motion is forced so no reveal is mid-transition
 * when the text is read.
 *
 *   OUT=/tmp/before PATHS="/,/about" node scripts/verify/text-snapshot.mjs
 */
const BASE = process.env.BASE ?? "http://localhost:3000";
const OUT = process.env.OUT ?? "/tmp/text-snapshot";
const paths = (process.env.PATHS ?? "/").split(",").map((p) => p.trim()).filter(Boolean);
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: "reduce" });
const page = await ctx.newPage();

const snapshot = {};
for (const path of paths) {
  const response = await page.goto(`${BASE}${path}`, { waitUntil: "load", timeout: 25000 });
  snapshot[path] = {
    status: response?.status() ?? 0,
    text: (await page.locator("main").innerText().catch(() => "")).replace(/\s+/g, " ").trim(),
  };
}

writeFileSync(`${OUT}/snapshot.json`, JSON.stringify(snapshot, null, 2));
await browser.close();
console.log(`captured ${paths.length} pages -> ${OUT}/snapshot.json`);
const bad = Object.entries(snapshot).filter(([, v]) => v.status !== 200);
if (bad.length) { console.log("non-200:", bad.map(([k, v]) => `${k}=${v.status}`).join(", ")); process.exit(1); }
