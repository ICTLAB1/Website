-- CreateTable
CREATE TABLE "MailSettings" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "host" TEXT,
    "port" INTEGER,
    "secure" BOOLEAN,
    "username" TEXT,
    "password" TEXT,
    "fromAddress" TEXT,
    "fromName" TEXT,
    "salesNotificationEmail" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedById" TEXT,

    CONSTRAINT "MailSettings_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "MailSettings" ADD CONSTRAINT "MailSettings_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
