/**
 * Meta descriptions, assembled from what a record already says.
 *
 * ## The problem this solves
 *
 * A product's `shortDescription` and a brand's `summary` are written to sit
 * under a heading, where the heading has already said what the thing is. They
 * are short on purpose — "Ad-free business email hosting on your own domain."
 * is forty-nine characters and exactly right on the page.
 *
 * As a meta description it is not right. A search result gives roughly a
 * hundred and fifty-five characters of space, and a listing that fills a third
 * of it looks like a page with nothing on it next to competitors that fill all
 * of it. Thirty-three pages on this site were between forty and sixty-nine
 * characters.
 *
 * ## What it must not do
 *
 * Not invent anything. There is no capability, price, availability, warranty or
 * certification here that the site does not already state elsewhere — the
 * sentences a caller passes are about how this business sells, which is the
 * same on every page and true on every page. The record's own words stay first
 * and unedited, because they are the specific part; what follows is context,
 * and context that had to be made up would be worse than a short description.
 *
 * Padding to a character count is not a goal in itself. A description already
 * inside the window is returned untouched.
 */

/** Google renders about this much before cutting the sentence off. */
const LONGEST = 160;

/** Below this a result looks thin next to anything else on the page. */
const SHORTEST = 70;

/**
 * `lead` first, then the first `candidates` entry that fits.
 *
 * Pass candidates longest first: the caller knows which context is most worth
 * having, and this takes the best one that will actually be shown rather than
 * trying to be clever about trimming somebody's sentence in half.
 */
export function metaDescription(lead: string, ...candidates: string[]): string {
  const base = lead.trim().replace(/\s+/g, " ");
  if (base.length >= SHORTEST) return base;

  for (const candidate of candidates) {
    const joined = `${base} ${candidate.trim()}`.replace(/\s+/g, " ");
    if (joined.length <= LONGEST) return joined;
  }

  // Nothing fit. A short description beats a truncated one.
  return base;
}
