import type { ContentMigration } from "./types";

/** Menu and footer links to the four plans-and-pricing pages, each added once and only if absent. */
const LINKS = [
  { label: "Microsoft 365 business plans", href: "/microsoft-365-business-plans-and-pricing" },
  { label: "Microsoft 365 enterprise plans", href: "/microsoft-365-enterprise-plans-and-pricing" },
  { label: "Adobe plans and pricing", href: "/adobe-plans-and-pricing" },
  { label: "Autodesk plans and pricing", href: "/autodesk-plans-and-pricing" },
] as const;

export const plansPagesLinks: ContentMigration = {
  id: "2026-11-plans-pages-links",
  describe: "menu and footer links to the plans-and-pricing pages",

  async apply(prisma) {
    const addLink = async (menu: "HEADER" | "FOOTER", column: string, link: { label: string; href: string }) => {
      if (await prisma.navigationItem.findFirst({ where: { menu, href: link.href }, select: { id: true } })) return false;
      const parent = await prisma.navigationItem.findFirst({ where: { menu, parentId: null, label: column }, select: { id: true } });
      if (!parent) return false;
      const last = await prisma.navigationItem.findFirst({ where: { parentId: parent.id }, orderBy: { displayOrder: "desc" }, select: { displayOrder: true } });
      await prisma.navigationItem.create({
        data: { menu, parentId: parent.id, label: link.label, href: link.href, displayOrder: (last?.displayOrder ?? 0) + 1, visible: true },
      });
      return true;
    };
    let added = 0;
    for (const link of LINKS) {
      if (await addLink("HEADER", "Products", link)) added += 1;
      if (await addLink("FOOTER", "Software", link)) added += 1;
    }
    return added > 0 ? `${added} menu and footer links added` : "nothing to do";
  },
};
