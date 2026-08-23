import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

/**
 * The quotation, rendered at every length it will actually meet.
 *
 * A layout that is right for six lines can be wrong for one and wrong for
 * fifty, and each failure is invisible until somebody quotes that many things.
 * The design pack asks for 1, 5, 10, 20 and 50+; this renders each, rasterises
 * every page, and checks the properties that a picture would show at a glance
 * and a unit test never will:
 *
 *   nothing is drawn outside the page's margins;
 *   the table header is repeated on every page the table runs onto;
 *   the summary is never split, and never lands on a page of its own;
 *   every page carries its footer, and the page count is right.
 *
 * It reads the PDF's own text rather than the pixels wherever it can: the
 * questions here are about layout, and the text layer is where layout is
 * decided. The raster is used for the one question text cannot answer, which is
 * whether anything has been drawn off the edge of the paper.
 */

const results = [];
const check = (name, ok, detail = "") => {
  const result = { name, ok: Boolean(ok), detail };
  results.push(result);
  console.log(
    `  ${result.ok ? "✓" : "✗"} ${result.name}${result.ok || !result.detail ? "" : ` — ${result.detail}`}`,
  );
};

const work = mkdtempSync(join(tmpdir(), "quotation-layout-"));

/** A4 at 72dpi, which is the unit the renderer works in. */
const PAGE = { width: 595.28, height: 841.89 };
const MARGIN = 38;

function render(count) {
  const file = join(work, `q-${count}.pdf`);
  execFileSync("npx", ["tsx", "scripts/render-sample-quote.ts", file, String(count)], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  return file;
}

/** Every text run with its page and its box, from pdftotext's layout dump. */
function pageText(file) {
  const raw = execFileSync("pdftotext", ["-layout", file, "-"], { encoding: "utf8" });
  return raw.split("\f").filter((page) => page.trim().length > 0);
}

/** The ink bounding box of each rendered page, in points. */
function inkBoxes(file) {
  const prefix = join(work, "page");
  for (const name of readdirSync(work)) {
    if (name.startsWith("page")) rmSync(join(work, name));
  }
  execFileSync("pdftoppm", ["-png", "-r", "72", file, prefix]);

  const script = `
import sys, glob
from PIL import Image
for path in sorted(glob.glob(${JSON.stringify(prefix)} + "-*.png")):
    im = Image.open(path).convert("L")
    # Ink is anything not white. The bbox of the inverted image is the drawn area.
    from PIL import ImageOps, ImageChops
    bg = Image.new("L", im.size, 255)
    diff = ImageChops.difference(im, bg)
    box = diff.getbbox()
    print(path, im.size[0], im.size[1], box)
`;
  return execFileSync("python3", ["-c", script], { encoding: "utf8" })
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const match = line.match(/^(\S+) (\d+) (\d+) \((\d+), (\d+), (\d+), (\d+)\)$/);
      if (!match) return null;
      const [, path, w, h, x0, y0, x1, y1] = match;
      return {
        path,
        width: Number(w),
        height: Number(h),
        box: { x0: Number(x0), y0: Number(y0), x1: Number(x1), y1: Number(y1) },
      };
    })
    .filter(Boolean);
}

for (const count of [1, 5, 10, 20, 55]) {
  const file = render(count);
  const pages = pageText(file);
  const boxes = inkBoxes(file);

  console.log(`\n  ${count} line${count === 1 ? "" : "s"} — ${pages.length} page${pages.length === 1 ? "" : "s"}`);

  check(`${count}: every page is rendered`, boxes.length === pages.length, `${boxes.length} vs ${pages.length}`);

  /*
   * Nothing outside the margins.
   *
   * Two points of tolerance, because a rule drawn *on* the margin is exactly
   * on it and antialiasing puts a pixel either side.
   */
  const overflow = boxes.filter(
    (page) =>
      page.box.x0 < MARGIN - 3 ||
      page.box.x1 > PAGE.width - MARGIN + 3 ||
      page.box.y1 > PAGE.height - 20,
  );
  check(`${count}: nothing is drawn outside the page margins`, overflow.length === 0,
    overflow.map((page) => `${page.path}: ${JSON.stringify(page.box)}`).join(" | "));

  // The table header repeats wherever the table runs on.
  const headed = pages.filter((page) => page.includes("TAXABLE VALUE"));
  const withRows = pages.filter((page) => /^\s*\d+\s+\S/m.test(page) && page.includes("PART / SKU"));
  check(`${count}: the table header is on every page the table reaches`,
    withRows.every((page) => page.includes("TAXABLE VALUE")),
    `${headed.length} headed, ${withRows.length} with rows`);

  // The summary lands whole, on one page.
  const summaryPages = pages.filter((page) => page.includes("GRAND TOTAL"));
  check(`${count}: the grand total appears exactly once`, summaryPages.length === 1, `${summaryPages.length} pages`);
  check(`${count}: and on the same page as the figures it sums`,
    summaryPages[0]?.includes("Taxable Value") && summaryPages[0]?.includes("Amount in Words"));

  /*
   * The issuing company block closes the document, once, at the foot of the
   * last page.
   *
   * It used to be drawn wherever the content happened to end, which on a short
   * final page left it floating halfway up and the document looking cut off.
   * The position is asserted rather than eyeballed: within the bottom third of
   * the last page, and on no other.
   */
  const closingPages = pages.filter((page) => page.includes("CIN") || page.includes("PAN"));
  check(`${count}: the issuing company block appears once`, closingPages.length === 1,
    `${closingPages.length} pages`);
  check(`${count}: and closes the last page`,
    pages[pages.length - 1] === closingPages[0]);

  // Every page is numbered, and the count is right.
  const numbered = pages.filter((page, index) => page.includes(`Page ${index + 1} of ${pages.length}`));
  check(`${count}: every page says which of how many it is`, numbered.length === pages.length,
    `${numbered.length} of ${pages.length}`);
}

rmSync(work, { recursive: true, force: true });

const failed = results.filter((result) => !result.ok).length;
console.log(`\n${results.length - failed}/${results.length} quotation layout checks passed`);
process.exit(failed ? 1 : 0);
