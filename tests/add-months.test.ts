import { describe, expect, it } from "vitest";
import { addMonthsUtc } from "@/lib/utils";

/**
 * Adding months at the end of a month.
 *
 * `Date.UTC(y, m + n, d)` overflows rather than clamping, and this is the
 * calculation behind every licence's expiry date and therefore behind every
 * renewal's due date. The four cases that were wrong are the first four below;
 * each one sold a few more days of software than were paid for and pushed the
 * renewal reminder past the day it was meant to land on.
 */
const cases: Array<[string, number, string]> = [
  // The regressions.
  ["2026-01-31", 1, "2026-02-28"], // was 2026-03-03
  ["2026-08-31", 1, "2026-09-30"], // was 2026-10-01
  ["2028-02-29", 12, "2029-02-28"], // was 2029-03-01
  ["2026-05-31", 1, "2026-06-30"], // was 2026-07-01

  // A leap year is reached by counting, not by a rule written here.
  ["2027-02-28", 12, "2028-02-28"],
  ["2028-01-31", 1, "2028-02-29"],

  // Ordinary dates, unchanged — a clamp that moved these would be its own bug.
  ["2026-03-15", 12, "2027-03-15"],
  ["2026-06-01", 1, "2026-07-01"],
  ["2026-11-30", 1, "2026-12-30"],
  ["2026-12-15", 1, "2027-01-15"], // crosses the year
  ["2026-04-10", 36, "2029-04-10"], // the longest term in the catalogue
];

describe("adding whole months in UTC", () => {
  it.each(cases)("%s plus %i months is %s", (from, months, expected) => {
    expect(addMonthsUtc(new Date(`${from}T00:00:00Z`), months).toISOString().slice(0, 10)).toBe(
      expected,
    );
  });

  it("lands on midnight UTC, whatever time of day it started from", () => {
    /*
     * Deliberate, and the behaviour this replaced: an expiry is a date rather
     * than a moment, and two licences fulfilled an hour apart on the same day
     * should not expire an hour apart a year later. Pinned so that a later
     * reading of this helper as general-purpose date arithmetic does not
     * quietly start carrying the clock through.
     */
    const result = addMonthsUtc(new Date("2026-01-31T09:30:15.250Z"), 1);
    expect(result.toISOString()).toBe("2026-02-28T00:00:00.000Z");
  });
});
