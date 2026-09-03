-- CCAvenue as a second, independently-switchable payment gateway alongside Stripe.
ALTER TABLE "PaymentSettings"
  ADD COLUMN "ccavenueEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "ccavenueMerchantId" TEXT,
  ADD COLUMN "ccavenueAccessCode" TEXT,
  ADD COLUMN "ccavenueWorkingKey" TEXT;
