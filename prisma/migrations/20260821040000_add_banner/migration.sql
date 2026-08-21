-- Site-wide notice banners, managed from the admin panel.
--
-- Scheduling is a window rather than a single boolean so a promotion can be
-- prepared ahead of time and expire on its own. `active` remains as an explicit
-- off switch that does not require clearing the dates.
CREATE TYPE "BannerTone" AS ENUM ('INFO', 'PROMO', 'WARNING');

CREATE TABLE "Banner" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "href" TEXT,
    "linkLabel" TEXT,
    "tone" "BannerTone" NOT NULL DEFAULT 'INFO',
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "active" BOOLEAN NOT NULL DEFAULT false,
    "displayOrder" INTEGER NOT NULL DEFAULT 100,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Banner_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Banner_active_startsAt_endsAt_idx" ON "Banner"("active", "startsAt", "endsAt");
