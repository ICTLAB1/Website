import type { SiteConfig } from "@/lib/site-config";
import { amountInWords, pdfAmount, pdfDate, pdfMoney } from "@/lib/pdf/money";
import { drawMark } from "@/lib/pdf/letterhead";
import type { EmbeddedImage } from "@/lib/pdf/image";
import { panFromGstin, placeOfSupply, taxHeads, taxTreatment, type TaxTreatment } from "@/lib/gstin";
import {
  BLACK,
  FAINT,
  HAIRLINE,
  PANEL,
  PdfDocument,
  WHITE,
  ZEBRA,
  fit,
  textWidth,
  wrap,
  type Colour,
} from "@/lib/pdf/writer";

/**
 * The document's own palette, from the supplied design tokens.
 *
 * Local rather than taken from the writer's shared set, which is the site's
 * charcoal and gold. This document is not a web page: it is printed, filed and
 * read beside a customer's other suppliers' quotations, and the navy is the
 * register that company expects a commercial document in. The writer's palette
 * stays where it is for everything else that prints.
 *
 * `#0D2B55`, `#18202A`, `#64748B`, `#D7DCE2` — the four tokens the design pack
 * names, converted once here so no drawing call carries a literal.
 */
const NAVY: Colour = { r: 0.051, g: 0.169, b: 0.333 };
const TEXT_INK: Colour = { r: 0.094, g: 0.125, b: 0.165 };
const SOFT: Colour = { r: 0.392, g: 0.455, b: 0.545 };
const LINE_RULE: Colour = { r: 0.843, g: 0.863, b: 0.886 };
/** The tint behind a header strip, a shade off white so it reads as a band. */
const TINT: Colour = { r: 0.957, g: 0.965, b: 0.973 };


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
  /**
   * The number printed as "Quotation No.", from the configured series.
   *
   * Falls back to the internal reference when no series is configured, which
   * is the state a fresh deployment is in.
   */
  documentNo: string | null;
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
  /** What the customer calls this on their side: their PO or tender number. */
  customerReference: string | null;
  /** Free text, e.g. "4-6 weeks from order". Nothing prints when unset. */
  deliveryTerms: string | null;
  salesExecutive: string | null;
  /** Who it is addressed to, who is billed, and where it goes. */
  quotedTo: QuotationParty;
  billing: QuotationParty;
  shipping: QuotationParty | null;
  lines: QuotationLine[];
  config: SiteConfig;
  /**
   * The certifications this business holds, with their numbers.
   *
   * The number is the substantive part. "ISO 27001 certified" is a claim
   * anybody can type; a certificate number is one a buyer can put to the body
   * that issued it, and a procurement office reading a quotation is exactly the
   * reader who will.
   */
  certifications: Array<{
    standard: string;
    title: string;
    reference: string;
  }>;
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

  let y = drawHeader(pdf, input);
  y = drawDetails(pdf, input, y);
  y = drawCommercialStrip(pdf, input, y);
  y = drawLineItems(pdf, input, y);
  y = drawTotals(pdf, input, treatment, y);
  y = drawTaxSummary(pdf, input, treatment, y);
  drawClosing(pdf, input, y);

  drawFooters(pdf, input);

  return pdf.build();
}

// ----------------------------------------------------------- the letterhead

/**
 * The masthead: who is issuing this, and what it is.
 *
 * Left is identity — the artwork, the registered name, the strapline. Right is
 * the document — the word QUOTATION, its number in a filled chip, and the three
 * facts a purchasing officer checks before reading anything else: when it was
 * issued, how long it stands, and what currency it is in.
 *
 * The strapline is `config.tagline`, the line an administrator controls. The
 * design pack shows a different one in its mock, and its own README says the
 * reference "contains illustrative data. Never hard-code it." — so the line
 * that prints is the business's, not the mock's.
 */
