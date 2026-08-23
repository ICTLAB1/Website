import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

import { brandSegments } from "@/../prisma/seed-data/brand-segments";
import { SEGMENT_DESCRIPTIONS, SEGMENT_LABELS, SEGMENT_ORDER } from "@/lib/brand-segments";

/**
 * Every brand is classified, and classified as itself.
 *
 * The brands page groups by segment and drops anything unclassified into
 * "other". That is the right behaviour — a silent omission would be worse —
 * but "other" is not where any of these belong, and the way a brand ends up
 * there is a slug that does not match: the map said "dell-technologies" and the
 * seed said "dell", so Dell fell through and nobody would have noticed until
 * somebody looked at the page.
 */

async function seededSlugs(): Promise<string[]> {
  const source = await readFile(new URL("../prisma/seed-data/brands.ts", import.meta.url), "utf8");
  return [...source.matchAll(/^\s{4}slug: "([a-z0-9-]+)",$/gm)].map((match) => match[1]!);
}

describe("brand segments", () => {
  it("classifies every brand the seed creates", async () => {
    const slugs = await seededSlugs();
    expect(slugs.length).toBeGreaterThan(30);

    const unclassified = slugs.filter((slug) => !brandSegments[slug]).sort();
    expect(unclassified).toEqual([]);
  });

  it("does not classify a brand the seed does not create", async () => {
    // A stale entry here is harmless at runtime and is still a lie about the
    // catalogue, so it fails rather than lingering.
    const slugs = new Set(await seededSlugs());
    const orphans = Object.keys(brandSegments).filter((slug) => !slugs.has(slug)).sort();
    expect(orphans).toEqual([]);
  });

  it("keeps HP and HPE in different segments", () => {
    /*
     * They are different companies, and this is the line between them: HP makes
     * the commercial PCs, HPE makes the infrastructure. Collapsing them is the
     * single most common mistake about this pair.
     */
    expect(brandSegments.hp).toBe("BUSINESS_HARDWARE");
    expect(brandSegments.hpe).toBe("ENTERPRISE_INFRASTRUCTURE");
    expect(brandSegments.hp).not.toBe(brandSegments.hpe);
  });

  it("has a heading and a description for every segment it can produce", () => {
    for (const segment of new Set(Object.values(brandSegments))) {
      expect(SEGMENT_LABELS[segment], segment).toBeTruthy();
      expect(SEGMENT_DESCRIPTIONS[segment], segment).toBeTruthy();
      expect(SEGMENT_ORDER, segment).toContain(segment);
    }
  });
});
