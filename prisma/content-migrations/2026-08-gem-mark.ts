import type { Prisma } from "@prisma/client";

import type { ContentMigration } from "./types";

/**
 * The GeM mark on the homepage's "Registered GeM seller" panel.
 *
 * Adds one key to one block's payload rather than replacing the block, because
 * everything else in that panel — the bullets, the tiles, the wording — is
 * content somebody may have edited since it was seeded, and this change is
 * about the artwork only.
 *
 * Matched on the eyebrow, which is the panel's subject rather than its prose:
 * a person tightening the description or adding a bullet keeps the mark, and a
 * person who has repurposed the panel for something other than GeM no longer
 * matches and does not get a government mark dropped into their section.
 *
 * Refuses to overwrite a logo already on the block for the same reason the
 * brand-logo migration leaves an uploaded logo alone: a value that is already
 * there was put there by someone.
 */
export const gemMark: ContentMigration = {
  id: "2026-08-gem-mark",
  describe: "the GeM mark on the homepage's GeM panel",

  async apply(prisma) {
    const page = await prisma.page.findUnique({ where: { slug: "" }, select: { id: true } });
    if (!page) return "no home page — skipped";

    const rows = await prisma.pageSection.findMany({
      where: { pageId: page.id, type: "SPLIT_PANEL" },
      select: { id: true, data: true },
    });

    const target = rows.find(
      (row) => (row.data as { eyebrow?: string } | null)?.eyebrow === "Government e-Marketplace",
    );
    if (!target) return "no GeM panel on the home page — skipped";

    const data = (target.data ?? {}) as Record<string, unknown>;
    if (data.logo) return "the GeM panel already carries a mark — left alone";

    await prisma.pageSection.update({
      where: { id: target.id },
      data: {
        data: {
          ...data,
          logo: { src: "/marks/gem.webp", alt: "Government e Marketplace (GeM)" },
        } as Prisma.InputJsonValue,
      },
    });

    return "GeM mark added to the homepage panel";
  },
};
