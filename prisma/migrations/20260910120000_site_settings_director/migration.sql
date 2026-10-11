-- The individual who runs the business, and the designation they hold.
--
-- Indian acquiring banks require a merchant to name the person behind it, so
-- the name can be matched against the account's KYC. Nullable, like every other
-- identity column here: an installation that has not set it shows nothing
-- rather than inventing a name, and the about page omits the row entirely.
ALTER TABLE "SiteSettings" ADD COLUMN     "directorName" TEXT,
ADD COLUMN     "directorTitle" TEXT;
