import { chromium } from "playwright";
import { readdir, readFile, writeFile } from "node:fs/promises";
import { join, parse } from "node:path";

/**
 * Redraws the certification wordmarks so the three of them are one set.
 *
 * The supplied files were three separate SVGs, each setting its standard at a
 * fixed 170px on an 1800px canvas. That is fine for "ISO 9001:2015" and not for
 * "ISO/IEC 20000-1:2018", which at 170px is about 2,050px wide — so the longest
 * of the three shipped with its first and last characters cut off by its own
 * canvas, and the rasterised PNG carried the damage. It was not a layout bug
 * downstream; the artwork was already clipped in the file.
 *
 * ## What "aligned" means for a row of wordmarks
 *
 * Not equal boxes. Three images of equal width whose type is set at three
 * different sizes look wrong precisely because the boxes match — the eye reads
 * the type, and "ISO 9001:2015" set larger than "ISO/IEC 20000-1:2018" beside
 * it reads as a mistake rather than as a longer name.
 *
 * So this measures every string first, picks the one size that fits the longest
 * of them, and sets all of them at it. Same canvas, same baselines, same cap
 * height, one shared size per line. Dropped into a row at equal widths they
 * then line up as a set, which is the whole point.
 *
 * ## Why it re-renders rather than edits
 *
 * The strings come from the supplied SVGs, so this is not typesetting somebody
 * else's certificate from memory — it reads what they wrote and re-sets it. Run
 * it after adding a mark to `public/certifications/`:
 *
 *     node scripts/rasterise-certification-marks.mjs
 *
 * Both the corrected SVG and the PNG are written and committed. The PNG is what
 * the quotation renderer embeds, because PDF cannot hold an SVG and the server
 * must not need a browser to issue a document.
 */

const DIR = "public/certifications";

/** The canvas the type is set on, before each mark is trimmed to its own ink. */
const WIDTH = 1800;
const HEIGHT = 520;

/** Ink either side, so no glyph ever touches the edge of its own canvas. */
const SIDE_PAD = 40;

/**
 * A hair of bleed around the trimmed ink, in canvas pixels.
 *
 * Antialiased edges fade rather than stop, and trimming to the last pixel above
 * zero clips the softest column of every stem.
 */
const BLEED = 6;

const INK = "#242478";
const FAMILY = "Arial, Helvetica, sans-serif";

/** The two lines every one of these carries, in source order. */
function readLines(svg) {
  const texts = [...svg.matchAll(/<text[^>]*>([^<]+)<\/text>/g)].map((m) => m[1].trim());
  return texts.length >= 2 ? { standard: texts[0], scope: texts[1] } : null;
}

const files = (await readdir(DIR)).filter((name) => name.endsWith(".svg")).sort();
const marks = [];
for (const file of files) {
  const lines = readLines(await readFile(join(DIR, file), "utf8"));
  if (!lines) {
    console.warn(`  skipped ${file} — could not read two text lines from it`);
    continue;
  }
  marks.push({ file, ...lines });
}

if (marks.length === 0) {
  console.log("nothing to do");
  process.exit(0);
}

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const page = await browser.newPage({ viewport: { width: WIDTH, height: HEIGHT } });

/**
 * The largest size at which *every* string in the set still fits.
 *
 * Measured in the browser that will draw them rather than estimated from an
 * average character width — the estimate is what produced a clipped mark in the
 * first place.
 */
async function fittedSize(strings, weight, ceiling) {
  const widths = await page.evaluate(
    ({ strings, weight, family, ceiling }) => {
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");
      context.font = `${weight} ${ceiling}px ${family}`;
      return strings.map((text) => context.measureText(text).width);
    },
    { strings, weight, family: FAMILY, ceiling },
  );

  const usable = WIDTH - SIDE_PAD * 2;
  const widest = Math.max(...widths);
  // Measured at the ceiling, so scaling down by the overflow ratio fits it.
  return widest <= usable ? ceiling : Math.floor((ceiling * usable) / widest);
}

const standardSize = await fittedSize(marks.map((m) => m.standard), 700, 170);
const scopeSize = await fittedSize(marks.map((m) => m.scope), 700, 62);

console.log(`  standard line set at ${standardSize}px, scope line at ${scopeSize}px`);

const svgFor = (mark) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
  <text x="${WIDTH / 2}" y="205" text-anchor="middle"
        font-family="${FAMILY}" font-size="${standardSize}" font-weight="700"
        fill="${INK}">${mark.standard}</text>
  <text x="${WIDTH / 2}" y="365" text-anchor="middle"
        font-family="${FAMILY}" font-size="${scopeSize}" font-weight="700"
        fill="${INK}">${mark.scope}</text>
</svg>
`;

for (const mark of marks) {
  const svg = svgFor(mark);
  await writeFile(join(DIR, mark.file), svg);

  /*
   * Transparent ground. These sit on a white letterhead today and on the
   * charcoal footer tomorrow, and a baked-in white rectangle would show as a
   * plate on the second — which is the exact problem the partner badges had.
   */
  await page.setContent(
    `<!doctype html><html><body style="margin:0;background:transparent">${svg}</body></html>`,
  );

  /*
   * Trimmed to its own ink, not left on the shared canvas.
   *
   * The type is centred while it is being set, which is right — but it leaves a
   * different amount of empty canvas either side of every mark, because the
   * strings are different lengths. Three such images left-aligned in a row of
   * cards start at three different places, which is the misalignment this whole
   * script exists to remove, reintroduced one step later.
   *
   * Trimmed, each file is exactly as wide as its own words. Set to a common
   * height they then share a cap height and a baseline and line up on either
   * edge, and a PDF can centre them in equal cells without the padding fighting
   * it.
   */
  const ink = await page.evaluate(
    (bleed) => {
      const svg = document.querySelector("svg");
      const boxes = [...svg.querySelectorAll("text")].map((node) => node.getBBox());
      const left = Math.min(...boxes.map((b) => b.x));
      const right = Math.max(...boxes.map((b) => b.x + b.width));
      const top = Math.min(...boxes.map((b) => b.y));
      const bottom = Math.max(...boxes.map((b) => b.y + b.height));
      return {
        x: Math.max(0, Math.floor(left - bleed)),
        y: Math.max(0, Math.floor(top - bleed)),
        width: Math.ceil(right - left + bleed * 2),
        height: Math.ceil(bottom - top + bleed * 2),
      };
    },
    BLEED,
  );

  const png = await page.screenshot({ omitBackground: true, clip: ink });
  await writeFile(join(DIR, `${parse(mark.file).name}.png`), png);
  console.log(
    `  ${mark.file} → ${parse(mark.file).name}.png  ${ink.width}×${ink.height}  “${mark.standard}”`,
  );
}

await browser.close();
console.log(`${marks.length} certification mark(s) redrawn at a shared size`);
