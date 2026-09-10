-- A photograph of the person who runs the business, as a path under /team/.
--
-- Stored beside the name and designation rather than compiled in, so that all
-- three change together: a new director recorded while the previous portrait
-- stayed in the bundle would put one person's name under another's face.
-- Nullable, like every other identity column here — a director with no
-- photograph is simply named, which is what the about page did before this.
ALTER TABLE "SiteSettings" ADD COLUMN     "directorPhoto" TEXT;