function drawHeader(pdf: PdfDocument, input: QuotationPdfInput): number {
  const { config } = input;
  const top = 40;

  const artwork = input.logo;
  if (artwork) {
    pdf.image(artwork, MARGIN, top, LOGO_WIDTH, 34);
  } else {
    drawMark(pdf, MARGIN, top, 30);
  }

  let left = top + 44;
  pdf.text(fit(config.entityName.toUpperCase(), 300, 10.5, "sansBold"), MARGIN, left, {
    size: 10.5,
    font: "sansBold",
    colour: NAVY,
  });
  left += 13;

  if (config.tagline) {
    pdf.text(fit(config.tagline, 300, 7.6), MARGIN, left, { size: 7.6, colour: SOFT });
    left += 11;
  }

  // ── the document, right ─────────────────────────────────────────────────
  pdf.textRight("QUOTATION", RIGHT, top + 15, { size: 19, font: "sansBold", colour: NAVY });

  /*
   * The number in a filled chip rather than as another label/value row.
   *
   * It is the one string on the page that gets quoted back — in a purchase
   * order, in an email, over the telephone — so it is the one thing that should
   * be findable without reading. The chip is sized to its own text so a longer
   * series does not overflow a fixed box.
   */
  const number = input.documentNo ?? input.reference;
  const chipSize = 9;
  const chipWidth = Math.min(textWidth(number, chipSize, "sansBold") + 20, 220);
  const chipY = top + 22;
  pdf.rect(RIGHT - chipWidth, chipY, chipWidth, 17, NAVY);
  pdf.textCentre(number, RIGHT - chipWidth / 2, chipY + 12, {
    size: chipSize,
    font: "sansBold",
    colour: WHITE,
  });

  let metaY = chipY + 30;
  const meta: Array<[string, string | null]> = [
    ["Date", pdfDate(input.issuedAt)],
    ["Valid Until", input.validUntil ? pdfDate(input.validUntil) : null],
    /*
     * Only once there is a revision to distinguish. "Revision 1" on a first
     * issue answers a question nobody asked; "Revision 2" answers one somebody
     * is about to.
     */
    ["Revision", input.version > 1 ? String(input.version) : null],
    ["Currency", input.currency],
  ];

  for (const [label, value] of meta) {
    if (!clean(value)) continue;
    pdf.textRight(label, RIGHT - 96, metaY, { size: 7.4, colour: SOFT });
    pdf.text(":", RIGHT - 92, metaY, { size: 7.4, colour: SOFT });
    pdf.textRight(value!, RIGHT, metaY, { size: 7.8, font: "sansBold", colour: TEXT_INK });
    metaY += 11;
  }

  const bottom = Math.max(left, metaY) + 4;
  pdf.line(MARGIN, bottom, RIGHT, bottom, NAVY, 1.6);
  return bottom + 14;
}

// ------------------------------------------------------------- the details

/**
 * Three columns: what the document is, who is billed, where it goes.
 *
 * The first is a plain label/value list under a navy heading; the other two are
 * boxed with a filled header, because they are addresses and a box is what
 * stops an address running visually into the one beside it.
 *
 * The shipping column appears only when the delivery address genuinely differs
 * from the billing one. A third identical panel is not thoroughness, it is
 * noise, and it makes the case that matters — goods going somewhere else —
 * harder to spot rather than easier.
 */
function drawDetails(pdf: PdfDocument, input: QuotationPdfInput, top: number): number {
  /*
   * The first column is wider than the address panels beside it.
   *
   * It carries label-and-value pairs where the value is a document number that
   * must not be abbreviated — "TZ/QT/2026-27/00…" is not a quotation number,
   * and it is the string the customer quotes back. The addresses wrap; a
   * reference cannot.
   */
  const gap = 10;
  const parties: Array<[string, QuotationParty]> = [["BILL TO", input.billing]];
  if (input.shipping) parties.push(["SHIP TO", input.shipping]);

  const usable = CONTENT - gap * parties.length;
  const detailWidth = usable * 0.38;
  const width = (usable - detailWidth) / parties.length;

  const detail = (
    [
      ["Quotation No.", input.documentNo ?? input.reference],
      ["Quotation Date", pdfDate(input.issuedAt)],
      ["Valid Until", input.validUntil ? pdfDate(input.validUntil) : null],
      ["Sales Executive", input.salesExecutive],
      ["Enquiry Reference", input.referenceNo],
    ] as Array<[string, string | null]>
  ).filter((row): row is [string, string] => Boolean(clean(row[1])));

  const detailHeight = 18 + detail.length * 11 + 6;
  const height = Math.max(detailHeight, ...parties.map(([, party]) => partyPanelHeight(party, width)));

  // ── column one: the document's own facts ────────────────────────────────
  pdf.text("QUOTATION DETAILS", MARGIN, top + 10, {
    size: LABEL_SIZE,
    font: "sansBold",
    colour: NAVY,
    tracking: 0.4,
  });

  let y = top + 26;
  for (const [label, value] of detail) {
    pdf.text(label, MARGIN, y, { size: 7.4, colour: SOFT });
    pdf.text(":", MARGIN + 86, y, { size: 7.4, colour: SOFT });
    pdf.text(value, MARGIN + 94, y, { size: 7.6, font: "sansBold", colour: TEXT_INK });
    y += 11;
  }

  // ── columns two and three: the addresses ────────────────────────────────
  parties.forEach(([title, party], index) => {
    const x = MARGIN + detailWidth + gap + index * (width + gap);
    drawPartyPanel(pdf, x, top, width, height, title, party);
  });

  return top + height + 12;
}

