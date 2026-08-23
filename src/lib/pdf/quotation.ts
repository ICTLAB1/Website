import type { SiteConfig } from "@/lib/site-config";
import { amountInWords, pdfAmount, pdfDate, pdfMoney } from "@/lib/pdf/money";
import { drawMark } from "@/lib/pdf/letterhead";
import type { EmbeddedImage } from "@/lib/pdf/image";
import { panFromGstin, placeOfSupply, taxHeads, taxTreatment, type TaxTreatment } from "@/lib/gstin";
import {
  ACCENT,
  BLACK,
  FAINT,
  HAIRLINE,
  INK,
  MUTED,
  PANEL,
  PdfDocument,
  RULE,
  WHITE,
  ZEBRA,
  fit,
  textWidth,
  wrap,
} from "@/lib/pdf/writer";

/**
 * A quotation as a commercial document.
 *
 * The email version of this exists and is right for reading. It is wrong for
 * the thing that actually happens next: a procurement officer forwards it to
 * finance, finance raises a purchase order against it, and somebody files both
 * for eight years. That wants a single artefact carrying the letterhead, the
 * statutory identifiers, the parties, the lines with their HSN codes, the tax
 * split into the heads it is charged under, the total in words, and the terms.
 *
 * The layout is the one a customer's accounts department already knows, because
 * every ERP prints this shape and departure from it costs a phone call.
 *
 * ## The rule that governs every field
 *
 * Nothing here is invented and nothing is labelled-but-blank. A value that is
 * not held is not printed: a deployment with no GSTIN has no GSTIN line rather
 * than an empty one, a line with no HSN code shows a dash rather than a code
 * this application chose, and the tax is shown as a single "GST" line rather
 * than split into CGST and SGST when we cannot tell which applies. An invented
 * tax classification on a document a customer claims credit against is a far
 * worse failure than a gap.
 */

export type QuotationParty = {
  name: string;
  addressLines: string[];
  gstin: string | null;
  pan: string | null;
  contactName: string | null;
  phone: string | null;
  email: string | null;
  state: string | null;
};

export type QuotationLine = {
  productName: string;
  description: string | null;
  brandName: string | null;
  sku: string;
  hsnCode: string | null;
  quantity: number;
  unitLabel: string | null;
  unitPriceMinor: number;
  discountMinor: number;
  gstRatePercent: number;
  /** Taxable value: quantity × unit price, less the discount. */
  lineTotalMinor: number;
};

export type QuotationPdfInput = {
  reference: string;
  /** The enquiry or RFQ this answers, where there is one. */
  referenceNo: string | null;
  version: number;
  currency: string;
  subtotalMinor: number;
  discountMinor: number;
  taxMinor: number;
  totalMinor: number;
  validUntil: Date | null;
  issuedAt: Date;
  notes: string | null;
  status: string;
  paymentTerms: string | null;
  salesExecutive: string | null;
  /** Who it is addressed to, who is billed, and where it goes. */
  quotedTo: QuotationParty;
  billing: QuotationParty;
  shipping: QuotationParty | null;
  lines: QuotationLine[];
  config: SiteConfig;
  /** Exactly as printed, e.g. "ISO 9001:2015 - Quality Management System". */
  certifications: string[];
  /**
   * The company's own logo, decoded. Null falls back to the drawn mark.
   *
   * Passed in rather than read here, so this module never touches a
   * filesystem and stays renderable from a test.
   */
  logo: EmbeddedImage | null;
  /**
   * Partner programme badges, as the publishers issued them.
   *
   * Only designations that may currently be stated reach this list — the
   * gating is `lib/brand-partner`, applied where the data is fetched. A badge
   * on a quotation is a claim about a relationship made to a procurement
   * office, and it is exactly the claim that gets checked.
   */
  accreditations: Array<{ name: string; label: string; image: EmbeddedImage }>;
  /**
   * Brands whose products this business supplies.
   *
   * Deliberately separate from the accreditations above, and captioned as
   * supply rather than partnership. Reselling a publisher's products and being
   * accredited by that publisher are different facts, and a strip of logos
   * under a heading that blurred them would be the site making a claim nobody
   * authorised.
   *
   * Split in two because most brand artwork on this site is SVG, which a PDF
   * cannot hold: the ones with printable artwork are shown, and the rest are
   * named.
   */
  brandLogos: Array<{ name: string; image: EmbeddedImage }>;
  otherBrands: string[];
  /** From `lib/banking-config`. All of it or none of it. */
  banking: {
    bankName: string;
    accountName: string;
    accountNumber: string;
    ifsc: string;
    branch: string;
  } | null;
  /** Written at /admin/settings. Nothing is printed when it is unset. */
  terms: string | null;
};

// ---------------------------------------------------------------------------
// Geometry
// ---------------------------------------------------------------------------

const MARGIN = 38;
const CONTENT = 595.28 - MARGIN * 2;
const RIGHT = MARGIN + CONTENT;

/** The letterhead's three columns: mark, issuer, document meta. */
const LOGO_WIDTH = 128;
const ISSUER_X = MARGIN + LOGO_WIDTH + 12;
const META_LABEL_X = MARGIN + 336;

