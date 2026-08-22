import { chromium } from "playwright";
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

/**
 * Crops brand logo SVGs to their own artwork.
 *
 *     node scripts/normalise-brand-logo.mjs            # every file
 *     node scripts/normalise-brand-logo.mjs vmware.svg # one of them
 *
 * Run it after adding an SVG to `public/brands/`. Idempotent: a file that is
 * already cropped is rewritten with the viewBox it already had.
 *
 * ## Why a logo needs this
 *
 * Icon sets normalise every mark into a square canvas — Simple Icons uses
 * 24×24 — so a wordmark seven times wider than it is tall sits in a thin band
 * with empty space above and below. `object-contain` then fits that square by
 * its width, and the wordmark inside it comes out five pixels tall: the artwork
 * is correct, present, and unreadable. Cropping the viewBox to the path's real
 * bounds is what lets the page decide the height instead of the file.
 *
 * The bounding box is measured rather than computed: a browser already knows
 * how to flatten a Bézier, and estimating it from the `d` attribute with a
 * regular expression is how you get a mark clipped along one edge that nobody
 * notices for a month.
 */
const dir = "public/brands";
const only = process.argv.slice(2);

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const page = await browser.newPage();
await page.setContent("<body></body>");

const files = readdirSync(dir)
  .filter((f) => f.endsWith(".svg"))
  .filter((f) => only.length === 0 || only.includes(f));

const rows = [];
for (const name of files) {
  const file = join(dir, name);
  const svg = readFileSync(file, "utf8");

  const box = await page.evaluate((markup) => {
    document.body.innerHTML = markup;
    const el = document.querySelector("svg");
    el.setAttribute("width", "240");
    el.setAttribute("height", "240");
    const { x, y, width, height } = el.getBBox();
    return { x, y, width, height };
  }, svg);

  // One unit of breathing room, so a stroke that touches the edge is not shaved.
  const pad = 0.25;
  const vb = [box.x - pad, box.y - pad, box.width + pad * 2, box.height + pad * 2]
    .map((n) => Math.round(n * 1000) / 1000)
    .join(" ");

  writeFileSync(file, svg.replace(/viewBox="[^"]*"/, `viewBox="${vb}"`));
  rows.push([name, (box.width / box.height).toFixed(2)]);
}

await browser.close();
rows.sort((a, b) => Number(b[1]) - Number(a[1]));
for (const [name, ratio] of rows) console.log(`  ${ratio.padStart(6)}:1  ${name}`);
