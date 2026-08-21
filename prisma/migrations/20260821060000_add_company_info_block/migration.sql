-- A block that renders the company identity panel.
--
-- It stores no identity of its own: the values come from environment
-- configuration at render time, which is where business identity deliberately
-- lives. The block only records that the panel belongs at that point in the
-- page, so an administrator can place it without being able to edit a GSTIN
-- through the CMS.
ALTER TYPE "PageSectionType" ADD VALUE 'COMPANY_INFO';
