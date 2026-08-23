import type { BrandSegment } from "@prisma/client";

/**
 * How each brand segment is headed on the site.
 *
 * Separate from `prisma/seed-data/brand-segments`, which says *which* segment
 * each brand is in. That is seed data — a fact about forty companies, written
 * once. This is interface copy, which is edited when the wording is wrong and
 * has no business being reachable from a database seed.
 */
export const SEGMENT_LABELS: Record<BrandSegment, string> = {
  SOFTWARE_CLOUD: "Software & cloud",
  BUSINESS_HARDWARE: "Business hardware",
  ENTERPRISE_INFRASTRUCTURE: "Enterprise infrastructure",
  CYBERSECURITY: "Cybersecurity",
};

export const SEGMENT_DESCRIPTIONS: Record<BrandSegment, string> = {
  SOFTWARE_CLOUD:
    "Licences and subscriptions, from perpetual desktop software to per-user cloud plans.",
  BUSINESS_HARDWARE:
    "Commercial laptops, desktops and workstations \u2014 the business ranges, not the consumer ones.",
  ENTERPRISE_INFRASTRUCTURE:
    "Servers, storage, networking and the platforms that run on them.",
  CYBERSECURITY: "Endpoint, network and threat protection for managed estates.",
};

/** The order the segments read in on the page. */
export const SEGMENT_ORDER: BrandSegment[] = [
  "SOFTWARE_CLOUD",
  "BUSINESS_HARDWARE",
  "ENTERPRISE_INFRASTRUCTURE",
  "CYBERSECURITY",
];
