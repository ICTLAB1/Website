/**
 * A very small PDF writer.
 *
 * Written rather than installed. The job is a handful of page layouts — a
 * quotation, and whatever commercial documents follow it — and every library
 * that does that brings a font subsetter, a stream encoder and a few megabytes
 * of dependency surface with it. This is a few hundred lines and there is
 * nothing in it to keep up to date.
 *
 * ## What it can do
 *
 * Text in five of the standard fourteen faces at any size and position;
 * straight lines, filled and stroked rectangles, circles and circular arcs.
 * Positions are in points from the top-left, because thinking upwards from the
 * bottom-left — which is what PDF actually does — is a reliable way to place
 * things wrongly.
 *
 * ## What it cannot do
 *
 * Any glyph outside WinAnsi. The standard fourteen fonts are all a PDF may
 * assume, and none of them contains the rupee sign: printing ₹ would emit a
 * byte that renders as something else entirely, differently in each reader.
 * Callers write "INR" instead — see `lib/pdf/money`.
 *
 * No raster images either, which is why the letterhead mark is drawn as vector
 * paths rather than embedded. That turns out to be the better answer anyway: it
 * prints sharp at any size and adds nothing to the file.
 */

import type { EmbeddedImage } from "@/lib/pdf/image";

const PAGE = { width: 595.28, height: 841.89 }; // A4 in points.

type Op = string;

/**
 * The faces this writer offers, and what each is for.
 *
 * `mono` exists because an identifier — a GSTIN, a PAN, a part number — is
 * read character by character and compared against another copy of itself.
 * Proportional digits and a proportional capital I make that harder than it
 * needs to be on a document somebody is checking against a purchase order.
 */
export type FontName = "sans" | "sansBold" | "mono" | "monoBold" | "italic";

const FONT_SLOTS: Record<FontName, string> = {
  sans: "/F1",
  sansBold: "/F2",
  mono: "/F3",
  monoBold: "/F4",
  italic: "/F5",
};

/** Escapes a string for a PDF literal, and drops what the fonts cannot show. */
export function pdfText(value: string): string {
  let out = "";
  for (const character of value) {
    const code = character.codePointAt(0) ?? 0;

    if (character === "\\") out += "\\\\";
    else if (character === "(") out += "\\(";
    else if (character === ")") out += "\\)";
    else if (code === 0x2018 || code === 0x2019) out += "'";
    else if (code === 0x201c || code === 0x201d) out += '"';
    else if (code === 0x2013 || code === 0x2014) out += "-";
    else if (code === 0x2022) out += "\\267";
    else if (code === 0x20b9) out += "INR ";
    else if (code >= 32 && code <= 126) out += character;
    else if (code >= 160 && code <= 255) out += `\\${code.toString(8).padStart(3, "0")}`;
    // Anything else is dropped rather than guessed at: a wrong glyph on a
    // quotation is worse than a missing one.
  }
  return out;
}

/**
 * Helvetica's advance widths, in 1/1000 em, for the printable ASCII range.
 *
 * Needed because a table has to know whether a product name fits before it is
 * drawn. Taken from the Adobe Font Metrics for Helvetica.
 */
const HELVETICA: Record<string, number> = {
  " ": 278, "!": 278, '"': 355, "#": 556, $: 556, "%": 889, "&": 667, "'": 191,
  "(": 333, ")": 333, "*": 389, "+": 584, ",": 278, "-": 333, ".": 278, "/": 278,
  "0": 556, "1": 556, "2": 556, "3": 556, "4": 556, "5": 556, "6": 556, "7": 556,
  "8": 556, "9": 556, ":": 278, ";": 278, "<": 584, "=": 584, ">": 584, "?": 556,
  "@": 1015, A: 667, B: 667, C: 722, D: 722, E: 667, F: 611, G: 778, H: 722,
  I: 278, J: 500, K: 667, L: 556, M: 833, N: 722, O: 778, P: 667, Q: 778, R: 722,
  S: 667, T: 611, U: 722, V: 667, W: 944, X: 667, Y: 667, Z: 611, "[": 278,
  "\\": 278, "]": 278, "^": 469, _: 556, "`": 333, a: 556, b: 556, c: 500,
  d: 556, e: 556, f: 278, g: 556, h: 556, i: 222, j: 222, k: 500, l: 222,
  m: 833, n: 556, o: 556, p: 556, q: 556, r: 333, s: 500, t: 278, u: 556,
  v: 500, w: 722, x: 500, y: 500, z: 500, "{": 334, "|": 260, "}": 334, "~": 584,
};

