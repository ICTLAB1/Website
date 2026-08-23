import { describe, expect, it } from "vitest";

import { PdfDocument, fit, pdfText, textWidth, wrap } from "@/lib/pdf/writer";
import { pdfDate, pdfMoney } from "@/lib/pdf/money";

/**
 * The PDF writer.
 *
 * A quotation is a commercial document somebody attaches to a purchase order,
 * so the things worth pinning down are the ones that would make it wrong
 * rather than ugly: a figure that lost its paise, a glyph the fonts cannot
 * print, and a file no reader will open.
 */

describe("money on a printed document", () => {
  it("prints the currency code rather than a symbol the fonts lack", () => {
    // ₹ is not in any of the standard fourteen fonts. Emitting it produces a
    // different character in every reader, which on a price is unacceptable.
    expect(pdfMoney(11800000, "INR")).toBe("INR 1,18,000.00");
    expect(pdfMoney(11800000, "INR")).not.toContain("₹");
  });

  it("always shows the paise", () => {
    // The catalogue hides ".00" because it reads better. A quotation is
    // reconciled against an invoice, and a figure that dropped its paise is a
    // figure that does not reconcile.
    expect(pdfMoney(100050)).toBe("INR 1,000.50");
    expect(pdfMoney(100000)).toBe("INR 1,000.00");
  });

  it("groups the other currencies their own way", () => {
    expect(pdfMoney(123456, "USD")).toBe("USD 1,234.56");
  });

  it("prints a date somebody can read without ambiguity", () => {
    expect(pdfDate(new Date("2026-08-23T00:00:00Z"))).toBe("23 Aug 2026");
  });
});

describe("escaping", () => {
  it("escapes what would break the syntax", () => {
    expect(pdfText("Bracket (one)")).toBe("Bracket \\(one\\)");
    expect(pdfText("back\\slash")).toBe("back\\\\slash");
  });

  it("turns typographic punctuation into what the font has", () => {
    expect(pdfText("Don’t “quote” me — please")).toBe("Don't \"quote\" me - please");
  });

  it("writes the rupee sign as a currency code rather than a wrong glyph", () => {
    expect(pdfText("₹1,000")).toBe("INR 1,000");
  });

  it("drops what no standard font can show, rather than guessing", () => {
    // A missing character is a gap. A guessed one is a different word.
    expect(pdfText("Namaste नमस्ते")).toBe("Namaste ");
    expect(pdfText("emoji \u{1f600} here")).toBe("emoji  here");
  });

  it("keeps the accented Latin the fonts do have", () => {
    expect(pdfText("Systèmes")).toBe("Syst\\350mes");
  });
});

describe("measuring and fitting", () => {
  it("measures a string in points", () => {
    expect(textWidth("iii", 10)).toBeLessThan(textWidth("WWW", 10));
    expect(textWidth("", 10)).toBe(0);
  });

  it("cuts a long name to fit, and says it did", () => {
    const cut = fit("A very long product name that will not fit in the column", 80, 9.5);
    expect(cut.endsWith("...")).toBe(true);
    expect(textWidth(cut, 9.5)).toBeLessThanOrEqual(80);
  });

  it("leaves a name that fits exactly as it is", () => {
    expect(fit("Short", 200, 10)).toBe("Short");
  });

  it("wraps a paragraph at word boundaries", () => {
    const lines = wrap("one two three four five six seven eight nine ten", 60, 9);
    expect(lines.length).toBeGreaterThan(1);
    for (const line of lines) expect(textWidth(line, 9)).toBeLessThanOrEqual(60);
    expect(lines.join(" ")).toBe("one two three four five six seven eight nine ten");
  });

  it("breaks a single word too long to fit rather than overflowing", () => {
    const lines = wrap("Supercalifragilisticexpialidocious", 40, 9);
    for (const line of lines) expect(textWidth(line, 9)).toBeLessThanOrEqual(40);
  });
});

