import type { ContentMigration } from "./types";

import { organisationSeeds } from "../seed-data/organisations";

/**
 * Six more organisations, by name.
 *
 * The business supplied marks for the National Security Guard, HUDCO, Sardar
 * Patel University, Nagpur Metro, RITES and BARC and asked for their names and
 * logos on the site. This adds the names.
 *
 * The logos are not here. They arrived pasted into a conversation rather than
 * as files, so there is nothing on disk to install. What this does create is a
 * `ClientLogo` row per organisation with no artwork, so that uploading a file
 * at /admin/clients is the only step left — and `lib/client-logo` keeps a row
 * without artwork off the site regardless of anything else, so an empty one
 * cannot appear as a gap in the line.
 *
 * ## Why the names go in the text list rather than waiting
 *
 * The text list and the logo line make the same claim by different means, and
 * only one of them needs artwork. A name this business can stand behind is
 * useful on the page today; holding all six back until six PNGs arrive would
 * be letting the presentation decide what the site is allowed to say.
 *
 * The names are as each organisation writes its own. Appended rather than
 * sorted: the existing order was somebody's, and re-sorting a list to insert
 * into it is a change nobody asked for.
 */

const HEADING = "Organisations we have supplied technology to";

/** As each organisation writes it, read from the marks the business supplied. */
const ADDED = [
  "National Security Guard",
  "HUDCO",
  "Sardar Patel University",
  "Nagpur Metro",
  "RITES",
  "Bhabha Atomic Research Centre",
];

export const moreOrganisations: ContentMigration = {
  id: "2026-08-more-organisations",
  describe: "six more organisations named on the homepage",

  async apply(prisma) {
    /*
     * A row per organisation, ready for its artwork.
     *
     * Created here rather than left to the earlier emblem migration, which has
     * already run everywhere it is going to. Matched on id, so this adds only
     * what is absent and a second run does nothing.
     */
    let rows = 0;
    for (const organisation of organisationSeeds) {
      const exists = await prisma.clientLogo.findUnique({
        where: { id: organisation.id },
        select: { id: true },
      });
      if (exists) continue;

      await prisma.clientLogo.create({
        data: {
          id: organisation.id,
          name: organisation.name,
          logoUrl: organisation.logoUrl,
          sector: organisation.sector,
          displayOrder: organisation.displayOrder,
          // Published, so that the moment artwork is uploaded the mark appears
          // without a second decision. Until then the row has no logo and is
          // not shown.
          published: true,
        },
      });
      rows += 1;
    }

    const page = await prisma.page.findFirst({
      where: { slug: "" },
      select: { id: true, sections: { select: { id: true, type: true, data: true } } },
    });
    const waiting = rows > 0 ? `, ${rows} awaiting artwork under Customer logos` : "";

    if (!page) return `no homepage record to change${waiting}`;

    const section = page.sections.find(
      (row) =>
        row.type === "CHIP_LIST" &&
        (row.data as Record<string, unknown> | null)?.heading === HEADING,
    );
    if (!section) return `the organisations list is gone — no names added${waiting}`;

    const data = section.data as Record<string, unknown>;
    const existing = Array.isArray(data.items) ? (data.items as string[]) : [];

    // Only the ones not already there, so a second run adds nothing and an
    // organisation somebody typed in by hand is not duplicated.
    const missing = ADDED.filter((name) => !existing.includes(name));
    if (missing.length === 0) return `all six organisations are already listed${waiting}`;

    await prisma.pageSection.update({
      where: { id: section.id },
      data: { data: { ...data, items: [...existing, ...missing] } },
    });

    return `${missing.length} organisation(s) added to the homepage list${waiting}`;
  },
};