/**
 * Helvetica-Bold's, likewise.
 *
 * A real table rather than a factor applied to the regular one. The line-item
 * table is thirteen columns wide and several of them are bold; a systematic
 * one-per-cent error in a fitted string is the difference between a part number
 * that fits and one that is silently truncated.
 */
const HELVETICA_BOLD: Record<string, number> = {
  " ": 278, "!": 333, '"': 474, "#": 556, $: 556, "%": 889, "&": 722, "'": 238,
  "(": 333, ")": 333, "*": 389, "+": 584, ",": 278, "-": 333, ".": 278, "/": 278,
  "0": 556, "1": 556, "2": 556, "3": 556, "4": 556, "5": 556, "6": 556, "7": 556,
  "8": 556, "9": 556, ":": 333, ";": 333, "<": 584, "=": 584, ">": 584, "?": 611,
  "@": 975, A: 722, B: 722, C: 722, D: 722, E: 667, F: 611, G: 778, H: 722,
  I: 278, J: 556, K: 722, L: 611, M: 833, N: 722, O: 778, P: 667, Q: 778, R: 722,
  S: 667, T: 611, U: 722, V: 667, W: 944, X: 667, Y: 667, Z: 611, "[": 333,
  "\\": 278, "]": 333, "^": 584, _: 556, "`": 333, a: 556, b: 611, c: 556,
  d: 611, e: 556, f: 333, g: 611, h: 611, i: 278, j: 278, k: 556, l: 278,
  m: 889, n: 611, o: 611, p: 611, q: 611, r: 389, s: 556, t: 333, u: 611,
  v: 556, w: 778, x: 556, y: 556, z: 500, "{": 389, "|": 280, "}": 389, "~": 584,
};

/** Courier is monospaced, so there is nothing to look up. */
const COURIER_WIDTH = 600;

function widthsFor(font: FontName): Record<string, number> | number {
  switch (font) {
    case "sansBold":
      return HELVETICA_BOLD;
    case "mono":
    case "monoBold":
      return COURIER_WIDTH;
    // Times-Italic sets a little narrower than Helvetica. It is used for one
    // unfitted line — the tagline under the mark — so measuring it as
    // Helvetica errs on the side of leaving room, which is the safe direction.
    case "italic":
    case "sans":
    default:
      return HELVETICA;
  }
}

function normaliseFont(font: FontName | boolean | undefined): FontName {
  if (font === true) return "sansBold";
  if (font === false || font === undefined) return "sans";
  return font;
}

/** How wide a string is, in points, at a given size. */
export function textWidth(value: string, size: number, font: FontName | boolean = "sans"): number {
  const table = widthsFor(normaliseFont(font));

  if (typeof table === "number") return (value.length * table * size) / 1000;

  let units = 0;
  for (const character of value) units += table[character] ?? 556;
  return (units / 1000) * size;
}

/** Cuts a string to fit a width, ending with an ellipsis where it had to. */
export function fit(
  value: string,
  width: number,
  size: number,
  font: FontName | boolean = "sans",
): string {
  if (textWidth(value, size, font) <= width) return value;

  let cut = value;
  while (cut.length > 1 && textWidth(`${cut}...`, size, font) > width) {
    cut = cut.slice(0, -1);
  }
  return `${cut.trimEnd()}...`;
}

