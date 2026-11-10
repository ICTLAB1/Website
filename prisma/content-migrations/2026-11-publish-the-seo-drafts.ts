import type { ContentMigration } from "./types";

/**
 * Publishes the eighteen articles and three pages written as drafts, and links
 * the two that nothing points at.
 *
 * `2026-11-seo-article-drafts` and `2026-11-seo-page-drafts` deliberately
 * created every row as DRAFT, because the brief that commissioned them said
 * to. The business has now asked for them to go live, which is this file.
 *
 * ## Publishing is three things, not one
 *
 * Flipping the status alone would have put twenty-one pages into the sitemap
 * that fail the site's own checks on the day they appear.
 *
 * **Metadata.** `scripts/verify/seo.mjs` fails any page whose meta description
 * runs past 160 characters — "the sentence is being cut mid-clause whatever
 * wrote it, and the fix is always available: cut a clause" — and any page
 * whose `<title>` passes 90. Eighteen of the twenty-one were over on the
 * description and three on the title, because they were written against the
 * looser bound in `tests/seo-content-drafts.test.ts`. Every one has been
 * rewritten in the two draft migrations, so this file has no metadata work to
 * do; it is recorded here because that is where somebody will look for it.
 *
 * **Orphans.** The same suite reports a sitemap URL that nothing on the site
 * links to, on the reasoning that a page offered to Google and reachable from
 * no page is a page the site does not believe in. Of the three new pages,
 * `/gem-software-supplier` is already linked from
 * `/blog/how-government-departments-procure-genuine-software`, which publishes
 * in the same breath. The two city pages are linked from nowhere at all, so
 * this adds them to the Delhi page's related list — which is where somebody
 * reading about licensing in Delhi would expect to find Noida and Gurugram,
 * and is therefore a link worth having rather than one placed to satisfy a
 * check.
 *
 * **Order.** Publishing happens after the linking, so there is no window in
 * which the pages are indexable and unreachable.
 *
 * ## What this does not touch
 *
 * Any row somebody has already published or edited by hand. The update is
 * filtered on `status: "DRAFT"`, so a page an administrator has since taken
 * further is left exactly as they left it, and a second run of this file is a
 * no-op rather than a way to resurrect something deliberately unpublished.
 */

const ARTICLE_SLUGS = [
  "what-is-a-digital-licence",
  "microsoft-365-business-standard-vs-business-premium",
  "microsoft-office-ltsc-2024-vs-microsoft-365",
  "how-to-buy-genuine-microsoft-licences-in-india",
  "microsoft-365-licensing-guide-for-indian-businesses",
  "windows-server-2025-licensing-explained",
  "adobe-creative-cloud-for-enterprise",
  "autocad-subscription-versus-the-alternatives",
  "autodesk-aec-collection-explained",
  "how-government-departments-procure-genuine-software",
  "common-software-licensing-mistakes",
  "adobe-creative-cloud-price-in-india",
  "microsoft-365-copilot-licensing-in-india",
  "autodesk-flex-versus-named-user-subscriptions",
  "preparing-for-a-software-licence-audit",
  "microsoft-365-versus-google-workspace-for-indian-smes",
  "adobe-vip-versus-vip-marketplace",
  "windows-11-pro-versus-enterprise-for-business",
];

const PAGE_SLUGS = [
  "gem-software-supplier",
  "software-licensing-company-noida",
  "software-licensing-company-gurugram",
];

/** The two city pages, and where a reader would look for them. */
const CITY_LINKS = [
  {
    label: "Software licensing in Noida",
    href: "/software-licensing-company-noida",
    description: "Licensing, renewals and asset management for Noida and Greater Noida.",
  },
  {
    label: "Software licensing in Gurugram",
    href: "/software-licensing-company-gurugram",
    description: "Licensing, renewals and compliance evidence for Gurugram offices.",
  },
];

type LinkItem = { label: string; href: string; description?: string };

export const publishTheSeoDrafts: ContentMigration = {
  id: "2026-11-publish-the-seo-drafts",
  describe: "publish the eighteen article and three page drafts, and link the two city pages",

  async apply(prisma) {
    const notes: string[] = [];

    /*
     * Linking first. A page that is indexable before anything links to it is
     * the orphan this is here to avoid, even for the minutes between two
     * statements in one migration.
     */
    const related = await prisma.pageSection.findFirst({
      where: { page: { slug: "software-licensing-company-delhi" }, type: "LINK_LIST" },
      select: { id: true, data: true },
      orderBy: { displayOrder: "asc" },
    });

    if (!related) {
      notes.push("no link list on the Delhi page; city pages left unlinked");
    } else {
      const data = (related.data ?? {}) as { items?: LinkItem[] };
      const items = Array.isArray(data.items) ? data.items : [];
      const missing = CITY_LINKS.filter(
        (link) => !items.some((item) => item.href === link.href),
      );
      if (missing.length === 0) {
        notes.push("city links already present");
      } else {
        await prisma.pageSection.update({
          where: { id: related.id },
          data: { data: { ...data, items: [...items, ...missing] } },
        });
        notes.push(`${missing.length} city link(s) added to the Delhi page`);
      }
    }

    const now = new Date();

    const posts = await prisma.blogPost.updateMany({
      where: { slug: { in: ARTICLE_SLUGS }, status: "DRAFT", deletedAt: null },
      data: { status: "PUBLISHED", publishedAt: now },
    });

    const pages = await prisma.page.updateMany({
      where: { slug: { in: PAGE_SLUGS }, status: "DRAFT", deletedAt: null },
      data: { status: "PUBLISHED", publishedAt: now },
    });

    return (
      `published ${posts.count} of ${ARTICLE_SLUGS.length} articles and ` +
      `${pages.count} of ${PAGE_SLUGS.length} pages (drafts only; ` +
      `anything already published or edited was left alone)` +
      (notes.length ? `; ${notes.join("; ")}` : "")
    );
  },
};
