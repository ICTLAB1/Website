-- Trigram index for catalogue search.
--
-- Product search filters with `contains`, which Prisma emits as
-- `LIKE '%term%'`. A leading wildcard cannot use a B-tree index, so every
-- search sequentially scanned the whole table. That is fine at 49 products and
-- is not fine at the "thousands" this catalogue is meant to hold: measured on a
-- synthetic catalogue, the scan cost rose from ~8 ms at 20,000 products to
-- ~40 ms at 100,000, growing linearly with the table, on every keystroke of a
-- type-ahead search.
--
-- `searchText` is written already lowercase-normalised (see
-- src/lib/search-text.ts), so the index goes directly on the column with no
-- expression wrapper — an expression index would only be used if the query
-- wrapped the column the same way, and it does not.
--
-- Measured on the same synthetic catalogue, three runs each:
--
--                       20,000 products        100,000 products
--   query               seq scan   trigram     seq scan   trigram
--   selective phrase     8.6 ms     2.7 ms      40.5 ms    13.4 ms
--   a SKU                7.8 ms     0.4 ms      37.6 ms     3.0 ms
--   moderately common    8.5 ms     3.2 ms      41.1 ms    16.3 ms
--
-- Two cases deliberately do not improve, and should not be expected to. A term
-- matching almost every row ("licence") and a term shorter than one trigram
-- ("ke") are both answered by walking `Product_popularity_idx` backwards until
-- the LIMIT is satisfied — around 0.9 ms either way. The planner picks that on
-- its own, with or without this index, which is the correct choice.
--
-- The index is roughly 3 MB per 20,000 products.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX "Product_searchText_idx"
  ON "Product" USING gin ("searchText" gin_trgm_ops);

-- FAQs are the only other search path with an unbounded row count: they are
-- authored per product, per brand and per service, so they grow with the
-- catalogue rather than with editorial effort. Brands, services and articles
-- are bounded by the business — a handful of vendors, a handful of service
-- lines, and articles written by hand — so their scans stay cheap and are
-- deliberately left alone rather than carrying an index the planner would
-- decline to use and every write would have to maintain.
--
-- These two are searched case-insensitively, which Prisma emits as ILIKE;
-- gin_trgm_ops serves ILIKE as well as LIKE.
CREATE INDEX "Faq_question_idx" ON "Faq" USING gin ("question" gin_trgm_ops);
CREATE INDEX "Faq_answer_idx" ON "Faq" USING gin ("answer" gin_trgm_ops);
