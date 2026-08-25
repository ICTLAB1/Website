import { brands } from "../seed-data/brands";
import { brandSegments } from "../seed-data/brand-segments";
import type { ContentMigration } from "./types";

/**
 * The brands added to the line card in August 2026, on a database already
 * seeded.
 *
 * Creates what is missing and touches nothing that exists. A brand already in
 * the database has either been seeded with this copy or edited since, and this
 * migration cannot tell the two apart — so it leaves every existing row alone
 * rather than reverting somebody's wording to the file's.
 *
 * The segment is set on creation, because a brand with no segment falls into
 * "other" on the brands page. It is set only for rows this migration creates,
 * for the same reason: an operator who moved a brand between groups meant it.
 *
 * Nothing here fills in a partner designation. Adding a company to the line
 * card is a statement about what we quote, not about a relationship with it,
 * and those columns are filled in only when somebody has confirmed one.
 */
export const moreBrands: ContentMigration = {
  id: "2026-08-more-brands",
  describe: "the brands added to the line card in August 2026",

  async apply(prisma) {
    const existing = new Set(
      (await prisma.brand.findMany({ select: { slug: true } })).map((row) => row.slug),
    );

    const created: string[] = [];

    for (const brand of brands) {
      if (existing.has(brand.slug)) continue;

      await prisma.brand.create({
        data: { ...brand, segment: brandSegments[brand.slug] ?? null },
      });
      created.push(brand.slug);
    }

    if (created.length === 0) return "no brands to add";
    return `${created.length} brand(s) added: ${created.join(", ")}`;
  },
};
