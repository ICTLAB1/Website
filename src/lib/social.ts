/**
 * Turning the stored profile URLs into links a person can click.
 *
 * The settings already hold these, and have since profiles were added for
 * `sameAs` in the structured data — an assertion to a search engine that those
 * pages and this site are one business. That is a machine-readable claim and
 * nothing more: until now the site published it and never showed a visitor a
 * single link.
 *
 * ## Why not every profile is a social link
 *
 * The stored list is deliberately broader than social media — a GeM seller
 * profile, a Google Business Profile, a trade directory listing all belong in
 * `sameAs` and none of them belongs in a row headed "Follow us". So this
 * recognises the networks by hostname and returns only those. Anything
 * unrecognised keeps its place in the structured data and stays out of the
 * visible row, which is the safe direction: a link nobody planned for is worse
 * on a page than absent from one.
 *
 * ## Why names rather than logos
 *
 * There is no licensed artwork for these marks in this repository, and drawing
 * one from memory produces a brand's logo very slightly wrong on somebody's
 * company website — which is worse than not showing it. The certifications band
 * made the same call for the same reason and sets the standard number in type.
 *
 * Drop official SVGs into `public/marks/` and this is the file to extend.
 */

export type SocialLink = {
  /** The network, as it is written on the network's own site. */
  name: string;
  href: string;
};

/**
 * Hostname suffixes, most specific first.
 *
 * Matched on the registrable part rather than the whole host, because these
 * arrive with whatever prefix the business copied out of a browser —
 * `in.linkedin.com`, `www.facebook.com`, `m.youtube.com` are all the same
 * network and all three appear in real settings.
 */
const NETWORKS: Array<[suffix: string, name: string]> = [
  ["linkedin.com", "LinkedIn"],
  ["facebook.com", "Facebook"],
  ["instagram.com", "Instagram"],
  ["youtube.com", "YouTube"],
  ["youtu.be", "YouTube"],
  ["x.com", "X"],
  ["twitter.com", "X"],
  ["threads.net", "Threads"],
  ["wa.me", "WhatsApp"],
];

function networkFor(host: string): string | null {
  const lower = host.toLowerCase();
  for (const [suffix, name] of NETWORKS) {
    // A suffix match, anchored on a dot, so "notlinkedin.com" is not LinkedIn.
    if (lower === suffix || lower.endsWith(`.${suffix}`)) return name;
  }
  return null;
}

/**
 * The recognised social profiles among a list of URLs, in the order stored.
 *
 * One entry per network: a business with two LinkedIn URLs in its settings has
 * a settings problem, and a footer showing "LinkedIn LinkedIn" advertises it.
 * The first wins, because the order in settings is the order somebody chose.
 */
export function socialLinks(profileUrls: readonly string[]): SocialLink[] {
  const found: SocialLink[] = [];
  const claimed = new Set<string>();

  for (const url of profileUrls) {
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      continue;
    }

    // `parseProfileUrls` already refuses anything but https. Checked again
    // rather than assumed, because this renders an anchor a visitor clicks.
    if (parsed.protocol !== "https:") continue;

    const name = networkFor(parsed.hostname);
    if (!name || claimed.has(name)) continue;

    claimed.add(name);
    found.push({ name, href: parsed.toString() });
  }

  return found;
}
