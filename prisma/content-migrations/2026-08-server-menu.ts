import { navigationSeeds } from "../seed-data/pages";
import type { ContentMigration } from "./types";

/**
 * The servers column in the hardware menu.
 *
 * Separate from the migration that built the rest of that menu, because that
 * one has already run everywhere it is going to run — a migration is recorded
 * and never offered again, which is what stops it undoing an edit. Adding
 * entries to a menu it created therefore needs a migration of its own.
 *
 * Matched on label within its parent, so re-running produces no second
 * "Servers" beside the first.
 */
export const serverMenu: ContentMigration = {
  id: "2026-08-server-menu",
  describe: "the servers column in the hardware menu",

  async apply(prisma) {
    const wanted = navigationSeeds.filter(
      (item) => item.menu === "HEADER" && item.key.startsWith("header:hardware.servers"),
    );

    const hardware = await prisma.navigationItem.findFirst({
      where: { menu: "HEADER", parentId: null, label: "Hardware" },
      select: { id: true },
    });
    if (!hardware) return "no Hardware menu to add to — skipped";

    // Parents before children: a child's parentId needs a row that exists.
    const ordered = [...wanted].sort((a, b) => a.key.length - b.key.length);
    const idByKey = new Map<string, string>([["header:hardware", hardware.id]]);
    let added = 0;

    for (const item of ordered) {
      const parentId = item.parentKey ? (idByKey.get(item.parentKey) ?? null) : null;
      if (!parentId) continue;

      const existing = await prisma.navigationItem.findFirst({
        where: { menu: "HEADER", parentId, label: item.label },
        select: { id: true },
      });

      if (existing) {
        idByKey.set(item.key, existing.id);
        continue;
      }

      const created = await prisma.navigationItem.create({
        data: {
          menu: "HEADER",
          parentId,
          label: item.label,
          href: item.href,
          description: item.description,
          displayOrder: item.displayOrder,
        },
        select: { id: true },
      });
      idByKey.set(item.key, created.id);
      added += 1;
    }

    return `${added} menu item(s) added`;
  },
};
