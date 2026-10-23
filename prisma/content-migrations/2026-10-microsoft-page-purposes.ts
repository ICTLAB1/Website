import type { ContentMigration } from "./types";

/**
 * Nine Microsoft URLs, four of them arguing the same case.
 *
 * The site has `/microsoft`, `/microsoft-365`, `/microsoft-office`,
 * `/microsoft-licensing`, `/microsoft-csp`, `/microsoft-office-ltsc`, two
 * Microsoft 365 plan pages and `/brands/microsoft`. Most of those are fine.
 * Four were not, and the overlap was in the metadata rather than in the bodies
 * — which is the harder kind to notice, because every page reads well on its
 * own:
 *
 *   /microsoft          Microsoft Licensing, Cloud & Enterprise Solutions
 *   /brands/microsoft   Microsoft Licensing & Solutions
 *
 * and their descriptions were the same sentence with one word changed:
 *
 *   /microsoft          "Microsoft 365, Office, Windows Server, SQL Server,
 *                        Dynamics 365 and Azure licensing, under the purchasing
 *                        programme that suits how your organisation buys."
 *   /brands/microsoft   "Microsoft 365, Office, Windows, Windows Server, SQL
 *                        Server, Dynamics 365 and Azure, supplied under the
 *                        licensing programme that fits how your organisation
 *                        buys."
 *
 * The brand page's own body prose then repeated `/microsoft`'s hero
 * subheadline nearly verbatim: "Microsoft licensing spans several purchasing
 * programmes, and the right one depends on your organisation's size, contract
 * appetite and how quickly your seat count changes."
 *
 * Two keyword collisions on top of that: `/microsoft` and
 * `/microsoft-licensing` both claimed "microsoft licensing", and
 * `/microsoft-office` claimed "volume licensing" and "perpetual office" —
 * which are what `/microsoft-office-ltsc` exists to answer.
 *
 * ## Nothing is merged or redirected
 *
 * Each page keeps its URL and its self-referencing canonical. They serve
 * different intents and a buyer arriving on any one of them is in the right
 * place; what was wrong is that the metadata did not say which intent, so the
 * four competed for one query instead of covering four.
 *
 * ## The purpose each one now states
 *
 * | URL | What it is for |
 * | --- | --- |
 * | `/microsoft` | the broad estate: which Microsoft products this business supplies, and the solutions built on them |
 * | `/microsoft-365` | plans and business subscriptions — seat sizing, the 300-seat cap, INR and GST |
 * | `/microsoft-office` | Office LTSC against Microsoft 365, for somebody choosing between them |
 * | `/brands/microsoft` | the catalogue directory: what is actually listed, by category |
 *
 * `/microsoft` loses the programme comparison from its description because
 * `/microsoft-licensing` is the page that does it properly, and now links
 * there instead of restating it. `/microsoft-365`'s title said "Cloud
 * Productivity Software for Business India", which claims a generic phrase
 * nobody searches and does not claim the one they do.
 *
 * The brand page's title is generated in `app/brands/[slug]/page.tsx` from what
 * the brand has in the catalogue, so the half of this fix that separates it
 * from `/microsoft` is a code change rather than a row: it is the template that
 * said "Licensing & Solutions" for all forty brands, and every one of those
 * pages is a directory rather than an argument.
 */

type PageEdit = {
  slug: string;
  title: string;
  description: string;
  keywords: string[];
  /** Replaces the `items` of the page's LINK_LIST section, where it has one. */
  related?: { href: string; label: string; description: string }[];
};

