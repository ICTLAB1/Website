-- The requirement status set a customer can actually be told.
--
-- Written by hand rather than generated, because replacing an enum's members is
-- destructive by default and the mapping from the old four buckets to the new
-- eleven is a business decision, not something a diff can infer:
--
--   NEW       -> SUBMITTED             it has arrived and nobody has looked yet
--   IN_REVIEW -> UNDER_REVIEW          somebody is looking
--   QUOTED    -> QUOTATION_SENT        the quotation has gone out
--   WON       -> CONVERTED_TO_ORDER    it became an order
--   LOST      -> REJECTED              the customer is not proceeding
--   CLOSED    -> CLOSED                unchanged
--
-- The new members with no predecessor — DRAFT, NEEDS_INFORMATION,
-- QUOTATION_PREPARING, ACCEPTED, EXPIRED — are states nothing could previously
-- be in, so no row maps onto them.

CREATE TYPE "EnquiryStatus_new" AS ENUM (
  'DRAFT',
  'SUBMITTED',
  'UNDER_REVIEW',
  'NEEDS_INFORMATION',
  'QUOTATION_PREPARING',
  'QUOTATION_SENT',
  'ACCEPTED',
  'REJECTED',
  'EXPIRED',
  'CONVERTED_TO_ORDER',
  'CLOSED'
);

ALTER TABLE "Enquiry" ALTER COLUMN "status" DROP DEFAULT;

ALTER TABLE "Enquiry"
  ALTER COLUMN "status" TYPE "EnquiryStatus_new"
  USING (
    CASE "status"::text
      WHEN 'NEW'       THEN 'SUBMITTED'
      WHEN 'IN_REVIEW' THEN 'UNDER_REVIEW'
      WHEN 'QUOTED'    THEN 'QUOTATION_SENT'
      WHEN 'WON'       THEN 'CONVERTED_TO_ORDER'
      WHEN 'LOST'      THEN 'REJECTED'
      WHEN 'CLOSED'    THEN 'CLOSED'
      ELSE 'SUBMITTED'
    END
  )::"EnquiryStatus_new";

DROP TYPE "EnquiryStatus";
ALTER TYPE "EnquiryStatus_new" RENAME TO "EnquiryStatus";

ALTER TABLE "Enquiry" ALTER COLUMN "status" SET DEFAULT 'SUBMITTED';

-- How a requirement arrived, and the requirement itself where it was described
-- rather than picked from the catalogue.
CREATE TYPE "EnquiryKind" AS ENUM ('BASKET', 'REQUIREMENT', 'BOQ');

ALTER TABLE "Enquiry"
  ADD COLUMN "kind" "EnquiryKind" NOT NULL DEFAULT 'BASKET',
  ADD COLUMN "requirement" JSONB,
  ADD COLUMN "submittedAt" TIMESTAMP(3);

-- Everything that exists was submitted the moment it was created: the draft
-- state did not exist before this migration, so there is no row it applies to.
UPDATE "Enquiry" SET "submittedAt" = "createdAt" WHERE "submittedAt" IS NULL;
