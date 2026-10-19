-- The rate a quotation's figures were converted at when it was moved off the
-- rupee, in paise per one unit of its currency. Null on a rupee quotation.
ALTER TABLE "Quote" ADD COLUMN "exchangeRatePaise" INTEGER;
