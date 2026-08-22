-- AlterTable
ALTER TABLE "ProductVariant" ADD COLUMN     "configNote" TEXT,
ADD COLUMN     "graphics" TEXT,
ADD COLUMN     "memory" TEXT,
ADD COLUMN     "operatingSystem" TEXT,
ADD COLUMN     "opticalDrive" TEXT,
ADD COLUMN     "partNumber" TEXT,
ADD COLUMN     "powerSupply" TEXT,
ADD COLUMN     "processor" TEXT,
ADD COLUMN     "storage" TEXT,
ADD COLUMN     "warranty" TEXT;

-- CreateIndex
CREATE INDEX "ProductVariant_partNumber_idx" ON "ProductVariant"("partNumber");
