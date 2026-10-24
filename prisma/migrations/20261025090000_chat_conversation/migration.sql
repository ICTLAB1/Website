-- The assistant's conversations, kept so the ones that did not become leads
-- are visible too. See the model's own documentation in schema.prisma.
CREATE TABLE "ChatConversation" (
    "id" TEXT NOT NULL,
    "messages" JSONB NOT NULL,
    "leadReference" TEXT,
    "ipHash" TEXT,
    "startedOn" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChatConversation_pkey" PRIMARY KEY ("id")
);

-- The retention sweep orders by this, and the admin list reads it newest first.
CREATE INDEX "ChatConversation_updatedAt_idx" ON "ChatConversation"("updatedAt");
