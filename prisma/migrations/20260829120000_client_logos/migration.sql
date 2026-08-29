-- Customers whose logo may be shown on the public site.
--
-- Nothing here is populated by this migration, and nothing can be shown by
-- accident: a row reaches a visitor only with artwork on file, a confirmed
-- permission date, and `published` deliberately turned on. See the model's own
-- note in schema.prisma for why permission is four columns and not a checkbox.
CREATE TABLE "ClientLogo" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "logoUrl" TEXT,
    "website" TEXT,
    "sector" TEXT,
    "permissionHolder" TEXT,
    "permissionReference" TEXT,
    "permissionConfirmedAt" TIMESTAMP(3),
    "published" BOOLEAN NOT NULL DEFAULT false,
    "displayOrder" INTEGER NOT NULL DEFAULT 100,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientLogo_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ClientLogo_published_idx" ON "ClientLogo"("published");
CREATE INDEX "ClientLogo_deletedAt_idx" ON "ClientLogo"("deletedAt");
