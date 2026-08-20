/**
 * Quotation and order arithmetic.
 *
 * Pure and dependency-free so it can be unit tested exhaustively. Every value
 * is an integer in the currency's minor unit (paise for INR); floating point is
 * never used, and every function guards against a negative result.
 *
 * Line model:
 *   gross    = unitPrice x quantity
 *   net      = gross - discount            (never below zero)
 *   tax      = net x gstRate / 100         (rounded to the nearest paisa)
 *   lineTotal = net                        (tax is carried separately)
 *
 * Document totals sum the line values, so a document total can always be
 * reconciled against its lines exactly.
 */

export type PricedLineInput = {
  unitPriceMinor: number;
  quantity: number;
  discountMinor?: number;
  gstRatePercent?: number;
};

export type PricedLine = {
  unitPriceMinor: number;
  quantity: number;
  discountMinor: number;
  gstRatePercent: number;
  grossMinor: number;
  lineTotalMinor: number;
  taxMinor: number;
};

export type DocumentTotals = {
  subtotalMinor: number;
  discountMinor: number;
  taxMinor: number;
  totalMinor: number;
};

const MAX_QUANTITY = 100_000;
const MAX_GST_RATE = 50;

function toSafeInteger(value: number, fallback = 0): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.trunc(value);
}

/** Normalises one line and derives its gross, net and tax amounts. */
export function priceLine(input: PricedLineInput): PricedLine {
  const unitPriceMinor = Math.max(0, toSafeInteger(input.unitPriceMinor));
  const quantity = Math.min(MAX_QUANTITY, Math.max(1, toSafeInteger(input.quantity, 1)));
  const gstRatePercent = Math.min(
    MAX_GST_RATE,
    Math.max(0, toSafeInteger(input.gstRatePercent ?? 18, 18)),
  );

  const grossMinor = unitPriceMinor * quantity;
  // A discount can never exceed the line, which would otherwise produce a
  // negative total and a negative tax charge.
  const discountMinor = Math.min(grossMinor, Math.max(0, toSafeInteger(input.discountMinor ?? 0)));

  const lineTotalMinor = grossMinor - discountMinor;
  const taxMinor = Math.round((lineTotalMinor * gstRatePercent) / 100);

  return {
    unitPriceMinor,
    quantity,
    discountMinor,
    gstRatePercent,
    grossMinor,
    lineTotalMinor,
    taxMinor,
  };
}

/** Sums priced lines into document totals that reconcile against them exactly. */
export function documentTotals(lines: PricedLine[]): DocumentTotals {
  const subtotalMinor = lines.reduce((sum, line) => sum + line.grossMinor, 0);
  const discountMinor = lines.reduce((sum, line) => sum + line.discountMinor, 0);
  const taxMinor = lines.reduce((sum, line) => sum + line.taxMinor, 0);

  return {
    subtotalMinor,
    discountMinor,
    taxMinor,
    totalMinor: subtotalMinor - discountMinor + taxMinor,
  };
}

/** Convenience: price a set of inputs and total them in one pass. */
export function priceDocument(inputs: PricedLineInput[]): {
  lines: PricedLine[];
  totals: DocumentTotals;
} {
  const lines = inputs.map(priceLine);
  return { lines, totals: documentTotals(lines) };
}

/**
 * Converts a percentage discount into a minor-unit amount for one line.
 * Percentages above 100 are clamped rather than producing a negative price.
 */
export function discountFromPercent(grossMinor: number, percent: number): number {
  const safePercent = Math.min(100, Math.max(0, Number.isFinite(percent) ? percent : 0));
  return Math.round((Math.max(0, grossMinor) * safePercent) / 100);
}

/** Default quotation validity, used when an administrator does not set one. */
export const DEFAULT_QUOTE_VALIDITY_DAYS = 30;

export function defaultValidUntil(from = new Date()): Date {
  const date = new Date(from);
  date.setUTCDate(date.getUTCDate() + DEFAULT_QUOTE_VALIDITY_DAYS);
  return date;
}

export function isQuoteExpired(validUntil: Date | null | undefined, now = new Date()): boolean {
  if (!validUntil) return false;
  return validUntil.getTime() < now.getTime();
}