/** The label/value rows a party panel carries, in the order they are read. */
function partyRows(party: QuotationParty): Array<[string, string]> {
  return (
    [
      ["GSTIN", party.gstin],
      ["Contact", party.contactName],
      ["Email", party.email],
      ["Phone", party.phone],
    ] as Array<[string, string | null]>
  ).filter((row): row is [string, string] => Boolean(clean(row[1])));
}

function partyPanelHeight(party: QuotationParty, width: number): number {
  const inner = width - 18;
  const addressLines = party.addressLines.flatMap((line) => wrap(line, inner, 7.4));
  const rowLines = partyRows(party).reduce(
    (sum, [, value]) => sum + wrap(value, inner - 54, 7.4, "sansBold").length,
    0,
  );
  return 18 + 14 + addressLines.length * 9 + 6 + rowLines * 10 + 10;
}

function drawPartyPanel(
  pdf: PdfDocument,
  x: number,
  top: number,
  width: number,
  height: number,
  title: string,
  party: QuotationParty,
): void {
  const inner = width - 18;

  pdf.rect(x, top, width, height, WHITE);
  pdf.strokeRect(x, top, width, height, LINE_RULE, 0.7);
  pdf.rect(x, top, width, 15, NAVY);
  pdf.text(title, x + 9, top + 10.5, {
    size: LABEL_SIZE,
    font: "sansBold",
    colour: WHITE,
    tracking: 0.4,
  });

  let y = top + 28;
  pdf.text(fit(party.name, inner, 9, "sansBold"), x + 9, y, {
    size: 9,
    font: "sansBold",
    colour: TEXT_INK,
  });
  y += 13;

  for (const line of party.addressLines.flatMap((entry) => wrap(entry, inner, 7.4))) {
    pdf.text(line, x + 9, y, { size: 7.4, colour: SOFT });
    y += 9;
  }

  y += 5;
  for (const [label, value] of partyRows(party)) {
    pdf.text(label, x + 9, y, { size: 7.2, colour: SOFT });
    pdf.text(":", x + 54, y, { size: 7.2, colour: SOFT });
    /*
     * Wrapped, not abbreviated. An email address with an ellipsis in it is not
     * an address anybody can write to, and a GSTIN missing its last characters
     * is worse than one that is absent.
     */
    for (const line of wrap(value, inner - 54, 7.4, "sansBold")) {
      pdf.text(line, x + 60, y, { size: 7.4, font: "sansBold", colour: TEXT_INK });
      y += 10;
    }
  }
}

// --------------------------------------------------------- the commercials

/**
 * The four commercial references, as equal cells across the width.
 *
 * Only the ones that are actually held: the cells share the width between
 * whichever survive, so a quotation with no customer purchase-order number
 * gets three wider cells rather than a labelled blank. A blank cell on a
 * commercial document reads as an omission somebody has to chase.
 */
