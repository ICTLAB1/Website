-- CreateTable
CREATE TABLE "Certification" (
    "id" TEXT NOT NULL,
    "standard" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "issuer" TEXT NOT NULL,
    "verifyUrl" TEXT,
    "scope" TEXT,
    "issuedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "displayOrder" INTEGER NOT NULL DEFAULT 100,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Certification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Certification_displayOrder_idx" ON "Certification"("displayOrder");

-- CreateIndex
CREATE INDEX "Certification_expiresAt_idx" ON "Certification"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "Certification_standard_reference_key" ON "Certification"("standard", "reference");
