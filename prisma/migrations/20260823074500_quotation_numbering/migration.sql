-- AlterTable
ALTER TABLE "Quote" ADD COLUMN     "customerReference" TEXT,
ADD COLUMN     "documentNo" TEXT;

-- AlterTable
ALTER TABLE "SiteSettings" ADD COLUMN     "quoteNumberFormat" TEXT,
ADD COLUMN     "secondaryEntityAddress" TEXT,
ADD COLUMN     "secondaryEntityName" TEXT;

-- CreateTable
CREATE TABLE "DocumentSeries" (
    "key" TEXT NOT NULL,
    "next" INTEGER NOT NULL DEFAULT 1,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocumentSeries_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE INDEX "Quote_documentNo_idx" ON "Quote"("documentNo");

-- CreateIndex
CREATE UNIQUE INDEX "Quote_documentNo_version_key" ON "Quote"("documentNo", "version");

