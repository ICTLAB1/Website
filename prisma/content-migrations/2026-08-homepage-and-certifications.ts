import type { Prisma } from "@prisma/client";

import { brands } from "../seed-data/brands";
import { certifications } from "../seed-data/certifications";
import { navigationSeeds, pageSeeds } from "../seed-data/pages";
import type { ContentMigration } from "./types";

/**
 * The August 2026 content release.
 *
 * The homepage gained an "Our experience" strip, an "Industries we serve" list,
 * a certifications section and a hardware grid; three ISO certificates were
 * recorded; thirty-two brands were added; and About moved to the front of the
 * menu. Every one of those is a row, and none of them reached the live site
 * when the code did — which is the whole reason this mechanism now exists.
 */
export const homepageAndCertifications: ContentMigration = {
  id: "2026-08-homepage-and-certifications",
  describe: "homepage sections, ISO certificates, thirty-two brands, menu order",

  async apply(prisma) {
    const done: string[] = [];

    // ─────────────────────────────────────────────────────── the home page
    const seed = pageSeeds.find((page) => page.slug === "");
    if (!seed) throw new Error("No home page in the seed data.");

    const page = await prisma.page.findUnique({ where: { slug: "" }, select: { id: true } });

    if (!page) {
      done.push("no home page in this database, so its sections were skipped");
    } else {
      /*
       * Replaced wholesale rather than merged.
       *
       * The sections were renumbered when the new ones were inserted, so
       * pairing old rows with new ones by position would put the wrong blocks
       * together. The home page is entirely seed-authored, which makes
       * replacement lossless — and it is the only page for which that is true,
       * which is why this migration touches no other.
       */
      const before = await prisma.pageSection.count({ where: { pageId: page.id } });

      await prisma.$transaction([
        prisma.pageSection.deleteMany({ where: { pageId: page.id } }),
        prisma.pageSection.createMany({
          data: seed.sections.map((section) => ({
            pageId: page.id,
            type: section.type,
            displayOrder: section.displayOrder,
            visible: section.visible,
            // Validated by the block schemas when it is rendered, not here;
            // the seed writes it the same way.
            data: section.data as Prisma.InputJsonValue,
          })),
        }),
        // The hero copy and the page's own metadata changed alongside the blocks.
        prisma.page.update({
          where: { id: page.id },
          data: { title: seed.title, description: seed.description, keywords: seed.keywords },
        }),
      ]);

      done.push(`home page: ${before} sections replaced with ${seed.sections.length}`);
    }

    // ────────────────────────────────────────────────────── certifications
    for (const certification of certifications) {
      const data = {
        title: certification.title,
        issuer: certification.issuer,
        verifyUrl: certification.verifyUrl,
        scope: certification.scope,
        issuedAt: new Date(`${certification.issuedAt}T00:00:00.000Z`),
        expiresAt: certification.expiresAt
          ? new Date(`${certification.expiresAt}T00:00:00.000Z`)
          : null,
        displayOrder: certification.displayOrder,
      };

      await prisma.certification.upsert({
        where: {
          standard_reference: {
            standard: certification.standard,
            reference: certification.reference,
          },
        },
        create: { ...data, standard: certification.standard, reference: certification.reference },
        update: data,
      });
    }
    done.push(`${certifications.length} certificates present`);

    // ─────────────────────────────────────────────────────────────── brands
    const existing = new Set(
      (await prisma.brand.findMany({ select: { slug: true } })).map((brand) => brand.slug),
    );

    // Created where absent; an existing brand is left alone, because its copy
    // may have been edited in the panel since it was seeded.
    const absent = brands.filter((brand) => !existing.has(brand.slug));
    for (const brand of absent) {
      await prisma.brand.create({
        data: {
          slug: brand.slug,
          name: brand.name,
          tagline: brand.tagline,
          summary: brand.summary,
          description: brand.description,
          logoText: brand.logoText,
          accentColor: brand.accentColor,
          displayOrder: brand.displayOrder,
          featured: brand.featured,
        },
      });
    }
    done.push(`${absent.length} brands added, ${existing.size} left untouched`);

    // ─────────────────────────────────────────────────────── the header menu
    let moved = 0;
    for (const item of navigationSeeds) {
      if (item.menu !== "HEADER" || item.parentKey !== null) continue;

      const row = await prisma.navigationItem.findFirst({
        where: { menu: "HEADER", parentId: null, label: item.label },
        select: { id: true, displayOrder: true },
      });
      if (!row || row.displayOrder === item.displayOrder) continue;

      await prisma.navigationItem.update({
        where: { id: row.id },
        data: { displayOrder: item.displayOrder },
      });
      moved += 1;
    }
    done.push(`${moved} menu item(s) reordered`);

    return done.join("; ");
  },
};
