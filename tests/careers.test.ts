import { describe, expect, it } from "vitest";

import {
  EMPLOYMENT_TYPE_LABELS,
  EMPLOYMENT_TYPE_SCHEMA,
  WORK_ARRANGEMENT_LABELS,
  daysOpen,
  experienceLabel,
  isLive,
  locationLabel,
  payRange,
} from "@/lib/careers";

const at = (iso: string) => new Date(iso);
const NOW = at("2026-08-23T12:00:00Z");
const OPEN = { closedAt: null, closesOn: null, postedOn: at("2026-08-01T00:00:00Z") };

describe("whether a role is live", () => {
  it("is live once posted, with no closing date", () => {
    expect(isLive(OPEN, NOW)).toBe(true);
  });

  it("is not live once closed by hand", () => {
    expect(isLive({ ...OPEN, closedAt: at("2026-08-20T00:00:00Z") }, NOW)).toBe(false);
  });

  it("closes itself once the closing date passes", () => {
    // The property that matters most here: Google downranks a site that leaves
    // filled roles up, and the commonest cause is that whoever posted it has
    // moved on. A date closes it whether or not anybody remembers.
    expect(isLive({ ...OPEN, closesOn: at("2026-08-22T00:00:00Z") }, NOW)).toBe(false);
  });

  it("is still live on its closing date", () => {
    expect(isLive({ ...OPEN, closesOn: at("2026-08-23T23:00:00Z") }, NOW)).toBe(true);
  });

  it("is not live before it is posted", () => {
    // What lets a role be written today and appear on Monday, rather than
    // being typed at eight in the morning on the day.
    expect(isLive({ ...OPEN, postedOn: at("2026-09-01T00:00:00Z") }, NOW)).toBe(false);
  });

  it("is not live once deleted", () => {
    expect(isLive({ ...OPEN, deletedAt: at("2026-08-10T00:00:00Z") }, NOW)).toBe(false);
  });

  it("counts the days it has been open", () => {
    expect(daysOpen({ postedOn: at("2026-08-01T12:00:00Z") }, NOW)).toBe(22);
  });
});

describe("advertised pay", () => {
  const base = { salaryCurrency: "INR", salaryPeriod: "year" };

  it("reports a range when both ends are set", () => {
    expect(payRange({ ...base, salaryMinMinor: 600000_00, salaryMaxMinor: 900000_00 })).toEqual({
      min: 600000_00,
      max: 900000_00,
      period: "year",
    });
  });

  it("reports a floor when only the minimum is set", () => {
    expect(payRange({ ...base, salaryMinMinor: 600000_00, salaryMaxMinor: null })).toEqual({
      min: 600000_00,
      max: null,
      period: "year",
    });
  });

  it("says nothing when no pay is advertised", () => {
    // An ordinary state for an Indian job advertisement, not an error.
    expect(payRange({ ...base, salaryMinMinor: null, salaryMaxMinor: null })).toBeNull();
  });

  it("says nothing when there is an amount but no period", () => {
    /*
     * The case this function exists for. "₹6,00,000" is a wildly different
     * offer per year than per month, and a reader assumes whichever suits
     * them. Silence is the only honest output.
     */
    expect(
      payRange({ salaryCurrency: "INR", salaryPeriod: null, salaryMinMinor: 600000_00, salaryMaxMinor: null }),
    ).toBeNull();
  });

  it("drops a maximum that is not above the minimum", () => {
    // "₹6,00,000–₹6,00,000" and "₹6,00,000–₹5,00,000" are both worse than a
    // single figure.
    expect(payRange({ ...base, salaryMinMinor: 600000_00, salaryMaxMinor: 600000_00 })?.max).toBeNull();
    expect(payRange({ ...base, salaryMinMinor: 600000_00, salaryMaxMinor: 500000_00 })?.max).toBeNull();
  });
});

describe("experience", () => {
  it("reads as a range when both bounds are set", () => {
    expect(experienceLabel({ experienceMinYears: 2, experienceMaxYears: 5 })).toBe("2–5 years");
  });

  it("reads as a floor when only a minimum is set", () => {
    expect(experienceLabel({ experienceMinYears: 3, experienceMaxYears: null })).toBe("3+ years");
  });

  it("treats a zero minimum as a real answer, not as absence", () => {
    // "No experience required" and "we have not said" are different positions,
    // and `0` is the first one.
    expect(experienceLabel({ experienceMinYears: 0, experienceMaxYears: null })).toBe(
      "No experience required",
    );
  });

  it("says nothing when neither bound is set", () => {
    expect(experienceLabel({ experienceMinYears: null, experienceMaxYears: null })).toBeNull();
  });
});

describe("location", () => {
  it("names the arrangement and the place", () => {
    expect(locationLabel({ workArrangement: "HYBRID", location: "New Delhi" })).toBe(
      "Hybrid · New Delhi",
    );
  });

  it("names only the arrangement on a remote role with no place", () => {
    // Never "Remote, null", which is what a template would print.
    expect(locationLabel({ workArrangement: "REMOTE", location: null })).toBe("Remote");
  });

  it("has a label for every arrangement and employment type", () => {
    for (const key of ["ON_SITE", "HYBRID", "REMOTE"] as const) {
      expect(WORK_ARRANGEMENT_LABELS[key], key).toBeTruthy();
    }
    for (const key of ["FULL_TIME", "PART_TIME", "CONTRACT", "INTERNSHIP"] as const) {
      expect(EMPLOYMENT_TYPE_LABELS[key], key).toBeTruthy();
      expect(EMPLOYMENT_TYPE_SCHEMA[key], key).toBeTruthy();
    }
  });

  it("maps employment types to schema.org's own vocabulary", () => {
    /*
     * Google validates against these exact strings and silently drops a
     * posting that uses anything else. `CONTRACT` is not a schema.org value —
     * `CONTRACTOR` is — which is why this is a table and not a string
     * transformation that would happen to work for three of the four.
     */
    expect(EMPLOYMENT_TYPE_SCHEMA.CONTRACT).toBe("CONTRACTOR");
    expect(EMPLOYMENT_TYPE_SCHEMA.INTERNSHIP).toBe("INTERN");
  });
});
