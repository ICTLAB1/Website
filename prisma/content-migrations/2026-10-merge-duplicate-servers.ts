import type { ContentMigration } from "./types";

/**
 * Two servers listed twice each, from two generations of the catalogue.
 *
 * The Dell PowerEdge R760 and the HPE ProLiant DL380 each have two product
 * records. They are the same machine:
 *
 *   dell-poweredge-r760          5 variants, series "PowerEdge R", RACK_SERVER
 *   dell-poweredge-r760-server   1 variant, no series, no form factor, featured
 *
 *   hpe-proliant-dl380-gen11     3 variants, series "ProLiant DL", RACK_SERVER
 *   hpe-proliant-dl380-server    1 variant, no series, no form factor, featured
 *
 * Two URLs for one product is the ordinary duplicate-content problem: they
 * compete with each other for the same query and split whatever authority the
 * page has earned. It is also the one a buyer notices, because the two pages
 * disagree — one offers five configurations and the other offers one.
 *
 * ## Which record survives
 *
 * The detailed one, in both cases. It carries the variants somebody can
 * actually be quoted from, and it carries `formFactor` and `series`, which is
 * what `/hardware?family=servers` filters on — the thin records have neither
 * and are invisible to the hardware catalogue entirely.
 *
 * The thin records are the ones marked `featured`, though, so the flag and the
 * popularity score move across before they are archived. Without that step
 * this migration would quietly empty a slot on the homepage, which is the sort
 * of change that gets noticed a week later by somebody who cannot explain it.
 *
 * ## Archived, not deleted
 *
 * `status: ARCHIVED` with `deletedAt` set. Nothing is destroyed, and no
 * quotation, order or enquiry line references either record — checked before
 * writing this. A quotation that lost the product behind one of its lines is a
 * document that cannot be reprinted, so archiving would have been right even
 * if something had.
 *
 * The withdrawn URLs are 301'd to the surviving product in `next.config.ts`,
 * rather than being left to 404. They point at the same machine, so the
 * surviving page is the correct destination rather than an approximation.
 *
 * ## The Servers category goes with them
 *
 * It contained these two records and nothing else — the other seventeen
 * servers are in Infrastructure & Hardware and are found by form factor. So
 * archiving them leaves `/products?category=servers` showing an empty page,
 * and the menu entry pointing at it is repointed to `/hardware?family=servers`,
 * which is the filter that actually finds every server.
 */

type Merge = {
  /** The record that survives, and the redirect target. */
  keep: string;
  /** The thin duplicate, archived. */
  archive: string;
};

const MERGES: Merge[] = [
  { keep: "dell-poweredge-r760", archive: "dell-poweredge-r760-server" },
  { keep: "hpe-proliant-dl380-gen11", archive: "hpe-proliant-dl380-server" },
];

const NAV_FROM = "/products?category=servers";
const NAV_TO = "/hardware?family=servers";

export const mergeDuplicateServers: ContentMigration = {
  id: "2026-10-merge-duplicate-servers",
  describe: "merge the two servers that are each listed twice, and repoint the menu entry",

  async apply(prisma) {
    const merged: string[] = [];

    for (const { keep, archive } of MERGES) {
      const [survivor, duplicate] = await Promise.all([
        prisma.product.findFirst({
          where: { slug: keep, deletedAt: null },
          select: { id: true, featured: true, popularity: true },
        }),
        prisma.product.findFirst({
          where: { slug: archive, deletedAt: null },
          select: { id: true, featured: true, popularity: true },
        }),
      ]);

      // Either already done, or a catalogue that never had the pair. Both are
      // reasons to leave it alone rather than to create something.
      if (!survivor || !duplicate) continue;

      await prisma.product.update({
        where: { id: survivor.id },
        data: {
          featured: survivor.featured || duplicate.featured,
          popularity: Math.max(survivor.popularity, duplicate.popularity),
        },
      });

      await prisma.product.update({
        where: { id: duplicate.id },
        data: { status: "ARCHIVED", deletedAt: new Date() },
      });

      merged.push(keep);
    }

    /*
     * Matched on the href rather than the label, because "Servers" appears
     * twice in the navigation — once under Hardware pointing at the working
     * filter, and once under Infrastructure pointing at the category this
     * empties. Only the second one moves.
     */
    const { count: repointed } = await prisma.navigationItem.updateMany({
      where: { href: NAV_FROM },
      data: { href: NAV_TO },
    });

    if (merged.length === 0 && repointed === 0) {
      return "no duplicate server records or stale menu entries left; nothing changed";
    }

    return `merged ${merged.length} duplicate server listing${merged.length === 1 ? "" : "s"} (${merged.join(", ") || "none"}) and repointed ${repointed} menu entr${repointed === 1 ? "y" : "ies"}`;
  },
};
