import type { ContentMigration } from "./types";

/**
 * The homepage brand strip becomes a moving belt.
 *
 * The section under the hero has always been the same thing — the marks of the
 * publishers and manufacturers this business resells — rendered as a static
 * wrapped row. It now rides a continuously scrolling belt, which is what the
 * section was reaching for: a row of twenty-seven marks that wraps onto three
 * lines reads as a list, and the same twenty-seven passing steadily reads as
 * breadth.
 *
 * ## What does not change
 *
 * The heading. It is authored copy that somebody signed off, and a migration
 * that swapped the block type *and* rewrote the claim above it would be two
 * changes wearing one name. If the wording wants revisiting that is an edit in
 * the admin panel, deliberate and attributable.
 *
 * The brands. Both blocks read the catalogue at render time and neither stores
 * a mark; the belt narrows to brands that actually have artwork on file, which
 * the strip did not, because a moving row of lettered wordmarks looks like a
 * rendering failure rather than a design.
 *
 * ## Why it checks the stored payload first
 *
 * Same rule as every migration here. It converts the block only while it still
 * holds exactly the shape this release is replacing: brands, strip layout, and
 * a heading nobody has touched. Anything else — a different layout, a rewritten
 * heading, a block already converted — is somebody's decision, and it is left
 * alone.
 */

const HEADING = "Authorised to resell licensing from";

export const logoMarquee: ContentMigration = {
  id: "2026-08-logo-marquee",
  describe: "the homepage brand strip, as a moving belt",

  async apply(prisma) {
    const page = await prisma.page.findFirst({
      where: { slug: "" },
      select: { id: true, sections: { select: { id: true, type: true, data: true } } },
    });

    if (!page) return "no homepage record to change";

    if (page.sections.some((section) => section.type === "LOGO_MARQUEE")) {
      return "the homepage already carries a logo belt";
    }

    const strip = page.sections.find((section) => {
      if (section.type !== "COLLECTION_GRID") return false;
      const data = section.data as Record<string, unknown> | null;
      return (
        data !== null &&
        data.kind === "brands" &&
        data.layout === "strip" &&
        data.heading === HEADING
      );
    });

    if (!strip) return "the homepage brand strip has been edited — left alone";

    const previous = strip.data as Record<string, unknown>;

    await prisma.pageSection.update({
      where: { id: strip.id },
      data: {
        type: "LOGO_MARQUEE",
        data: {
          heading: HEADING,
          source: "withLogo",
          // Carried across rather than defaulted: 24 was a decision about how
          // much of the brand list belongs above the fold, and it survives the
          // change of block type.
          limit: typeof previous.limit === "number" ? previous.limit : 24,
          speed: "steady",
          reverse: false,
        },
      },
    });

    return "the homepage brand strip now scrolls";
  },
};
