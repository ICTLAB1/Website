import type { ReviewStatus } from "@prisma/client";

/**
 * The rules about what may be shown, kept away from the database.
 *
 * These decide whether a star rating reaches a visitor and whether an
 * `AggregateRating` reaches a search engine, so they are worth being able to
 * test without a database and worth stating once rather than in each of the
 * four places that ask.
 */

export const MIN_RATING = 1;
export const MAX_RATING = 5;

/** Longest a review body may be. Long enough for a considered paragraph. */
export const MAX_REVIEW_BODY = 2000;
/** Short enough that a title is a title and not a second review. */
export const MAX_REVIEW_TITLE = 120;

export type RatingInput = { rating: number };

/** A whole number of stars, in range. Anything else is not a rating. */
export function isValidRating(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= MIN_RATING &&
    value <= MAX_RATING
  );
}

export type Aggregate = {
  count: number;
  /** The mean, to one decimal place, or null when there is nothing to average. */
  average: number | null;
  /** How many reviews gave each rating, indexed 1–5. */
  distribution: Record<number, number>;
};

/**
 * The summary shown above a product's reviews.
 *
 * `average` is null rather than 0 when there are no reviews, and the
 * distinction is the point: zero is a rating somebody could have given, and a
 * product showing "0.0 out of 5" because nobody has reviewed it is worse than a
 * product showing nothing. Every caller has to handle the null, which is what
 * stops that rendering existing.
 *
 * Rounded to one decimal on the way out, so the page, the structured data and
 * the admin screen cannot disagree about whether something is a 4.2 or a 4.25.
 */
export function aggregate(reviews: RatingInput[]): Aggregate {
  const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let total = 0;
  let count = 0;

  for (const review of reviews) {
    if (!isValidRating(review.rating)) continue;
    distribution[review.rating] = (distribution[review.rating] ?? 0) + 1;
    total += review.rating;
    count += 1;
  }

  return {
    count,
    average: count === 0 ? null : Math.round((total / count) * 10) / 10,
    distribution,
  };
}

/**
 * Whether `AggregateRating` structured data may be emitted.
 *
 * Separate from `aggregate` having a number in it, because the question is not
 * arithmetic. Review markup is the most abused structured data on the web and
 * search engines police it accordingly: markup on a page with no visible
 * reviews, or with reviews the site wrote about itself, costs a domain its rich
 * results and sometimes more. So this asks for reviews that are approved, from
 * verified purchases, and actually rendered on the same page.
 *
 * One is enough. A single real review is a real review; the threshold that
 * matters is between none and some.
 */
export function mayPublishAggregateRating(summary: Aggregate): boolean {
  return summary.count >= 1 && summary.average !== null;
}

/**
 * Whether a testimonial may be shown to a visitor.
 *
 * Published *and* consented. Both, always, and checked here rather than only in
 * the form that sets them: a row can be edited straight in the database, and
 * the consequence of getting this wrong is a named person's words and employer
 * on a supplier's website without their permission. That is not a rendering
 * bug, it is a thing you apologise for.
 */
export function testimonialIsPublishable(row: {
  status: string;
  consentOn: Date | null;
  deletedAt?: Date | null;
}): boolean {
  return row.status === "PUBLISHED" && row.consentOn !== null && !row.deletedAt;
}

/**
 * How a reviewer is named publicly.
 *
 * The organisation is what makes a business review worth reading — "IT Manager,
 * a logistics company in Pune" says more than a name does — but the reviewer
 * chose neither field, so this only ever assembles what is there and never
 * invents a descriptor to fill the gap.
 */
export function reviewerLabel(review: {
  user: { name: string | null };
  organisation: string | null;
}): string {
  const name = review.user.name?.trim();
  const organisation = review.organisation?.trim();
  if (name && organisation) return `${name}, ${organisation}`;
  if (name) return name;
  if (organisation) return organisation;
  // Neither. Still not "Anonymous customer" — that reads as a claim about who
  // wrote it. "A verified buyer" is the only thing actually known.
  return "A verified buyer";
}

/** Statuses a customer may see on their own review, and what to call each. */
export const REVIEW_STATUS_LABELS: Record<ReviewStatus, string> = {
  PENDING: "Awaiting moderation",
  APPROVED: "Published",
  REJECTED: "Not published",
};

/**
 * Rounded to the nearest half, for drawing stars.
 *
 * Separate from `average` because the two round differently on purpose: 4.2
 * displays as "4.2" in text and as four stars in the row of icons, and a single
 * rounding used for both would either lie in the text or jitter in the icons.
 */
export function starFill(average: number): number {
  return Math.round(average * 2) / 2;
}
