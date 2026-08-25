import { brandLogos } from "./2026-08-brand-logos";
import { gemMark } from "./2026-08-gem-mark";
import { partnerStatusMigration } from "./2026-08-partner-status";
import { requirementMenu } from "./2026-08-requirement-menu";
import { hardwareCatalogue } from "./2026-08-hardware-catalogue";
import { hardwareModels } from "./2026-08-hardware-models";
import { serverMenu } from "./2026-08-server-menu";
import { homepageAndCertifications } from "./2026-08-homepage-and-certifications";
import { suppliedBrandArtwork } from "./2026-08-supplied-brand-artwork";
import { brandSegmentsMigration } from "./2026-08-brand-segments";
import { homepageTitle } from "./2026-08-homepage-title";
import { careersLink } from "./2026-08-careers-link";
import { profileUrls } from "./2026-08-profile-urls";
import { uaeBranch } from "./2026-08-uae-branch";
import { quoteCopy } from "./2026-08-quote-copy";
import { uaeRegistrations } from "./2026-08-uae-registrations";
import { quotationTerms } from "./2026-08-quotation-terms";
import { ajmanEmirate } from "./2026-08-ajman-emirate";
import { moreBrands } from "./2026-08-more-brands";
import { analyticsDisclosure } from "./2026-08-analytics-disclosure";
import type { ContentMigration } from "./types";

/**
 * Every content migration, in the order they are applied.
 *
 * Append to the end. The order is the order they run in on a database that has
 * seen none of them, so a later migration may rely on an earlier one having
 * happened — the logos one, for instance, expects the brands the first one
 * creates to exist.
 */
export const contentMigrations: ContentMigration[] = [
  homepageAndCertifications,
  brandLogos,
  hardwareCatalogue,
  serverMenu,
  hardwareModels,
  gemMark,
  partnerStatusMigration,
  requirementMenu,
  suppliedBrandArtwork,
  brandSegmentsMigration,
  homepageTitle,
  careersLink,
  profileUrls,
  uaeBranch,
  quoteCopy,
  uaeRegistrations,
  quotationTerms,
  ajmanEmirate,
  moreBrands,
  analyticsDisclosure,
];

export type { ContentMigration };
