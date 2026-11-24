/**
 * Search-result copy: titles and meta descriptions that fit, and say the things
 * a buyer in India is searching for.
 *
 * Two jobs, kept here so no route re-invents them:
 *
 * - {@link productTitle} / {@link productDescription} — the product page's
 *   title and description, in one pattern.
 * - {@link fitDescription} — the safety net `buildMetadata` runs every
 *   indexable page's description through, so a page lands between 140 and 160
 *   characters and, on a commercial page, says "India", "GST invoice" and
 *   "Get a quote today".
 *
 * ## What it never does
 *
 * It does not invent a claim. Every sentence added is a statement the site
 * already makes on every page: it supplies on a GST invoice, it quotes on one
 * purchase order across brands, it is in India. Nothing here says "best price",
 * "fastest delivery", "authorised" (that is gated per publisher elsewhere), or
 * anything specific to one product that the record does not itself say.
 *
 * Pure functions and no `server-only`, so the tests can reach them.
 */

export const TITLE_LIMIT = 60;
export const DESCRIPTION_MIN = 140;
export const DESCRIPTION_MAX = 160;

const SUFFIX = "| TechZoid";

/** Abbreviations tried, in order, only when a title would otherwise run long. */
const NAME_SHORTENINGS: Array<[RegExp, string]> = [
  [/ for Teams$/i, ""],
  [/ for Enterprise$/i, " Enterprise"],
  [/ without Audio Conferencing$/i, " w/o Audio Conf."],
  [/ with Copilot$/i, " + Copilot"],
  [/\bProfessional\b/i, "Pro"],
  [/\bManufacturing\b/i, "Mfg"],
  [/ Business Plan 2$/i, " Plan 2"],
  [/\bHome & Business\b/i, "Home & Biz"],
];

const clean = (text: string) => text.replace(/\s+/g, " ").trim();

/**
 * "<Name> Price in India – Buy Licence | TechZoid" for software.
 *
 * Under sixty characters where it can be. The ladder is: the full pattern; then
 * without "– Buy Licence"; then the name shortened with the abbreviations above
 * (applied one at a time, stopping as soon as it fits) — never a cut mid-word.
 * A name that still cannot fit keeps the shorter pattern and runs long, which
 * is better than a title with the product name chopped off.
 *
 * Hardware is not bought by licence, so it never says "Buy Licence": it gets
 * "<Name> Price in India" and, where there is room, "– Get Quote".
 */
export function productTitle(
  name: string,
  kind: "software" | "hardware" = "software",
  options: { year?: number } = {},
): string {
  const base = clean(name);
  const year = options.year ? ` ${options.year}` : "";
  const patterns =
    kind === "hardware"
      ? [(n: string) => `${n} Price in India – Get Quote ${SUFFIX}`, (n: string) => `${n} Price in India ${SUFFIX}`]
      : [(n: string) => `${n} Price in India${year} – Buy Licence ${SUFFIX}`, (n: string) => `${n} Price in India${year} ${SUFFIX}`];

  for (const pattern of patterns) {
    const title = pattern(base);
    if (title.length <= TITLE_LIMIT) return title;
  }

  let shortened = base;
  for (const [from, to] of NAME_SHORTENINGS) {
    const next = clean(shortened.replace(from, to));
    if (next === shortened) continue;
    shortened = next;
    for (const pattern of patterns) {
      const title = pattern(shortened);
      if (title.length <= TITLE_LIMIT) return title;
    }
  }
  return patterns[patterns.length - 1]!(shortened);
}

/** The pattern without the site suffix, for `buildMetadata`'s `absoluteTitle`. */
export const productTitleHasSuffix = (title: string) => title.endsWith(SUFFIX);

/** Statements the site already makes everywhere; used to fill, never to claim. */
const COMMERCIAL_FILLERS = [
  "Quoted on a single purchase order across brands.",
  "Licences, renewals and support from one supplier.",
  "Delivered digitally against your purchase order.",
  "Genuine licences.",
  "Priced in INR.",
  "Renewals handled by TechZoid.",
];
const HARDWARE_FILLERS = ["Quoted to your specification and quantity.", "Quoted alongside the licensing that goes on it.", "One purchase order across brands."];
const GENERAL_FILLERS = [
  "Software licensing, IT hardware and managed IT services for businesses across India.",
  "Enterprise software, hardware and cloud from one supplier.",
  "TechZoid Technologies, New Delhi.",
  "Based in New Delhi.",
];

/** Pages that are not selling anything: no "Get a quote today" on a privacy policy. */
const NON_COMMERCIAL =
  /^\/(about|contact|careers|privacy|terms|cookie-policy|delivery-policy|refund-policy|support|resources|search|track-order|login|register|account|thank-you|verify-email|forgot-password|reset-password|buy|enquiry|requirement|documents)(\/|$)/;

export function isCommercialPath(path: string): boolean {
  return !NON_COMMERCIAL.test(path);
}

const sentences = (text: string) => clean(text).match(/[^.!?]+[.!?]+(?=\s|$)|[^.!?]+$/g)?.map((s) => s.trim()) ?? [];

const TRAILING_CONNECTORS = /\s+(and|or|with|of|for|the|a|an|to|in|on|at|by|from|that|which|plus)$/i;

/**
 * Cut at a clause boundary (comma, colon, semicolon or dash) where there is
 * one, otherwise at a word boundary, and finish with a full stop. A dangling
 * "and" or "with" is dropped, so a cut never reads as "…seats and."
 */
