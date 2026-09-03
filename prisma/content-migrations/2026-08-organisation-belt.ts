import type { ContentMigration } from "./types";

/**
 * The organisation emblems back onto one moving line.
 *
 * A release ago this section was made a wall, on the reasoning that a belt of
 * nine marks spends most of every pass showing the gap between the end of the
 * row and the start of its copy. That reasoning was wrong about this component:
 * `LogoBelt` repeats its list until there are at least twelve items, so nine
 * marks become eighteen per row and thirty-six in the track — a row wide enough
 * that no gap ever reaches the viewport, and wide enough that a reader never
 * sees the same emblem twice on one screen.
 *
 * So the objection did not apply, and the owner's preference decides: one line,
 * moving slowly to the left.
 *
 * Slow is the seventy-two-second pass rather than the forty-eight. These are
 * institutional emblems with fine detail in them — the Delhi Police and DRDO
 * marks carry legible text — and a strip that hurries past them is a strip
 * nobody reads. `reverse` stays off, which is the leftward direction: the
 * keyframe runs the track from zero to -50%.
 *
 * Everything else is unchanged. Nothing here publishes anything: the nine rows
 * still have no confirmed permission date, so the section renders nothing at
 * all until somebody records one.
 */
export const organisationBelt: ContentMigration = {
  id: "2026-08-organisation-belt",
  describe: "the organisation emblems on one slowly moving line",

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
    if (!section) return "no organisation logo section on the homepage";

    const data = section.data as Record<string, unknown>;
    if (data.layout === "belt" && data.speed === "slow") {
      return "the organisation emblems are already on one slow line";
    }

    await prisma.pageSection.update({
      where: { id: section.id },
      data: {
        data: {
          source: "clients",
          limit: 24,
          layout: "belt",
          speed: "slow",
          reverse: false,
        },
      },
    });

    return "the organisation emblems now ride one line, slowly, to the left";
  },
};
