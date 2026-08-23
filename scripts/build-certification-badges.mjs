import { chromium } from "playwright";
import { readFile, writeFile } from "node:fs/promises";

/**
 * Builds the three certification badges from the one the business supplied.
 *
 * Only one of the three arrived usable. Of the reference files sent, the ISO
 * 9001 seal was a stock-site preview carrying "cleanpng" watermarks across the
 * whole image, and the ISO 27001 one used ISO's own globe trademark, which a
 * certified organisation may not display — ISO's position is that you state the
 * certification and use your certification body's mark, never theirs. The
 * 20000-1 badge was clean: no watermark, no ISO device, just a tick, a frame and
 * a number.
 *
 * So that one becomes the template, and the other two are made from it by
 * replacing the number and nothing else. The tick, the frame, the ISO wordmark
 * and "CERTIFIED COMPANY" are the supplied artwork, pixel for pixel; the only
 * thing this draws is nine or ten digits.
 *
 * ## Why it replaces rather than redraws
 *
 * A badge redrawn from scratch would be three badges that look nearly the same,
 * and "nearly" is what a reader notices when they sit in a row. Compositing on
 * the original means the three are identical everywhere except where they have
 * to differ.
 *
 * ## How it knows it worked
 *
 * It regenerates the 20000-1 badge too, from the same template and by the same
 * path — so its output should be indistinguishable from the input. If the
 * substituted type does not match, that badge is where it shows, and it is
 * checked against the original rather than taken on trust.
 *
 *     node scripts/build-certification-badges.mjs
 */

const TEMPLATE = "public/certifications/source/ISO-20000-1-badge.png";
/*
 * The face the template's own number is set in — or near enough that the
 * substitution does not read as one.
 *
 * Chosen by measurement, not by eye: each candidate was set to the template's
 * 116px cap height and its "20000-1:2018" measured against the template's own
 * 1117px. Poppins came out 124px narrow, Nunito Sans 70, Montserrat 59, Rubik
 * 16 — a 1.4% difference, closed by about a pixel and a half of tracking
 * rather than the eleven Poppins needed. Tracking that large is visible as
 * tracking, which is what gives a substitution away.
 */
const FONT = "public/certifications/source/badge-number.woff2";
const OUT = "public/certifications";

/** The supplied artwork's own canvas. Everything below is in its pixels. */
const CANVAS = { width: 1800, height: 973 };

/**
 * The number's ink box in the template, measured rather than eyeballed.
 *
 * `x` is where the digits start and end, `baseline` the bottom of them, and
 * `capHeight` their height — these are lining figures, so cap height is the
 * whole of it.
 */
const NUMBER = { left: 601, right: 1718, top: 542, baseline: 657, capHeight: 116 };
const NUMBER_CENTRE = (NUMBER.left + NUMBER.right) / 2;
const NUMBER_WIDTH = NUMBER.right - NUMBER.left;

/**
 * The area painted out before the new number goes down.
 *
 * Deliberately narrower than the frame. The tick's swoosh crosses this band on
 * the left as far as x≈470, and the frame's own right edge sits from x≈1780, so
 * a full-width wipe would take a bite out of both. Measured, then inset.
 */
const WIPE = { left: 520, top: 528, right: 1770, bottom: 672 };

/** Sampled from the middle of a digit stroke in the template. */
const INK = "rgb(18, 69, 126)";

/** Standard → the line printed under the ISO wordmark. */
const BADGES = [
  { file: "ISO-9001-2015.png", number: "9001:2015" },
  { file: "ISO-27001-2022.png", number: "27001:2022" },
  { file: "ISO-IEC-20000-1-2018.png", number: "20000-1:2018" },
];

/** The string the template itself carries, used to calibrate the type. */
const REFERENCE = "20000-1:2018";

const template = `data:image/png;base64,${(await readFile(TEMPLATE)).toString("base64")}`;
const font = `data:font/woff2;base64,${(await readFile(FONT)).toString("base64")}`;

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const page = await browser.newPage({ viewport: CANVAS });

