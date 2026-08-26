-- Per-product search-result title and description.
--
-- Null on every existing row, which is the current behaviour: the product's
-- name and short description compose the metadata.
ALTER TABLE "Product" ADD COLUMN "seoTitle" TEXT;
ALTER TABLE "Product" ADD COLUMN "seoDescription" TEXT;
