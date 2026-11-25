/**
 * Which faceted catalogue URLs a crawler is asked not to fetch.
 *
 * ## Why this exists, and why it replaces "noindex alone"
 *
 * On 22 October the `Disallow` rules for the filter URLs were removed on the
 * argument that `noindex` does the same job and a `Disallow` stops a crawler
 * reading it. Half of that is true and the other half cost real money. A
 * `noindex` keeps a page out of the index; it does nothing about *fetching* it,
 * and the fetching is the cost. Every brand × category × series × sort
 * combination the interface can build is a distinct URL, each linked from the
 * one before it, and Search Console reported about 257,000 of them discovered
 * between late October and mid November — a crawl budget spent on near-copies
 * of one listing while real pages wait.
 *
 * So the explosion is blocked, and only the explosion:
 *
 * - **Any catalogue URL with two or more parameters** (`?brand=x&category=y`).
 *   That is where the multiplication happens; a single facet is one URL per
 *   value, a pair is their product.
 * - **The parameters that exist only to reorder or narrow a view** — sort,
 *   series, form factor, availability, licence, price band, free-text query —
 *   even on their own.
 *
 * What stays crawlable on purpose:
 *
 * - `/products` itself, and `/products?category=x` / `?brand=x` / `?page=n`.
 *   One URL per category or brand is a small, bounded set, and the site's own
 *   category cards link to them.
 * - `/hardware?family=laptops|desktops|servers`. Those three are indexable
 *   landing pages with their own titles, and a rule that caught them would
 *   remove pages the site is trying to rank. Only combinations *beside* a family
 *   are blocked.
 *
 * Indexation is still decided per view by `generateMetadata`; this only stops
 * the crawl of the views that decision always answers "no" to.
 */
export const FACET_DISALLOW = [
  "/products?*&",
  "/products?*sort=",
  "/products?*series=",
  "/products?*form=",
  "/products?*availability=",
  "/products?*licence=",
  "/products?*min=",
  "/products?*max=",
  "/products?*q=",
  "/hardware?*&",
  "/hardware?*sort=",
  "/hardware?*series=",
  "/hardware?*form=",
  "/hardware?*brand=",
  "/hardware?*availability=",
  "/hardware?*licence=",
] as const;

/**
 * Whether a robots.txt `Disallow` pattern matches a path-and-query, using the
 * rules Google documents: a prefix match, `*` for any run of characters, and
 * `$` to anchor the end.
 */
export function robotsPatternMatches(pattern: string, target: string): boolean {
  const anchored = pattern.endsWith("$");
  const body = anchored ? pattern.slice(0, -1) : pattern;
  const source = body
    .split("*")
    .map((part) => part.replace(/[.+?^${}()|[\]\\]/g, "\\$&"))
    .join(".*");
  return new RegExp(`^${source}${anchored ? "$" : ""}`).test(target);
}

/** Whether any of the facet rules asks a crawler to skip this URL. */
export function isFacetBlocked(target: string): boolean {
  return FACET_DISALLOW.some((pattern) => robotsPatternMatches(pattern, target));
}

/**
 * The `rel` for a link to a catalogue URL: "nofollow" when the URL is one robots.txt asks a
 * crawler to skip, so a menu or card that links to a filtered view does not hand a crawler a
 * link it has been told not to follow. Undefined for every other link.
 */
export function facetRel(href: string): "nofollow" | undefined {
  return isFacetBlocked(href) ? "nofollow" : undefined;
}