function drawCommercialStrip(pdf: PdfDocument, input: QuotationPdfInput, top: number): number {
  const cells: Array<[string, string]> = (
    [
      ["CUSTOMER REFERENCE", input.customerReference],
      ["ENQUIRY REFERENCE", input.referenceNo],
      ["PAYMENT TERMS", input.paymentTerms],
      ["DELIVERY TERMS", input.deliveryTerms],
    ] as Array<[string, string | null]>
  ).filter((row): row is [string, string] => Boolean(clean(row[1])));

  if (cells.length === 0) return top;

  const width = CONTENT / cells.length;
  const headerHeight = 15;
  const valueLines = cells.map(([, value]) => wrap(value, width - 14, 7.6, "sansBold"));
  const bodyHeight = Math.max(16, ...valueLines.map((lines) => lines.length * 9 + 8));
  const height = headerHeight + bodyHeight;

  pdf.rect(MARGIN, top, CONTENT, headerHeight, TINT);
  pdf.strokeRect(MARGIN, top, CONTENT, height, LINE_RULE, 0.7);
  pdf.line(MARGIN, top + headerHeight, RIGHT, top + headerHeight, LINE_RULE, 0.7);

  cells.forEach(([label], index) => {
    const x = MARGIN + index * width;
    if (index > 0) pdf.line(x, top, x, top + height, LINE_RULE, 0.7);
    pdf.textCentre(label, x + width / 2, top + 10.5, {
      size: LABEL_SIZE,
      font: "sansBold",
      colour: NAVY,
      tracking: 0.35,
    });
  });

  valueLines.forEach((lines, index) => {
    const x = MARGIN + index * width;
    let y = top + headerHeight + 11;
    for (const line of lines) {
      pdf.textCentre(line, x + width / 2, y, { size: 7.6, font: "sansBold", colour: TEXT_INK });
      y += 9;
    }
  });

  return top + height + 14;
}

// ------------------------------------------------------------- line items

