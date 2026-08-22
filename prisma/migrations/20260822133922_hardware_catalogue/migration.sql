-- CreateEnum
CREATE TYPE "FormFactor" AS ENUM ('LAPTOP', 'MOBILE_WORKSTATION', 'DESKTOP_TOWER', 'DESKTOP_SFF', 'DESKTOP_MINI', 'DESKTOP_WORKSTATION', 'ALL_IN_ONE');

-- AlterEnum
ALTER TYPE "LicenceType" ADD VALUE 'HARDWARE';

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "formFactor" "FormFactor",
ADD COLUMN     "imageUrl" TEXT,
ADD COLUMN     "partNumber" TEXT,
ADD COLUMN     "series" TEXT,
ADD COLUMN     "sourceCheckedAt" TIMESTAMP(3),
ADD COLUMN     "sourceUrl" TEXT;

-- CreateTable
CREATE TABLE "ProductSpec" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ProductSpec_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProductSpec_productId_displayOrder_idx" ON "ProductSpec"("productId", "displayOrder");

-- CreateIndex
CREATE UNIQUE INDEX "ProductSpec_productId_label_key" ON "ProductSpec"("productId", "label");

-- CreateIndex
CREATE INDEX "Product_series_idx" ON "Product"("series");

-- CreateIndex
CREATE INDEX "Product_formFactor_idx" ON "Product"("formFactor");

-- AddForeignKey
ALTER TABLE "ProductSpec" ADD CONSTRAINT "ProductSpec_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
