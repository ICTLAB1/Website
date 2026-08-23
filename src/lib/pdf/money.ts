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
  return `${currency} ${pdfAmount(minorUnits, currency)}`;
}

/**
 * The figure without its currency code.
 *
 * For the line-item table, where the currency is stated once in the column
 * heading and repeating it thirteen times down a column of numbers costs the
 * width that the part numbers need.
 */
export function pdfAmount(minorUnits: number, currency = "INR"): string {
  const locale = currency === "INR" ? "en-IN" : "en-US";
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(minorUnits / 100);
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

const ONES = [
  "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
  "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
  "Seventeen", "Eighteen", "Nineteen",
];

const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

function underThousand(value: number): string {
  if (value === 0) return "";
  if (value < 20) return ONES[value]!;
  if (value < 100) {
    const tens = TENS[Math.floor(value / 10)]!;
    const ones = ONES[value % 10]!;
    return ones ? `${tens} ${ones}` : tens;
  }
  const hundreds = `${ONES[Math.floor(value / 100)]!} Hundred`;
  const rest = underThousand(value % 100);
  return rest ? `${hundreds} ${rest}` : hundreds;
}

/**
 * The total written out, in the Indian numbering system.
 *
 * Every tax invoice in India carries this line, and it is not decoration: it is
 * what a bank and an auditor read when the figures have been altered. Crore,
 * lakh, thousand — not million — because that is what the document is read in.
 *
 * Paise are written as a separate clause rather than as a fraction, which is
 * the convention: "Rupees One Lakh Eighteen Thousand and Fifty Paise Only".
 */
export function amountInWords(minorUnits: number, currency = "INR"): string {
  const negative = minorUnits < 0;
  const absolute = Math.abs(Math.round(minorUnits));

  const major = Math.floor(absolute / 100);
  const minor = absolute % 100;

  const rupees = major > 0 ? spellIndian(major) : "Zero";
  const noun = currency === "INR" ? "Rupees" : currency;
  const fraction = currency === "INR" ? "Paise" : "Cents";

  return [
    negative ? "Minus" : null,
    noun,
    rupees,
    minor > 0 ? `and ${underThousand(minor)} ${fraction}` : null,
    "Only",
  ]
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * A whole number in the Indian system: crore, lakh, thousand, then the rest.
 *
 * Recursive on the leading group, so a figure above a thousand crore still
 * reads properly rather than running out of names. Nothing in this application
 * reaches that — a money column is a 32-bit integer of paise, which tops out
 * near twenty-one crore rupees — but the recursion costs one line and removes a
 * cliff nobody would think to test for.
 */
function spellIndian(value: number): string {
  const units: Array<[number, string]> = [
    [10_000_000, "Crore"],
    [100_000, "Lakh"],
    [1_000, "Thousand"],
  ];

  for (const [size, name] of units) {
    if (value >= size) {
      const count = Math.floor(value / size);
      const rest = value % size;
      const head = `${count >= 1000 ? spellIndian(count) : underThousand(count)} ${name}`;
      return rest > 0 ? `${head} ${spellIndian(rest)}` : head;
    }
  }

  return underThousand(value);
}
