-- CreateEnum
CREATE TYPE "QuoteFollowUpKind" AS ENUM ('AUTOMATIC', 'MANUAL');

-- AlterTable
ALTER TABLE "Quote" ADD COLUMN     "followUpsPausedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "QuoteFollowUp" (
    "id" TEXT NOT NULL,
    "quoteId" TEXT NOT NULL,
    "kind" "QuoteFollowUpKind" NOT NULL,
    "step" INTEGER,
    "toEmail" TEXT NOT NULL,
    "note" TEXT,
    "sentById" TEXT,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "delivered" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "QuoteFollowUp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuoteFollowUpSettings" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "schedule" INTEGER[] DEFAULT ARRAY[3, 7, 14]::INTEGER[],
    "minimumGapDays" INTEGER NOT NULL DEFAULT 2,
    "stopOnReply" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedById" TEXT,

    CONSTRAINT "QuoteFollowUpSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "QuoteFollowUp_quoteId_idx" ON "QuoteFollowUp"("quoteId");

-- CreateIndex
CREATE UNIQUE INDEX "QuoteFollowUp_quoteId_step_key" ON "QuoteFollowUp"("quoteId", "step");

-- AddForeignKey
ALTER TABLE "QuoteFollowUp" ADD CONSTRAINT "QuoteFollowUp_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteFollowUp" ADD CONSTRAINT "QuoteFollowUp_sentById_fkey" FOREIGN KEY ("sentById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteFollowUpSettings" ADD CONSTRAINT "QuoteFollowUpSettings_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

