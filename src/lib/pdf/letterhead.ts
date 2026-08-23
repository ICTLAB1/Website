import {
  INK,
  MARK_AMBER,
  MARK_BLUE,
  MARK_TEAL,
  MUTED,
  type PdfDocument,
  textWidth,
} from "@/lib/pdf/writer";

/**
 * The letterhead lockup, drawn rather than embedded.
 *
 * This writer has no image support and does not want any: a raster logo means
 * decoding a PNG, deflating pixels and shipping a few hundred kilobytes into
 * every document, and it prints soft. The mark in `public/logo.svg` is three
 * arcs and a ring, which is four path operators, prints sharp at any size and
 * costs about a hundred bytes.
 *
 * ## Keeping it in step with the SVG
 *
 * The geometry below is read off `public/logo.svg` directly. In that file the
 * mark lives in a 100×100 box: a ring of radius 20 at the centre, and three
 * 96-degree arcs of radius 40 starting at 186, 306 and 66 degrees — evenly
 * spaced a third of a turn apart. Change the SVG and this needs the same
 * change; there is no way to derive one from the other at render time, because
 * this code runs where nothing can be fetched.
 */

/** The mark's own coordinate system, matching the SVG's inner group. */
const BOX = 100;
const RING_RADIUS = 20;
const ARC_RADIUS = 40;
const ARC_SWEEP = 96;
const ARC_STARTS = [186, 306, 66];
const ARC_COLOURS = [MARK_BLUE, MARK_AMBER, MARK_TEAL];

/**
 * Draws the mark with its top-left at (x, y), `size` points square.
 *
 * Stroke widths scale with the mark, so it stays recognisable small — at
 * letterhead size the arcs are barely over half a point and still print.
 */
export function drawMark(pdf: PdfDocument, x: number, y: number, size: number): void {
  const scale = size / BOX;
  const cx = x + size / 2;
  const cy = y + size / 2;

  for (const [index, start] of ARC_STARTS.entries()) {
    pdf.arc(cx, cy, ARC_RADIUS * scale, start, start + ARC_SWEEP, {
      colour: ARC_COLOURS[index]!,
      thickness: 10 * scale,
      round: true,
    });
  }

  pdf.circle(cx, cy, RING_RADIUS * scale, { colour: INK, thickness: 9 * scale });
}

/**
 * The mark with the trading name beside it, as a letterhead.
 *
 * The name is set rather than drawn, and taken from configuration rather than
 * hardcoded: this application is deployed under a configured company name, and
 * a document that printed somebody else's name because it was baked into a
 * renderer would be worse than one with no logo at all.
 *
 * Returns the height it used, so the caller can lay out beneath it.
 */
export function drawLetterhead(
  pdf: PdfDocument,
  options: {
    x: number;
    y: number;
    /** The name as it should appear. Set in capitals, as the mark is. */
    name: string;
    tagline: string | null;
    /** Widest the whole lockup may be. The name is sized down to fit. */
    maxWidth: number;
  },
): number {
  const { x, y, maxWidth } = options;

  const markSize = 30;
  drawMark(pdf, x, y, markSize);

  const name = options.name.toUpperCase();
  const gap = 9;
  const room = maxWidth - markSize - gap;

  /*
   * The name is fitted by shrinking rather than by truncating. A cut company
   * name on a letterhead reads as a bug in a way that a slightly smaller one
   * never does, and the range here — 18 down to 9 points — covers every
   * plausible name at this width.
   */
  let size = 18;
  while (size > 9 && textWidth(name, size, "sansBold") > room) size -= 0.5;

  pdf.text(name, x + markSize + gap, y + 19, { size, font: "sansBold", colour: INK });

  if (options.tagline) {
    pdf.text(options.tagline, x + markSize + gap, y + 30, {
      size: 7.5,
      font: "italic",
      colour: MUTED,
    });
    return markSize + 4;
  }

  return markSize;
}
