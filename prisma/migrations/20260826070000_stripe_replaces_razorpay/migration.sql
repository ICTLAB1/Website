-- Stripe replaces Razorpay as the card gateway.
--
-- The two credential columns are renamed rather than dropped and recreated, so
-- the encrypted-column shape and the row itself survive. Their *contents* do
-- not: what is stored is a Razorpay key, and carrying it into a column Stripe
-- will be asked to authenticate with would leave the gateway enabled and
-- unusable — the one state `getPaymentConfig` exists to prevent.
--
-- So the credentials are cleared and the gateway is switched off. An
-- administrator enters the Stripe keys and turns it back on, which is a
-- deliberate act with its own audit entry. Until then the purchase-order route
-- carries checkout, exactly as it does on a deployment that never had a
-- gateway.
ALTER TABLE "PaymentSettings" DROP COLUMN IF EXISTS "razorpayKeyId";
ALTER TABLE "PaymentSettings" RENAME COLUMN "razorpayKeySecret" TO "stripeSecretKey";
ALTER TABLE "PaymentSettings" RENAME COLUMN "razorpayWebhookSecret" TO "stripeWebhookSecret";

UPDATE "PaymentSettings"
SET "stripeSecretKey" = NULL,
    "stripeWebhookSecret" = NULL,
    "enabled" = false;
