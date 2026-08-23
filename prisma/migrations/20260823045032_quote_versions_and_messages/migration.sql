-- CreateEnum
CREATE TYPE "QuoteMessageKind" AS ENUM ('QUESTION', 'REVISION_REQUEST', 'REPLY');

-- AlterEnum
ALTER TYPE "QuoteStatus" ADD VALUE 'SUPERSEDED';

-- AlterTable
ALTER TABLE "Quote" ADD COLUMN     "revisionNote" TEXT,
ADD COLUMN     "rootId" TEXT,
ADD COLUMN     "supersededAt" TIMESTAMP(3),
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1;

-- CreateTable
CREATE TABLE "QuoteMessage" (
    "id" TEXT NOT NULL,
    "quoteId" TEXT NOT NULL,
    "kind" "QuoteMessageKind" NOT NULL,
    "body" TEXT NOT NULL,
    "userId" TEXT,
    "fromStaff" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuoteMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "QuoteMessage_quoteId_idx" ON "QuoteMessage"("quoteId");

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_rootId_fkey" FOREIGN KEY ("rootId") REFERENCES "Quote"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteMessage" ADD CONSTRAINT "QuoteMessage_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteMessage" ADD CONSTRAINT "QuoteMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Every quotation that already exists is version 1 of itself.
--
-- The root is the quotation's own id rather than null, so "give me every
-- version of this" is one query with no special case for the first one — and a
-- row with no root would be a version of nothing.
UPDATE "Quote" SET "rootId" = id WHERE "rootId" IS NULL;
