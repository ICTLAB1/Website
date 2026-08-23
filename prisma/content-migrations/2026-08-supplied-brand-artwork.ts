import { partnerStatus } from "../seed-data/partner-status";
import type { ContentMigration } from "./types";

/**
 * The artwork the business supplied, onto a database that has already been
 * seeded.
 *
 * Without this the change would never reach the live site. The seed runs only
 * on an empty database — which is what stops a redeploy overwriting work done
 * in the admin panel — so a release that corrects *seeded* values arrives as
 * new code and old rows. That is exactly the case here: five brand logos and
 * two partner designations changed in `prisma/seed-data/`, and the running
 * deployment would keep showing the lettered wordmarks and the placeholder
 * label "Partner" indefinitely.
 *
 * ## What it will and will not overwrite
 *
 * The brand logos *are* replaced, including where one is already set. That is
 * the opposite of the earlier brand-logo migration's rule, and deliberately so:
 * this is a correction, not a fill-in. The paths being replaced are the ones
 * the seed itself wrote — the Simple Icons marks — and leaving them would leave
 * the wrong artwork up. An operator's own upload is recognised by its
 * directory and left alone.
 *
 * The partner designations are only upgraded where the label is still the
 * placeholder "Partner". A tier somebody typed from the admin panel knows more
 * about the relationship than this file does.
 */

/** What the seed now says, and what it is correcting. */
const LOGOS: Array<{ slug: string; logoUrl: string; replaces: string }> = [
  { slug: "microsoft", logoUrl: "/brands/microsoft.png", replaces: "" },
  { slug: "adobe", logoUrl: "/brands/adobe.png", replaces: "" },
  { slug: "hp", logoUrl: "/brands/hp.png", replaces: "/brands/hp.svg" },
  { slug: "lenovo", logoUrl: "/brands/lenovo.png", replaces: "/brands/lenovo.svg" },
  { slug: "acer", logoUrl: "/brands/acer.png", replaces: "/brands/acer.svg" },
];

/** Uploads live here and are somebody's deliberate choice, not the seed's. */
const UPLOAD_DIR = "/uploads/";

export const suppliedBrandArtwork: ContentMigration = {
  id: "2026-08-supplied-brand-artwork",
  describe: "the publishers' own logos and the two issued partner badges",

  async apply(prisma) {
    let logos = 0;
    let keptUploads = 0;

    for (const entry of LOGOS) {
      const brand = await prisma.brand.findFirst({
        where: { slug: entry.slug, deletedAt: null },
        select: { id: true, logoUrl: true },
      });
      if (!brand) continue;

      /*
       * An uploaded file wins.
       *
       * Somebody went to the admin panel and put it there, which is a stronger
       * signal about what this brand should look like than a path in a seed
       * file. Only the seed's own artwork is corrected.
       */
      if (brand.logoUrl?.startsWith(UPLOAD_DIR)) {
        keptUploads += 1;
        continue;
      }

      if (brand.logoUrl === entry.logoUrl) continue;

      await prisma.brand.update({ where: { id: brand.id }, data: { logoUrl: entry.logoUrl } });
      logos += 1;
    }

    // ── the two designations that came with an issued badge ────────────────
    let designations = 0;
    let leftAlone = 0;

    for (const entry of partnerStatus) {
      if (!entry.badgeUrl) continue;

      const brand = await prisma.brand.findFirst({
        where: { slug: entry.slug, deletedAt: null },
        select: { id: true, partnerLabel: true, partnerBadgeUrl: true },
      });
      if (!brand) continue;

      /*
       * Upgraded only from the placeholder.
       *
       * "Partner" is what this repository wrote when nobody had supplied the
       * programme's own wording. Anything else in that field was typed by
       * somebody who knew the tier, and a migration must not talk over them.
       */
      const isPlaceholder = (brand.partnerLabel ?? "").trim().toLowerCase() === "partner";
      if (!isPlaceholder && brand.partnerBadgeUrl) {
        leftAlone += 1;
        continue;
      }

      await prisma.brand.update({
        where: { id: brand.id },
        data: {
          ...(isPlaceholder ? { partnerLabel: entry.label } : {}),
          partnerBadgeUrl: entry.badgeUrl,
          partnerConfirmedAt: new Date(entry.confirmedAt),
          partnerPublic: entry.isPublic,
        },
      });
      designations += 1;
    }

    return (
      `${logos} brand logo(s) corrected, ${keptUploads} upload(s) kept; ` +
      `${designations} designation(s) given their badge, ${leftAlone} left alone`
    );
  },
};
