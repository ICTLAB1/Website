import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { closedAt } from "@/lib/ticket-service";
import {
  RETENTION_FLOORS,
  RETENTION_RULES,
  cutoffFor,
  type RetentionRule,
} from "@/lib/privacy/retention";

/**
 * The retention table is a published promise, and these tests exist to keep the
 * promise and the code from drifting apart.
 *
 * The one that matters is `every published row is accounted for`. It reads the
 * policy copy out of the seed data and insists that each row is either
 * implemented or explicitly held back with a reason. Add a row to the privacy
 * policy and this test fails until somebody decides which of the two it is —
 * which is exactly the moment to decide it, rather than a year later when
 * somebody notices the page claims a deletion nothing performs.
 */

const RETENTION_HEADING = "How long we keep it";

/** The rows of the published table, read from the copy rather than restated. */
function publishedRows(): string[] {
  const seed = readFileSync(new URL("../prisma/seed-data/pages.ts", import.meta.url), "utf8");

  /*
   * The heading sits after the items in the serialised block, so the table is
   * found by locating the heading and then reading backwards to the nearest
   * `"items"` before it. Matching forwards from `"items"` would find whichever
   * KEY_VALUE_LIST happens to come first in the file.
   */
  const heading = seed.indexOf(`"heading": "${RETENTION_HEADING}"`);
  expect(heading, `the "${RETENTION_HEADING}" block is in the seed data`).toBeGreaterThan(-1);

  const items = seed.lastIndexOf('"items"', heading);
  expect(items).toBeGreaterThan(-1);

  const block = seed.slice(items, heading);
  const pairs = [...block.matchAll(/"key":\s*"([^"]+)",\s*\n\s*"value":\s*"([^"]+)"/g)];

  return pairs.map(([, key, value]) => `${key} — ${value}`);
}

/**
 * Published rows and the strings in the code are the same sentence with
 * different punctuation — the policy renders the period beside the subject,
 * the code joins them with a dash. Compared on the subject alone, which is the
 * half that identifies the row.
 */
function subject(row: string): string {
  return row.split("—")[0]!.trim().toLowerCase();
}

describe("published retention periods", () => {
  it("every published row is accounted for", () => {
    const rows = publishedRows();
    expect(rows.length).toBe(7);

    const covered = new Set(
      [...RETENTION_RULES.map((rule) => rule.published), ...RETENTION_FLOORS.map((f) => f.published)]
        .map(subject),
    );

    const unaccounted = rows.filter((row) => !covered.has(subject(row)));
    expect(unaccounted).toEqual([]);
  });

  it("claims no rule that the policy does not publish", () => {
    const published = new Set(publishedRows().map(subject));
    for (const rule of RETENTION_RULES) {
      expect(published.has(subject(rule.published)), rule.published).toBe(true);
    }
  });

  it("holds every floor back with a reason", () => {
    for (const floor of RETENTION_FLOORS) {
      expect(floor.held.length, floor.published).toBeGreaterThan(20);
    }
  });
});

describe("cutoffFor", () => {
  const rule = (months: number): RetentionRule => ({
    id: "audit-logs",
    published: "test",
    months,
    measuredFrom: "test",
  });

  it("counts back in whole months", () => {
    const cutoff = cutoffFor(rule(12), new Date("2026-10-22T14:30:00Z"));
    expect(cutoff.toISOString()).toBe("2025-10-22T00:00:00.000Z");
  });

  it("reads three years as thirty-six months, not 1095 days", () => {
    // 2024 was a leap year, so the day count differs from 365 × 3.
    const cutoff = cutoffFor(rule(36), new Date("2026-03-01T00:00:00Z"));
    expect(cutoff.toISOString()).toBe("2023-03-01T00:00:00.000Z");
  });

  it("does not depend on the hour the job runs", () => {
    const early = cutoffFor(rule(36), new Date("2026-10-22T02:00:00Z"));
    const late = cutoffFor(rule(36), new Date("2026-10-22T23:59:59Z"));
    expect(early.toISOString()).toBe(late.toISOString());
  });

  it("clamps a day the target month does not have", () => {
    // 36 months before the 31st of May is the 31st of May; 3 months before it
    // is the 28th or 29th of February, not the 2nd or 3rd of March.
    const cutoff = cutoffFor(rule(3), new Date("2026-05-31T12:00:00Z"));
    expect(cutoff.toISOString()).toBe("2026-02-28T00:00:00.000Z");
  });
});

/**
 * `closedAt` is here rather than in a ticket test because the retention rule is
 * why it exists. The published period runs from closure, so a closed ticket
 * with no closure date is a ticket the rule can never reach — and before this
 * change the admin form that closes most tickets never set one at all.
 */
describe("closedAt", () => {
  const now = new Date("2026-10-22T09:00:00Z");
  const earlier = new Date("2026-10-19T09:00:00Z");

  it("stamps a resolution", () => {
    expect(closedAt("RESOLVED", null, now)).toEqual(now);
  });

  it("re-stamps a resolution, because it is the current one that counts", () => {
    expect(closedAt("RESOLVED", earlier, now)).toEqual(now);
  });

  it("gives a closure with no date one, so retention has something to count from", () => {
    expect(closedAt("CLOSED", null, now)).toEqual(now);
  });

  it("keeps the resolution date when a resolved ticket is closed later", () => {
    // Resolved on the Monday, closed on the Thursday: it was resolved on the
    // Monday, and the response-time figures are read off this column.
    expect(closedAt("CLOSED", earlier, now)).toEqual(earlier);
  });

  it("clears the date when a ticket is reopened", () => {
    for (const status of ["OPEN", "IN_PROGRESS", "WAITING_ON_CUSTOMER"] as const) {
      expect(closedAt(status, earlier, now), status).toBeNull();
    }
  });
});
