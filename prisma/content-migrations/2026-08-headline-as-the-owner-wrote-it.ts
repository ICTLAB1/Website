import type { ContentMigration } from "./types";

/**
 * The homepage headline, in the owner's own words.
 *
 * `2026-08-homepage-headline` replaced "Trusted IT & Software Solutions
 * Partner" with a line built to carry search demand: the three publishers with
 * the most products behind them, the market, and the buyer. The reasoning was
 * an SEO audit's and it was not wrong about the problem — "trusted partner" is
 * what every competitor writes, and it ranks for nothing.
 *
 * It was wrong about the answer, in two ways the owner spotted immediately.
 * Naming Microsoft, Adobe and Autodesk describes half the catalogue and drops
 * the other half: forty-two of the ninety products are HP, Dell and HPE
 * hardware, and a headline that omits them tells a buyer looking for
 * workstations that they are in the wrong place. And at seventy-six characters
 * it set three lines deep in the hero, which is a lot of weight for a line
 * whose job is to be read at a glance.
 *
 * This is the owner's wording, verbatim: the original with the missing half
 * put back. It is shorter, it covers both halves of what this business sells,
 * and it is theirs — which matters more than an audit's preference, because a
 * homepage headline is a positioning decision and positioning is not an
 * engineering call.
 *
 * The search-demand problem is real and is not solved by this line. It is
 * better addressed where the demand actually is — the product titles already
 * carry keyword, intent and geography, and the landing pages exist for the
 * high-volume terms — than by making the front door read like a keyword list.
 *
 * Matched against the exact text it replaces, so a headline edited in the
 * admin panel since is reported and left alone.
 */

const FROM = "Microsoft, Adobe and Autodesk licensing for Indian enterprises and government";
const TO = "Trusted IT Hardware & Software Solutions Partner";

export const headlineAsTheOwnerWroteIt: ContentMigration = {
  id: "2026-08-headline-as-the-owner-wrote-it",
  describe: "the homepage headline, in the owner's own words",

  async apply(prisma) {
    const page = await prisma.page.findFirst({
      where: { slug: "" },
      select: { sections: { select: { id: true, type: true, data: true } } },
    });
    if (!page) return "no homepage record to change";

    const hero = page.sections.find(
      (row) =>
        row.type === "HERO" && (row.data as Record<string, unknown> | null)?.headline === FROM,
    );
    if (!hero) {
      const current = page.sections.find((row) => row.type === "HERO");
      const headline = (current?.data as Record<string, unknown> | null)?.headline;
      return headline === TO
        ? "the homepage headline is already the owner's wording"
        : `the homepage headline is "${String(headline ?? "missing")}", not the one this expected — left alone`;
    }

    await prisma.pageSection.update({
      where: { id: hero.id },
      data: { data: { ...(hero.data as Record<string, unknown>), headline: TO } },
    });

    return `homepage headline set to "${TO}"`;
  },
};
