import "server-only";
import { cache } from "react";

import { prisma } from "@/lib/db";
import { cached } from "@/lib/queries/cached";
import { tags } from "@/lib/cache";
import { aggregate, type Aggregate } from "@/lib/reviews";

/**
 * Reads for reviews and testimonials.
 *
 * Two properties are enforced here rather than left to the caller, because a
 * caller that forgets either publishes something it should not have:
 *
 * - A review is only ever read with `status: "APPROVED"`. There is no query in
 *   this file that returns a pending or rejected review to a public surface.
 * - A testimonial is only ever read with a recorded consent. `PUBLISHED` alone
 *   is not enough — see `testimonialIsPublishable`, whose condition this
 *   mirrors clause for clause.
 */

const REVIEW_CARD = {
  id: true,
  rating: true,
  title: true,
  body: true,
  organisation: true,
  response: true,
  respondedAt: true,
  createdAt: true,
  user: { select: { name: true } },
} as const;

/** Approved reviews for one product, newest first. */
export const productReviews = cache(
  cached(
    async (productSlug: string) =>
      prisma.productReview.findMany({
        where: { status: "APPROVED", product: { slug: productSlug } },
        orderBy: { createdAt: "desc" },
        select: REVIEW_CARD,
        // A product page is not a review site. Everything is counted in the
        // aggregate below; this is how many are rendered.
        take: 20,
      }),
    ["product-reviews"],
    [tags.reviews],
  ),
);

/**
 * The rating summary for one product, counted over every approved review.
 *
 * Deliberately not derived from the twenty rows above. The list is capped for
 * rendering and the average must not be — an average over "the twenty most
 * recent" would drift away from the count printed beside it, and the number a
 * search engine is given has to be the number over everything.
 */
export const productRating = cache(
  cached(
    async (productSlug: string): Promise<Aggregate> => {
      const rows = await prisma.productReview.findMany({
        where: { status: "APPROVED", product: { slug: productSlug } },
        select: { rating: true },
      });
      return aggregate(rows);
    },
    ["product-rating"],
    [tags.reviews],
  ),
);

/**
 * Star ratings for a set of products at once, for cards in a listing.
 *
 * One grouped query rather than one per card. A catalogue page renders twelve
 * products and would otherwise ask twelve times, which is the shape of thing
 * that is fine at 49 products and not at the thousands this catalogue is built
 * for.
 */
export const ratingsForProducts = cache(async (productIds: string[]) => {
  if (productIds.length === 0) return new Map<string, Aggregate>();

  const grouped = await prisma.productReview.groupBy({
    by: ["productId", "rating"],
    where: { status: "APPROVED", productId: { in: productIds } },
    _count: { _all: true },
  });

  const byProduct = new Map<string, { rating: number }[]>();
  for (const row of grouped) {
    const list = byProduct.get(row.productId) ?? [];
    for (let n = 0; n < row._count._all; n += 1) list.push({ rating: row.rating });
    byProduct.set(row.productId, list);
  }

  return new Map([...byProduct].map(([id, rows]) => [id, aggregate(rows)]));
});

/**
 * Testimonials for the public site.
 *
 * The `consentOn: { not: null }` clause is the important one and is not
 * decoration: a row can be set to PUBLISHED directly in the database, and
 * without this the only thing standing between that and a named person's words
 * on the site would be a form somebody bypassed.
 */
const TESTIMONIAL_CARD = {
  id: true,
  quote: true,
  authorName: true,
  authorRole: true,
  organisation: true,
  brand: { select: { name: true, slug: true } },
  service: { select: { name: true, slug: true } },
} as const;

export const publishedTestimonials = cache(
  cached(
    async () =>
      prisma.testimonial.findMany({
        where: { status: "PUBLISHED", consentOn: { not: null }, deletedAt: null },
        orderBy: [{ featured: "desc" }, { displayOrder: "asc" }, { createdAt: "desc" }],
        select: TESTIMONIAL_CARD,
      }),
    ["testimonials"],
    [tags.testimonials],
  ),
);

/** Testimonials about one brand, plus the general ones. */
export const testimonialsForBrand = cache(async (brandSlug: string) => {
  const all = await publishedTestimonials();
  return all.filter((row) => row.brand?.slug === brandSlug);
});

/** Testimonials about one service. */
export const testimonialsForService = cache(async (serviceSlug: string) => {
  const all = await publishedTestimonials();
  return all.filter((row) => row.service?.slug === serviceSlug);
});

/**
 * The products this account may review, and has not yet.
 *
 * This is the query that makes every review on the site traceable to a
 * purchase. A product appears here only if this user's own order contains it
 * and that order reached a state where the customer actually has the thing —
 * a PENDING order is a basket, not a purchase, and a CANCELLED or REFUNDED one
 * is the opposite of one.
 *
 * Uncached, and it must stay that way: it is per-user and it changes the moment
 * a review is written. A cached read here would offer somebody a product they
 * had already reviewed, or hide one they had just bought.
 */
const REVIEWABLE_ORDER_STATUS = ["CONFIRMED", "PROVISIONING", "FULFILLED"] as const;

export async function reviewableProducts(userId: string) {
  const items = await prisma.orderItem.findMany({
    where: {
      productId: { not: null },
      order: { userId, status: { in: [...REVIEWABLE_ORDER_STATUS] } },
      product: { status: "ACTIVE", deletedAt: null },
    },
    orderBy: { order: { placedAt: "desc" } },
    select: {
      orderId: true,
      order: { select: { reference: true, placedAt: true } },
      product: { select: { id: true, slug: true, name: true, imageUrl: true, formFactor: true } },
    },
  });

  const reviewed = new Set(
    (
      await prisma.productReview.findMany({
        where: { userId },
        select: { productId: true },
      })
    ).map((row) => row.productId),
  );

  // One entry per product, keeping the earliest order it was bought on — the
  // review is evidence of a purchase, and the first one is the purchase.
  const seen = new Set<string>();
  const out = [];
  for (const item of items) {
    if (!item.product || reviewed.has(item.product.id) || seen.has(item.product.id)) continue;
    seen.add(item.product.id);
    out.push({ ...item.product, orderId: item.orderId, order: item.order });
  }
  return out;
}

/** This account's own reviews, in every state, for the portal. */
export async function myReviews(userId: string) {
  return prisma.productReview.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      rating: true,
      title: true,
      body: true,
      status: true,
      response: true,
      respondedAt: true,
      createdAt: true,
      product: { select: { slug: true, name: true } },
    },
  });
}

/**
 * Whether this account bought this product, and on which order.
 *
 * Asked at write time, not read from the form. The order id a browser sends is
 * a claim; this is the check.
 */
export async function purchaseFor(userId: string, productId: string) {
  const item = await prisma.orderItem.findFirst({
    where: {
      productId,
      order: { userId, status: { in: [...REVIEWABLE_ORDER_STATUS] } },
    },
    orderBy: { order: { placedAt: "asc" } },
    select: { orderId: true },
  });
  return item?.orderId ?? null;
}
