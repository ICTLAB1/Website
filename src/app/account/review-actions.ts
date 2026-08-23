"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/guards";
import { recordAudit } from "@/lib/audit";
import { clientIp } from "@/lib/auth/request";
import { hit, LIMITS } from "@/lib/auth/rate-limit";
import { invalidate, tags } from "@/lib/cache";
import { fieldErrorsOf } from "@/lib/validation";
import { purchaseFor } from "@/lib/queries/reviews";
import { MAX_RATING, MAX_REVIEW_BODY, MAX_REVIEW_TITLE, MIN_RATING } from "@/lib/reviews";
import type { ActionState } from "@/app/account/actions";

/**
 * Writing a review, as a customer.
 *
 * The design is one rule: **a review can only be written by the account that
 * bought the product.** Everything below is that rule being enforced rather
 * than assumed.
 *
 * It matters more here than on a normal shop. This is a reseller's catalogue of
 * Microsoft, Adobe and Autodesk licensing, and an open review form on it
 * collects two things in quantity — competitors marking down a rival's
 * listings, and suppliers marking up their own. Neither is distinguishable from
 * a real opinion once it is a row in the table, and both are what the star
 * rating on a search result would then be built from.
 *
 * So the order is looked up server-side from the session, never taken from the
 * form. A browser can send any `orderId` it likes; it is ignored.
 */

const reviewSchema = z.object({
  productId: z.string().min(1),
  rating: z.coerce
    .number()
    .int("Choose a rating between one and five stars.")
    .min(MIN_RATING, "Choose a rating between one and five stars.")
    .max(MAX_RATING, "Choose a rating between one and five stars."),
  title: z
    .string()
    .trim()
    .max(MAX_REVIEW_TITLE, `Keep the headline under ${MAX_REVIEW_TITLE} characters.`)
    .optional()
    .transform((value) => value || null),
  body: z
    .string()
    .trim()
    .min(20, "Tell other buyers a little more — at least twenty characters.")
    .max(MAX_REVIEW_BODY, `Keep the review under ${MAX_REVIEW_BODY} characters.`),
  organisation: z
    .string()
    .trim()
    .max(120)
    .optional()
    .transform((value) => value || null),
});

export async function submitReview(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser("/account/reviews");

  /*
   * Rate limited by account, because the expensive thing here is moderation
   * time rather than compute. Somebody working through a large order history
   * will not come close; somebody scripting will.
   */
  const limited = hit(`review:${user.id}`, LIMITS.enquiry.limit, LIMITS.enquiry.windowSeconds);
  if (!limited.allowed) {
    return {
      status: "error",
      message: "That is a lot of reviews at once. Try again shortly.",
    };
  }

  const parsed = reviewSchema.safeParse({
    productId: formData.get("productId"),
    rating: formData.get("rating"),
    title: formData.get("title"),
    body: formData.get("body"),
    organisation: formData.get("organisation"),
  });
  if (!parsed.success) {
    return {
      status: "error",
      message: "Please correct the highlighted fields.",
      fieldErrors: fieldErrorsOf(parsed.error),
    };
  }

  /*
   * The check the whole feature rests on.
   *
   * Note what is *not* here: the form has no order field, and if it had one it
   * would not be read. This asks the database which of this user's own orders
   * contains this product, and refuses if the answer is none.
   */
  const orderId = await purchaseFor(user.id, parsed.data.productId);
  if (!orderId) {
    return {
      status: "error",
      message: "Reviews are open to customers who bought the product through us.",
    };
  }

  const product = await prisma.product.findFirst({
    where: { id: parsed.data.productId, status: "ACTIVE", deletedAt: null },
    select: { id: true, slug: true, name: true },
  });
  if (!product) {
    return { status: "error", message: "That product is no longer listed." };
  }

  /*
   * `create`, not `upsert`. A second review from the same account is refused by
   * the unique index rather than quietly replacing the first — a customer who
   * buys the same licence again is not a second opinion, and an upsert here is
   * the cheapest way to move an average.
   */
  try {
    await prisma.productReview.create({
      data: {
        productId: product.id,
        userId: user.id,
        orderId,
        rating: parsed.data.rating,
        title: parsed.data.title,
        body: parsed.data.body,
        organisation: parsed.data.organisation,
        // PENDING by default, and there is no argument here that could change
        // that. Nothing a customer writes reaches the public site unread.
      },
    });
  } catch {
    return {
      status: "error",
      message: "You have already reviewed this product. Edit it from your reviews instead.",
    };
  }

  await recordAudit({
    actorId: user.id,
    action: "review.submitted",
    entityType: "ProductReview",
    entityId: product.id,
    metadata: { product: product.slug, rating: parsed.data.rating },
    ip: await clientIp(),
  });

  revalidatePath("/account/reviews");

  return {
    status: "success",
    message: "Thank you. Your review will appear once it has been read by our team.",
  };
}

/**
 * Withdrawing a review.
 *
 * A customer can take back what they wrote; they cannot edit it into something
 * else after it has been approved and published, which is why this deletes
 * rather than reopening it for editing. Writing a fresh one is then possible,
 * and goes through moderation like any other.
 */
export async function withdrawReview(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser("/account/reviews");
  const id = String(formData.get("id") ?? "");

  // Scoped to this user's own row. An id from the form cannot reach anybody
  // else's review, because the `where` names the owner.
  const review = await prisma.productReview.findFirst({
    where: { id, userId: user.id },
    select: { id: true, product: { select: { slug: true, name: true } } },
  });
  if (!review) return { status: "error", message: "That review is not yours to withdraw." };

  await prisma.productReview.delete({ where: { id: review.id } });

  await recordAudit({
    actorId: user.id,
    action: "review.withdrawn",
    entityType: "ProductReview",
    entityId: review.id,
    metadata: { product: review.product.slug },
    ip: await clientIp(),
  });

  // It may have been live, so the public caches go too.
  invalidate(tags.reviews, tags.productReviews(review.product.slug), tags.catalogue);
  revalidatePath("/account/reviews");

  return { status: "success", message: "Your review has been withdrawn." };
}
