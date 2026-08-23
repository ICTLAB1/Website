import { describe, expect, it } from "vitest";

import {
  aggregate,
  isValidRating,
  mayPublishAggregateRating,
  reviewerLabel,
  starFill,
  testimonialIsPublishable,
} from "@/lib/reviews";

/**
 * The rules that decide what a visitor and a search engine are told.
 *
 * Two of these are not really display logic. `mayPublishAggregateRating` gates
 * structured data that a search engine will penalise a site for getting wrong,
 * and `testimonialIsPublishable` gates a named person's words appearing on a
 * supplier's website. Both are tested for the negative case first.
 */

describe("isValidRating", () => {
  it("accepts one through five", () => {
    for (const value of [1, 2, 3, 4, 5]) expect(isValidRating(value)).toBe(true);
  });

  it("rejects everything else", () => {
    for (const value of [0, 6, -1, 4.5, NaN, Infinity, "5", null, undefined]) {
      expect(isValidRating(value)).toBe(false);
    }
  });
});

describe("aggregate", () => {
  it("reports null rather than zero when nothing has been reviewed", () => {
    const summary = aggregate([]);
    expect(summary.count).toBe(0);
    // Zero is a rating somebody could have given. "0.0 out of 5" on an
    // unreviewed product is worse than showing nothing at all.
    expect(summary.average).toBeNull();
  });

  it("averages to one decimal place", () => {
    expect(aggregate([{ rating: 5 }, { rating: 4 }, { rating: 4 }]).average).toBe(4.3);
    expect(aggregate([{ rating: 5 }, { rating: 4 }]).average).toBe(4.5);
  });

  it("counts the distribution", () => {
    const summary = aggregate([{ rating: 5 }, { rating: 5 }, { rating: 3 }]);
    expect(summary.distribution[5]).toBe(2);
    expect(summary.distribution[3]).toBe(1);
    expect(summary.distribution[1]).toBe(0);
    expect(summary.count).toBe(3);
  });

  it("ignores a rating outside the scale rather than averaging it in", () => {
    const summary = aggregate([{ rating: 5 }, { rating: 99 }, { rating: 0 }]);
    expect(summary.count).toBe(1);
    expect(summary.average).toBe(5);
  });
});

describe("mayPublishAggregateRating", () => {
  it("refuses when there are no reviews", () => {
    expect(mayPublishAggregateRating(aggregate([]))).toBe(false);
  });

  it("allows a single real review", () => {
    expect(mayPublishAggregateRating(aggregate([{ rating: 4 }]))).toBe(true);
  });
});

describe("testimonialIsPublishable", () => {
  const consented = new Date("2026-08-14");

  it("refuses a published testimonial with no recorded consent", () => {
    // The case this function exists for: publishing a named customer's words
    // and employer without a record that they agreed to it.
    expect(testimonialIsPublishable({ status: "PUBLISHED", consentOn: null })).toBe(false);
  });

  it("refuses a consented testimonial that is still a draft", () => {
    expect(testimonialIsPublishable({ status: "DRAFT", consentOn: consented })).toBe(false);
  });

  it("refuses an archived testimonial even with both", () => {
    expect(
      testimonialIsPublishable({
        status: "PUBLISHED",
        consentOn: consented,
        deletedAt: new Date("2026-08-20"),
      }),
    ).toBe(false);
  });

  it("allows one that is published, consented and not archived", () => {
    expect(testimonialIsPublishable({ status: "PUBLISHED", consentOn: consented })).toBe(true);
  });
});

describe("reviewerLabel", () => {
  it("names the person and their organisation when both are known", () => {
    expect(reviewerLabel({ user: { name: "Priya Nair" }, organisation: "Vertex Logistics" })).toBe(
      "Priya Nair, Vertex Logistics",
    );
  });

  it("falls back to whichever it has", () => {
    expect(reviewerLabel({ user: { name: "Priya Nair" }, organisation: null })).toBe("Priya Nair");
    expect(reviewerLabel({ user: { name: null }, organisation: "Vertex Logistics" })).toBe(
      "Vertex Logistics",
    );
  });

  it("says what is actually known when it has neither", () => {
    // Not "Anonymous customer", which is a claim about who wrote it. The one
    // fact available is that the purchase was verified.
    expect(reviewerLabel({ user: { name: null }, organisation: null })).toBe("A verified buyer");
    expect(reviewerLabel({ user: { name: "   " }, organisation: "  " })).toBe("A verified buyer");
  });
});

describe("starFill", () => {
  it("rounds to the nearest half", () => {
    expect(starFill(4.2)).toBe(4);
    expect(starFill(4.3)).toBe(4.5);
    expect(starFill(4.8)).toBe(5);
    expect(starFill(1)).toBe(1);
  });
});
