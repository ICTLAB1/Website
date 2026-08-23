"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { recordAudit } from "@/lib/audit";
import { guard, isFailure } from "@/lib/admin/guard";
import type { AdminActionState } from "@/lib/admin/types";
import { invalidate, tags } from "@/lib/cache";

/**
 * Moderating a customer review.
 *
 * Three verbs and no fourth: approve, reject, reply. There is deliberately no
 * action here that edits the customer's words.
 *
 * That absence is the design. A review a supplier can rewrite is not a review,
 * and once the capability exists it will be used — to fix a typo, then to trim
 * a sentence, then to soften one. The business can reply in public underneath,
 * which is the honest way to answer a review it disagrees with, and it can
 * reject one outright with a note saying why. Neither of those changes what the
 * customer said.
 *
 * Rejection is not deletion. The row stays, with its rating out of the average
 * and its text off the site, so a pattern of rejections is visible to whoever
 * looks — a moderation queue that quietly loses the reviews it does not like
 * looks exactly like one that never received them.
 */

const noteSchema = z
  .string()
  .trim()
  .max(1000)
  .optional()
  .transform((value) => value || null);

const responseSchema = z
  .string()
  .trim()
  .max(1500, "Keep the reply under 1,500 characters.")
  .optional()
  .transform((value) => value || null);

async function loadReview(id: string) {
  return prisma.productReview.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      rating: true,
      product: { select: { slug: true, name: true } },
      user: { select: { name: true, email: true } },
    },
  });
}

/** Both public caches for a product: the global one and the per-product one. */
function refresh(productSlug: string) {
  invalidate(tags.reviews, tags.productReviews(productSlug), tags.catalogue);
  revalidatePath("/admin/reviews");
}

export async function moderateReview(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const staff = await guard("staff");
  if (isFailure(staff)) return staff;

  const id = String(formData.get("id") ?? "");
  const decision = String(formData.get("decision") ?? "");
  if (decision !== "APPROVED" && decision !== "REJECTED") {
    return { status: "error", message: "Choose whether to publish this review." };
  }

  const note = noteSchema.safeParse(formData.get("moderationNote") ?? undefined);
  if (!note.success) return { status: "error", message: "That note is too long." };

  const review = await loadReview(id);
  if (!review) return { status: "error", message: "That review no longer exists." };

  await prisma.productReview.update({
    where: { id: review.id },
    data: {
      status: decision,
      moderatedAt: new Date(),
      moderatedById: staff.id,
      moderationNote: note.data,
    },
  });

  await recordAudit({
    actorId: staff.id,
    action: decision === "APPROVED" ? "review.approved" : "review.rejected",
    entityType: "ProductReview",
    entityId: review.id,
    metadata: { product: review.product.slug, rating: review.rating, decision },
  });

  refresh(review.product.slug);

  return {
    status: "success",
    message:
      decision === "APPROVED"
        ? "Published. It is live on the product page now."
        : "Rejected. It stays on record here and does not appear on the site.",
  };
}

/**
 * The business's public reply, shown under the review.
 *
 * Allowed on an approved review only. Replying under something that was never
 * published would put half a conversation on the site — the answer without the
 * question — which reads as the business arguing with itself.
 */
export async function respondToReview(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const staff = await guard("staff");
  if (isFailure(staff)) return staff;

  const id = String(formData.get("id") ?? "");
  const parsed = responseSchema.safeParse(formData.get("response") ?? undefined);
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "That reply is too long." };
  }

  const review = await loadReview(id);
  if (!review) return { status: "error", message: "That review no longer exists." };
  if (review.status !== "APPROVED") {
    return {
      status: "error",
      message: "Publish the review first — a reply with nothing above it makes no sense to a reader.",
    };
  }

  await prisma.productReview.update({
    where: { id: review.id },
    data: {
      response: parsed.data,
      // Cleared alongside the text, so an emptied reply does not leave a date
      // claiming somebody answered.
      respondedAt: parsed.data ? new Date() : null,
    },
  });

  await recordAudit({
    actorId: staff.id,
    action: parsed.data ? "review.answered" : "review.answer_removed",
    entityType: "ProductReview",
    entityId: review.id,
    metadata: { product: review.product.slug },
  });

  refresh(review.product.slug);

  return {
    status: "success",
    message: parsed.data ? "Your reply is live under the review." : "Reply removed.",
  };
}
