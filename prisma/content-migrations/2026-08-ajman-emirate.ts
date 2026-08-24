import type { ContentMigration } from "./types";

/**
 * The UAE office is in Ajman, not Dubai.
 *
 * The address taken off the company's letterhead ended "Ajman Free Zone,
 * Dubai" — two different emirates in one line, which is the sort of thing a
 * customs broker or a bank notices before anybody here does. Confirmed by the
 * business: Ajman.
 *
 * ## Why this is a second migration rather than an edit to the first
 *
 * `2026-08-uae-branch` stops at its own name check — a database whose second
 * entity already reads "TechZoid Technologies — UAE office" returns "already
 * recorded" and never looks at the address. Correcting the constant there fixes
 * a database seeded from nothing and no other, which is every deployment that
 * matters.
 *
 * It replaces exactly the stale line and nothing else. An address edited since
 * is one somebody looked at, and is reported rather than overwritten — a deploy
 * is the worst possible moment to discover a business detail changed silently.
 */
const STALE = "Office C1-1F-SF2571, Ajman Free Zone C1 Building, Ajman Free Zone, Dubai";
const CORRECT = "Office C1-1F-SF2571, Ajman Free Zone C1 Building, Ajman Free Zone, Ajman";

export const ajmanEmirate: ContentMigration = {
  id: "2026-08-ajman-emirate",
  describe: "the UAE office sits in Ajman, not Dubai",

  async apply(prisma) {
    const existing = await prisma.siteSettings.findUnique({
      where: { id: "singleton" },
      select: { secondaryEntityAddress: true },
    });

    const current = existing?.secondaryEntityAddress?.trim() ?? "";
    if (current === CORRECT) return "the UAE office already reads Ajman";
    if (current === "") return "no second entity is recorded — nothing to correct";
    if (current !== STALE) {
      return `the second entity's address reads "${current}" — left alone`;
    }

    await prisma.siteSettings.update({
      where: { id: "singleton" },
      data: { secondaryEntityAddress: CORRECT },
    });

    return "the UAE office now reads Ajman";
  },
};