/** Where the page stops and a new one starts. */
const PAGE_BOTTOM = 792;
const FOOTER_RULE = 806;

/**
 * The line-item columns, as widths that sum to the content width.
 *
 * Thirteen columns on A4 portrait is tight, and the widths are apportioned by
 * what each one has to hold rather than evenly: a part number and an HSN code
 * are fixed-length and narrow, a product name and its description are neither.
 */
const COLUMNS = [
  { key: "sno", label: "S.No.", width: 24, align: "centre" },
  { key: "product", label: "Product Description", width: 80, align: "left" },
  { key: "description", label: "Description", width: 58, align: "left" },
  { key: "brand", label: "Brand", width: 40, align: "left" },
  { key: "sku", label: "SKU / Part No.", width: 54, align: "left" },
  { key: "hsn", label: "HSN", width: 32, align: "centre" },
  { key: "qty", label: "Qty", width: 20, align: "right" },
  { key: "unit", label: "Unit", width: 30, align: "left" },
  { key: "price", label: "Unit Price", width: 45, align: "right" },
  { key: "disc", label: "Disc. (%)", width: 22, align: "right" },
  { key: "tax", label: "Tax %", width: 19, align: "right" },
  { key: "gst", label: "GST Amount", width: 46, align: "right" },
  // The last column takes whatever is left, so the table's right edge lands
  // exactly on the margin however the others are re-apportioned.
  { key: "total", label: "Total", width: 0, align: "right" },
] as const;

type ColumnKey = (typeof COLUMNS)[number]["key"];

/** Left edge of each column, accumulated once. */
const COLUMN_X: Record<ColumnKey, { left: number; right: number; width: number }> = (() => {
  const map = {} as Record<ColumnKey, { left: number; right: number; width: number }>;
  const fixed = COLUMNS.slice(0, -1).reduce((sum, column) => sum + column.width, 0);

  let x = MARGIN;
  for (const [index, column] of COLUMNS.entries()) {
    const width = index === COLUMNS.length - 1 ? CONTENT - fixed : column.width;
    map[column.key] = { left: x, right: x + width, width };
    x += width;
  }
  return map;
})();

const CELL_PAD = 3;
const BODY_SIZE = 6.8;
const LABEL_SIZE = 6.2;

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

