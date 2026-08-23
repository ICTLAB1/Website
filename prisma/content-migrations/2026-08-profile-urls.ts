import type { ContentMigration } from "./types";

/**
 * The company's own profiles, for `sameAs` on the Organization schema.
 *
 * These three were supplied by the business, which is the only way a URL gets
 * in here — `sameAs` asserts that a page belongs to this organisation, and an
 * assertion nobody checked is one that may be about somebody else's page. They
 * are recorded rather than guessed, and this migration exists because they must
 * survive a deploy: the settings row lives in the database, and a value typed
 * into the admin panel on one environment is not in any other.
 *
 * ## Why it refuses to overwrite
 *
 * If anything is already stored, this leaves it alone and says so. The whole
 * point of the field is that a person decided what belongs in it; a migration
 * that replaced a later, better list with this one would undo that decision
 * silently, and a deploy is the worst possible moment to find out.
 *
 * A row that does not exist yet is created, because `SiteSettings` is a
 * singleton that only appears the first time somebody saves the settings form —
 * a site configured entirely through environment variables has no row at all.
 */
const PROFILES = [
  "https://in.linkedin.com/company/techzoid-technologies-private-limited",
  "https://www.facebook.com/ttpldelhi/",
  "https://www.instagram.com/techzoidtechnologies/",
].join("\n");

export const profileUrls: ContentMigration = {
  id: "2026-08-profile-urls",
  describe: "the company's LinkedIn, Facebook and Instagram profiles",

  async apply(prisma) {
    const existing = await prisma.siteSettings.findUnique({
      where: { id: "singleton" },
      select: { profileUrls: true },
    });

    if (existing?.profileUrls?.trim()) {
      return "profile URLs are already set — left alone";
    }

    await prisma.siteSettings.upsert({
      where: { id: "singleton" },
      create: { id: "singleton", profileUrls: PROFILES },
      update: { profileUrls: PROFILES },
    });

    return "LinkedIn, Facebook and Instagram published as sameAs";
  },
};
