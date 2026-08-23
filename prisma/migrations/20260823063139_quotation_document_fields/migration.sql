-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "hsnCode" TEXT,
ADD COLUMN     "unitLabel" TEXT;

-- AlterTable
ALTER TABLE "Quote" ADD COLUMN     "ownerId" TEXT,
ADD COLUMN     "paymentTerms" TEXT;

-- AlterTable
ALTER TABLE "QuoteItem" ADD COLUMN     "brandName" TEXT,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "hsnCode" TEXT,
ADD COLUMN     "unitLabel" TEXT;

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
