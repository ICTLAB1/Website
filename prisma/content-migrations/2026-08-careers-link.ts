import type { ContentMigration } from "./types";

/**
 * A Careers link in the footer, on a database that already has a footer.
 *
 * The page exists whether or not anything links to it — that is what makes a
 * URL findable by search — but a careers page nobody on the site can reach is
 * one only search engines ever see. The footer's company column is where a
 * visitor looks for it.
 *
 * ## Why it checks for the parent rather than assuming it
 *
 * The navigation is editable in the admin panel, so the column this belongs
 * under may have been renamed, moved or removed since it was seeded. Creating
 * the parent to hang this from would resurrect a column somebody deliberately
 * deleted. If the column is gone, this says so and stops.
 *
 * The parent is found by label and by having no parent of its own. The seed's
 * `key` fields — `footer:company` and so on — exist only in the seed file: they
 * are how it resolves `parentKey` into a real `parentId` at insert time, and
 * are not a column on the table. Matching on one would have looked right and
 * found nothing.
 */
export const careersLink: ContentMigration = {
  id: "2026-08-careers-link",
  describe: "a Careers link in the footer",

  async apply(prisma) {
    const existing = await prisma.navigationItem.findFirst({
      where: { menu: "FOOTER", href: "/careers" },
      select: { id: true },
    });
    if (existing) return "the footer already links to careers";

    const parent = await prisma.navigationItem.findFirst({
      where: { menu: "FOOTER", parentId: null, label: "Company" },
      select: { id: true },
    });
    if (!parent) {
      return "no company column in the footer — add the careers link by hand";
    }

    await prisma.navigationItem.create({
      data: {
        parentId: parent.id,
        menu: "FOOTER",
        label: "Careers",
        href: "/careers",
        // After "About us" and the rest of the column, before "Support".
        displayOrder: 45,
      },
    });

    return "careers added to the footer's company column";
  },
};
