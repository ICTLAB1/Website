-- CreateEnum
CREATE TYPE "CrmEventStatus" AS ENUM ('PENDING', 'DELIVERED', 'FAILED', 'ABANDONED');

-- CreateTable
CREATE TABLE "CrmEvent" (
    "id" TEXT NOT NULL,
    "status" "CrmEventStatus" NOT NULL DEFAULT 'PENDING',
    "kind" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastAttemptAt" TIMESTAMP(3),
    "lastError" TEXT,
    "deliveredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CrmEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrmSettings" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "endpointUrl" TEXT,
    "signingSecret" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedById" TEXT,

    CONSTRAINT "CrmSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CrmEvent_status_createdAt_idx" ON "CrmEvent"("status", "createdAt");

-- CreateIndex
CREATE INDEX "CrmEvent_entityType_entityId_idx" ON "CrmEvent"("entityType", "entityId");

-- AddForeignKey
ALTER TABLE "CrmSettings" ADD CONSTRAINT "CrmSettings_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

