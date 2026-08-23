/**
 * The number printed at the top of a commercial document.
 *
 * Distinct from the reference the application uses internally, and that
 * separation is the whole design. `QTE-2026-4F7K2P` is a good internal
 * identifier — unguessable, so a customer cannot walk somebody else's
 * quotations by incrementing a URL — and a poor document number: a purchasing
 * officer filing three hundred quotations a year wants a series they can sort,
 * and a random token tells them nothing about when it was raised or how many
 * came before it.
 *
 * So a document carries both. The reference stays the key and the URL; the
 * document number is what is printed, and it comes from a counter.
 *
 * ## The template
 *
 * Set by an administrator, because a numbering series is a business
 * convention rather than something software should decide. `TZ/QT/{FY}/{SEQ:4}`
 * produces `TZ/QT/2627/0042`.
 *
 *   `{FY}`    the Indian financial year, short — April 2026 to March 2027 is
 *             `2627`, which is how most Indian document series are numbered
 *   `{FYYYY}` the same, long: `2026-27`
 *   `{YYYY}`  calendar year, `2026`
 *   `{YY}`    calendar year, `26`
 *   `{MM}`    calendar month, `08`
 *   `{SEQ}`   the counter; `{SEQ:4}` pads it to four digits
 *
 * ## What resets the counter
 *
 * Whatever the template says. The series key is the template with the counter
 * removed and every other token resolved, so `TZ/QT/{FY}/{SEQ:4}` counts
 * separately in each financial year and `TZ/QT/{SEQ:5}` counts once, for ever.
 * There is nothing else to configure and no way for the two to disagree.
 */

export const SEQUENCE_TOKEN = /\{SEQ(?::(\d+))?\}/;

/**
 * The Indian financial year a date falls in, as a four-digit string.
 *
 * April to March. A date in January 2027 belongs to 2026-27, which is `2627` —
 * getting this wrong would restart the series three months early and produce
 * two documents with the same number.
 */
export function financialYear(date: Date): { short: string; long: string } {
  const year = date.getUTCFullYear();
  const startYear = date.getUTCMonth() >= 3 ? year : year - 1;
  const endYear = startYear + 1;

  return {
    short: `${String(startYear).slice(-2)}${String(endYear).slice(-2)}`,
    long: `${startYear}-${String(endYear).slice(-2)}`,
  };
}

/** Fills in everything except the counter. */
function resolvePeriod(template: string, date: Date): string {
  const fy = financialYear(date);

  return template
    .replace(/\{FYYYY\}/g, fy.long)
    .replace(/\{FY\}/g, fy.short)
    .replace(/\{YYYY\}/g, String(date.getUTCFullYear()))
    .replace(/\{YY\}/g, String(date.getUTCFullYear()).slice(-2))
    .replace(/\{MM\}/g, String(date.getUTCMonth() + 1).padStart(2, "0"));
}

/**
 * The key the counter is stored under.
 *
 * Derived from the template rather than configured separately, so that
 * changing `{FY}` to `{YYYY}` changes what the series resets on without
 * anybody having to remember to change a second setting to match.
 */
export function seriesKey(template: string, date: Date): string {
  return resolvePeriod(template.replace(SEQUENCE_TOKEN, ""), date);
}

/** Renders a template with a counter value. */
export function formatDocumentNumber(template: string, sequence: number, date: Date): string {
  const match = template.match(SEQUENCE_TOKEN);
  const padding = match?.[1] ? Number(match[1]) : 0;
  const number = String(sequence).padStart(padding, "0");

  return resolvePeriod(template.replace(SEQUENCE_TOKEN, number), date);
}

export type TemplateProblem = "empty" | "no_sequence" | "too_long" | "bad_characters";

/**
 * Whether a template can be used, and if not, why.
 *
 * Checked because the result is printed on a commercial document and stored
 * under a unique constraint: a template with no counter in it would produce
 * the same number for every quotation, and the second one would fail to save
 * at the moment somebody was trying to send it.
 */
export function templateProblem(template: string | null | undefined): TemplateProblem | null {
  const value = template?.trim();
  if (!value) return "empty";
  if (value.length > 60) return "too_long";
  if (!SEQUENCE_TOKEN.test(value)) return "no_sequence";

  // Everything a document number is allowed to contain, plus the token braces.
  if (!/^[A-Za-z0-9/\-_.{}: ]+$/.test(value)) return "bad_characters";

  return null;
}

export const TEMPLATE_PROBLEMS: Record<TemplateProblem, string> = {
  empty: "Enter a numbering format, or leave it blank to keep using the internal reference.",
  no_sequence: "The format needs {SEQ} in it, or every quotation would get the same number.",
  too_long: "That format is longer than a document number should be.",
  bad_characters: "Use letters, digits and / - _ . only, plus the tokens in braces.",
};

/** What the administrator sees beside the field, so the tokens are discoverable. */
export const TEMPLATE_EXAMPLE = "TZ/QT/{FY}/{SEQ:4}";
