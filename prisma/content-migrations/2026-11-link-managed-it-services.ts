import type { ContentMigration } from "./types";

/**
 * Footer link to the managed IT services page, so it is not an orphan.
 *
 * A page nothing links to is one only a crawler following the sitemap will ever
 * find, and the sitemap alone is a weak reason for a search engine to rank it.
 * The footer is on every page, which makes it the cheapest honest way to give
 * each one a link from the rest of the site.
 *
 * ## It checks before it writes
 *
 * The footer is editable in the admin panel. The column a link belongs under
 * may have been renamed or removed since it was seeded, and creating a parent to
 * hang a link from would resurrect something somebody deleted on purpose — so a
 * missing column is reported and skipped, never invented. A link that is
 * already there, wherever it sits, is left alone. Order is read from the
 * column rather than assumed, for the same reason: these columns have been
 * hand-edited. Each link goes just before the column's "All products" or
 * "All services" entry, which stays last.
 */

const LINKS = [
  { column: "Services", label: "Managed IT services", href: "/managed-it-services" },
] as const;

export const linkManagedItServices: ContentMigration = {
  id: "2026-11-link-managed-it-services",
  describe: "footer link to the managed IT services page",

  async apply(prisma) {
    const results: string[] = [];

    for (const link of LINKS) {
      const existing = await prisma.navigationItem.findFirst({
        where: { menu: "FOOTER", href: link.href },
        select: { id: true },
      });
      if (existing) {
        results.push(`${link.href} already linked`);
        continue;
      }

      const column = await prisma.navigationItem.findFirst({
        where: { menu: "FOOTER", parentId: null, label: link.column },
        select: { id: true },
      });
      if (!column) {
        results.push(`no "${link.column}" column in the footer — ${link.href} not linked`);
        continue;
      }

      /*
       * Just before the column's "All …" entry, which should stay last, not
       * after it. Its order is read from the row; the entry is nudged down by one
       * and the new link takes the place it was in. Nothing else moves.
       */
      const all = await prisma.navigationItem.findFirst({
        where: { parentId: column.id, href: { in: ["/products", "/services"] } },
        select: { id: true, displayOrder: true },
      });
      let order: number;
      if (all) {
        order = all.displayOrder;
        await prisma.navigationItem.update({
          where: { id: all.id },
          data: { displayOrder: { increment: 1 } },
        });
      } else {
        const last = await prisma.navigationItem.findFirst({
          where: { parentId: column.id },
          orderBy: { displayOrder: "desc" },
          select: { displayOrder: true },
        });
        order = (last?.displayOrder ?? 0) + 1;
      }

      await prisma.navigationItem.create({
        data: {
          menu: "FOOTER",
          parentId: column.id,
          label: link.label,
          href: link.href,
          displayOrder: order,
          visible: true,
        },
      });
      results.push(`${link.href} linked under ${link.column}`);
    }

    return results.join("; ");
  },
};
