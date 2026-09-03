-- The site's chat assistant: a singleton settings row, and a deal source to
-- track leads it captures.

ALTER TYPE "DealSource" ADD VALUE 'CHATBOT';

CREATE TABLE "AssistantSettings" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "anthropicApiKey" TEXT,
    "assistantName" TEXT NOT NULL DEFAULT 'Zoey',
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedById" TEXT,

    CONSTRAINT "AssistantSettings_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "AssistantSettings" ADD CONSTRAINT "AssistantSettings_updatedById_fkey"
    FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
