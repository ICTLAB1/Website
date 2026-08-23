import { describe, expect, it } from "vitest";

import {
  CONFIRMATION_VALID_DAYS,
  currentPartnerLabel,
  partnerConfirmationCurrent,
  publicPartnerLabel,
} from "@/lib/brand-partner";
import { partnerStatus } from "../prisma/seed-data/partner-status";
import { brands } from "../prisma/seed-data/brands";

/**
 * A partner designation is a statement about another company's relationship
 * with this one, and one that company can be asked to confirm. These tests are
 * about what stops the site making that statement by accident.
 */

const day = 24 * 60 * 60 * 1000;
const daysAgo = (days: number) => new Date(Date.now() - days * day);

describe("when a designation may be stated", () => {
  it("states a confirmed, published designation", () => {
    expect(
      publicPartnerLabel({
        partnerLabel: "Solutions Partner",
        partnerConfirmedAt: daysAgo(10),
        partnerPublic: true,
      }),
    ).toBe("Solutions Partner");
  });

  it("says nothing without a designation on file", () => {
    // The important half: there is no code path that composes one from the
    // brand's name, so a brand with nothing on file has nothing to say.
    expect(
      publicPartnerLabel({ partnerLabel: null, partnerConfirmedAt: daysAgo(1), partnerPublic: true }),
    ).toBeNull();
    expect(
      publicPartnerLabel({ partnerLabel: "   ", partnerConfirmedAt: daysAgo(1), partnerPublic: true }),
    ).toBeNull();
  });

  it("says nothing until somebody has confirmed it", () => {
    expect(
      publicPartnerLabel({ partnerLabel: "Partner", partnerConfirmedAt: null, partnerPublic: true }),
    ).toBeNull();
  });

  it("says nothing until it is deliberately published", () => {
    // Filling in a designation for internal reference must not put it on the
    // website as a side effect.
    expect(
      publicPartnerLabel({
        partnerLabel: "Partner",
        partnerConfirmedAt: daysAgo(1),
        partnerPublic: false,
      }),
    ).toBeNull();
  });

  it("refuses a paragraph that has been typed into the wrong field", () => {
    expect(
      publicPartnerLabel({
        partnerLabel: "We have been a partner since 2014 and hold the highest tier available in the region",
        partnerConfirmedAt: daysAgo(1),
        partnerPublic: true,
      }),
    ).toBeNull();
  });

  it("takes nothing at all as nothing", () => {
    expect(publicPartnerLabel(null)).toBeNull();
    expect(publicPartnerLabel(undefined)).toBeNull();
  });
});

describe("a confirmation goes stale", () => {
  const brand = (confirmedAt: Date) => ({
    partnerLabel: "Partner",
    partnerConfirmedAt: confirmedAt,
    partnerPublic: true,
  });

  it("counts a recent confirmation", () => {
    expect(partnerConfirmationCurrent(brand(daysAgo(30)))).toBe(true);
    expect(currentPartnerLabel(brand(daysAgo(30)))).toBe("Partner");
  });

  it("stops counting one older than the window", () => {
    // Programmes are renewed annually and tiers move. A claim confirmed two
    // years ago is evidence of nothing, so it comes down on its own.
    expect(partnerConfirmationCurrent(brand(daysAgo(CONFIRMATION_VALID_DAYS + 5)))).toBe(false);
    expect(currentPartnerLabel(brand(daysAgo(CONFIRMATION_VALID_DAYS + 5)))).toBeNull();
  });

  it("refuses a confirmation dated in the future", () => {
    expect(partnerConfirmationCurrent(brand(new Date(Date.now() + 30 * day)))).toBe(false);
  });

  it("refuses an unparseable date rather than treating it as now", () => {
    expect(
      partnerConfirmationCurrent({
        partnerLabel: "Partner",
        partnerConfirmedAt: "not a date",
        partnerPublic: true,
      }),
    ).toBe(false);
  });
});

describe("the designations on file", () => {
  it("names only brands that exist", () => {
    const slugs = new Set(brands.map((brand) => brand.slug));
    for (const entry of partnerStatus) {
      expect(slugs.has(entry.slug), `no brand ${entry.slug}`).toBe(true);
    }
  });

  it("carries a label and a real confirmation date for each", () => {
    for (const entry of partnerStatus) {
      expect(entry.label.trim().length).toBeGreaterThan(0);
      expect(Number.isNaN(new Date(entry.confirmedAt).getTime())).toBe(false);
      expect(new Date(entry.confirmedAt).getTime()).toBeLessThanOrEqual(Date.now());
    }
  });

  it("names each brand once", () => {
    const slugs = partnerStatus.map((entry) => entry.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("is short — reselling a brand is not a designation", () => {
    // A guard against the list quietly growing to cover the whole catalogue,
    // which is how "we supply it" turns into "we are a partner".
    expect(partnerStatus.length).toBeLessThan(brands.length / 2);
  });
});

describe("the badge that evidences a designation", () => {
  it("comes down with the words it evidences", async () => {
    /*
     * The failure this rules out: a lapsed designation disappearing as text
     * and staying up as a picture, which leaves the more convincing half of
     * the claim in place.
     */
    const { currentPartnerBadge } = await import("@/lib/brand-partner");

    const badge = "/badges/microsoft-solutions-partner.png";
    const live = {
      partnerLabel: "Solutions Partner",
      partnerConfirmedAt: new Date("2026-08-01"),
      partnerPublic: true,
      partnerBadgeUrl: badge,
    };

    expect(currentPartnerBadge(live, new Date("2026-08-23"))).toBe(badge);

    // Never published.
    expect(currentPartnerBadge({ ...live, partnerPublic: false })).toBeNull();
    // Never confirmed.
    expect(currentPartnerBadge({ ...live, partnerConfirmedAt: null })).toBeNull();
    // Confirmed too long ago.
    expect(currentPartnerBadge(live, new Date("2028-01-01"))).toBeNull();
    // A badge with no designation behind it is not a designation.
    expect(currentPartnerBadge({ ...live, partnerLabel: null })).toBeNull();
  });

  it("refuses a path that is not artwork in the badge directory", async () => {
    const { currentPartnerBadge } = await import("@/lib/brand-partner");

    const base = {
      partnerLabel: "Certified Reseller",
      partnerConfirmedAt: new Date("2026-08-01"),
      partnerPublic: true,
    };
    const at = new Date("2026-08-23");

    for (const path of [
      "https://example.test/badge.png",
      "//example.test/badge.png",
      "/badges/../../etc/passwd",
      "/brands/microsoft.png",
      "/badges/badge.exe",
      "javascript:alert(1)",
    ]) {
      expect(currentPartnerBadge({ ...base, partnerBadgeUrl: path }, at)).toBeNull();
    }

    expect(
      currentPartnerBadge({ ...base, partnerBadgeUrl: "/badges/adobe-certified-reseller.png" }, at),
    ).toBe("/badges/adobe-certified-reseller.png");
  });
});
