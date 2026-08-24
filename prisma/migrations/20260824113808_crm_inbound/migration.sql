-- CreateEnum
CREATE TYPE "CrmInboundStatus" AS ENUM ('APPLIED', 'IGNORED', 'REFUSED');

-- AlterTable
ALTER TABLE "CrmSettings" ADD COLUMN     "inboundEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "inboundSecret" TEXT;

-- CreateTable
CREATE TABLE "CrmInboundEvent" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "status" "CrmInboundStatus" NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "detail" TEXT,
    "payload" JSONB NOT NULL,

    CONSTRAINT "CrmInboundEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CrmInboundEvent_receivedAt_idx" ON "CrmInboundEvent"("receivedAt");

-- CreateIndex
CREATE INDEX "CrmInboundEvent_status_idx" ON "CrmInboundEvent"("status");

