-- What each sector's page links to.
--
-- Slugs rather than foreign keys: a sector naming a brand that is later
-- archived should quietly lose a card, not block the archive or break the page.
ALTER TABLE "Industry" ADD COLUMN "brandSlugs" TEXT[],
  ADD COLUMN "serviceSlugs" TEXT[],
  ADD COLUMN "categorySlugs" TEXT[];
