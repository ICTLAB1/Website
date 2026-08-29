import type { ContentMigration } from "./types";

/**
 * A place on the homepage for customer logos, ready before there are any.
 *
 * The block renders nothing while it is empty — no heading, no band, no gap —
 * so this changes the page not at all until somebody adds a customer, confirms
 * the permission and publishes the row. That is the point of adding it now
 * rather than later: the person with the permissions on file should be able to
 * put a logo on the site from the admin panel without waiting for a deploy.
 *
 * It goes directly beneath "Organisations we have supplied technology to",
 * which is the same claim in text. The text list is not replaced by it. Naming
 * a customer and reproducing their mark are different acts — the first is a
 * statement of fact this business can stand behind for every organisation
 * listed, the second needs that organisation's permission — so the list stays
 * whole regardless of how many marks ever join it.
 *
 * ## Why it inserts rather than appends
 *
 * A logo strip at the bottom of the page, under the call to action, is a strip
 * nobody sees. Inserting means shifting everything below it down one, which is
 * done in a transaction and from the bottom up so no two sections ever hold
 * the same displayOrder mid-flight.
 */

const AFTER_HEADING = "Organisations we have supplied technology to";

export const clientBelt: ContentMigration = {
  id: "2026-08-client-belt",
  describe: "a homepage slot for customer logos, empty until permissions are on file",

  async apply(prisma) {
    const page = await prisma.page.findFirst({
      where: { slug: "" },
      select: { id: true, sections: { select: { id: true, type: true, displayOrder: true, data: true } } },
    });

    if (!page) return "no homepage record to change";

    const existing = page.sections.find(
      (section) =>
        section.type === "LOGO_MARQUEE" &&
        (section.data as Record<string, unknown> | null)?.source === "clients",
    );
    if (existing) return "the homepage already has a customer logo strip";

    const anchor = page.sections.find(
      (section) =>
        section.type === "CHIP_LIST" &&
        (section.data as Record<string, unknown> | null)?.heading === AFTER_HEADING,
    );

    /*
     * No anchor means the section it belongs under has been removed or
     * rewritten, which is a decision. Appending it somewhere arbitrary would be
     * this migration overruling that decision on a guess.
     */
    if (!anchor) return "the organisations section is gone — no slot added";

    const at = anchor.displayOrder + 1;
    const below = page.sections
      .filter((section) => section.displayOrder >= at)
      .sort((a, b) => b.displayOrder - a.displayOrder);

    await prisma.$transaction([
      ...below.map((section) =>
        prisma.pageSection.update({
          where: { id: section.id },
          data: { displayOrder: section.displayOrder + 1 },
        }),
      ),
      prisma.pageSection.create({
        data: {
          pageId: page.id,
          type: "LOGO_MARQUEE",
          displayOrder: at,
          visible: true,
          data: {
            heading: "Customers we work with",
            source: "clients",
            limit: 24,
            speed: "steady",
            // Opposite to the brand belt above it. Two strips running the same
            // way read as one thing that has stalled; running apart, they read
            // as two.
            reverse: true,
          },
        },
      }),
    ]);

    return `customer logo strip added at position ${at}, showing nothing until a permission is confirmed`;
  },
};