/**
 * Splits a single word too long for the width into pieces that fit, preferring
 * the boundaries a reader would choose.
 *
 * Never an ellipsis. The strings this happens to are part numbers, SKUs, email
 * addresses and order references — things somebody pastes into a supplier
 * portal — and a truncated one looks exactly like a real one while being
 * useless. Two lines are always better than a plausible wrong value.
 *
 * Character-by-character is the fallback, not the first move. An email address
 * split blindly comes out as `itpurchase@example.e` / `du.in`, which stops
 * looking like an address at all; broken after its `@` and its dots it stays
 * legible, and so do URLs and long part numbers. The separator stays on the
 * line it ends, the way a hyphenated break does.
 */
function breakWord(word: string, width: number, size: number, font: FontName): string[] {
  const chars = (value: string): string[] => {
    const pieces: string[] = [];
    let piece = "";
    for (const character of value) {
      if (piece.length > 0 && textWidth(piece + character, size, font) > width) {
        pieces.push(piece);
        piece = character;
      } else {
        piece += character;
      }
    }
    if (piece.length > 0) pieces.push(piece);
    return pieces;
  };

  // Segments end *after* a separator, so `a@b.c` becomes `a@`, `b.`, `c`.
  const segments = word.match(/[^@./_-]*[@./_-]+|[^@./_-]+/g) ?? [word];

  const pieces: string[] = [];
  let line = "";
  for (const segment of segments) {
    if (line.length > 0 && textWidth(line + segment, size, font) > width) {
      pieces.push(line);
      line = "";
    }
    if (textWidth(segment, size, font) > width) {
      const split = chars(line + segment);
      pieces.push(...split.slice(0, -1));
      line = split[split.length - 1] ?? "";
      continue;
    }
    line += segment;
  }
  if (line.length > 0) pieces.push(line);

  return pieces.length > 0 ? pieces : [word];
}

/** Wraps a paragraph to a width, at word boundaries. */
export function wrap(
  value: string,
  width: number,
  size: number,
  font: FontName | boolean = "sans",
): string[] {
  const lines: string[] = [];
  const face = normaliseFont(font);

  for (const paragraph of value.split(/\r?\n/)) {
    if (paragraph.trim().length === 0) {
      lines.push("");
      continue;
    }

    let line = "";
    for (const word of paragraph.split(/\s+/)) {
      const candidate = line.length === 0 ? word : `${line} ${word}`;
      if (textWidth(candidate, size, face) <= width) {
        line = candidate;
        continue;
      }

      if (line.length > 0) lines.push(line);

      if (textWidth(word, size, face) <= width) {
        line = word;
      } else {
        // Every piece but the last is a complete line; the last carries on.
        const pieces = breakWord(word, width, size, face);
        lines.push(...pieces.slice(0, -1));
        line = pieces[pieces.length - 1]!;
      }
    }
    if (line.length > 0) lines.push(line);
  }

  return lines;
}

export type Colour = { r: number; g: number; b: number };

export const BLACK: Colour = { r: 0.13, g: 0.11, b: 0.09 };
export const MUTED: Colour = { r: 0.42, g: 0.38, b: 0.35 };
export const FAINT: Colour = { r: 0.58, g: 0.55, b: 0.52 };
export const RULE: Colour = { r: 0.82, g: 0.8, b: 0.77 };
export const HAIRLINE: Colour = { r: 0.89, g: 0.87, b: 0.84 };
export const ACCENT: Colour = { r: 0.48, g: 0.35, b: 0.05 };
export const WHITE: Colour = { r: 1, g: 1, b: 1 };
export const PANEL: Colour = { r: 0.97, g: 0.965, b: 0.955 };
export const ZEBRA: Colour = { r: 0.985, g: 0.982, b: 0.977 };

/**
 * The three mark colours and the ink, matching the brand lockup in
 * `public/brand-assets/`.
 *
 * Duplicated from the SVG rather than parsed out of it: this file is written
 * once and read by a renderer that cannot fetch anything, and a colour that
 * silently stopped matching would be visible on the next document anybody
 * opened.
 */
export const MARK_BLUE: Colour = { r: 0.184, g: 0.49, b: 0.82 };
export const MARK_AMBER: Colour = { r: 0.949, g: 0.639, b: 0.235 };
export const MARK_TEAL: Colour = { r: 0.169, g: 0.702, b: 0.639 };
export const INK: Colour = { r: 0.11, g: 0.122, b: 0.118 };