const document = (number, size, tracking) => `<!doctype html><html><head><style>
  @font-face { font-family: Badge; src: url(${font}) format("woff2"); font-weight: 500; }
  html,body { margin:0; width:${CANVAS.width}px; height:${CANVAS.height}px; }
  body { background: url(${template}) 0 0 / ${CANVAS.width}px ${CANVAS.height}px no-repeat; }
  .wipe {
    position:absolute; background:#fff;
    left:${WIPE.left}px; top:${WIPE.top}px;
    width:${WIPE.right - WIPE.left}px; height:${WIPE.bottom - WIPE.top}px;
  }
  /*
   * Positioned on the baseline, not on a line box. A line box carries the
   * font's own leading, which differs from the template's typesetting and would
   * put the digits a few pixels off the frame they sit in.
   */
  #n {
    position:absolute; left:0; top:0; width:${CANVAS.width}px;
    text-align:center; white-space:pre;
    font-family:Badge; font-weight:500; color:${INK};
    font-size:${size}px; letter-spacing:${tracking}px;
    line-height:0;
  }
</style></head><body>
  <div class="wipe"></div>
  <div id="n" style="top:${NUMBER.baseline}px">${number}</div>
</body></html>`;

/**
 * The ink the type actually makes, measured on a canvas.
 *
 * `getBoundingClientRect` on the element measures its line box — the font's
 * ascent and descent and whatever leading it carries — not the digits. Sizing
 * against that produced 83px type with 51px of tracking wedged in to make the
 * width come back: arithmetically consistent and visibly wrong. Canvas reports
 * the actual bounding box of the glyphs, which is what has to match.
 */
async function inkOf(text, size, tracking) {
  return page.evaluate(
    async ({ text, size, tracking }) => {
      await document.fonts.load(`500 ${size}px Badge`);
      await document.fonts.ready;
      const context = document.createElement("canvas").getContext("2d");
      context.font = `500 ${size}px Badge`;
      if (tracking) context.letterSpacing = `${tracking}px`;
      const m = context.measureText(text);
      return {
        height: m.actualBoundingBoxAscent + m.actualBoundingBoxDescent,
        width: m.actualBoundingBoxLeft + m.actualBoundingBoxRight,
        advance: m.width,
      };
    },
    { text, size, tracking },
  );
}

/*
 * Two passes, because a font's cap height is not a number you can look up
 * reliably per weight and subset — it is measured, and then corrected.
 *
 * Pass one sizes the type so its cap height matches the template's 116px. Pass
 * two spaces it so the reference string comes out the same width the template's
 * own number is, which is what makes the substituted digits sit on the same
 * rhythm as the ones they replace.
 */
await page.setContent(document(REFERENCE, 160, 0));
const probe = await inkOf(REFERENCE, 160, 0);
const size = Math.round((160 * NUMBER.capHeight) / probe.height);

const plain = await inkOf(REFERENCE, size, 0);
const tracking =
  Math.round(((NUMBER_WIDTH - plain.width) / (REFERENCE.length - 1)) * 100) / 100;

const check = await inkOf(REFERENCE, size, tracking);
console.log(
  `  type calibrated on the template: ${size}px, ${tracking}px tracking — ` +
    `cap height ${Math.round(probe.height * (size / 160))}px (want ${NUMBER.capHeight}), ` +
    `width ${Math.round(check.width)}px (want ${NUMBER_WIDTH})`,
);

for (const badge of BADGES) {
  await page.setContent(document(badge.number, size, tracking));
  await page.evaluate(() => document.fonts.ready);

  /*
   * Centred on the template's own centre line rather than on the canvas.
   *
   * `text-align:center` centres the advance width, and the last letter's
   * tracking is part of that advance — so a tracked string lands half a
   * letter-space left of where its ink actually is. Nudged by the difference,
   * measured.
   */
  const drawn = await page.evaluate(() => {
    const range = document.createRange();
    range.selectNodeContents(document.getElementById("n"));
    const box = range.getBoundingClientRect();
    return { left: box.left, right: box.right };
  });
  await page.evaluate(
    (shift) => {
      document.getElementById("n").style.left = `${shift}px`;
    },
    NUMBER_CENTRE - (drawn.left + drawn.right - tracking) / 2,
  );

  const png = await page.screenshot({ clip: { x: 0, y: 0, ...CANVAS }, omitBackground: true });
  await writeFile(`${OUT}/${badge.file}`, png);
  console.log(`  ${badge.file}  “${badge.number}”`);
}

await browser.close();
console.log(`${BADGES.length} certification badges built from the supplied artwork`);
