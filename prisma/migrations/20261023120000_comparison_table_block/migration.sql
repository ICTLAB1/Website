-- A feature-comparison table block.
--
-- Added at the end of the enum rather than in a tidier position: Postgres
-- orders enum values by their position, and inserting one in the middle
-- rewrites the sort order of every row that already stores a later value.
ALTER TYPE "PageSectionType" ADD VALUE 'COMPARISON_TABLE';
