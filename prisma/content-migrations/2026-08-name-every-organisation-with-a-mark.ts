import type { ContentMigration } from "./types";

/**
 * Every organisation whose emblem is on the page is also named on it, once.
 *
 * The homepage makes the same claim twice — a list of names and a line of
 * marks — and the two had drifted. The Indian Air Force emblem was on the belt
 * while the list beside it did not say the Indian Air Force, which reads as an
 * emblem nobody could account for.
 *
 * The two are filled from different places (the list is a `CHIP_LIST` block
 * somebody can edit; the belt comes from `ClientLogo` rows) and there is no
 * reason to merge them: the list is deliberately allowed to name an
 * organisation whose mark cannot be shown, which is most of them. What must
 * not happen is the other direction — a mark with no name — so this closes
 * that gap and only that one.
 *
 * ## Matching is not string equality
 *
 * The first version of this compared names case-insensitively and appended
 * anything that did not match, which put "NBCC (India) Limited" into a list
 * that already said "NBCC". Two entries, one organisation, and the list now
 * looked padded — the opposite of what it was for.
 *
 * So an existing entry counts as the same organisation when one name contains
 * the other once both are reduced to their letters and digits. "NBCC" is
 * inside "NBCC (India) Limited"; "DRDO" is not inside "Delhi Police". Where
 * they match, the entry is rewritten to the organisation's own name — the one
 * on the `ClientLogo` row, which is the name that appears under the mark — so
 * the list and the belt say the same thing rather than two versions of it.
 */

const HEADING = "Organisations we have supplied technology to";

/** Letters and digits only, folded. "NBCC (India) Limited" → "nbccindialimited". */
const key = (name: string) => name.toLowerCase().replace(/[^a-z0-9]/g, "");

export const nameEveryOrganisationWithAMark: ContentMigration = {
  id: "2026-08-name-every-organisation-with-a-mark",
  describe: "every organisation whose emblem is shown is named in the list beside it",

  async apply(prisma) {
    const shown = await prisma.clientLogo.findMany({
      where: { published: true, logoUrl: { not: null } },
      orderBy: { displayOrder: "asc" },
      select: { name: true },
    });

    const page = await prisma.page.findFirst({
      where: { slug: "" },
      select: { id: true, sections: { select: { id: true, type: true, data: true } } },
    });
    if (!page) return "no homepage record to change";

    const section = page.sections.find(
      (row) =>
        row.type === "CHIP_LIST" &&
        (row.data as Record<string, unknown> | null)?.heading === HEADING,
    );
    if (!section) return "the organisations list is gone — nothing to reconcile";

    const data = section.data as Record<string, unknown>;
    const before = Array.isArray(data.items) ? (data.items as string[]) : [];

    const items = [...before];
    const added: string[] = [];
    const renamed: string[] = [];

    for (const { name } of shown) {
      const target = key(name);
      // Every entry this organisation is already in the list under. There can
      // be more than one — that is exactly the state the first version of this
      // migration created, and re-running has to collapse it rather than leave
      // it.
      const matches = items
        .map((entry, index) => ({ entry, index }))
        .filter(({ entry }) => {
          const candidate = key(entry);
          return candidate.includes(target) || target.includes(candidate);
        });

      if (matches.length === 0) {
        items.push(name);
        added.push(name);
        continue;
      }

      // Keep the first, drop any others, and make the survivor the
      // organisation's own name.
      const keep = matches[0]!;
      const duplicates = matches.slice(1);
      if (items[keep.index] !== name) {
        renamed.push(`${items[keep.index]} → ${name}`);
        items[keep.index] = name;
      }
      for (const duplicate of duplicates.map(({ index }) => index).sort((a, b) => b - a)) {
        items.splice(duplicate, 1);
      }
    }

    if (added.length === 0 && renamed.length === 0 && items.length === before.length) {
      return "every organisation with a mark is already named, once";
    }

    await prisma.pageSection.update({
      where: { id: section.id },
      data: { data: { ...data, items } },
    });

    const parts = [];
    if (added.length > 0) parts.push(`named alongside their mark: ${added.join(", ")}`);
    if (renamed.length > 0) parts.push(`renamed to match the mark: ${renamed.join("; ")}`);
    if (items.length < before.length) parts.push(`${before.length - items.length} duplicate(s) removed`);
    return parts.join("; ");
  },
};
