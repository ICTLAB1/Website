-- Campaign builder, phase A: extends the existing Banner table additively.
-- Every new column is nullable or defaulted, so no existing row changes
-- behaviour: a row with a NULL format is never shown.
CREATE TYPE "CampaignFormat" AS ENUM ('BANNER', 'MODAL');
CREATE TYPE "CampaignFrequency" AS ENUM ('EVERY_VISIT', 'ONCE_PER_DAY', 'ONCE');

ALTER TABLE "Banner"
  ADD COLUMN "format" "CampaignFormat",
  ADD COLUMN "title" TEXT,
  ADD COLUMN "pages" TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "frequency" "CampaignFrequency" NOT NULL DEFAULT 'ONCE_PER_DAY',
  ADD COLUMN "delaySeconds" INTEGER NOT NULL DEFAULT 4;