const EDITS: PageEdit[] = [
  {
    slug: "microsoft",
    title: "Microsoft Products & Enterprise Solutions",
    description:
      "Every Microsoft product we supply — Microsoft 365, Office, Windows, Windows Server, SQL Server, Dynamics 365 and Azure — and the solutions built on them.",
    /*
     * "microsoft licensing" is gone: it belongs to /microsoft-licensing, which
     * is a comparison of the purchasing programmes and is the better answer to
     * that query than a hub page. What is left describes the estate, which is
     * what this page covers and what no other page here claims.
     */
    keywords: [
      "microsoft products",
      "microsoft solutions",
      "microsoft partner india",
      "windows server",
      "dynamics 365",
      "azure",
    ],
    related: [
      {
        href: "/microsoft-licensing",
        label: "Which programme to buy under",
        description: "CSP, Enterprise Agreement and volume licensing compared, with the thresholds",
      },
      {
        href: "/microsoft-365",
        label: "Microsoft 365 plans",
        description: "Business and Enterprise tiers, seat sizing and the 300-seat cap",
      },
      {
        href: "/microsoft-office",
        label: "Office LTSC or Microsoft 365",
        description: "Choosing between a perpetual Office and a subscription",
      },
      {
        href: "/brands/microsoft",
        label: "Microsoft in the catalogue",
        description: "Every Microsoft product listed, by category, with pricing on request",
      },
    ],
  },
  {
    slug: "microsoft-365",
    /*
     * The old title was "Cloud Productivity Software for Business India",
     * which does not contain the name of the product the page is about. A
     * title is the strongest signal a page has about what it answers, and this
     * one spent it on a phrase nobody types.
     */
    title: "Microsoft 365 Plans & Business Subscriptions",
    description:
      "Compare Microsoft 365 Business and Enterprise plans for Indian teams: seat sizing, the 300-user cap, CSP subscription pricing in INR and GST invoicing.",
    keywords: [
      "microsoft 365 plans",
      "microsoft 365 business subscription",
      "m365 pricing india",
      "business standard",
      "business premium",
      "e3",
      "e5",
    ],
    related: [
      {
        href: "/microsoft-365/business-standard",
        label: "Business Standard",
        description: "Desktop Office, 50 GB mailboxes, Teams and 1 TB of OneDrive per user",
      },
      {
        href: "/microsoft-365/business-premium",
        label: "Business Premium",
        description: "Everything in Standard, plus Intune and Defender for Office 365",
      },
      {
        href: "/microsoft-office",
        label: "Or a perpetual Office instead",
        description: "Where Office LTSC is the better answer than a subscription",
      },
      {
        href: "/services/microsoft-365",
        label: "Microsoft 365 deployment",
        description: "Tenant design, migration and licence assignment",
      },
    ],
  },
  {
    slug: "microsoft-office",
    /*
     * Repositioned from "Perpetual & Subscription" to the comparison it
     * actually is. The keywords it used to claim — "volume licensing",
     * "perpetual office", "office 2024" — are the queries
     * /microsoft-office-ltsc answers in detail, and two pages competing for
     * them meant neither won. This page keeps the comparison queries, which
     * that page does not claim.
     */
    title: "Office LTSC vs Microsoft 365 — Which to Buy",
    description:
      "Office LTSC 2024 compared with a Microsoft 365 subscription: what each costs over three years, what LTSC gives up, and which suits a device that cannot update.",
    keywords: [
      "office ltsc vs microsoft 365",
      "perpetual office or subscription",
      "buy microsoft office business",
      "office licence comparison",
    ],
    related: [
      {
        href: "/microsoft-office-ltsc",
        label: "Office LTSC 2024 in detail",
        description: "Volume licensing, device binding and the update policy",
      },
      {
        href: "/microsoft-365",
        label: "Microsoft 365 plans in detail",
        description: "What each subscription tier includes, and how seats are sized",
      },
      {
        href: "/microsoft-licensing",
        label: "How either one is purchased",
        description: "CSP, Enterprise Agreement and volume licensing compared",
      },
      {
        href: "/brands/microsoft",
        label: "Microsoft in the catalogue",
        description: "Every Microsoft product listed, by category",
      },
    ],
  },
];

/**
 * The brand row. Its `summary` becomes the meta description and is already a
 * product list, which is right for a directory; its `description` is the body
 * prose, and that is the half that repeated `/microsoft`'s argument.
 */
const BRAND_DESCRIPTION = `This page lists what is actually in the catalogue under Microsoft, grouped by category: Microsoft 365 subscriptions, perpetual and LTSC Office, Windows and Windows Server, SQL Server, Dynamics 365 and Azure consumption. Every item is quoted on request, in INR with GST, on one quotation and one purchase order with the rest of your estate.

Which purchasing programme that quotation should be raised under is a separate question, and often the one worth settling first. [Microsoft licensing](/microsoft-licensing) compares Cloud Solution Provider, Enterprise Agreement and volume licensing against the thresholds that decide between them, and [Microsoft products and solutions](/microsoft) covers the estate as a whole.`;

export const microsoftPagePurposes: ContentMigration = {
  id: "2026-10-microsoft-page-purposes",
  describe: "give each Microsoft URL one purpose, so four of them stop competing for one query",

  async apply(prisma) {
    const changed: string[] = [];

    for (const edit of EDITS) {
      const page = await prisma.page.findFirst({
        where: { slug: edit.slug, deletedAt: null },
        select: { id: true, title: true },
      });

      // A catalogue that never had the page. A reason to leave it alone rather
      // than to create something this migration has no body copy for.
      if (!page) continue;

      await prisma.page.update({
        where: { id: page.id },
        data: {
          title: edit.title,
          description: edit.description,
          keywords: edit.keywords,
        },
      });

      /*
       * The related-links block, matched on its type rather than its order:
       * these pages have been edited in the admin panel and the LINK_LIST is
       * not at a fixed index. Only the items change — the heading and the
       * layout are whatever somebody chose.
       */
      if (edit.related) {
        const list = await prisma.pageSection.findFirst({
          where: { pageId: page.id, type: "LINK_LIST" },
          select: { id: true, data: true },
        });

        if (list) {
          const data = (list.data ?? {}) as Record<string, unknown>;
          await prisma.pageSection.update({
            where: { id: list.id },
            data: { data: { ...data, items: edit.related } },
          });
        }
      }

      changed.push(`/${edit.slug}`);
    }

    const brand = await prisma.brand.findFirst({
      where: { slug: "microsoft", deletedAt: null },
      select: { id: true },
    });

    let brandChanged = false;
    if (brand) {
      await prisma.brand.update({
        where: { id: brand.id },
        data: { description: BRAND_DESCRIPTION },
      });
      brandChanged = true;
    }

    if (changed.length === 0 && !brandChanged) {
      return "no Microsoft pages or brand row to separate; nothing changed";
    }

    return `separated ${changed.length} Microsoft page${changed.length === 1 ? "" : "s"} (${changed.join(", ") || "none"})${brandChanged ? " and rewrote the brand directory copy" : ""}`;
  },
};
