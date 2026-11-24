import reviewsFile from "../../content/reviews.json";

import type { TestimonialCard } from "@/components/reviews/testimonials";

/**
 * Customer reviews the owner has approved, read from `content/reviews.json`.
 *
 * Only an entry with `approved: true` and both a quote and an author is ever
 * returned, so a half-filled placeholder cannot reach a page. Nothing is copied
 * in automatically from Google or anywhere else.
 */
type Entry = {
  id: string;
  approved: boolean;
  quote: string;
  author: string;
  role?: string;
  organisation?: string;
  source?: string;
  sourceUrl?: string;
  products?: string[];
};

export function approvedReviews(productSlug?: string): TestimonialCard[] {
  const entries = (reviewsFile as { reviews: Entry[] }).reviews;
  return entries
    .filter((entry) => entry.approved === true && entry.quote.trim() !== "" && entry.author.trim() !== "")
    .filter((entry) => {
      const scoped = entry.products ?? [];
      return scoped.length === 0 || (productSlug ? scoped.includes(productSlug) : true);
    })
    .map((entry) => ({
      id: entry.id,
      quote: entry.quote.trim(),
      authorName: entry.author.trim(),
      authorRole: entry.role?.trim() || null,
      organisation: entry.organisation?.trim() || null,
    }));
}
