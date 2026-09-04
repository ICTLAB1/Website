-- Azure Communication Services as a second, independent channel for system
-- mail (verification, password reset, order/payment confirmations, status and
-- ticket updates), alongside the existing SMTP/Graph mailbox used for
-- quotations and internal sales-inbox copies.
ALTER TABLE "MailSettings"
  ADD COLUMN "acsEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "acsConnectionString" TEXT,
  ADD COLUMN "acsSenderAddress" TEXT;
