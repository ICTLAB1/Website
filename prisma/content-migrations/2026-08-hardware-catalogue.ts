import type { Prisma } from "@prisma/client";

import { navigationSeeds, pageSeeds } from "../seed-data/pages";
import type { ContentMigration } from "./types";

/**
 * The hardware catalogue's content: a menu and a homepage section.
 *
 * The code for `/hardware` ships in the same release, and would work on a live
 * site the moment it deployed — but nothing would link to it. A catalogue
 * nobody can navigate to is not shipped.
 *
 * Deliberately surgical, unlike the August homepage migration. That one
 * replaced every section, which was lossless because it ran against a homepage
 * nobody had edited yet. This one runs against a site that has been live for a
 * while, so it changes the single section it is about and leaves an edited one
 * alone rather than overwriting somebody's wording with the seed's.
 */
export const hardwareCatalogue: ContentMigration = {
  id: "2026-08-hardware-catalogue",
  describe: "the hardware menu, and the homepage's business-computers section",

  async apply(prisma) {
    const done: string[] = [];

    // ──────────────────────────────────────────────────────── the menu
    const wanted = navigationSeeds.filter(
      (item) => item.menu === "HEADER" && item.key.startsWith("header:hardware"),
    );

    // Parents before children: a child's `parentId` needs a row that exists.
    const ordered = [...wanted].sort((a, b) => a.key.length - b.key.length);
    const idByKey = new Map<string, string>();
    let added = 0;

    for (const item of ordered) {
      const parentId = item.parentKey ? (idByKey.get(item.parentKey) ?? null) : null;

      // Matched on label within its parent, which is what the navigation editor
      // shows and what a person would recognise. Re-running must not produce a
      // second "Hardware" beside the first.
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
    done.push(`${added} menu item(s) added`);

    // ───────────────────────────────────────────── the homepage section
    const seed = pageSeeds.find((page) => page.slug === "");
    const seedSection = seed?.sections.find(
      (section) =>
        section.type === "PRODUCT_GRID" &&
        (section.data as { ref?: string } | null)?.ref === "infrastructure-hardware",
    );

    const page = await prisma.page.findUnique({ where: { slug: "" }, select: { id: true } });

    if (!seedSection || !page) {
      done.push("homepage section skipped — no home page, or none in the seed");
      return done.join("; ");
    }

    const rows = await prisma.pageSection.findMany({
      where: { pageId: page.id, type: "PRODUCT_GRID" },
      select: { id: true, data: true },
    });

    const target = rows.find(
      (row) => (row.data as { ref?: string } | null)?.ref === "infrastructure-hardware",
    );

    if (!target) {
      done.push("homepage hardware section not found — left alone");
      return done.join("; ");
    }

    /*
     * Only replaced if it still says what the previous release left there.
     *
     * Anything else means somebody edited it in the admin panel, and their
     * wording is a decision — overwriting it on a deploy, silently, on a page
     * nobody was looking at, is the exact failure the whole "runs once"
     * mechanism exists to avoid.
     */
    const heading = (target.data as { heading?: string } | null)?.heading;
    const expected = "Servers, storage, networking and workstations";

    if (heading !== expected) {
      done.push(`homepage hardware section has been edited ("${heading}") — left alone`);
      return done.join("; ");
    }

    await prisma.pageSection.update({
      where: { id: target.id },
      data: { data: seedSection.data as Prisma.InputJsonValue },
    });
    done.push("homepage hardware section updated");

    return done.join("; ");
  },
};
