import type { ContentMigration } from "./types";

import { industrySeeds } from "../seed-data/industries";

/**
 * The sixteen sectors, and the homepage grid that replaces the chip list.
 *
 * Two changes, and they belong together: the rows are useless without somewhere
 * to render them, and the grid is an empty section without the rows.
 *
 * ## The chip list it replaces
 *
 * The homepage said "Industries we serve" over five words — Defence, Education,
 * Banking & Finance, Manufacturing, and one ministry. Five plain chips is a
 * list of words a reader cannot act on; sixteen cards that each say what is
 * supplied to that sector, and lead to a page about it, is the same claim made
 * useful. The five are all inside the sixteen.
 *
 * The one that is not a sector — "Ministry of Health and Family Welfare" — was
 * a named organisation sitting in a list of industries. It belongs with the
 * organisations further down the page, and it is already there.
 *
 * ## Why rows are created rather than left to the seed
 *
 * `prisma/seed.ts` runs on an empty database only. A live site would get the
 * block and no sectors, which renders nothing at all — so the rows have to be
 * created here too. `upsert` on the slug means running this after a seed, or
 * twice, changes nothing.
 */

const REPLACES = "Industries we serve";

export const industries: ContentMigration = {
  id: "2026-08-industries",
  describe: "sixteen sectors, and the homepage grid that shows them",

  async apply(prisma) {
    let created = 0;
    for (const industry of industrySeeds) {
      const data = {
        name: industry.name,
        summary: industry.summary,
        description: industry.description,
        icon: industry.icon,
        solutions: industry.solutions,
        brandSlugs: industry.brandSlugs,
        serviceSlugs: industry.serviceSlugs,
        categorySlugs: industry.categorySlugs,
        displayOrder: industry.displayOrder,
      };
      const before = await prisma.industry.findUnique({ where: { slug: industry.slug } });
      await prisma.industry.upsert({
        where: { slug: industry.slug },
        create: { ...data, slug: industry.slug },
        /*
         * An existing row keeps its copy — somebody may have rewritten a
         * summary in the admin panel, and a release note is not a reason to
         * undo that — but an empty mapping is filled.
         *
         * An empty array is not an edit; it is a row created before these
         * columns existed. Filling it is the difference between a sector page
         * that links into the catalogue and one that is three paragraphs and a
         * button.
         */
        update: {
          ...(before && before.brandSlugs.length === 0 ? { brandSlugs: industry.brandSlugs } : {}),
          ...(before && before.serviceSlugs.length === 0
            ? { serviceSlugs: industry.serviceSlugs }
            : {}),
          ...(before && before.categorySlugs.length === 0
            ? { categorySlugs: industry.categorySlugs }
            : {}),
        },
      });
      if (!before) created += 1;
    }

    /*
     * A menu entry, so the sixteen pages are reachable from every page rather
     * than only from the homepage grid.
     *
     * Between Solutions and Services: a reader who thinks in terms of their own
     * sector looks near "Solutions", and a reader who thinks in terms of what
     * they are buying looks further right. Placed once — an entry the owner
     * moves in the navigation editor afterwards stays where they put it.
     */
    const already = await prisma.navigationItem.findFirst({
      where: { menu: "HEADER", href: "/industries" },
      select: { id: true },
    });

    const linked = already === null;
    if (linked) {
      await prisma.navigationItem.create({
        data: {
          menu: "HEADER",
          label: "Industries",
          href: "/industries",
          description: "Technology procurement by sector",
          displayOrder: 25,
          visible: true,
        },
      });
    }

    const page = await prisma.page.findFirst({
      where: { slug: "" },
      select: { id: true, sections: { select: { id: true, type: true, displayOrder: true, data: true } } },
    });
    const menu = linked ? "; Industries added to the header" : "";

    if (!page) return `${created} sector(s) created${menu}; no homepage record to change`;

    if (page.sections.some((section) => section.type === "INDUSTRY_GRID")) {
      return `${created} sector(s) created${menu}; the homepage already has an industry grid`;
    }

    const chips = page.sections.find(
      (section) =>
        section.type === "CHIP_LIST" &&
        (section.data as Record<string, unknown> | null)?.heading === REPLACES,
    );

    // No chip list means it has been edited or removed, which is a decision.
    if (!chips) return `${created} sector(s) created${menu}; the industries chip list is gone — left alone`;

    await prisma.pageSection.update({
      where: { id: chips.id },
      data: {
        type: "INDUSTRY_GRID",
        data: {
          eyebrow: "Industries we serve",
          heading: "Built for how your sector actually buys",
          description:
            "Procurement rules, security requirements and licensing models differ by sector. These are the ones we work within routinely.",
          // The filter belongs on /industries, where all sixteen are. Eight
          // cards and a way through is the right amount of this for a homepage.
          filterable: false,
          limit: 8,
          action: { label: "All industries", href: "/industries" },
        },
      },
    });

    return `${created} sector(s) created${menu}; the homepage chip list is now a grid of eight`;
  },
};
