import type { ContentMigration } from "./types";

/**
 * The Delhi page was an orphan.
 *
 * `2026-10-delhi-local-page` created `/software-licensing-company-delhi` and
 * put it in the sitemap, and nothing on the site linked to it. `verify:seo`
 * says so in as many words: "in the sitemap, linked from no page on the site".
 *
 * That is close to wasted work. A page nobody links to is crawled rarely,
 * carries none of the site's internal authority, and competes for its query
 * from a standing start — which defeats the purpose of writing a local page in
 * the first place. The sitemap tells a crawler the page exists; an internal
 * link is what tells it the page matters.
 *
 * It goes in the Company column of the footer, beside About, Contact and
 * Enterprise procurement. That is the group that already holds the pages about
 * who this business is rather than what it sells, which is what this page is,
 * and the footer appears on every page of the site — so the link is present
 * wherever a crawler arrives.
 *
 * Placed directly after Contact, because the two are about the same thing from
 * opposite ends: Contact is the address and the telephone, and this is the
 * argument for using them.
 */

const SLUG = "/software-licensing-company-delhi";
const LABEL = "Delhi NCR";

export const linkTheDelhiPage: ContentMigration = {
  id: "2026-10-link-the-delhi-page",
  describe: "link the Delhi page from the footer, so it is not an orphan",

  async apply(prisma) {
    const existing = await prisma.navigationItem.findFirst({
      where: { menu: "FOOTER", href: SLUG },
      select: { id: true },
    });
    if (existing) return `${SLUG} is already linked from the footer; nothing changed`;

    const company = await prisma.navigationItem.findFirst({
      where: { menu: "FOOTER", parentId: null, label: "Company" },
      select: { id: true },
    });
    if (!company) return "no Company column in the footer to add to — skipped";

    /*
     * Ordered immediately after Contact rather than appended to the end, and
     * the order is read from the sibling rather than assumed: these columns
     * have been edited by hand in the admin panel and a hard-coded number
     * would land somewhere arbitrary.
     */
    const contact = await prisma.navigationItem.findFirst({
      where: { parentId: company.id, href: "/contact" },
      select: { displayOrder: true },
    });

    await prisma.navigationItem.create({
      data: {
        menu: "FOOTER",
        parentId: company.id,
        label: LABEL,
        href: SLUG,
        displayOrder: (contact?.displayOrder ?? 100) + 1,
        visible: true,
      },
    });

    return `linked ${SLUG} from the footer as "${LABEL}"`;
  },
};
