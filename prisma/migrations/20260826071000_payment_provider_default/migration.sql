-- New payments are taken through Stripe.
--
-- Only the default changes. Existing rows keep "razorpay", which is what they
-- were: a payment record is a historical fact about which gateway held the
-- money, and rewriting it would make an old capture unfindable in the dashboard
-- it actually lives in.
ALTER TABLE "Payment" ALTER COLUMN "provider" SET DEFAULT 'stripe';
