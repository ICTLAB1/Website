-- A block that compares this catalogue's price against a named alternative,
-- without turning the alternative into a promoted card.
ALTER TYPE "PageSectionType" ADD VALUE IF NOT EXISTS 'PRICE_COMPARISON';
