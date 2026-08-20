-- One order per quotation, enforced by the database.
--
-- The application already refuses to raise a second order against a quotation,
-- but that is a check-then-act which two concurrent acceptances could both
-- pass. This constraint makes the guarantee real. quoteId is nullable because a
-- direct purchase has no quotation, and Postgres permits many NULLs under a
-- unique index.
CREATE UNIQUE INDEX "Order_quoteId_key" ON "Order"("quoteId");
