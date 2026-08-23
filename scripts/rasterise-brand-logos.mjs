import { chromium } from "playwright";
import { readFile, readdir, mkdir, writeFile } from "node:fs/promises";
import { join, parse } from "node:path";

/**
 * Turns the brand logo SVGs into PNGs a PDF can hold.
 *
 * A quotation prints the brands this business supplies, and PDF has no notion
 * of SVG — it holds rasters and its own path operators, and nothing else. The
 * options were to redraw two dozen publishers' marks as paths, which is both
 * enormous and exactly the kind of alteration their trademark policies forbid,
 * or to rasterise the artwork we already have. This does the second.
 *
 * The renderer is the headless browser the verification suites already use, so
 * this adds no dependency. Each mark is drawn on transparent ground at four
 * times its printed height and trimmed to its own ink, so a wordmark six times
 * wider than it is tall comes out six times wider than it is tall rather than
 * padded into somebody's idea of a square.
 *
 * Run after adding or changing anything in `public/brands/`:
 *
 *     node scripts/rasterise-brand-logos.mjs
 *
 * The output is committed, because the quotation renderer must not depend on a
 * browser being installed on the machine that serves it.
 */

const SOURCE = "public/brands";
const OUTPUT = "public/brands/print";

/** Four times the ~20pt the quotation prints them at, for a retina reserve. */
const HEIGHT = 80;
const MAX_WIDTH = 480;

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const page = await browser.newPage({ deviceScaleFactor: 1 });

await mkdir(OUTPUT, { recursive: true });

const files = (await readdir(SOURCE)).filter((name) => name.endsWith(".svg")).sort();
const written = [];

for (const file of files) {
  const svg = await readFile(join(SOURCE, file), "utf8");

  /*
   * Measured before it is drawn.
   *
   * The intrinsic aspect ratio comes from the SVG's own viewBox, which the
   * repository's `normalise-brand-logo` step has already cropped to the
   * artwork. Reading it here rather than assuming a square is what keeps a
   * long wordmark legible.
   */
  const viewBox = svg.match(/viewBox="([^"]+)"/)?.[1]?.trim().split(/[\s,]+/).map(Number);
  if (!viewBox || viewBox.length !== 4 || !viewBox[2] || !viewBox[3]) {
    console.log(`  skipped ${file} — no usable viewBox`);
    continue;
  }

  const ratio = viewBox[2] / viewBox[3];
  const width = Math.min(MAX_WIDTH, Math.max(1, Math.round(HEIGHT * ratio)));

  await page.setViewportSize({ width, height: HEIGHT });
  await page.setContent(
    `<!doctype html><html><body style="margin:0;background:transparent">` +
      `<div style="width:${width}px;height:${HEIGHT}px">` +
      svg.replace("<svg", `<svg width="${width}" height="${HEIGHT}" preserveAspectRatio="xMidYMid meet"`) +
      `</div></body></html>`,
  );

  const png = await page.screenshot({ omitBackground: true, type: "png" });
  const name = `${parse(file).name}.png`;
  await writeFile(join(OUTPUT, name), png);

  written.push({ name, width, height: HEIGHT, bytes: png.length });
  console.log(`  ${name.padEnd(24)} ${width}x${HEIGHT}  ${png.length} bytes`);
}

await browser.close();

console.log(`\n${written.length} brand logos rasterised into ${OUTPUT}`);
