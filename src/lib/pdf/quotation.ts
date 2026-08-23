import type { SiteConfig } from "@/lib/site-config";
import { pdfDate, pdfMoney } from "@/lib/pdf/money";
import { ACCENT, BLACK, MUTED, PdfDocument, RULE, fit, wrap } from "@/lib/pdf/writer";

/**
 * A quotation as a document somebody can attach to a purchase order.
 *
 * The email version of this exists and is right for reading. It is wrong for
 * the thing that actually happens next: a procurement officer forwards it to
 * finance, finance attaches it to a purchase order, and somebody files it. That
 * wants a single artefact with the letterhead, the lines, the tax and the terms
 * on it — not an email that renders differently in six clients and cannot be
 * attached to anything.
 *
 * Nothing here is invented. Every letterhead line is printed only when it is
 * configured; a quotation from a deployment with no GSTIN on file simply has no
 * GSTIN line, rather than a blank labelled one.
 */

export type QuotationPdfInput = {
  reference: string;
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
  customer: {
    name: string;
    companyName: string | null;
    email: string;
    gstin: string | null;
    address: string | null;
  };
  lines: Array<{
    productName: string;
    sku: string;
    quantity: number;
    unitPriceMinor: number;
    discountMinor: number;
    gstRatePercent: number;
    lineTotalMinor: number;
  }>;
  config: SiteConfig;
  /** Written at /admin/settings. Nothing is printed when it is unset. */
  terms: string | null;
};

const MARGIN = 48;
const CONTENT_WIDTH = 595.28 - MARGIN * 2;

/** The letterhead lines that are actually configured. Never a placeholder. */
function issuerLines(config: SiteConfig): string[] {
  const address = [
    config.address.line1,
    config.address.line2,
    [config.address.city, config.address.state].filter(Boolean).join(", "),
    config.address.postcode,
    config.address.country,
  ].filter((part): part is string => Boolean(part && part.trim()));

  return [
    ...address,
    config.gstin ? `GSTIN ${config.gstin}` : null,
    config.cin ? `CIN ${config.cin}` : null,
    config.email.sales,
    config.phone.sales,
  ].filter((line): line is string => Boolean(line));
}

function termLines(terms: string | null): string[] {
  if (!terms) return [];
  return terms
    .split("\n")
    .map((line) => line.replace(/^\s*[-*•]\s*/, "").trim())
    .filter(Boolean)
    .slice(0, 40);
}

/**
 * Column positions for the line-item table.
 *
 * Right edges, and spaced for the widest thing each column can hold rather than
 * for the sample: "INR 1,18,000.00" is 75 points at 9.5pt, so the gap between
 * the tax column and the line total has to be at least that or a large order
 * prints its GST rate on top of its total.
 */
const COLUMNS = {
  product: MARGIN,
  quantity: MARGIN + 280,
  unit: MARGIN + 375,
  tax: MARGIN + 405,
  total: MARGIN + CONTENT_WIDTH,
};

/** How wide a product name may be before it is cut. */
const PRODUCT_WIDTH = 250;

