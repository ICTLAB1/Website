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
import { secondAnalyticsProperty } from "./2026-08-second-analytics-property";
import { consentDisclosure } from "./2026-08-consent-disclosure";
import { rankingProducts } from "./2026-08-ranking-products";
import { aboutTitle } from "./2026-08-about-title";
import { workplaceComparison } from "./2026-08-workplace-comparison";
import { digitalLicenceArticle } from "./2026-08-digital-licence-article";
import { searchResultCopy } from "./2026-08-search-result-copy";
import { rankingGaps } from "./2026-08-ranking-gaps";
import { logoMarquee } from "./2026-08-logo-marquee";
import { clientBelt } from "./2026-08-client-belt";
import { industries } from "./2026-08-industries";
import { organisationWall } from "./2026-08-organisation-wall";
import { organisationLogos } from "./2026-08-organisation-logos";
import { organisationBelt } from "./2026-08-organisation-belt";
import { publishOrganisations } from "./2026-08-publish-organisations";
import { moreOrganisations } from "./2026-08-more-organisations";
import { gemPanelTiles } from "./2026-08-gem-panel-tiles";
import { organisationArtworkSecondBatch } from "./2026-08-organisation-artwork-second-batch";
import { nameEveryOrganisationWithAMark } from "./2026-08-name-every-organisation-with-a-mark";
import { threeDsMaxRanking } from "./2026-08-3ds-max-ranking";
import { homepageHeadline } from "./2026-08-homepage-headline";
import { claimsWithoutEvidence } from "./2026-08-claims-without-evidence";
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
  secondAnalyticsProperty,
  consentDisclosure,
  rankingProducts,
  aboutTitle,
  workplaceComparison,
  digitalLicenceArticle,
  searchResultCopy,
  rankingGaps,
  logoMarquee,
  clientBelt,
  industries,
  organisationWall,
  organisationLogos,
  organisationBelt,
  publishOrganisations,
  moreOrganisations,
  gemPanelTiles,
  organisationArtworkSecondBatch,
  nameEveryOrganisationWithAMark,
  threeDsMaxRanking,
  homepageHeadline,
  claimsWithoutEvidence,
];

export type { ContentMigration };
