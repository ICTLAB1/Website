/**
 * Money on a printed document.
 *
 * Differs from the on-screen formatter in two ways, both forced by the medium
 * rather than chosen:
 *
 *   1. **The code, not the symbol.** A PDF that assumes only the standard
 *      fourteen fonts cannot print ₹ — none of them contains the glyph, and
 *      emitting the byte anyway renders as something else, differently in every
 *      reader. "INR 1,18,000.00" is unambiguous, prints everywhere, and is what
 *      most Indian tax invoices carry anyway.
 *   2. **Always two decimals.** The catalogue hides ".00" because a page of
 *      round licence prices reads better without it. A quotation is a
 *      commercial document that somebody reconciles against an invoice, and a
 *      figure that has silently dropped its paise is a figure that does not
 *      reconcile.
 */
export function pdfMoney(minorUnits: number, currency = "INR"): string {
  const locale = currency === "INR" ? "en-IN" : "en-US";
  const amount = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(minorUnits / 100);

  return `${currency} ${amount}`;
}

/** A date as a document would print it. */
export function pdfDate(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  }).format(date);
}
