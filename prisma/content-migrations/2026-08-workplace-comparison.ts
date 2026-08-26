import type { ContentMigration } from "./types";

/**
 * Microsoft 365 out of the Zoho Workplace buy grid, into a comparison.
 *
 * ## What was wrong
 *
 * The page argues that Zoho Workplace costs less per seat than the mainstream
 * suites, and its product grid listed Zoho Workplace, Zoho Mail and Microsoft
 * 365 Business Standard together under "Workplace licensing and the
 * alternative". Three identical cards, each with an Add to Enquiry button.
 *
 * Business Standard carries a real sale price — ₹11,800 against ₹12,500 — so
 * the grid rendered it with a "5% OFF" badge and the list price struck through.
 * On a page whose whole argument is that the alternative is expensive, the
 * alternative had the only promotional badge and the largest figure. The
 * layout was arguing against the copy.
 *
 * ## What this does
 *
 * Takes the Microsoft slug out of the grid, retitles the grid to "Workplace
 * licensing" so the heading still describes what is under it, and inserts a
 * PRICE_COMPARISON block below: the same two products, priced from the
 * catalogue, with no purchase action and no discount badge.
 *
 * The comparison shows the effective price on both sides, sale included. The
 * badge going away is not a licence to quote a competitor's list price while
 * the site sells it cheaper.
 *
 * ## What it will not do
 *
 * Touch a grid somebody has edited since. It matches on the exact slug list it
 * expects; anything else is a choice somebody made, and is reported instead.
 */
const PAGE = "zoho-workplace";
const EXPECTED = ["zoho-workplace", "zoho-mail", "microsoft-365-business-standard"];
const KEPT = ["zoho-workplace", "zoho-mail"];

const OURS = "zoho-workplace";
const AGAINST = "microsoft-365-business-standard";

export const workplaceComparison: ContentMigration = {
  id: "2026-08-workplace-comparison",
  describe: "the Microsoft alternative on the Zoho Workplace page, out of the buy grid",

  async apply(prisma) {
    const page = await prisma.page.findUnique({
      where: { slug: PAGE },
      select: { id: true, sections: { select: { id: true, type: true, data: true, displayOrder: true } } },
    });

    if (!page) return `no ${PAGE} page — nothing to change`;

    const grid = page.sections.find((section) => section.type === "PRODUCT_GRID");
    if (!grid) return `no product grid on ${PAGE} — nothing to change`;

    const data = grid.data as { slugs?: unknown; heading?: unknown };
    const slugs = Array.isArray(data.slugs) ? data.slugs.map(String) : [];

    // Already done, or already changed by hand.
    if (!slugs.includes(AGAINST)) {
      return `the ${PAGE} grid no longer lists the alternative — left alone`;
    }

    if (slugs.length !== EXPECTED.length || !EXPECTED.every((slug, index) => slugs[index] === slug)) {
      return `the ${PAGE} grid lists ${slugs.join(", ")} — left alone; move the alternative by hand if that is stale`;
    }

    await prisma.pageSection.update({
      where: { id: grid.id },
      data: {
        data: { ...(grid.data as object), slugs: KEPT, heading: "Workplace licensing" },
      },
    });

    /*
     * Only if one is not already there. A second comparison block would render
     * the same two products twice, which is the sort of thing a re-run of a
     * migration that was supposed to be idempotent quietly produces.
     */
    const existing = page.sections.find((section) => section.type === "PRICE_COMPARISON");
    if (existing) return "the alternative is out of the grid; a comparison was already present";

    await prisma.pageSection.create({
      data: {
        pageId: page.id,
        type: "PRICE_COMPARISON",
        displayOrder: grid.displayOrder + 1,
        visible: true,
        data: {
          heading: "Workplace against the mainstream alternative",
          description:
            "The per-seat difference this page is about, at the price each is sold for here.",
          ourSlug: OURS,
          againstSlugs: [AGAINST],
          note: "Per seat, on the annual commitment each publisher lists, exclusive of GST. Both are sold here; the comparison is the cost, not a recommendation against Microsoft.",
        },
      },
    });

    return "moved the Microsoft alternative out of the Zoho Workplace grid and into a priced comparison";
  },
};
