-- AlterTable
ALTER TABLE "Brand" ADD COLUMN     "partnerConfirmedAt" TIMESTAMP(3),
ADD COLUMN     "partnerLabel" TEXT,
ADD COLUMN     "partnerPublic" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "partnerReference" TEXT;
