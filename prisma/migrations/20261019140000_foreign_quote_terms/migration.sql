-- The terms printed on a quotation written in a foreign currency, where the
-- rupee terms' GST wording does not apply. Null means the rupee terms are used.
ALTER TABLE "SiteSettings" ADD COLUMN "quoteTermsForeign" TEXT;