function drawTableHeader(pdf: PdfDocument, top: number): number {
  const height = 22;
  pdf.rect(MARGIN, top, CONTENT, height, PANEL);
  pdf.strokeRect(MARGIN, top, CONTENT, height, LINE_RULE, 0.7);

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
          colour: SOFT,
        });
      } else if (column.align === "centre") {
        pdf.textCentre(line, box.left + box.width / 2, y, {
          size: LABEL_SIZE,
          font: "sansBold",
          colour: SOFT,
        });
      } else {
        pdf.text(line, box.left + CELL_PAD, y, {
          size: LABEL_SIZE,
          font: "sansBold",
          colour: SOFT,
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
    description.forEach((text, row) => cell("description", text, { row, colour: SOFT }));
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
    if (box.left > MARGIN) pdf.line(box.left, top, box.left, bottom, LINE_RULE, 0.5);
  }

  pdf.line(MARGIN, top, MARGIN, bottom, LINE_RULE, 0.7);
  pdf.line(RIGHT, top, RIGHT, bottom, LINE_RULE, 0.7);
  pdf.line(MARGIN, bottom, RIGHT, bottom, LINE_RULE, 0.8);
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
    colour: SOFT,
    tracking: 0.35,
  });

  let wordsY = y + 24;
  for (const line of wrap(amountInWords(input.totalMinor, input.currency), wordsWidth, 8, "sansBold")) {
    pdf.text(line, MARGIN, wordsY, { size: 8, font: "sansBold", colour: TEXT_INK });
    wordsY += 10.5;
  }

  pdf.strokeRect(boxLeft, y, boxWidth, height, LINE_RULE, 0.7);

  let rowY = y + 16;
  for (const [label, value] of rows) {
    pdf.text(label, boxLeft + 10, rowY, { size: 7.4, colour: SOFT });
    pdf.textRight(value, RIGHT - 10, rowY, { size: 7.4, colour: BLACK });
    rowY += 12;
  }

  const bandTop = y + listHeight;
  pdf.rect(boxLeft, bandTop, boxWidth, bandHeight, PANEL);
  pdf.strokeRect(boxLeft, bandTop, boxWidth, bandHeight, LINE_RULE, 0.7);
  pdf.text("Grand Total", boxLeft + 10, bandTop + 16, { size: 9, font: "sansBold", colour: TEXT_INK });
  pdf.textRight(pdfMoney(input.totalMinor, input.currency), RIGHT - 10, bandTop + 16, {
    size: 9,
    font: "sansBold",
    colour: TEXT_INK,
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
    colour: SOFT,
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
  pdf.strokeRect(MARGIN, y, CONTENT, 15, LINE_RULE, 0.7);
  for (const column of columns) {
    const style = { size: LABEL_SIZE, font: "sansBold" as const, colour: SOFT };
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
    pdf.text("Total", MARGIN + 4, y + 9.5, { size: 6.8, font: "sansBold", colour: TEXT_INK });
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

  pdf.line(MARGIN, y, RIGHT, y, LINE_RULE, 0.8);
  return y + 20;
}

// -------------------------------------------------- terms, bank, signature

function drawClosing(pdf: PdfDocument, input: QuotationPdfInput, top: number): number {
  let y = top;

  const heading = (label: string) => {
    pdf.text(label.toUpperCase(), MARGIN, y, {
      size: LABEL_SIZE,
      font: "sansBold",
      colour: SOFT,
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
      pdf.text(label, MARGIN, y, { size: 7.2, colour: SOFT });
      pdf.text(value, MARGIN + 84, y, { size: 7.2, font: "mono", colour: BLACK });
      y += 10;
    }
    y += 10;
  }

  /*
   * One trust band, not three sections.
   *
   * The first version of this printed the certifications, the accreditations
   * and twenty-six brand marks as three stacked blocks, and it read as a logo
   * dump on a page that was two-thirds empty. A commercial document does not
   * do that: the evidence a procurement office needs is a badge and a
   * certificate number, and both fit on one line.
   *
   * What is *not* here any more is the wall of brand logos. A quotation is a
   * priced offer, not a capability brochure — the brands relevant to it are the
   * ones on the lines above, and they are named in their own column. The full
   * supplier list belongs on the website, where a reader has come looking for
   * it.
   */
  const badges = input.accreditations;
  const certificates = input.certifications.slice(0, 4);

  if (badges.length > 0 || certificates.length > 0) {
    const badgeHeight = 22;
    const rows = Math.max(1, certificates.length);
    const height = Math.max(badgeHeight + 22, 20 + rows * 11);

    room(height + 24);

    pdf.rect(MARGIN, y, CONTENT, height, PANEL);
    pdf.strokeRect(MARGIN, y, CONTENT, height, LINE_RULE, 0.7);

    // ── the badges, left ──────────────────────────────────────────────────
    let badgeX = MARGIN + 12;
    const badgeY = y + (height - badgeHeight) / 2;

    for (const badge of badges) {
      const width = (badge.image.width / badge.image.height) * badgeHeight;
      if (badgeX + width > MARGIN + CONTENT / 2) break;
      pdf.image(badge.image, badgeX, badgeY, width, badgeHeight);
      badgeX += width + 12;
    }

    // ── the certificates, right, each with the number that proves it ──────
    const certificateX = MARGIN + CONTENT / 2 + 8;
    let certificateY = y + 14;

    if (certificates.length > 0) {
      pdf.text("CERTIFIED TO", certificateX, certificateY, {
        size: LABEL_SIZE,
        font: "sansBold",
        colour: SOFT,
        tracking: 0.35,
      });
      certificateY += 10;

      for (const certificate of certificates) {
        pdf.text(fit(certificate.standard, 108, 7, "sansBold"), certificateX, certificateY, {
          size: 7,
          font: "sansBold",
          colour: TEXT_INK,
        });
        pdf.textRight(fit(certificate.reference, 90, 6.8, "mono"), RIGHT - 12, certificateY, {
          size: 6.8,
          font: "mono",
          colour: SOFT,
        });
        certificateY += 10;
      }
    }

    y += height + 18;
  }

  // ── the signature block ─────────────────────────────────────────────────
  room(70);

  pdf.text(`For ${input.config.entityName}`, RIGHT - 190, y + 4, {
    size: 8,
    font: "sansBold",
    colour: TEXT_INK,
  });

  pdf.line(RIGHT - 190, y + 46, RIGHT - 40, y + 46, LINE_RULE, 0.7);
  pdf.text("Authorised signatory", RIGHT - 190, y + 56, { size: 7, colour: SOFT });

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

      const right = `${input.documentNo ?? input.reference}   ·   Page ${page + 1} of ${pageCount}`;
      pdf.textRight(right, RIGHT, FOOTER_RULE + 11, { size: 6.8, colour: FAINT });
    });
  }
}

/** Exported for the tests, which check the widths add up to the page. */
export const TABLE_COLUMNS = COLUMNS;
export const TABLE_WIDTH = CONTENT;
export const COLUMN_EDGES = COLUMN_X;
