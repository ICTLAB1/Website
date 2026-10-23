import type { ContentMigration } from "./types";

/**
 * The three quote pages were orphans.
 *
 * `2026-10-quote-page-microsoft`, `-adobe` and `-autodesk` created
 * `/get-a-quote/{brand}`, put them in the sitemap, and nothing on the site
 * linked to any of them. `verify:seo` said so in as many words, three times:
 * "in the sitemap, linked from no page on the site".
 *
 * This is the second time in one audit. `2026-10-link-the-delhi-page` exists
 * because the Delhi page arrived the same way, and the reasoning is the same:
 * the sitemap tells a crawler the page exists, an internal link is what tells
 * it the page matters. A page nobody links to is crawled rarely and carries
 * none of the site's internal authority.
 *
 * It matters more here than it did there. These three are the destination for
 * paid traffic, and a landing page that Google will not crawl properly is also
 * a landing page whose quality signals Ads cannot read — so the orphan costs
 * the ad account as well as the organic ranking.
 *
 * ## Where the links go
 *
 * Into the "Related pages" list each brand hub already carries, at the top of
 * it rather than appended. Somebody reading `/microsoft` and wondering what
 * Microsoft 365 costs should be offered the price before the explanation of
 * CSP versus Enterprise Agreement: the first item is the one that gets
 * clicked, and the question these pages answer is the question that brought
 * most of that traffic.
 *
 * Matched on the hub's own slug and on the block's type, not on a position:
 * these pages have been edited in the admin panel and the LINK_LIST is not at
 * a fixed index.
 *
 * Idempotent — a hub that already links to its quote page is left alone, which
 * is what stops this undoing an editor's reordering if it ever runs twice.
 */

type Link = {
  /** The brand hub that gains the link. */
  hub: string;
  /** The quote page it points at. */
  href: string;
  label: string;
  description: string;
};

const LINKS: Link[] = [
  {
    hub: "microsoft",
    href: "/get-a-quote/microsoft",
    label: "Microsoft 365 prices",
    description: "What each plan costs, and an exact quote for your seat count",
  },
  {
    hub: "adobe",
    href: "/get-a-quote/adobe",
    label: "Adobe prices",
    description: "Acrobat and Creative Cloud for Teams, with a quote under VIP",
  },
  {
    hub: "autodesk",
    href: "/get-a-quote/autodesk",
    label: "Autodesk prices",
    description: "AutoCAD, Revit, Civil 3D and the AEC Collection, priced",
  },
];

export const linkTheQuotePages: ContentMigration = {
  id: "2026-10-link-the-quote-pages",
  describe: "link the three quote pages from their brand hubs, so they are not orphans",

  async apply(prisma) {
    const linked: string[] = [];
    const missing: string[] = [];

    for (const link of LINKS) {
      const hub = await prisma.page.findFirst({
        where: { slug: link.hub, deletedAt: null },
        select: { id: true },
      });
      if (!hub) {
        missing.push(`/${link.hub}`);
        continue;
      }

      const list = await prisma.pageSection.findFirst({
        where: { pageId: hub.id, type: "LINK_LIST" },
        select: { id: true, data: true },
      });
      if (!list) {
        missing.push(`/${link.hub} (no related-links block)`);
        continue;
      }

      const data = (list.data ?? {}) as Record<string, unknown>;
      /*
       * Typed as the shape a link-list item actually has rather than as
       * `Record<string, unknown>`: Prisma's `InputJsonValue` accepts a concrete
       * object type and rejects an index-signature one, so the loose read type
       * cannot be written back. Every field is optional because these rows have
       * been edited by hand and an item with no description is legal.
       */
      const items = Array.isArray(data.items)
        ? (data.items as Array<{ href?: string; label?: string; description?: string }>)
        : [];

      if (items.some((item) => item.href === link.href)) continue;

      await prisma.pageSection.update({
        where: { id: list.id },
        data: {
          data: {
            ...data,
            items: [
              { href: link.href, label: link.label, description: link.description },
              ...items,
            ],
          },
        },
      });

      linked.push(link.href);
    }

    if (linked.length === 0 && missing.length === 0) {
      return "every quote page is already linked from its brand hub; nothing changed";
    }

    const parts = [];
    if (linked.length > 0) parts.push(`linked ${linked.length} quote page${linked.length === 1 ? "" : "s"} (${linked.join(", ")})`);
    if (missing.length > 0) parts.push(`skipped ${missing.join(", ")}`);
    return parts.join("; ");
  },
};
