import { chromium } from "playwright";
import { readFile, writeFile } from "node:fs/promises";

/**
 * Builds the browser and home-screen icons from the brand mark.
 *
 * The mark was already the right artwork — it is the same file the header uses.
 * What was wrong was everything around it.
 *
 * ## The padding
 *
 * The supplied 512px file carries the mark at 71% of its width, with the rest
 * transparent. A favicon is displayed at sixteen pixels, so that padding is not
 * neutral: it shrinks the visible glyph from about fifteen pixels to about
 * eleven, on a mark whose whole identity is six interleaved blades. Trimming to
 * the ink and re-padding to a thin, even margin is the single thing that makes
 * a favicon legible, and it costs nothing.
 *
 * ## The Apple icon
 *
 * On a white ground rather than transparent, because iOS does not honour
 * transparency in a home-screen icon — it composites it onto black, and a mark
 * drawn in mid-blue and orange on black is a different mark. Android and every
 * desktop browser handle the transparent one properly, so only this one is
 * flattened, and only because the platform forces it.
 *
 * Run after changing `public/brand-assets/techzoid-icon.png`:
 *
 *     node scripts/build-app-icons.mjs
 *
 * The output is committed. Next resolves `src/app/icon.png` and
 * `src/app/apple-icon.png` by convention — there is no `<link rel="icon">`
 * anywhere, and adding one would compete with the ones the framework emits.
 */

const SOURCE = "public/brand-assets/techzoid-icon.png";

/** Margin around the trimmed mark, as a share of the finished icon. */
const MARGIN = 0.06;

const OUTPUTS = [
  { file: "src/app/icon.png", size: 512, ground: null },
  { file: "src/app/apple-icon.png", size: 180, ground: "#ffffff" },
];

const source = await readFile(SOURCE);
const dataUri = `data:image/png;base64,${source.toString("base64")}`;

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const page = await browser.newPage();

/** Where the ink actually is, read off a canvas rather than assumed. */
const box = await page.evaluate(async (uri) => {
  const image = new Image();
  image.src = uri;
  await image.decode();

  const canvas = document.createElement("canvas");
  canvas.width = image.width;
  canvas.height = image.height;
  const context = canvas.getContext("2d");
  context.drawImage(image, 0, 0);
  const { data } = context.getImageData(0, 0, image.width, image.height);

  let minX = image.width;
  let minY = image.height;
  let maxX = 0;
  let maxY = 0;
  for (let y = 0; y < image.height; y += 1) {
    for (let x = 0; x < image.width; x += 1) {
      // 16 rather than 0: a drop shadow fades to nothing, and trimming to the
      // last pixel of it would keep most of the padding it was drawn into.
      if (data[(y * image.width + x) * 4 + 3] > 16) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  return { minX, minY, width: maxX - minX + 1, height: maxY - minY + 1 };
}, dataUri);

console.log(`  mark trimmed to ${box.width}×${box.height} from its 512px canvas`);

for (const output of OUTPUTS) {
  const inner = output.size * (1 - MARGIN * 2);
  // Contain, not cover: the mark keeps its proportions and is centred in the
  // square, so a mark that is not square is never cropped to make it one.
  const scale = inner / Math.max(box.width, box.height);
  const drawnWidth = box.width * scale;
  const drawnHeight = box.height * scale;

  await page.setViewportSize({ width: output.size, height: output.size });
  await page.setContent(
    `<!doctype html><html><body style="margin:0;width:${output.size}px;height:${output.size}px;${
      output.ground ? `background:${output.ground}` : "background:transparent"
    }">
      <img src="${dataUri}" style="
        position:absolute;
        left:${(output.size - drawnWidth) / 2 - box.minX * scale}px;
        top:${(output.size - drawnHeight) / 2 - box.minY * scale}px;
        width:${512 * scale}px;
        image-rendering:high-quality;
      ">
    </body></html>`,
  );

  const png = await page.screenshot({
    omitBackground: output.ground === null,
    clip: { x: 0, y: 0, width: output.size, height: output.size },
  });
  await writeFile(output.file, png);
  console.log(`  ${output.file} — ${output.size}px${output.ground ? ` on ${output.ground}` : " transparent"}`);
}

await browser.close();
console.log("app icons rebuilt from the brand mark");
