-- CreateEnum
CREATE TYPE "MailProvider" AS ENUM ('SMTP', 'MICROSOFT_GRAPH');

-- AlterTable
ALTER TABLE "MailSettings" ADD COLUMN     "graphClientId" TEXT,
ADD COLUMN     "graphClientSecret" TEXT,
ADD COLUMN     "graphSender" TEXT,
ADD COLUMN     "graphTenantId" TEXT,
ADD COLUMN     "provider" "MailProvider" NOT NULL DEFAULT 'SMTP';
