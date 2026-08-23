/**
 * A very small PDF writer.
 *
 * Written rather than installed. The job is one page-layout of text, rules and
 * a table — a quotation — and every library that does that brings a font
 * subsetter, a stream encoder and a few megabytes of dependency surface with
 * it. This is about two hundred lines and there is nothing in it to keep up to
 * date.
 *
 * ## What it can do
 *
 * Text in Helvetica and Helvetica-Bold at any size and position, straight
 * lines, filled rectangles, and page breaks. Positions are in points from the
 * top-left, because thinking upwards from the bottom-left — which is what PDF
 * actually does — is a reliable way to place things wrongly.
 *
 * ## What it cannot do
 *
 * Any glyph outside WinAnsi. The standard fourteen fonts are all a PDF may
 * assume, and none of them contains the rupee sign: printing ₹ would emit a
 * byte that renders as something else entirely, differently in each reader.
 * Callers write "INR" instead — see `lib/pdf/money`.
 */

const PAGE = { width: 595.28, height: 841.89 }; // A4 in points.

type Op = string;

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
 * drawn. Taken from the Adobe Font Metrics for Helvetica; the bold face is
 * close enough at this size that one table is used for both, with a small
 * factor applied — a heading that measures one per cent narrow costs nothing,
 * and the alternative is a second table nobody will ever check.
 */
const WIDTHS: Record<string, number> = {
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

/** How wide a string is, in points, at a given size. */
export function textWidth(value: string, size: number, bold = false): number {
  let units = 0;
  for (const character of value) units += WIDTHS[character] ?? 556;
  return (units / 1000) * size * (bold ? 1.03 : 1);
}

/** Cuts a string to fit a width, ending with an ellipsis where it had to. */
export function fit(value: string, width: number, size: number, bold = false): string {
  if (textWidth(value, size, bold) <= width) return value;

  let cut = value;
  while (cut.length > 1 && textWidth(`${cut}...`, size, bold) > width) {
    cut = cut.slice(0, -1);
  }
  return `${cut.trimEnd()}...`;
}

/** Wraps a paragraph to a width, at word boundaries. */
export function wrap(value: string, width: number, size: number, bold = false): string[] {
  const lines: string[] = [];

  for (const paragraph of value.split(/\r?\n/)) {
    if (paragraph.trim().length === 0) {
      lines.push("");
      continue;
    }

    let line = "";
    for (const word of paragraph.split(/\s+/)) {
      const candidate = line.length === 0 ? word : `${line} ${word}`;
      if (textWidth(candidate, size, bold) <= width) {
        line = candidate;
      } else {
        if (line.length > 0) lines.push(line);
        line = textWidth(word, size, bold) <= width ? word : fit(word, width, size, bold);
      }
    }
    if (line.length > 0) lines.push(line);
  }

  return lines;
}

export type Colour = { r: number; g: number; b: number };

export const BLACK: Colour = { r: 0.13, g: 0.11, b: 0.09 };
export const MUTED: Colour = { r: 0.42, g: 0.38, b: 0.35 };
export const RULE: Colour = { r: 0.89, g: 0.87, b: 0.84 };
export const ACCENT: Colour = { r: 0.48, g: 0.35, b: 0.05 };

/**
 * One document being built.
 *
 * Deliberately imperative: a quotation is drawn top to bottom, the caller keeps
 * a cursor, and a layout engine would be a great deal of machinery for one
 * document shape.
 */
export class PdfDocument {
  readonly width = PAGE.width;
  readonly height = PAGE.height;

  private pages: Op[][] = [[]];
  private current = 0;

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

  /** Draws text with its baseline at `y` points from the top. */
  text(
    value: string,
    x: number,
    y: number,
    options: { size?: number; bold?: boolean; colour?: Colour } = {},
  ): void {
    const size = options.size ?? 10;
    const colour = options.colour ?? BLACK;
    const font = options.bold ? "/F2" : "/F1";

    this.push(
      `BT ${colour.r.toFixed(3)} ${colour.g.toFixed(3)} ${colour.b.toFixed(3)} rg ${font} ${size} Tf ` +
        `1 0 0 1 ${x.toFixed(2)} ${(PAGE.height - y).toFixed(2)} Tm (${pdfText(value)}) Tj ET`,
    );
  }

  /** Draws text ending at `x`, for a column of figures. */
  textRight(
    value: string,
    x: number,
    y: number,
    options: { size?: number; bold?: boolean; colour?: Colour } = {},
  ): void {
    const width = textWidth(value, options.size ?? 10, options.bold ?? false);
    this.text(value, x - width, y, options);
  }

  line(x1: number, y1: number, x2: number, y2: number, colour: Colour = RULE, thickness = 0.6): void {
    this.push(
      `${colour.r.toFixed(3)} ${colour.g.toFixed(3)} ${colour.b.toFixed(3)} RG ${thickness} w ` +
        `${x1.toFixed(2)} ${(PAGE.height - y1).toFixed(2)} m ${x2.toFixed(2)} ${(PAGE.height - y2).toFixed(2)} l S`,
    );
  }

  rect(x: number, y: number, width: number, height: number, colour: Colour): void {
    this.push(
      `${colour.r.toFixed(3)} ${colour.g.toFixed(3)} ${colour.b.toFixed(3)} rg ` +
        `${x.toFixed(2)} ${(PAGE.height - y - height).toFixed(2)} ${width.toFixed(2)} ${height.toFixed(2)} re f`,
    );
  }

  /** Serialises the document. */
  build(): Buffer {
    const objects: string[] = [];
    const add = (body: string): number => {
      objects.push(body);
      return objects.length; // 1-based object numbers
    };

    // 1: catalogue, 2: page tree, 3 and 4: the two fonts. Fixed, so the page
    // objects below can refer to them before they are written.
    const catalogueId = add("");
    const pagesId = add("");
    const regularId = add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>");
    const boldId = add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>");

    const pageIds: number[] = [];
    for (const ops of this.pages) {
      const content = ops.join("\n");
      const streamId = add(`<< /Length ${Buffer.byteLength(content, "latin1")} >>\nstream\n${content}\nendstream`);
      pageIds.push(
        add(
          `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${PAGE.width} ${PAGE.height}] ` +
            `/Resources << /Font << /F1 ${regularId} 0 R /F2 ${boldId} 0 R >> >> /Contents ${streamId} 0 R >>`,
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