describe("the document itself", () => {
  it("produces something a reader will open", () => {
    const pdf = new PdfDocument();
    pdf.text("Quotation", 48, 60, { size: 18, bold: true });
    const bytes = pdf.build();
    const text = bytes.toString("latin1");

    expect(text.startsWith("%PDF-1.4")).toBe(true);
    expect(text.trimEnd().endsWith("%%EOF")).toBe(true);
    expect(text).toContain("/Type /Catalog");
    expect(text).toContain("/BaseFont /Helvetica-Bold");
  });

  it("writes a cross-reference entry for every object", () => {
    const pdf = new PdfDocument();
    pdf.text("One", 10, 10);
    pdf.addPage();
    pdf.text("Two", 10, 10);
    const text = pdf.build().toString("latin1");

    const size = Number(text.match(/\/Size (\d+)/)?.[1]);
    const entries = text.match(/^\d{10} \d{5} [nf] $/gm)?.length ?? 0;
    expect(entries).toBe(size);
  });

  it("counts its pages", () => {
    const pdf = new PdfDocument();
    expect(pdf.pageCount).toBe(1);
    pdf.addPage();
    pdf.addPage();
    expect(pdf.pageCount).toBe(3);
    expect(pdf.build().toString("latin1")).toContain("/Count 3");
  });

  it("draws onto an earlier page without disturbing the current one", () => {
    // What the footer needs: "page 1 of 3" cannot be written until page 3
    // exists.
    const pdf = new PdfDocument();
    pdf.addPage();
    pdf.onPage(0, () => pdf.text("footer on page one", 10, 800));
    pdf.text("still drawing on page two", 10, 100);

    const text = pdf.build().toString("latin1");
    const first = text.indexOf("footer on page one");
    const second = text.indexOf("still drawing on page two");
    expect(first).toBeGreaterThan(-1);
    expect(second).toBeGreaterThan(first);
  });

  it("records byte offsets, not character offsets", () => {
    /*
     * The bug this guards against: encoding the file as UTF-8 would widen every
     * accented character to two bytes and leave every offset in the
     * cross-reference table pointing at the wrong place — a file that opens in
     * a forgiving reader and fails in a strict one.
     */
    const pdf = new PdfDocument();
    pdf.text("Systèmes Dassault", 48, 60);
    const bytes = pdf.build();
    const text = bytes.toString("latin1");

    const offset = Number(text.match(/startxref\n(\d+)/)?.[1]);
    expect(bytes.subarray(offset, offset + 4).toString("latin1")).toBe("xref");
  });
});

describe("wrapping a string that has no spaces in it", () => {
  it("breaks it rather than truncating it", async () => {
    /*
     * The bug this pins down: `wrap` used to ellipsise a word too long for the
     * column. The strings that happens to are part numbers — the thing a
     * customer pastes into a supplier portal — and "CFQ7TTC0..." looks exactly
     * like a real one while being useless. Two lines beat a plausible wrong
     * value every time.
     */
    const { wrap } = await import("@/lib/pdf/writer");

    const lines = wrap("CFQ7TTC0LH18", 40, 6.8, "mono");
    expect(lines.join("")).toBe("CFQ7TTC0LH18");
    expect(lines.join("")).not.toContain(".");
    for (const line of lines) expect(textWidth(line, 6.8, "mono")).toBeLessThanOrEqual(40);
  });

  it("loses nothing from a long word inside a sentence either", async () => {
    const { wrap } = await import("@/lib/pdf/writer");
    const lines = wrap("Order ABCDEFGHIJKLMNOPQRSTUVWXYZ now", 40, 8);
    expect(lines.join(" ").replace(/\s+/g, "")).toBe("OrderABCDEFGHIJKLMNOPQRSTUVWXYZnow");
  });
});

describe("the faces", () => {
  it("measures the monospaced one as monospaced", async () => {
    const { textWidth: measure } = await import("@/lib/pdf/writer");
    expect(measure("iii", 10, "mono")).toBe(measure("WWW", 10, "mono"));
    expect(measure("iii", 10, "sans")).toBeLessThan(measure("WWW", 10, "sans"));
  });

  it("measures bold from its own table rather than a fudge factor", async () => {
    const { textWidth: measure } = await import("@/lib/pdf/writer");
    // 'f' is 278 regular and 333 bold; a blanket factor cannot produce both.
    expect(measure("f", 1000, "sansBold")).toBe(333);
    expect(measure("f", 1000, "sans")).toBe(278);
  });

  it("still accepts the boolean the older callers pass", async () => {
    const { textWidth: measure } = await import("@/lib/pdf/writer");
    expect(measure("Total", 10, true)).toBe(measure("Total", 10, "sansBold"));
    expect(measure("Total", 10, false)).toBe(measure("Total", 10, "sans"));
  });

  it("embeds every face it offers", () => {
    const pdf = new PdfDocument();
    pdf.text("a", 10, 10, { font: "mono" });
    const text = pdf.build().toString("latin1");

    for (const face of ["Helvetica", "Helvetica-Bold", "Courier", "Courier-Bold", "Times-Italic"]) {
      expect(text).toContain(`/BaseFont /${face}`);
    }
  });
});

describe("drawing the mark", () => {
  it("emits curves rather than an image", async () => {
    // No raster support, on purpose: a vector mark prints sharp at any size and
    // adds a hundred bytes rather than a hundred kilobytes.
    const { drawMark } = await import("@/lib/pdf/letterhead");

    const pdf = new PdfDocument();
    drawMark(pdf, 40, 40, 38);
    const text = pdf.build().toString("latin1");

    expect(text).toMatch(/\d c /); // cubic Bézier segments
    expect(text).not.toContain("/Image");
    expect(text).not.toContain("/DCTDecode");
  });
});

describe("the quotation table", () => {
  it("apportions its columns across the exact content width", async () => {
    // The right-hand edge of the last column has to land on the margin, or the
    // table's outer box and its cells disagree by a visible sliver.
    const { TABLE_COLUMNS, TABLE_WIDTH } = await import("@/lib/pdf/quotation");
    const { COLUMN_EDGES } = await import("@/lib/pdf/quotation");

    expect(TABLE_COLUMNS.length).toBe(13);
    expect(COLUMN_EDGES.total.right - COLUMN_EDGES.sno.left).toBeCloseTo(TABLE_WIDTH, 5);
  });
});