function clean(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

/** The issuer's address, in postal order, skipping what is not configured. */
function issuerAddress(config: SiteConfig): string[] {
  return [
    config.address.line1,
    config.address.line2,
    [
      [config.address.city, config.address.state].filter(Boolean).join(", "),
      config.address.postcode,
    ]
      .filter(Boolean)
      .join(" "),
    config.address.country,
  ].filter((line): line is string => Boolean(clean(line)));
}

function termLines(terms: string | null): string[] {
  if (!terms) return [];
  return terms
    .split("\n")
    .map((line) => line.replace(/^\s*[-*•]\s*/, "").trim())
    .filter(Boolean)
    .slice(0, 40);
}

/** The discount as the percentage it was set as, for the column that shows one. */
function discountPercent(line: QuotationLine): number {
  const gross = line.unitPriceMinor * line.quantity;
  if (gross <= 0 || line.discountMinor <= 0) return 0;
  return (line.discountMinor / gross) * 100;
}

function lineTax(line: QuotationLine): number {
  return Math.round((line.lineTotalMinor * line.gstRatePercent) / 100);
}

// ---------------------------------------------------------------------------
// The document
// ---------------------------------------------------------------------------

export function renderQuotationPdf(input: QuotationPdfInput): Buffer {
  const pdf = new PdfDocument();
  const { config } = input;

  const supplierGstin = clean(config.gstin);
  const treatment = taxTreatment(supplierGstin, input.billing.gstin);

  let y = drawLetterheadBlock(pdf, input);
  y = drawStatutoryStrip(pdf, config, y);
  y = drawParties(pdf, input, y);
  y = drawSalutation(pdf, input, y);
  y = drawLineItems(pdf, input, y);
  y = drawTotals(pdf, input, treatment, y);
  y = drawTaxSummary(pdf, input, treatment, y);
  drawClosing(pdf, input, y);

  drawFooters(pdf, input);

  return pdf.build();
}

// ----------------------------------------------------------- the letterhead

function drawLetterheadBlock(pdf: PdfDocument, input: QuotationPdfInput): number {
  const { config } = input;
  const top = 40;

  /*
   * The company's own artwork where it exists, and the drawn mark where it
   * does not.
   *
   * A real logo file is always the better answer — it is the artwork the
   * business actually uses, on letterheads a customer has seen before. The
   * drawn mark is the fallback that keeps a document from having a blank
   * corner on a deployment where nobody has supplied one.
   */
  const artwork = input.logo;
  if (artwork) {
    pdf.image(artwork, MARGIN, top, LOGO_WIDTH, 44);
  } else {
    drawMark(pdf, MARGIN, top, 38);
  }

  let logoY = top + (artwork ? 56 : 50);
  if (config.tagline) {
    for (const line of wrap(config.tagline, LOGO_WIDTH, 7, "italic")) {
      pdf.text(line, MARGIN, logoY, { size: 7, font: "italic", colour: MUTED });
      logoY += 9;
    }
  }

  // ── who is issuing it ───────────────────────────────────────────────────
  const issuerWidth = META_LABEL_X - ISSUER_X - 14;
  let issuerY = top + 10;

  /*
   * The registered name, wrapped rather than cut.
   *
   * "TechZoid Technologies Private Li..." is not a company. A legal name is the
   * one string on a commercial document that must appear in full, so it takes
   * a second line and, if it needs it, a smaller size — never an ellipsis.
   */
  const nameSize = textWidth(config.entityName, 10.5, "sansBold") > issuerWidth * 2 ? 9 : 10.5;
  for (const line of wrap(config.entityName, issuerWidth, nameSize, "sansBold")) {
    pdf.text(line, ISSUER_X, issuerY, { size: nameSize, font: "sansBold", colour: INK });
    issuerY += nameSize + 1.5;
  }
  issuerY += 2;

  const issuerDetail = [
    ...issuerAddress(config),
    config.phone.sales,
    config.email.sales,
    config.url.replace(/^https?:\/\//, ""),
  ].filter((line): line is string => Boolean(clean(line)));

  for (const line of issuerDetail) {
    for (const wrapped of wrap(line, issuerWidth, 7.2)) {
      pdf.text(wrapped, ISSUER_X, issuerY, { size: 7.2, colour: MUTED });
      issuerY += 8.6;
    }
  }

  /*
   * The certifications, exactly as they are held.
   *
   * Printed from the records that carry a certificate number and an issuing
   * body, never as a bare claim. "ISO 27001 certified" with nothing behind it
   * is the sort of line this whole application exists not to print.
   */
  if (input.certifications.length > 0) {
    issuerY += 5;
    for (const certification of input.certifications.slice(0, 4)) {
      for (const wrapped of wrap(`- ${certification}`, issuerWidth, 6.4)) {
        pdf.text(wrapped, ISSUER_X, issuerY, { size: 6.4, colour: FAINT });
        issuerY += 7.6;
      }
    }
  }

  // ── what the document is ────────────────────────────────────────────────
  pdf.textRight("QUOTATION", RIGHT, top + 16, { size: 20, font: "sansBold", colour: ACCENT });

  const meta: Array<[string, string | null]> = [
    ["Quotation No.", input.reference],
    ["Reference No.", input.referenceNo],
    ["Revision No.", input.version > 1 ? String(input.version) : null],
    ["Date", pdfDate(input.issuedAt)],
    ["Valid Till", input.validUntil ? pdfDate(input.validUntil) : null],
    ["Sales Executive", input.salesExecutive],
    ["Payment Terms", input.paymentTerms],
    ["Currency", input.currency],
  ];

  let metaY = top + 36;
  const valueWidth = RIGHT - META_LABEL_X - 76;

  for (const [label, value] of meta) {
    if (!clean(value)) continue;

    pdf.text(label, META_LABEL_X, metaY, { size: 7, colour: MUTED });

    // Long terms wrap under themselves rather than running into the label.
    const lines = wrap(value!, valueWidth + 70, 7.2, "sansBold");
    for (const line of lines) {
      pdf.textRight(line, RIGHT, metaY, { size: 7.2, font: "sansBold", colour: INK });
      metaY += 9.5;
    }
    if (lines.length === 0) metaY += 9.5;
  }

  return Math.max(logoY, issuerY, metaY) + 10;
}

// ------------------------------------------------------ statutory identity

/**
 * CIN, GSTIN and PAN, between two rules.
 *
 * Set in a monospaced face because these are read character by character and
 * checked against another copy — a proportional capital I beside a 1 is a
 * genuine hazard on a document somebody is reconciling.
 *
 * The PAN is read out of the GSTIN rather than stored twice. It is literally
 * the middle ten characters, so there is nothing to keep in step and no second
 * field to get wrong.
 */
function drawStatutoryStrip(pdf: PdfDocument, config: SiteConfig, top: number): number {
  const parts = [
    config.cin ? `CIN: ${config.cin}` : null,
    config.gstin ? `GSTIN: ${config.gstin}` : null,
    panFromGstin(config.gstin) ? `PAN: ${panFromGstin(config.gstin)}` : null,
  ].filter((part): part is string => Boolean(part));

  if (parts.length === 0) return top;

  pdf.line(MARGIN, top, RIGHT, top, RULE, 0.8);
  pdf.text(fit(parts.join("   |   "), CONTENT, 7.2, "mono"), MARGIN, top + 12, {
    size: 7.2,
    font: "mono",
    colour: BLACK,
  });
  pdf.line(MARGIN, top + 17, RIGHT, top + 17, RULE, 0.8);

  return top + 30;
}

// -------------------------------------------------------------- the parties

function drawParties(pdf: PdfDocument, input: QuotationPdfInput, top: number): number {
  /*
   * Three panels, or two.
   *
   * The shipping panel appears only when the delivery address genuinely differs
   * from the billing one. A third identical column is not thoroughness, it is
   * noise, and it makes the one case that matters — goods going somewhere else
   * — harder to spot rather than easier.
   */
  const panels: Array<[string, QuotationParty]> = [
    ["Quoted to (Bill to)", input.quotedTo],
    ["Billing address", input.billing],
  ];
  if (input.shipping) panels.push(["Shipping address (if different)", input.shipping]);

  const gap = 8;
  const width = (CONTENT - gap * (panels.length - 1)) / panels.length;

  const heights = panels.map(([, party]) => partyHeight(party, width));
  const height = Math.max(...heights, 96);

  panels.forEach(([title, party], index) => {
    const x = MARGIN + index * (width + gap);
    pdf.rect(x, top, width, height, WHITE);
    pdf.strokeRect(x, top, width, height, RULE, 0.7);
    drawParty(pdf, x, top, width, title, party);
  });

  return top + height + 18;
}

/** The label/value rows a party panel carries, in the order they are read. */
function partyRows(party: QuotationParty): Array<[string, string]> {
  return (
    [
      ["GSTIN", party.gstin],
      ["PAN", party.pan ?? panFromGstin(party.gstin)],
      ["Contact", party.contactName],
      ["Mobile", party.phone],
      ["Email", party.email],
      ["State", party.state],
      ["Place of Supply", placeOfSupply(party.gstin)],
    ] as Array<[string, string | null]>
  ).filter((row): row is [string, string] => Boolean(clean(row[1])));
}

function partyHeight(party: QuotationParty, width: number): number {
  const inner = width - 16;
  const addressLines = party.addressLines.flatMap((line) => wrap(line, inner, 7));
  return 14 + 14 + addressLines.length * 8.4 + 4 + partyRows(party).length * 9.6 + 10;
}

function drawParty(
  pdf: PdfDocument,
  x: number,
  top: number,
  width: number,
  title: string,
  party: QuotationParty,
): void {
  const inner = width - 16;
  let y = top + 13;

  pdf.text(title.toUpperCase(), x + 8, y, {
    size: LABEL_SIZE,
    font: "sansBold",
    colour: MUTED,
    tracking: 0.35,
  });
  y += 14;

  pdf.text(fit(party.name, inner, 9.5, "sansBold"), x + 8, y, {
    size: 9.5,
    font: "sansBold",
    colour: INK,
  });
  y += 12;

  for (const line of party.addressLines.flatMap((entry) => wrap(entry, inner, 7))) {
    pdf.text(line, x + 8, y, { size: 7, colour: MUTED });
    y += 8.4;
  }

  y += 4;

  const labelWidth = 46;
  for (const [label, value] of partyRows(party)) {
    pdf.text(label, x + 8, y, { size: 6.6, colour: MUTED });
    pdf.text(":", x + 8 + labelWidth, y, { size: 6.6, colour: MUTED });
    pdf.text(fit(value, inner - labelWidth - 8, 7, "sansBold"), x + 8 + labelWidth + 6, y, {
      size: 7,
      font: "sansBold",
      colour: BLACK,
    });
    y += 9.6;
  }
}

// ------------------------------------------------------------- salutation

function drawSalutation(pdf: PdfDocument, input: QuotationPdfInput, top: number): number {
  let y = top;

  pdf.text("Dear Sir / Madam,", MARGIN, y, { size: 8.5, colour: BLACK });
  y += 13;

  /*
   * The covering sentence is whatever was written on the quotation, or a
   * neutral one. The fallback says only what is certainly true of every
   * quotation this system produces — it makes no claim about discounts,
   * relationships or terms that somebody would have to honour.
   */
  const intro =
    clean(input.notes) ??
    "Thank you for your enquiry. We are pleased to submit our offer for the requirement discussed. Please see the items and commercial terms set out below.";

  for (const line of wrap(intro, CONTENT, 8, "sans")) {
    pdf.text(line, MARGIN, y, { size: 8, colour: BLACK });
    y += 10.5;
  }

  return y + 12;
}

// ------------------------------------------------------------- line items

function drawTableHeader(pdf: PdfDocument, top: number): number {
  const height = 22;
  pdf.rect(MARGIN, top, CONTENT, height, PANEL);
  pdf.strokeRect(MARGIN, top, CONTENT, height, RULE, 0.7);

  for (const column of COLUMNS) {
    const box = COLUMN_X[column.key];

    /*
     * The money headings carry the currency, so the cells beneath them do not
     * have to. Thirteen columns on A4 cannot spare "INR " on every figure, and
     * stating the unit once at the top of a column is how a ledger does it.
     */
    const label = ["price", "gst", "total"].includes(column.key)
      ? `${column.label} (INR)`
      : column.label;

    const lines = wrap(label, box.width - CELL_PAD * 2, LABEL_SIZE, "sansBold").slice(0, 2);
    let y = top + (lines.length > 1 ? 9 : 13);

    for (const line of lines) {
      if (column.align === "right") {
        pdf.textRight(line, box.right - CELL_PAD, y, {
          size: LABEL_SIZE,
          font: "sansBold",
          colour: MUTED,
        });
      } else if (column.align === "centre") {
        pdf.textCentre(line, box.left + box.width / 2, y, {
          size: LABEL_SIZE,
          font: "sansBold",
          colour: MUTED,
        });
      } else {
        pdf.text(line, box.left + CELL_PAD, y, {
          size: LABEL_SIZE,
          font: "sansBold",
          colour: MUTED,
        });
      }
      y += 7.4;
    }

  }

  return top + height;
}

function drawLineItems(pdf: PdfDocument, input: QuotationPdfInput, top: number): number {
  let y = drawTableHeader(pdf, top);
  let segmentTop = y;

  input.lines.forEach((line, index) => {
    const product = wrap(line.productName, COLUMN_X.product.width - CELL_PAD * 2, BODY_SIZE, "sansBold");
    const description = line.description
      ? wrap(line.description, COLUMN_X.description.width - CELL_PAD * 2, BODY_SIZE)
      : [];
    const brand = line.brandName
      ? wrap(line.brandName, COLUMN_X.brand.width - CELL_PAD * 2, BODY_SIZE)
      : [];
    /*
     * The part number wraps rather than being cut.
     *
     * It is the string a customer pastes into a publisher's portal or a tender
     * response. Truncating it produces something that looks like a part number
     * and is not one, which is worse than taking a second line.
     */
    const sku = wrap(line.sku, COLUMN_X.sku.width - CELL_PAD * 2, BODY_SIZE, "mono");

    const rows = Math.max(product.length, description.length, brand.length, sku.length, 1);
    const height = Math.max(20, rows * 8.4 + 10);

    /*
     * A page break before a row, never through one. A line item split across
     * two pages reads as two line items, and on a document somebody prices a
     * purchase order from, that is the expensive kind of confusion.
     */
    if (y + height > PAGE_BOTTOM) {
      closeTable(pdf, segmentTop, y);
      pdf.addPage();
      y = drawTableHeader(pdf, 48);
      segmentTop = y;
    }

    if (index % 2 === 1) pdf.rect(MARGIN, y, CONTENT, height, ZEBRA);

    const cell = (
      key: ColumnKey,
      value: string,
      options: { bold?: boolean; font?: "mono"; row?: number; colour?: typeof BLACK } = {},
    ) => {
      const box = COLUMN_X[key];
      const column = COLUMNS.find((entry) => entry.key === key)!;
      const lineY = y + 13 + (options.row ?? 0) * 8.4;
      const style = {
        size: BODY_SIZE,
        font: options.font ?? (options.bold ? ("sansBold" as const) : ("sans" as const)),
        colour: options.colour ?? BLACK,
      };

      if (column.align === "right") pdf.textRight(value, box.right - CELL_PAD, lineY, style);
      else if (column.align === "centre") pdf.textCentre(value, box.left + box.width / 2, lineY, style);
      else pdf.text(value, box.left + CELL_PAD, lineY, style);
    };

    cell("sno", String(index + 1));
    product.forEach((text, row) => cell("product", text, { bold: true, row }));
    description.forEach((text, row) => cell("description", text, { row, colour: MUTED }));
    brand.forEach((text, row) => cell("brand", text, { row }));
    sku.forEach((text, row) => cell("sku", text, { font: "mono", row }));
    // A dash, not a blank and never a guess: an HSN code this application chose
    // would be a tax classification the business never made.
    cell("hsn", line.hsnCode ? fit(line.hsnCode, COLUMN_X.hsn.width - 4, BODY_SIZE, "mono") : "—", {
      font: line.hsnCode ? "mono" : undefined,
      colour: line.hsnCode ? BLACK : FAINT,
    });
    cell("qty", String(line.quantity));
    cell("unit", fit(line.unitLabel ?? "", COLUMN_X.unit.width - CELL_PAD * 2, BODY_SIZE));
    cell("price", pdfAmount(line.unitPriceMinor, input.currency));

    const percent = discountPercent(line);
    cell("disc", percent > 0 ? percent.toFixed(2) : "0.00", { colour: percent > 0 ? BLACK : FAINT });
    cell("tax", `${line.gstRatePercent}%`);
    cell("gst", pdfAmount(lineTax(line), input.currency));
    cell("total", pdfAmount(line.lineTotalMinor + lineTax(line), input.currency), { bold: true });

    y += height;
    pdf.line(MARGIN, y, RIGHT, y, HAIRLINE, 0.5);
  });

  closeTable(pdf, segmentTop, y);
  return y + 16;
}

/**
 * The column rules and the outer box, drawn once the table's height is known.
 *
 * Deferred rather than drawn per row because the rules have to run unbroken
 * from the header to the last row on the page, and how far that is depends on
 * how many rows fitted — which is not known until they have.
 */
function closeTable(pdf: PdfDocument, top: number, bottom: number): void {
  for (const column of COLUMNS) {
    const box = COLUMN_X[column.key];
    if (box.left > MARGIN) pdf.line(box.left, top, box.left, bottom, RULE, 0.5);
  }

  pdf.line(MARGIN, top, MARGIN, bottom, RULE, 0.7);
  pdf.line(RIGHT, top, RIGHT, bottom, RULE, 0.7);
  pdf.line(MARGIN, bottom, RIGHT, bottom, RULE, 0.8);
}

// ---------------------------------------------------------------- totals

function drawTotals(
  pdf: PdfDocument,
  input: QuotationPdfInput,
  treatment: TaxTreatment,
  top: number,
): number {
  const boxWidth = 236;
  const boxLeft = RIGHT - boxWidth;

  const gross = input.subtotalMinor + input.discountMinor;

  const rows: Array<[string, string, boolean]> = [
    ["Gross value", pdfAmount(gross, input.currency), false],
  ];
  if (input.discountMinor > 0) {
    rows.push(["Less discount", `- ${pdfAmount(input.discountMinor, input.currency)}`, false]);
  }
  rows.push(["Taxable value", pdfAmount(input.subtotalMinor, input.currency), false]);

  /*
   * The tax split into the heads it is actually charged under.
   *
   * One rate is the common case and is shown as one pair of lines; a quotation
   * mixing 18% licences with 5% hardware shows each rate separately, because
   * that is what the customer's accounts department has to post.
   */
  for (const [rate, amount] of taxByRate(input.lines)) {
    for (const head of taxHeads(amount, rate, treatment)) {
      rows.push([
        `${head.label} @ ${formatRate(head.ratePercent)}%`,
        pdfAmount(head.amountMinor, input.currency),
        false,
      ]);
    }
  }

  // The rules stack, then the grand-total band sits flush on the bottom of the
  // box. Computed rather than guessed, so an extra tax rate does not leave a
  // gap under the total.
  const listHeight = 8 + rows.length * 12 + 4;
  const bandHeight = 24;
  const height = listHeight + bandHeight;

  let y = top;
  if (y + height > PAGE_BOTTOM) {
    pdf.addPage();
    y = 48;
  }

  // The words go on the left, level with the figures they spell out.
  const wordsWidth = boxLeft - MARGIN - 16;
  pdf.text("Amount in words", MARGIN, y + 12, {
    size: LABEL_SIZE,
    font: "sansBold",
    colour: MUTED,
    tracking: 0.35,
  });

  let wordsY = y + 24;
  for (const line of wrap(amountInWords(input.totalMinor, input.currency), wordsWidth, 8, "sansBold")) {
    pdf.text(line, MARGIN, wordsY, { size: 8, font: "sansBold", colour: INK });
    wordsY += 10.5;
  }

  pdf.strokeRect(boxLeft, y, boxWidth, height, RULE, 0.7);

  let rowY = y + 16;
  for (const [label, value] of rows) {
    pdf.text(label, boxLeft + 10, rowY, { size: 7.4, colour: MUTED });
    pdf.textRight(value, RIGHT - 10, rowY, { size: 7.4, colour: BLACK });
    rowY += 12;
  }

  const bandTop = y + listHeight;
  pdf.rect(boxLeft, bandTop, boxWidth, bandHeight, PANEL);
  pdf.strokeRect(boxLeft, bandTop, boxWidth, bandHeight, RULE, 0.7);
  pdf.text("Grand Total", boxLeft + 10, bandTop + 16, { size: 9, font: "sansBold", colour: INK });
  pdf.textRight(pdfMoney(input.totalMinor, input.currency), RIGHT - 10, bandTop + 16, {
    size: 9,
    font: "sansBold",
    colour: INK,
  });

  return Math.max(wordsY, y + height) + 20;
}

/** Taxable value grouped by GST rate, so each rate gets its own tax line. */
function taxByRate(lines: QuotationLine[]): Array<[number, number]> {
  const byRate = new Map<number, number>();
  for (const line of lines) {
    byRate.set(line.gstRatePercent, (byRate.get(line.gstRatePercent) ?? 0) + lineTax(line));
  }
  return [...byRate.entries()].sort((a, b) => a[0] - b[0]);
}

function formatRate(rate: number): string {
  return Number.isInteger(rate) ? String(rate) : rate.toFixed(1);
}

// ------------------------------------------------------------ tax summary

/**
 * The HSN-wise summary every Indian tax document carries.
 *
 * Printed only when the codes are actually on file. A summary table with a
 * column of dashes tells the customer's accounts department nothing they can
 * post against, and printing one would imply a classification we have not made.
 */
function drawTaxSummary(
  pdf: PdfDocument,
  input: QuotationPdfInput,
  treatment: TaxTreatment,
  top: number,
): number {
  const withCodes = input.lines.filter((line) => clean(line.hsnCode));
  if (withCodes.length === 0) return top;

  type Group = { taxable: number; tax: number; rate: number };
  const groups = new Map<string, Group>();

  for (const line of withCodes) {
    const key = `${line.hsnCode!.trim()}|${line.gstRatePercent}`;
    const existing = groups.get(key);
    if (existing) {
      existing.taxable += line.lineTotalMinor;
      existing.tax += lineTax(line);
    } else {
      groups.set(key, {
        taxable: line.lineTotalMinor,
        tax: lineTax(line),
        rate: line.gstRatePercent,
      });
    }
  }

  const rows = [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  const height = 20 + rows.length * 13 + 6;

  let y = top;
  if (y + height > PAGE_BOTTOM) {
    pdf.addPage();
    y = 48;
  }

  pdf.text("HSN / SAC SUMMARY", MARGIN, y, {
    size: LABEL_SIZE,
    font: "sansBold",
    colour: MUTED,
    tracking: 0.35,
  });
  y += 10;

  /*
   * Laid out from the right, so the money columns line up with the ones in the
   * table above them however many tax heads there are.
   */
  const heads = treatment === "intra_state" ? ["CGST", "SGST"] : ["IGST"];
  const headWidth = 84;
  const totalX = RIGHT;
  const headXs = heads.map((_, index) => totalX - headWidth * (heads.length - index));
  // Each gap is wide enough for the widest thing that ends at it: a rate is
  // three or four characters, a taxable value can be a crore.
  const rateX = headXs[0]! - 34;
  const taxableX = rateX - 44;

  const columns: Array<{ label: string; x: number; align: "left" | "right" }> = [
    { label: "HSN / SAC", x: MARGIN, align: "left" },
    { label: "Taxable value", x: taxableX, align: "right" },
    { label: "Rate", x: rateX, align: "right" },
    ...heads.map((head, index) => ({ label: head, x: headXs[index]!, align: "right" as const })),
    { label: "Total tax", x: totalX, align: "right" as const },
  ];

  pdf.rect(MARGIN, y, CONTENT, 15, PANEL);
  pdf.strokeRect(MARGIN, y, CONTENT, 15, RULE, 0.7);
  for (const column of columns) {
    const style = { size: LABEL_SIZE, font: "sansBold" as const, colour: MUTED };
    if (column.align === "right") pdf.textRight(column.label, column.x - 4, y + 10, style);
    else pdf.text(column.label, column.x + 4, y + 10, style);
  }
  y += 15;

  let taxableTotal = 0;
  let taxTotal = 0;

  for (const [key, group] of rows) {
    const code = key.split("|")[0]!;
    const split = taxHeads(group.tax, group.rate, treatment);
    taxableTotal += group.taxable;
    taxTotal += group.tax;

    pdf.text(code, MARGIN + 4, y + 9, { size: 6.8, font: "mono", colour: BLACK });
    pdf.textRight(pdfAmount(group.taxable, input.currency), taxableX - 4, y + 9, { size: 6.8 });
    pdf.textRight(`${group.rate}%`, rateX - 4, y + 9, { size: 6.8 });

    split.forEach((head, index) => {
      pdf.textRight(pdfAmount(head.amountMinor, input.currency), headXs[index]! - 4, y + 9, {
        size: 6.8,
      });
    });

    pdf.textRight(pdfAmount(group.tax, input.currency), totalX - 4, y + 9, {
      size: 6.8,
      font: "sansBold",
    });

    y += 13;
    pdf.line(MARGIN, y, RIGHT, y, HAIRLINE, 0.5);
  }

  /*
   * The summary adds up to itself.
   *
   * A tax table whose rows do not sum to a stated total is one the customer's
   * accounts department has to reconcile by hand, so the total is printed and
   * is the sum of the rows above it rather than a separately-derived figure.
   */
  if (rows.length > 1) {
    pdf.rect(MARGIN, y, CONTENT, 14, PANEL);
    pdf.text("Total", MARGIN + 4, y + 9.5, { size: 6.8, font: "sansBold", colour: INK });
    pdf.textRight(pdfAmount(taxableTotal, input.currency), taxableX - 4, y + 9.5, {
      size: 6.8,
      font: "sansBold",
    });
    pdf.textRight(pdfAmount(taxTotal, input.currency), totalX - 4, y + 9.5, {
      size: 6.8,
      font: "sansBold",
    });
    y += 14;
  }

  pdf.line(MARGIN, y, RIGHT, y, RULE, 0.8);
  return y + 20;
}

// -------------------------------------------------- terms, bank, signature

function drawClosing(pdf: PdfDocument, input: QuotationPdfInput, top: number): number {
  let y = top;

  const heading = (label: string) => {
    pdf.text(label.toUpperCase(), MARGIN, y, {
      size: LABEL_SIZE,
      font: "sansBold",
      colour: MUTED,
      tracking: 0.35,
    });
    y += 12;
  };

  const room = (needed: number) => {
    if (y + needed > PAGE_BOTTOM) {
      pdf.addPage();
      y = 48;
    }
  };

  const terms = termLines(input.terms);
  if (terms.length > 0) {
    room(40);
    heading("Terms and conditions");
    let index = 1;
    for (const term of terms) {
      const lines = wrap(`${index}.  ${term}`, CONTENT - 10, 7.4);
      room(lines.length * 9.4 + 6);
      for (const line of lines) {
        pdf.text(line, MARGIN, y, { size: 7.4, colour: BLACK });
        y += 9.4;
      }
      index += 1;
    }
    y += 10;
  }

  /*
   * Bank details, when they are configured — all of them or none.
   *
   * A quotation is where a customer's finance team sets up a payee, and half a
   * set of bank details (an account number with no IFSC) is worse than none:
   * they cannot pay from it and somebody has to ring for the rest.
   */
  if (input.banking) {
    room(70);
    heading("Bank details");

    const rows: Array<[string, string]> = [
      ["Account name", input.banking.accountName],
      ["Bank", `${input.banking.bankName}, ${input.banking.branch}`],
      ["Account number", input.banking.accountNumber],
      ["IFSC", input.banking.ifsc],
    ];

    for (const [label, value] of rows) {
      pdf.text(label, MARGIN, y, { size: 7.2, colour: MUTED });
      pdf.text(value, MARGIN + 84, y, { size: 7.2, font: "mono", colour: BLACK });
      y += 10;
    }
    y += 10;
  }

  /*
   * Accreditations, then brands, in that order and never merged.
   *
   * The order is the argument: a badge is a publisher's statement about this
   * business, a logo strip is this business's statement about its catalogue,
   * and a reader who sees them as one band has been told something nobody
   * said. The caption under the brands says so in words as well.
   */
  if (input.accreditations.length > 0) {
    room(64);
    heading("Partner and reseller accreditations");

    let x = MARGIN;
    const badgeHeight = 26;

    for (const accreditation of input.accreditations) {
      const width = (accreditation.image.width / accreditation.image.height) * badgeHeight;

      if (x + width > RIGHT) {
        x = MARGIN;
        y += badgeHeight + 8;
        room(badgeHeight + 20);
      }

      pdf.image(accreditation.image, x, y, width, badgeHeight);
      x += width + 14;
    }

    y += badgeHeight + 10;

    pdf.text(
      input.accreditations
        .map((accreditation) => `${accreditation.name} ${accreditation.label}`)
        .join("   ·   "),
      MARGIN,
      y,
      { size: 6.8, colour: MUTED },
    );
    y += 18;
  }

  if (input.brandLogos.length > 0 || input.otherBrands.length > 0) {
    room(60);
    heading("Brands we supply");

    let x = MARGIN;
    const logoHeight = 20;

    for (const brand of input.brandLogos) {
      const width = Math.min(72, (brand.image.width / brand.image.height) * logoHeight);

      if (x + width > RIGHT) {
        x = MARGIN;
        y += logoHeight + 8;
        room(logoHeight + 20);
      }

      pdf.image(brand.image, x, y, width, logoHeight);
      x += width + 16;
    }

    if (input.brandLogos.length > 0) y += logoHeight + 10;

    if (input.otherBrands.length > 0) {
      for (const line of wrap(input.otherBrands.join(" · "), CONTENT, 7)) {
        room(12);
        pdf.text(line, MARGIN, y, { size: 7, colour: MUTED });
        y += 9.5;
      }
      y += 2;
    }

    /*
     * The sentence that keeps the strip honest.
     *
     * Without it a page carrying a customer's name, our accreditations and
     * thirty publishers' logos reads as thirty partnerships. This says plainly
     * which of the two things above it is a partnership and which is a
     * catalogue.
     */
    room(20);
    pdf.text(
      "We supply the products of the brands shown above. Partner and reseller designations are stated only where a badge is shown for them.",
      MARGIN,
      y,
      { size: 6.5, colour: FAINT },
    );
    y += 18;
  }

  // ── the signature block ─────────────────────────────────────────────────
  room(70);

  pdf.text(`For ${input.config.entityName}`, RIGHT - 190, y + 4, {
    size: 8,
    font: "sansBold",
    colour: INK,
  });

  pdf.line(RIGHT - 190, y + 46, RIGHT - 40, y + 46, RULE, 0.7);
  pdf.text("Authorised signatory", RIGHT - 190, y + 56, { size: 7, colour: MUTED });

  pdf.text(
    "This is a quotation, not an invoice. No tax is payable on it and no goods or services are supplied against it.",
    MARGIN,
    y + 56,
    { size: 6.8, colour: FAINT },
  );

  return y + 70;
}

// ---------------------------------------------------------------- footers

function drawFooters(pdf: PdfDocument, input: QuotationPdfInput): void {
  const pageCount = pdf.pageCount;

  // Drawn last, and explicitly onto each page: "page 2 of 3" cannot be written
  // until the third page exists.
  for (let page = 0; page < pageCount; page += 1) {
    pdf.onPage(page, () => {
      pdf.line(MARGIN, FOOTER_RULE, RIGHT, FOOTER_RULE, HAIRLINE, 0.5);

      pdf.text(input.config.entityName, MARGIN, FOOTER_RULE + 11, { size: 6.8, colour: FAINT });

      const right = `${input.reference}   ·   Page ${page + 1} of ${pageCount}`;
      pdf.textRight(right, RIGHT, FOOTER_RULE + 11, { size: 6.8, colour: FAINT });
    });
  }
}

/** Exported for the tests, which check the widths add up to the page. */
export const TABLE_COLUMNS = COLUMNS;
export const TABLE_WIDTH = CONTENT;
export const COLUMN_EDGES = COLUMN_X;
