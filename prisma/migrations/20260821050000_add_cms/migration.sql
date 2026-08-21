-- CMS: pages built from ordered, typed blocks, plus database-driven navigation.
--
-- Replaces ~2,500 lines of marketing copy and navigation that were compiled
-- into the application, where no administrator could reach them and every
-- change needed a redeploy.
--
-- A page's slug is its full path below the site root, so nested marketing pages
-- are one row rather than a tree. The empty slug is reserved for the home page,
-- which is a Page like any other so that there is only one content system.
--
-- PageSection.data is JSONB rather than fifteen sets of nullable typed columns:
-- each block type has its own zod schema applied on write and on read, and an
-- unrecognised or legacy payload degrades to a skipped block instead of a
-- failed page.
CREATE TYPE "PageStatus" AS ENUM ('DRAFT', 'PUBLISHED');
CREATE TYPE "NavigationMenu" AS ENUM ('HEADER', 'FOOTER', 'UTILITY');
CREATE TYPE "PageSectionType" AS ENUM (
  'HERO', 'RICH_TEXT', 'BULLETS', 'CARDS', 'ICON_POINTS', 'LINK_LIST',
  'KEY_VALUE_LIST', 'CHIP_LIST', 'SPLIT_PANEL', 'STAT_BAR', 'PRODUCT_GRID',
  'COLLECTION_GRID', 'FAQ', 'CTA_BANNER', 'PLANS'
);

CREATE TABLE "Page" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "keywords" TEXT[],
    "status" "PageStatus" NOT NULL DEFAULT 'DRAFT',
    "breadcrumb" JSONB NOT NULL DEFAULT '[]',
    "brandId" TEXT,
    "faqTopic" TEXT,
    "publishedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Page_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Page_slug_key" ON "Page"("slug");
CREATE INDEX "Page_status_deletedAt_idx" ON "Page"("status", "deletedAt");
CREATE INDEX "Page_brandId_idx" ON "Page"("brandId");

ALTER TABLE "Page" ADD CONSTRAINT "Page_brandId_fkey"
  FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "PageSection" (
    "id" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "type" "PageSectionType" NOT NULL,
    "displayOrder" INTEGER NOT NULL DEFAULT 100,
    "visible" BOOLEAN NOT NULL DEFAULT true,
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PageSection_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PageSection_pageId_displayOrder_idx" ON "PageSection"("pageId", "displayOrder");

-- Cascade: a page's blocks have no meaning without the page.
ALTER TABLE "PageSection" ADD CONSTRAINT "PageSection_pageId_fkey"
  FOREIGN KEY ("pageId") REFERENCES "Page"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "NavigationItem" (
    "id" TEXT NOT NULL,
    "menu" "NavigationMenu" NOT NULL,
    "label" TEXT NOT NULL,
    "href" TEXT,
    "description" TEXT,
    "parentId" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 100,
    "visible" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NavigationItem_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "NavigationItem_menu_parentId_displayOrder_idx"
  ON "NavigationItem"("menu", "parentId", "displayOrder");

-- Cascade: removing a menu heading removes the links underneath it.
ALTER TABLE "NavigationItem" ADD CONSTRAINT "NavigationItem_parentId_fkey"
  FOREIGN KEY ("parentId") REFERENCES "NavigationItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
