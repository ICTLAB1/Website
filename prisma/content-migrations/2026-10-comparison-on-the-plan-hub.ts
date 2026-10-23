import type { ContentMigration } from "./types";

/**
 * Moves the Microsoft plan comparison to the page that promises it.
 *
 * `2026-10-microsoft-comparison-tables` put both tables on
 * `/get-a-quote/microsoft`, under the price grid, on the reasoning that
 * somebody who has just read the prices asks what the difference is. That
 * reasoning is sound and the placement still came out wrong, for a reason
 * visible on the page itself: the quote page's "Related pages" list already
 * carries a link reading **"Compare all Microsoft 365 plans"**, pointing at
 * `/microsoft-365`.
 *
 * So the site offered the comparison on the page a reader was being sent
 * *away from*, and the page they were sent *to* — whose own section is headed
 * "Plans compared" — had a plan grid and no feature comparison at all. A
 * visitor following the obvious path found less than one who ignored it. The
 * business looked for the tables and did not find them, which is the whole of
 * the evidence needed.
 *
 * ## Moved rather than copied
 *
 * Two indexable URLs carrying the same ninety-row matrix is the duplication
 * `2026-10-microsoft-page-purposes` spent a release removing: each Microsoft
 * URL states one purpose, and "what each plan includes" cannot be the purpose
 * of two of them. `/microsoft-365` is where it belongs — it is the page about
 * the plans, and `/get-a-quote/microsoft` is the page about what they cost.
 * The quote page keeps its link, which now leads somewhere that answers it.
 *
 * ## Placed where the question is asked
 *
 * Immediately after the `PLANS` block, before the catalogue grid. The order of
 * the page follows the order of the question: here are the plans, here is what
 * separates them, here is where to buy them.
 *
 * Idempotent: it moves whatever comparison tables are still on the quote page
 * and reports nothing to do when there are none, so a second run cannot drag
 * a table an editor has since moved back out from under them.
 */

/** Right after `PLANS` (60) and before `PRODUCT_GRID` (70). */
const BUSINESS_ORDER = 62;
const ENTERPRISE_ORDER = 64;

export const comparisonOnThePlanHub: ContentMigration = {
  id: "2026-10-comparison-on-the-plan-hub",
  describe: "moves the Microsoft plan comparison tables to /microsoft-365",

  async apply(prisma) {
    const hub = await prisma.page.findUnique({
      where: { slug: "microsoft-365" },
      select: { id: true },
    });
    if (!hub) return "no /microsoft-365 page to move the comparison onto; nothing changed";

    const tables = await prisma.pageSection.findMany({
      where: { page: { slug: "get-a-quote/microsoft" }, type: "COMPARISON_TABLE" },
      select: { id: true, data: true },
    });
    if (tables.length === 0) return "no comparison table on the quote page; nothing changed";

    let moved = 0;
    for (const table of tables) {
      /*
       * Which of the two this is, read from its own heading rather than from
       * the order they came back in. `findMany` has no order here, and
       * publishing the enterprise matrix above the SMB one would be a quiet
       * wrong answer rather than a visible failure.
       */
      const heading = String((table.data as { heading?: unknown } | null)?.heading ?? "");
      const isEnterprise = /enterprise/i.test(heading);

      await prisma.pageSection.update({
        where: { id: table.id },
        data: {
          pageId: hub.id,
          displayOrder: isEnterprise ? ENTERPRISE_ORDER : BUSINESS_ORDER,
        },
      });
      moved += 1;
    }

    /*
     * And say so on the hub that links to it. `/microsoft` offers
     * "Microsoft 365 plans" with a description listing the tiers and the seat
     * cap; a reader looking for a feature comparison has no reason to think
     * that is where it is. One clause, in the place somebody reads before
     * deciding which of five Microsoft pages to open.
     */
    let relabelled = 0;
    const related = await prisma.pageSection.findFirst({
      where: { page: { slug: "microsoft" }, type: "LINK_LIST" },
      select: { id: true, data: true },
    });
    const data = related?.data as { items?: Array<{ href?: string; description?: string }> } | null;
    const item = data?.items?.find((entry) => entry.href === "/microsoft-365");
    if (related && data && item && !/compare/i.test(item.description ?? "")) {
      item.description =
        "Business and Enterprise tiers compared feature by feature, with seat sizing and the 300-seat cap";
      await prisma.pageSection.update({ where: { id: related.id }, data: { data } });
      relabelled = 1;
    }

    const parts = [
      `moved ${moved} comparison table${moved === 1 ? "" : "s"} from /get-a-quote/microsoft to /microsoft-365`,
    ];
    if (relabelled) parts.push("and said so in the related-pages list on /microsoft");
    return parts.join(", ");
  },
};
