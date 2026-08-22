-- CreateEnum
CREATE TYPE "CompanyRole" AS ENUM ('ADMIN', 'PROCUREMENT', 'FINANCE', 'IT', 'VIEWER');

-- CreateEnum
CREATE TYPE "AddressKind" AS ENUM ('BILLING', 'DELIVERY', 'BOTH');

-- CreateEnum
CREATE TYPE "ContactKind" AS ENUM ('PROCUREMENT', 'FINANCE', 'IT', 'ESCALATION');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "UserRole" ADD VALUE 'DIRECTOR';
ALTER TYPE "UserRole" ADD VALUE 'SALES_MANAGER';
ALTER TYPE "UserRole" ADD VALUE 'PROCUREMENT';
ALTER TYPE "UserRole" ADD VALUE 'OPERATIONS';
ALTER TYPE "UserRole" ADD VALUE 'ACCOUNTS';
ALTER TYPE "UserRole" ADD VALUE 'SUPPORT';

-- AlterTable
ALTER TABLE "Company" ADD COLUMN     "accountManagerId" TEXT,
ADD COLUMN     "pan" TEXT,
ADD COLUMN     "phone" TEXT;

-- AlterTable
ALTER TABLE "SupportTicket" ADD COLUMN     "companyId" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "companyRole" "CompanyRole" NOT NULL DEFAULT 'VIEWER';

-- CreateTable
CREATE TABLE "CompanyAddress" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "kind" "AddressKind" NOT NULL DEFAULT 'DELIVERY',
    "attention" TEXT,
    "line1" TEXT NOT NULL,
    "line2" TEXT,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "postcode" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'India',
    "gstin" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanyAddress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanyContact" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "kind" "ContactKind" NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanyContact_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CompanyAddress_companyId_idx" ON "CompanyAddress"("companyId");

-- CreateIndex
CREATE INDEX "CompanyContact_companyId_idx" ON "CompanyContact"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "CompanyContact_companyId_kind_email_key" ON "CompanyContact"("companyId", "kind", "email");

-- CreateIndex
CREATE INDEX "Company_accountManagerId_idx" ON "Company"("accountManagerId");

-- CreateIndex
CREATE INDEX "SupportTicket_companyId_idx" ON "SupportTicket"("companyId");

-- AddForeignKey
ALTER TABLE "Company" ADD CONSTRAINT "Company_accountManagerId_fkey" FOREIGN KEY ("accountManagerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyAddress" ADD CONSTRAINT "CompanyAddress_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyContact" ADD CONSTRAINT "CompanyContact_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ---------------------------------------------------------------- backfill --
--
-- Access moves from the individual to the organisation in this migration, so
-- the existing rows have to be given the organisation they always belonged to.
-- Without this an existing customer signs in after the deploy and finds their
-- own history missing, which is the worst possible way to learn that a query
-- changed its WHERE clause.
--
-- Note: the new UserRole values added above cannot be referenced until this
-- transaction commits, so nothing here mentions them. CompanyRole is a new
-- type and is safe to use.

-- Everyone who already has a company created it themselves during checkout, so
-- they are its administrator. Nobody was ever invited by somebody else yet.
UPDATE "User" SET "companyRole" = 'ADMIN' WHERE "companyId" IS NOT NULL;

-- Records raised before companies were the unit of access: attribute each one
-- to the raiser's company. Rows already carrying a company are left alone.
UPDATE "Enquiry" e SET "companyId" = u."companyId"
  FROM "User" u WHERE e."userId" = u."id" AND e."companyId" IS NULL AND u."companyId" IS NOT NULL;

UPDATE "Quote" q SET "companyId" = u."companyId"
  FROM "User" u WHERE q."userId" = u."id" AND q."companyId" IS NULL AND u."companyId" IS NOT NULL;

UPDATE "Order" o SET "companyId" = u."companyId"
  FROM "User" u WHERE o."userId" = u."id" AND o."companyId" IS NULL AND u."companyId" IS NOT NULL;

UPDATE "Licence" l SET "companyId" = u."companyId"
  FROM "User" u WHERE l."userId" = u."id" AND l."companyId" IS NULL AND u."companyId" IS NOT NULL;

UPDATE "SupportTicket" t SET "companyId" = u."companyId"
  FROM "User" u WHERE t."userId" = u."id" AND u."companyId" IS NOT NULL;