const rgb = (colour: Colour) => `${colour.r.toFixed(3)} ${colour.g.toFixed(3)} ${colour.b.toFixed(3)}`;

/**
 * One document being built.
 *
 * Deliberately imperative: a document is drawn top to bottom, the caller keeps
 * a cursor, and a layout engine would be a great deal of machinery for a
 * handful of document shapes.
 */
export class PdfDocument {
  readonly width = PAGE.width;
  readonly height = PAGE.height;

  private pages: Op[][] = [[]];
  private current = 0;

  /**
   * Images placed in the document, in the order they were first used.
   *
   * Held once and referenced from every page that draws them, so a logo on
   * four pages is four references to one stream rather than four copies of a
   * quarter of a megabyte.
   */
  private images: EmbeddedImage[] = [];

  /** Starts a new page and returns to the top of it. */
  addPage(): void {
    this.pages.push([]);
    this.current = this.pages.length - 1;
  }

  get pageCount(): number {
    return this.pages.length;
  }

  /**
   * Draws on a page that is not the current one.
   *
   * For the things that can only be drawn once the whole document is laid out —
   * a footer that says "page 2 of 3" cannot be written until the third page
   * exists.
   */
  onPage(index: number, draw: () => void): void {
    const previous = this.current;
    this.current = Math.max(0, Math.min(index, this.pages.length - 1));
    draw();
    this.current = previous;
  }

  private push(op: Op): void {
    this.pages[this.current]!.push(op);
  }

  /** Turns a top-down y into the upward-counting one PDF wants. */
  private flip(y: number): number {
    return PAGE.height - y;
  }

  /** Draws text with its baseline at `y` points from the top. */
  text(
    value: string,
    x: number,
    y: number,
    options: { size?: number; bold?: boolean; font?: FontName; colour?: Colour; tracking?: number } = {},
  ): void {
    const size = options.size ?? 10;
    const colour = options.colour ?? BLACK;
    const font = FONT_SLOTS[options.font ?? normaliseFont(options.bold)];

    // Letter-spacing, for the small uppercase labels a form uses. Set on every
    // run rather than left standing, because Tc persists in the graphics state
    // and a stray value would space out the next thing drawn.
    const tracking = options.tracking ?? 0;

    this.push(
      `BT ${rgb(colour)} rg ${font} ${size} Tf ${tracking.toFixed(2)} Tc ` +
        `1 0 0 1 ${x.toFixed(2)} ${this.flip(y).toFixed(2)} Tm (${pdfText(value)}) Tj ET`,
    );
  }

  /** Draws text ending at `x`, for a column of figures. */
  textRight(
    value: string,
    x: number,
    y: number,
    options: { size?: number; bold?: boolean; font?: FontName; colour?: Colour; tracking?: number } = {},
  ): void {
    const font = options.font ?? normaliseFont(options.bold);
    const tracking = (options.tracking ?? 0) * value.length;
    const width = textWidth(value, options.size ?? 10, font) + tracking;
    this.text(value, x - width, y, options);
  }

  /** Draws text centred on `x`. */
  textCentre(
    value: string,
    x: number,
    y: number,
    options: { size?: number; bold?: boolean; font?: FontName; colour?: Colour; tracking?: number } = {},
  ): void {
    const font = options.font ?? normaliseFont(options.bold);
    const tracking = (options.tracking ?? 0) * value.length;
    const width = textWidth(value, options.size ?? 10, font) + tracking;
    this.text(value, x - width / 2, y, options);
  }

  line(x1: number, y1: number, x2: number, y2: number, colour: Colour = RULE, thickness = 0.6): void {
    this.push(
      `${rgb(colour)} RG ${thickness} w 0 J ` +
        `${x1.toFixed(2)} ${this.flip(y1).toFixed(2)} m ${x2.toFixed(2)} ${this.flip(y2).toFixed(2)} l S`,
    );
  }