function cutAtClause(text: string, max: number): string {
  if (text.length <= max) return text;
  const slice = text.slice(0, max - 1);
  const boundary = Math.max(slice.lastIndexOf(","), slice.lastIndexOf(";"), slice.lastIndexOf(":"), slice.lastIndexOf(" — "));
  let cut = boundary > 40 ? slice.slice(0, boundary) : slice.slice(0, Math.max(slice.lastIndexOf(" "), 40));
  cut = cut.replace(/[,;:\s—–-]+$/, "");
  while (TRAILING_CONNECTORS.test(cut)) cut = cut.replace(TRAILING_CONNECTORS, "");
  return `${cut}.`;
}

/** Whole sentences while they fit; a clause-boundary cut only if even the first is too long. */
function trimLead(text: string, room: number): string {
  if (text.length <= room) return text;
  const kept: string[] = [];
  for (const sentence of sentences(text)) {
    const next = clean([...kept, sentence].join(" "));
    if (next.length > room) break;
    kept.push(sentence);
  }
  return kept.length > 0 ? clean(kept.join(" ")) : cutAtClause(text, room);
}

/**
 * Brings a description to 140–160 characters and, on a commercial page, makes
 * sure it says India, GST invoice and a call to action.
 *
 * What the page already wrote is kept first and untouched wherever it fits;
 * missing elements are appended as short factual sentences; if the whole thing
 * would run past 160 the page's own sentences are trimmed from the end (whole
 * sentences first, a word boundary only if the first sentence alone is too
 * long). A description already compliant is returned as written.
 */
export function fitDescription(description: string, path: string): string {
  let base = clean(description);
  const commercial = isCommercialPath(path);

  // A page that already names New Delhi gets "India" where it stands, which costs
  // seven characters and keeps every sentence the page wrote.
  if (!/\bindia\b/i.test(base) && /New Delhi/.test(base)) base = base.replace("New Delhi", "New Delhi, India");

  // What is missing is decided on the text that will actually be shown: trimming
  // can remove the very sentence that said "India" or "GST invoice", so the tail
  // is rebuilt from the trimmed lead until it stops changing.
  const tailFor = (text: string): string => {
    const needsIndia = !/\bindia\b/i.test(text);
    const needsGst = commercial && !/gst invoic/i.test(text);
    const needsCta = commercial && !/(get a quote|quote today)/i.test(text);
    const parts: string[] = [];
    if (commercial && (needsGst || needsIndia)) {
      parts.push(needsIndia ? "Supplied in India with a GST invoice." : "Supplied with a GST invoice.");
    } else if (!commercial && needsIndia) {
      parts.push("TechZoid Technologies, New Delhi, India.");
    }
    if (needsCta) parts.push("Get a quote today.");
    return parts.join(" ");
  };

  let lead = base;
  let tail = tailFor(lead);
  for (let pass = 0; pass < 4; pass += 1) {
    const room = DESCRIPTION_MAX - (tail ? tail.length + 1 : 0);
    const trimmed = trimLead(base, room);
    const nextTail = tailFor(trimmed);
    lead = trimmed;
    if (nextTail === tail) break;
    tail = nextTail;
  }

  // Compliant already: nothing missing and the right length.
  if (!tail && lead.length >= DESCRIPTION_MIN && lead.length <= DESCRIPTION_MAX) return lead;

  let result = clean(`${lead} ${tail}`);

  // Too short: add whole factual sentences that fit, before the call to action.
  if (result.length < DESCRIPTION_MIN) {
    const fillers = commercial ? COMMERCIAL_FILLERS : GENERAL_FILLERS;
    for (const filler of fillers) {
      if (result.includes(filler)) continue;
      const withFiller = clean(`${lead} ${filler} ${tail}`);
      if (withFiller.length <= DESCRIPTION_MAX) {
        lead = clean(`${lead} ${filler}`);
        result = withFiller;
      }
      if (result.length >= DESCRIPTION_MIN) break;
    }
  }
  return result.length <= DESCRIPTION_MAX ? result : cutAtClause(result, DESCRIPTION_MAX);
}

/**
 * A product page's description: names the product, says India, GST invoice and
 * the call to action, using the record's own sentence first when it fits.
 */
export function productDescription(input: {
  name: string;
  shortDescription: string;
  kind?: "software" | "hardware";
}): string {
  const name = clean(input.name);
  const lead = clean(input.shortDescription);
  const required =
    input.kind === "hardware"
      ? [`Buy ${name} in India, quoted to your configuration, with a GST invoice from TechZoid.`, "Get a quote today."]
      : [`Buy ${name} licence in India with a GST invoice from TechZoid.`, "Get a quote today."];
  // The record's own sentence first, then facts the site states everywhere, then
  // the call to action last. Subsets are tried so the result lands in 140–160.
  const optional = [lead, ...(input.kind === "hardware" ? HARDWARE_FILLERS : COMMERCIAL_FILLERS)];
  let best = "";
  const total = 1 << optional.length;
  for (let mask = 0; mask < total; mask += 1) {
    const chosen = optional.filter((_, i) => mask & (1 << i));
    const text = clean([required[0], ...chosen, required[1]].join(" "));
    if (text.length > DESCRIPTION_MAX) continue;
    const inRange = text.length >= DESCRIPTION_MIN;
    const bestInRange = best.length >= DESCRIPTION_MIN;
    if ((inRange && !bestInRange) || (inRange === bestInRange && text.length > best.length)) best = text;
  }
  return best || fitDescription(required.join(" "), "/products/x");
}
