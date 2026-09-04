-- WhatsApp order and payment confirmations, alongside email.
CREATE TABLE "WhatsAppSettings" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "phoneNumberId" TEXT,
    "businessAccountId" TEXT,
    "accessToken" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedById" TEXT,

    CONSTRAINT "WhatsAppSettings_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "WhatsAppSettings" ADD CONSTRAINT "WhatsAppSettings_updatedById_fkey"
    FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
