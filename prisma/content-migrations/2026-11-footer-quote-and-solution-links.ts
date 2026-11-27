import type { ContentMigration } from "./types";

/**
 * Footer links for pages search engines had found but not crawled.
 *
 * The three brand quote pages were linked only from their brand hubs, and the
 * five solution pages from each other and from two guides. The footer is on
 * every page, so a link there is the strongest internal signal this site can
 * give a page. Added to the existing columns, appended after what is there, and
 * skipped for any address the footer already links to, so an editor's order and
 * removals are respected if this ever runs twice.
 */
const ADDITIONS: Array<{ column: string; label: string; href: string }> = [
  { column: "Software", label: "Get a quote: Microsoft", href: "/get-a-quote/microsoft" },
  { column: "Software", label: "Get a quote: Adobe", href: "/get-a-quote/adobe" },
  { column: "Software", label: "Get a quote: Autodesk", href: "/get-a-quote/autodesk" },
  { column: "Company", label: "Gurugram", href: "/software-licensing-company-gurugram" },
  { column: "Company", label: "Noida", href: "/software-licensing-company-noida" },
  { column: "Services", label: "Data centre solutions", href: "/data-centre-solutions" },
  { column: "Services", label: "Web application firewall", href: "/web-application-firewall" },
  { column: "Services", label: "Email security", href: "/email-security" },
  { column: "Services", label: "Zero trust network access", href: "/zero-trust-network-access" },
  { column: "Services", label: "Data loss prevention", href: "/data-loss-prevention" },
];

export const footerQuoteAndSolutionLinks: ContentMigration = {
  id: "2026-11-footer-quote-and-solution-links",
  describe: "footer links to the three quote pages, the Gurugram and Noida pages and the five solution pages",

  async apply(prisma) {
    const notes: string[] = [];
    for (const item of ADDITIONS) {
      const existing = await prisma.navigationItem.findFirst({ where: { menu: "FOOTER", href: item.href }, select: { id: true } });
      if (existing) continue;
      const column = await prisma.navigationItem.findFirst({
        where: { menu: "FOOTER", parentId: null, label: item.column },
        select: { id: true },
      });
      if (!column) {
        notes.push(`no ${item.column} column; skipped ${item.href}`);
        continue;
      }
      const last = await prisma.navigationItem.findFirst({
        where: { parentId: column.id },
        orderBy: { displayOrder: "desc" },
        select: { displayOrder: true },
      });
      await prisma.navigationItem.create({
        data: { menu: "FOOTER", parentId: column.id, label: item.label, href: item.href, displayOrder: (last?.displayOrder ?? 100) + 10, visible: true },
      });
      notes.push(`linked ${item.href}`);
    }
    return notes.join("; ") || "nothing to do";
  },
};
