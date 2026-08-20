/**
 * Money is represented as an integer number of minor units (paise for INR).
 * Floating point arithmetic is never used for prices, discounts or tax.
 */

export const DEFAULT_GST_RATE = 18;

export function formatMoney(
  minorUnits: number,
  currency = "INR",
  options: { showDecimals?: boolean } = {},
): string {
  const { showDecimals = false } = options;
  const value = minorUnits / 100;
  return new Intl.NumberFormat(currency === "INR" ? "en-IN" : "en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: showDecimals ? 2 : 0,
    maximumFractionDigits: showDecimals ? 2 : 0,
  }).format(value);
}

/** Effective unit price: the sale price when set and genuinely lower. */
export function effectivePriceMinor(
  listPriceMinor: number,
  salePriceMinor?: number | null,
): number {
  if (salePriceMinor != null && salePriceMinor > 0 && salePriceMinor < listPriceMinor) {
    return salePriceMinor;
  }
  return listPriceMinor;
}

/**
 * Discount percentage, rounded down. Returns null when there is no genuine
 * saving - the UI must never display a fabricated "discount" badge.
 */
export function discountPercent(
  listPriceMinor: number,
  salePriceMinor?: number | null,
): number | null {
  if (salePriceMinor == null || salePriceMinor <= 0) return null;
  if (salePriceMinor >= listPriceMinor) return null;
  const pct = Math.floor(((listPriceMinor - salePriceMinor) / listPriceMinor) * 100);
  return pct > 0 ? pct : null;
}

export function gstAmountMinor(baseMinor: number, gstRatePercent: number): number {
  return Math.round((baseMinor * gstRatePercent) / 100);
}

export function lineTotalMinor(
  unitPriceMinor: number,
  quantity: number,
  discountMinor = 0,
): number {
  return Math.max(0, unitPriceMinor * quantity - discountMinor);
}

/** Human label for a licence term expressed in months. */
export function formatTerm(termMonths: number | null | undefined): string {
  if (termMonths == null) return "Perpetual";
  if (termMonths % 12 === 0) {
    const years = termMonths / 12;
    return years === 1 ? "1 year" : `${years} years`;
  }
  return termMonths === 1 ? "1 month" : `${termMonths} months`;
}
