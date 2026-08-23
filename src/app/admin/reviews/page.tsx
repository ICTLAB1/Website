import Link from "next/link";
import type { Metadata } from "next";
import type { ReviewStatus } from "@prisma/client";

import { AdminForm } from "@/components/admin/admin-form";
import { Field, Input, Textarea } from "@/components/ui/form";
import { StatusBadge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/states";
import { Stars } from "@/components/reviews/stars";
import { moderateReview, respondToReview } from "@/app/admin/review-actions";
import { requireStaff } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { REVIEW_STATUS_LABELS } from "@/lib/reviews";
import { formatDate, formatDateTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Reviews" };

const FILTERS: Array<{ key: string; label: string; status: ReviewStatus | null }> = [
  { key: "pending", label: "Waiting", status: "PENDING" },
  { key: "approved", label: "Published", status: "APPROVED" },
  { key: "rejected", label: "Rejected", status: "REJECTED" },
  { key: "all", label: "All", status: null },
];

/**
 * The moderation queue.
 *
 * Waiting first, because that is the only tab with work in it. The other three
 * exist so a decision can be revisited — a review rejected in error is
 * recoverable, and a published one can be taken down.
 *
 * Rejected reviews stay listed rather than disappearing. A queue that quietly
 * loses what it declines looks identical to one that never received anything,
 * and the person who has to answer "why is there nothing from that customer"
 * needs the row.
 */
export default async function AdminReviewsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  await requireStaff();
  const params = await searchParams;
  const active = FILTERS.find((filter) => filter.key === params.status) ?? FILTERS[0]!;

  const [reviews, counts] = await Promise.all([
    prisma.productReview.findMany({
      where: active.status ? { status: active.status } : {},
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      take: 100,
      select: {
        id: true,
        rating: true,
        title: true,
        body: true,
        organisation: true,
        status: true,
        response: true,
        moderationNote: true,
        moderatedAt: true,
        createdAt: true,
        product: { select: { slug: true, name: true } },
        user: { select: { name: true, email: true } },
        order: { select: { reference: true } },
        moderatedBy: { select: { name: true } },
      },
    }),
    prisma.productReview.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);

  const countOf = (status: ReviewStatus | null) =>
    status === null
      ? counts.reduce((total, row) => total + row._count._all, 0)
      : (counts.find((row) => row.status === status)?._count._all ?? 0);

  return (
    <div className="space-y-8">
      <header className="max-w-3xl">
        <h1 className="text-2xl">Customer reviews</h1>
        <p className="mt-2 text-[14px] leading-relaxed text-ink-600">
          Every review here was written by the account that bought the product, checked against
          its order — there is no way to post one otherwise. Nothing appears on the site until
          you publish it.
        </p>
        <p className="mt-2 text-[14px] leading-relaxed text-ink-600">
          You can publish a review, decline it, or reply in public underneath. You cannot edit
          what a customer wrote, and that is deliberate: a review the seller can rewrite is not
          a review. If one is wrong or unfair, the reply is the answer to it.
        </p>
      </header>

      <nav aria-label="Filter reviews" className="scroll-x">
        <ul className="flex min-w-max gap-1">
          {FILTERS.map((filter) => (
            <li key={filter.key}>
              <Link
                href={`/admin/reviews?status=${filter.key}`}
                aria-current={filter.key === active.key ? "page" : undefined}
                className={
                  filter.key === active.key
                    ? "block rounded-[--radius-md] bg-graphite-900 px-3 py-2 text-meta font-medium text-white"
                    : "block rounded-[--radius-md] px-3 py-2 text-meta text-ink-600 hover:bg-surface-muted"
                }
              >
                {filter.label}
                <span className="ml-1.5 tabular-nums opacity-70">{countOf(filter.status)}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {reviews.length === 0 ? (
        <EmptyState
          title={active.status === "PENDING" ? "Nothing waiting" : "Nothing here"}
          description={
            active.status === "PENDING"
              ? "Reviews appear here as customers write them. Only customers with a matching order can."
              : "No reviews in this state yet."
          }
        />
      ) : (
        <ul className="flex flex-col gap-5">
          {reviews.map((review) => (
            <li key={review.id} className="rounded-[--radius-lg] border border-line bg-white p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-[15px] font-semibold text-graphite-900">
                    <Link
                      href={`/products/${review.product.slug}`}
                      className="hover:text-accent-700"
                    >
                      {review.product.name}
                    </Link>
                  </h2>
                  <p className="mt-1.5 flex flex-wrap items-center gap-2">
                    <Stars rating={review.rating} size={14} />
                    <span className="text-meta text-ink-500">
                      {review.user.name || review.user.email}
                      {review.organisation ? ` · ${review.organisation}` : ""}
                      <span aria-hidden="true"> · </span>
                      order {review.order.reference}
                      <span aria-hidden="true"> · </span>
                      {formatDate(review.createdAt)}
                    </span>
                  </p>
                </div>
                <StatusBadge status={REVIEW_STATUS_LABELS[review.status]} />
              </div>

              {review.title ? (
                <p className="mt-3 text-[15px] font-medium text-graphite-900">{review.title}</p>
              ) : null}
              <p className="mt-2 whitespace-pre-line text-[14px] leading-relaxed text-ink-700">
                {review.body}
              </p>

              {review.moderatedAt ? (
                <p className="mt-3 text-meta text-ink-500">
                  {REVIEW_STATUS_LABELS[review.status]} by{" "}
                  {review.moderatedBy?.name ?? "a colleague"} on{" "}
                  {formatDateTime(review.moderatedAt)}
                  {review.moderationNote ? ` — ${review.moderationNote}` : ""}
                </p>
              ) : null}

              <div className="mt-4 flex flex-col gap-4 border-t border-line pt-4 lg:flex-row lg:items-start lg:gap-8">
                <div className="lg:w-80 lg:shrink-0">
                  <AdminForm
                    action={moderateReview}
                    submitLabel={review.status === "APPROVED" ? "Take it down" : "Publish it"}
                    pendingLabel="Saving…"
                    variant={review.status === "APPROVED" ? "outline" : "primary"}
                    compact
                    hidden={{
                      id: review.id,
                      decision: review.status === "APPROVED" ? "REJECTED" : "APPROVED",
                    }}
                  >
                    <Field
                      label="Internal note"
                      name="moderationNote"
                      hint="Never shown publicly. Why you decided what you decided."
                    >
                      <Input
                        name="moderationNote"
                        maxLength={1000}
                        defaultValue={review.moderationNote ?? ""}
                      />
                    </Field>
                  </AdminForm>
                </div>

                <div className="min-w-0 flex-1">
                  <AdminForm
                    action={respondToReview}
                    submitLabel={review.response ? "Update reply" : "Reply publicly"}
                    pendingLabel="Saving…"
                    variant="outline"
                    compact
                    hidden={{ id: review.id }}
                  >
                    <Field
                      label="Public reply"
                      name="response"
                      hint="Shown under the review on the product page. Empty removes it."
                    >
                      <Textarea
                        name="response"
                        rows={3}
                        maxLength={1500}
                        defaultValue={review.response ?? ""}
                      />
                    </Field>
                  </AdminForm>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
