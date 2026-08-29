import type { ContentMigration } from "./types";

/**
 * The customer logo section becomes a wall, and stops calling anyone a customer.
 *
 * Two corrections to the section added a release ago, both prompted by the
 * organisation logo pack supplied for this site.
 *
 * ## A wall, not a belt
 *
 * The eight organisations named for it are eight. A belt with eight marks on
 * it spends most of every pass showing the gap between the end of the row and
 * the start of its copy — the movement that reads as breadth across
 * twenty-seven brands reads as a fault across eight. A static grid is the right
 * shape at this count, and the section can be switched back in the admin panel
 * if the number ever grows.
 *
 * ## And no heading of its own
 *
 * It read "Customers we work with". The organisations it will hold are
 * government, PSU and defence bodies, and the pack supplied with them says in
 * as many words not to present their marks as "clients", "customers" or
 * "partners" — which is the same conclusion this site reached from the
 * Emblems and Names Act, arrived at independently.
 *
 * Rather than replacing one heading with another, it loses its heading
 * altogether and becomes the visual half of the section directly above it,
 * which already says the true thing: "Organisations we have supplied technology
 * to". One claim, made once, in words that can be stood behind.
 *
 * ## Not desaturated
 *
 * The usual logo-wall treatment greys the marks until hovered. The pack says
 * "do not redraw or modify government emblems, preserve official proportions
 * and colors", and a greyscale filter is a modification. It stays off here.
 */

const WAS_HEADING = "Customers we work with";

export const organisationWall: ContentMigration = {
  id: "2026-08-organisation-wall",
  describe: "the organisation logos as a wall, under the heading that is already true",

  async apply(prisma) {
    const page = await prisma.page.findFirst({
      where: { slug: "" },
      select: { id: true, sections: { select: { id: true, type: true, data: true } } },
    });
    if (!page) return "no homepage record to change";

    const section = page.sections.find(
      (row) =>
        row.type === "LOGO_MARQUEE" &&
        (row.data as Record<string, unknown> | null)?.source === "clients",
    );
    if (!section) return "no customer logo section on the homepage";

    const data = section.data as Record<string, unknown>;

    // Only while it still holds what this release is correcting. A heading
    // somebody has since rewritten is their decision.
    if (data.layout === "wall") return "the organisation logos are already a wall";
    if (data.heading !== undefined && data.heading !== WAS_HEADING) {
      return `left alone — the heading has been edited to "${String(data.heading)}"`;
    }

    await prisma.pageSection.update({
      where: { id: section.id },
      data: {
        data: {
          source: "clients",
          limit: 24,
          layout: "wall",
          desaturate: false,
          // speed and reverse are belt settings and mean nothing to a wall;
          // dropped rather than carried as dead keys.
        },
      },
    });

    return "the organisation logos are a wall, with no heading of their own";
  },
};
