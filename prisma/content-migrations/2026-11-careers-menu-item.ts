import type { ContentMigration } from "./types";

/**
 * A "Careers" item in the main menu, at the end.
 *
 * The footer has linked to `/careers` since August. The header did not, so the
 * page that now sends job seekers to the HR portal was one a visitor had to
 * scroll to the bottom to find.
 *
 * ## Where it goes
 *
 * Last among the top-level items. There is no top-level "Contact" to sit in
 * front of — Contact is inside the About dropdown — and the brief's fallback is
 * "last". The desktop menu and the mobile menu are built from the same rows, so
 * this one row adds it to both.
 *
 * ## Why it checks before it writes
 *
 * The navigation is editable in the admin panel. If somebody has already added a
 * top-level link to `/careers` — or deliberately hidden one — this leaves it
 * alone instead of adding a second. It also never creates anything under
 * another item: a top-level row has no parent to go missing.
 */
export const careersMenuItem: ContentMigration = {
  id: "2026-11-careers-menu-item",
  describe: "a Careers item at the end of the main menu",

  async apply(prisma) {
    const existing = await prisma.navigationItem.findFirst({
      where: { menu: "HEADER", parentId: null, href: "/careers" },
      select: { id: true },
    });
    if (existing) return "the main menu already links to careers";

    const last = await prisma.navigationItem.findFirst({
      where: { menu: "HEADER", parentId: null },
      orderBy: { displayOrder: "desc" },
      select: { displayOrder: true },
    });

    await prisma.navigationItem.create({
      data: {
        menu: "HEADER",
        label: "Careers",
        href: "/careers",
        // Ten after whatever is last, and never lower than the seed's own
        // "Resources" (160), so it stays at the end if that is later removed.
        displayOrder: Math.max(last?.displayOrder ?? 0, 160) + 10,
      },
    });

    return "careers added to the end of the main menu";
  },
};
