-- CreateEnum
CREATE TYPE "DocumentKind" AS ENUM ('BOQ', 'PURCHASE_ORDER', 'QUOTATION', 'INVOICE', 'DELIVERY_NOTE', 'LICENCE', 'WARRANTY', 'SUPPORT_ATTACHMENT', 'OTHER');

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "kind" "DocumentKind" NOT NULL,
    "filename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "bytes" INTEGER NOT NULL,
    "storageKey" TEXT NOT NULL,
    "digest" TEXT NOT NULL,
    "companyId" TEXT,
    "userId" TEXT,
    "enquiryId" TEXT,
    "quoteId" TEXT,
    "orderId" TEXT,
    "ticketId" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Document_reference_key" ON "Document"("reference");

-- CreateIndex
CREATE INDEX "Document_companyId_idx" ON "Document"("companyId");

-- CreateIndex
CREATE INDEX "Document_enquiryId_idx" ON "Document"("enquiryId");

-- CreateIndex
CREATE INDEX "Document_quoteId_idx" ON "Document"("quoteId");

-- CreateIndex
CREATE INDEX "Document_orderId_idx" ON "Document"("orderId");

-- CreateIndex
CREATE INDEX "Document_ticketId_idx" ON "Document"("ticketId");

-- CreateIndex
CREATE INDEX "Document_kind_idx" ON "Document"("kind");

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_enquiryId_fkey" FOREIGN KEY ("enquiryId") REFERENCES "Enquiry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "SupportTicket"("id") ON DELETE SET NULL ON UPDATE CASCADE;