  rect(x: number, y: number, width: number, height: number, colour: Colour): void {
    this.push(
      `${rgb(colour)} rg ` +
        `${x.toFixed(2)} ${this.flip(y + height).toFixed(2)} ${width.toFixed(2)} ${height.toFixed(2)} re f`,
    );
  }

  /** An outlined rectangle, for the panels and table cells. */
  strokeRect(
    x: number,
    y: number,
    width: number,
    height: number,
    colour: Colour = RULE,
    thickness = 0.6,
  ): void {
    this.push(
      `${rgb(colour)} RG ${thickness} w ` +
        `${x.toFixed(2)} ${this.flip(y + height).toFixed(2)} ${width.toFixed(2)} ${height.toFixed(2)} re S`,
    );
  }

  /**
   * A circular arc, given in the same top-down space as everything else.
   *
   * Angles are degrees clockwise from east, which is what reading them off a
   * screen-coordinate drawing gives you. Cubic Béziers approximate the arc in
   * segments of at most a quarter turn — the standard construction, and exact
   * enough that no printer will resolve the difference.
   */
  arc(
    cx: number,
    cy: number,
    radius: number,
    startDegrees: number,
    endDegrees: number,
    options: { colour?: Colour; thickness?: number; round?: boolean } = {},
  ): void {
    const colour = options.colour ?? BLACK;
    const thickness = options.thickness ?? 1;
    const cap = options.round ? 1 : 0;

    const total = ((endDegrees - startDegrees) * Math.PI) / 180;
    const segments = Math.max(1, Math.ceil(Math.abs(total) / (Math.PI / 2)));
    const step = total / segments;
    const k = (4 / 3) * Math.tan(step / 4);

    const at = (angle: number) => ({
      x: cx + radius * Math.cos(angle),
      y: cy + radius * Math.sin(angle),
    });

    let angle = (startDegrees * Math.PI) / 180;
    let point = at(angle);
    let path = `${point.x.toFixed(2)} ${this.flip(point.y).toFixed(2)} m`;

    for (let index = 0; index < segments; index += 1) {
      const next = angle + step;
      const from = at(angle);
      const to = at(next);

      // Control points lie along the tangents, at k times the radius.
      const c1 = { x: from.x - k * radius * Math.sin(angle), y: from.y + k * radius * Math.cos(angle) };
      const c2 = { x: to.x + k * radius * Math.sin(next), y: to.y - k * radius * Math.cos(next) };

      path +=
        ` ${c1.x.toFixed(2)} ${this.flip(c1.y).toFixed(2)}` +
        ` ${c2.x.toFixed(2)} ${this.flip(c2.y).toFixed(2)}` +
        ` ${to.x.toFixed(2)} ${this.flip(to.y).toFixed(2)} c`;

      angle = next;
      point = to;
    }

    this.push(`${rgb(colour)} RG ${thickness} w ${cap} J ${path} S`);
  }

  /**
   * Places an image, scaled into a box `width` × `height` points.
   *
   * The image keeps its own aspect ratio and is centred in the box, because
   * the caller reserves a slot on the letterhead and the artwork that lands in
   * it is whatever the business supplied — a square mark and a seven-to-one
   * wordmark both have to sit correctly in the same space.
   */
  image(picture: EmbeddedImage, x: number, y: number, width: number, height: number): void {
    let index = this.images.indexOf(picture);
    if (index === -1) index = this.images.push(picture) - 1;

    const scale = Math.min(width / picture.width, height / picture.height);
    const drawWidth = picture.width * scale;
    const drawHeight = picture.height * scale;
    const left = x + (width - drawWidth) / 2;
    const top = y + (height - drawHeight) / 2;

    // `cm` sets the image's box: PDF draws every image into a unit square, so
    // the transform is the size and position in one.
    this.push(
      `q ${drawWidth.toFixed(2)} 0 0 ${drawHeight.toFixed(2)} ` +
        `${left.toFixed(2)} ${this.flip(top + drawHeight).toFixed(2)} cm /Im${index} Do Q`,
    );
  }

