-- CreateEnum
CREATE TYPE "VariantAudience" AS ENUM ('COMMERCIAL', 'EDUCATION', 'NON_PROFIT');

-- AlterTable
ALTER TABLE "ProductVariant" ADD COLUMN     "audience" "VariantAudience" NOT NULL DEFAULT 'COMMERCIAL';

-- CreateIndex
CREATE INDEX "ProductVariant_audience_idx" ON "ProductVariant"("audience");
