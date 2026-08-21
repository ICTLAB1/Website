-- CreateEnum
CREATE TYPE "PaymentMode" AS ENUM ('TEST', 'LIVE');

-- CreateTable
CREATE TABLE "PaymentSettings" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "mode" "PaymentMode" NOT NULL DEFAULT 'TEST',
    "razorpayKeyId" TEXT,
    "razorpayKeySecret" TEXT,
    "razorpayWebhookSecret" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedById" TEXT,

    CONSTRAINT "PaymentSettings_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "PaymentSettings" ADD CONSTRAINT "PaymentSettings_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