export function renderQuotationPdf(input: QuotationPdfInput): Buffer {
  const pdf = new PdfDocument();
  const { config } = input;

  let y = MARGIN;

  // ------------------------------------------------------------ letterhead
  pdf.text(config.tradingName, MARGIN, y + 14, { size: 18, bold: true });
  if (config.legalName && config.legalName !== config.tradingName) {
    pdf.text(config.legalName, MARGIN, y + 30, { size: 9, colour: MUTED });
  }

  let issuerY = y + (config.legalName && config.legalName !== config.tradingName ? 46 : 32);
  for (const line of issuerLines(config)) {
    pdf.text(fit(line, 260, 9), MARGIN, issuerY, { size: 9, colour: MUTED });
    issuerY += 12;
  }

  // The document's own identity, on the right.
  pdf.textRight("QUOTATION", COLUMNS.total, y + 14, { size: 16, bold: true, colour: ACCENT });
  pdf.textRight(input.reference, COLUMNS.total, y + 32, { size: 11, bold: true });
  if (input.version > 1) {
    pdf.textRight(`Version ${input.version}`, COLUMNS.total, y + 46, { size: 9, colour: MUTED });
  }
  pdf.textRight(`Issued ${pdfDate(input.issuedAt)}`, COLUMNS.total, y + (input.version > 1 ? 60 : 46), {
    size: 9,
    colour: MUTED,
  });
  if (input.validUntil) {
    pdf.textRight(
      `Valid until ${pdfDate(input.validUntil)}`,
      COLUMNS.total,
      y + (input.version > 1 ? 74 : 60),
      { size: 9, colour: MUTED },
    );
  }

  y = Math.max(issuerY, y + 92) + 8;
  pdf.line(MARGIN, y, MARGIN + CONTENT_WIDTH, y);
  y += 22;

  // -------------------------------------------------------------- customer
  pdf.text("Quotation for", MARGIN, y, { size: 8, bold: true, colour: MUTED });
  y += 14;
  const customerLines = [
    input.customer.companyName ?? input.customer.name,
    input.customer.companyName ? input.customer.name : null,
    input.customer.email,
    input.customer.gstin ? `GSTIN ${input.customer.gstin}` : null,
    ...(input.customer.address ? input.customer.address.split("\n") : []),
  ].filter((line): line is string => Boolean(line && line.trim()));

  for (const line of customerLines) {
    pdf.text(fit(line, 300, 10), MARGIN, y, { size: 10 });
    y += 13;
  }

  y += 14;

  // ------------------------------------------------------------- the lines
  const headerRow = (top: number): number => {
    pdf.rect(MARGIN, top - 11, CONTENT_WIDTH, 18, { r: 0.96, g: 0.95, b: 0.93 });
    pdf.text("Product", COLUMNS.product + 4, top, { size: 8, bold: true, colour: MUTED });
    pdf.textRight("Qty", COLUMNS.quantity, top, { size: 8, bold: true, colour: MUTED });
    pdf.textRight("Unit", COLUMNS.unit, top, { size: 8, bold: true, colour: MUTED });
    pdf.textRight("GST", COLUMNS.tax, top, { size: 8, bold: true, colour: MUTED });
    pdf.textRight("Line total", COLUMNS.total - 4, top, { size: 8, bold: true, colour: MUTED });
    return top + 20;
  };

  y = headerRow(y);

  for (const line of input.lines) {
    // A page break before a row rather than through one: a line item split
    // across two pages is the kind of thing that gets read as two line items.
    if (y > 720) {
      pdf.addPage();
      y = MARGIN + 10;
      y = headerRow(y);
    }

    pdf.text(fit(line.productName, PRODUCT_WIDTH, 9.5), COLUMNS.product + 4, y, { size: 9.5 });
    pdf.text(fit(line.sku, PRODUCT_WIDTH, 8), COLUMNS.product + 4, y + 11, { size: 8, colour: MUTED });
    pdf.textRight(String(line.quantity), COLUMNS.quantity, y, { size: 9.5 });
    pdf.textRight(pdfMoney(line.unitPriceMinor, input.currency), COLUMNS.unit, y, { size: 9.5 });
    pdf.textRight(`${line.gstRatePercent}%`, COLUMNS.tax, y, { size: 9.5 });
    pdf.textRight(pdfMoney(line.lineTotalMinor, input.currency), COLUMNS.total - 4, y, {
      size: 9.5,
      bold: true,
    });

    y += 24;
    pdf.line(MARGIN, y - 8, MARGIN + CONTENT_WIDTH, y - 8, RULE, 0.4);
  }

  // ----------------------------------------------------------------- totals
  y += 6;
  const totalsLeft = MARGIN + CONTENT_WIDTH - 200;

  const totalRow = (label: string, amount: number, bold = false) => {
    pdf.text(label, totalsLeft, y, { size: 9.5, colour: bold ? BLACK : MUTED, bold });
    pdf.textRight(pdfMoney(amount, input.currency), COLUMNS.total - 4, y, { size: 9.5, bold });
    y += 15;
  };

  totalRow("Subtotal", input.subtotalMinor);
  if (input.discountMinor > 0) totalRow("Discount", -input.discountMinor);
  totalRow("GST", input.taxMinor);

  pdf.line(totalsLeft, y - 9, MARGIN + CONTENT_WIDTH, y - 9);
  y += 4;
  totalRow("Total", input.totalMinor, true);

  // ------------------------------------------------------------ notes, terms
  const block = (heading: string, lines: string[]) => {
    if (lines.length === 0) return;

    if (y > 690) {
      pdf.addPage();
      y = MARGIN + 10;
    }

    y += 18;
    pdf.text(heading, MARGIN, y, { size: 8, bold: true, colour: MUTED });
    y += 14;

    for (const line of lines) {
      if (y > 780) {
        pdf.addPage();
        y = MARGIN + 10;
      }
      pdf.text(line, MARGIN, y, { size: 9 });
      y += 12;
    }
  };

  block("Notes", input.notes ? wrap(input.notes, CONTENT_WIDTH, 9) : []);
  block(
    "Terms",
    termLines(input.terms).flatMap((term) => wrap(`• ${term}`, CONTENT_WIDTH, 9)),
  );

  // ------------------------------------------------------------- the footer
  const footer = [
    `${input.reference} • ${config.tradingName}`,
    "This quotation is an offer to supply on the terms stated. Prices are subject to the validity above.",
  ];

  // Drawn last, and explicitly onto each page: "page 2 of 3" cannot be written
  // until the third page exists.
  const pageCount = pdf.pageCount;
  for (let page = 0; page < pageCount; page += 1) {
    pdf.onPage(page, () => {
      pdf.line(MARGIN, 800, MARGIN + CONTENT_WIDTH, 800, RULE, 0.4);
      pdf.text(footer[0]!, MARGIN, 812, { size: 8, colour: MUTED });
      pdf.textRight(`Page ${page + 1} of ${pageCount}`, COLUMNS.total, 812, {
        size: 8,
        colour: MUTED,
      });
      pdf.text(fit(footer[1]!, CONTENT_WIDTH, 7.5), MARGIN, 823, { size: 7.5, colour: MUTED });
    });
  }

  return pdf.build();
}
