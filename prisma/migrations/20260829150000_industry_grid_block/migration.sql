-- A block that renders the sectors this business supplies.
--
-- It names no sector of its own: the rows are read from the Industry table when
-- the page renders, so a sector added, renamed or withdrawn in the admin panel
-- changes the grid, the filter and the detail pages together.
ALTER TYPE "PageSectionType" ADD VALUE IF NOT EXISTS 'INDUSTRY_GRID';