  /** A stroked circle. Four arcs, which is what a circle is in PostScript. */
  circle(
    cx: number,
    cy: number,
    radius: number,
    options: { colour?: Colour; thickness?: number } = {},
  ): void {
    this.arc(cx, cy, radius, 0, 360, options);
  }

  /** Serialises the document. */
  build(): Buffer {
    const objects: string[] = [];
    const add = (body: string): number => {
      objects.push(body);
      return objects.length; // 1-based object numbers
    };

    // The catalogue, the page tree and the fonts come first at fixed numbers,
    // so the page objects below can refer to them before they are written.
    const catalogueId = add("");
    const pagesId = add("");

    const font = (base: string) =>
      add(`<< /Type /Font /Subtype /Type1 /BaseFont /${base} /Encoding /WinAnsiEncoding >>`);

    const fontIds: Record<FontName, number> = {
      sans: font("Helvetica"),
      sansBold: font("Helvetica-Bold"),
      mono: font("Courier"),
      monoBold: font("Courier-Bold"),
      italic: font("Times-Italic"),
    };

    /*
     * Images, once each, however many pages draw them.
     *
     * Emitted before the pages so the page objects can name them, and listed
     * in every page's resources rather than tracked per page — a duplicated
     * dictionary entry costs a dozen bytes, and per-page bookkeeping for it
     * would be more code than it saves.
     */
    const imageIds = this.images.map((picture) => {
      const maskId = picture.mask
        ? add(
            `<< /Type /XObject /Subtype /Image /Width ${picture.mask.width} /Height ${picture.mask.height} ` +
              `/ColorSpace /DeviceGray /BitsPerComponent 8 /Filter /FlateDecode ` +
              `/Length ${picture.mask.data.length} >>\nstream\n${picture.mask.data.toString("latin1")}\nendstream`,
          )
        : null;

      return add(
        `<< /Type /XObject /Subtype /Image /Width ${picture.width} /Height ${picture.height} ` +
          `/ColorSpace /${picture.colourSpace} /BitsPerComponent 8 /Filter /${picture.filter} ` +
          (maskId ? `/SMask ${maskId} 0 R ` : "") +
          `/Length ${picture.data.length} >>\nstream\n${picture.data.toString("latin1")}\nendstream`,
      );
    });

    const resources =
      "/Font << " +
      (Object.keys(FONT_SLOTS) as FontName[])
        .map((name) => `${FONT_SLOTS[name]} ${fontIds[name]} 0 R`)
        .join(" ") +
      " >>" +
      (imageIds.length > 0
        ? ` /XObject << ${imageIds.map((id, index) => `/Im${index} ${id} 0 R`).join(" ")} >>`
        : "");

    const pageIds: number[] = [];
    for (const ops of this.pages) {
      const content = ops.join("\n");
      const streamId = add(`<< /Length ${Buffer.byteLength(content, "latin1")} >>\nstream\n${content}\nendstream`);
      pageIds.push(
        add(
          `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${PAGE.width} ${PAGE.height}] ` +
            `/Resources << ${resources} >> /Contents ${streamId} 0 R >>`,
        ),
      );
    }

    objects[catalogueId - 1] = `<< /Type /Catalog /Pages ${pagesId} 0 R >>`;
    objects[pagesId - 1] =
      `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageIds.length} >>`;

    let out = "%PDF-1.4\n";
    const offsets: number[] = [];

    for (let index = 0; index < objects.length; index += 1) {
      offsets.push(Buffer.byteLength(out, "latin1"));
      out += `${index + 1} 0 obj\n${objects[index]}\nendobj\n`;
    }

    const xrefOffset = Buffer.byteLength(out, "latin1");
    out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
    for (const offset of offsets) {
      out += `${offset.toString().padStart(10, "0")} 00000 n \n`;
    }
    out += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogueId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

    // latin1: every byte written above is already a single byte, and the
    // offsets in the cross-reference table are byte offsets. Encoding as UTF-8
    // would silently widen the accented characters and invalidate every one.
    return Buffer.from(out, "latin1");
  }
}
