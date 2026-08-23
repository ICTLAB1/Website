import Link from "next/link";
import type { Metadata } from "next";

import { AccountForm } from "@/components/account/account-form";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { StatusBadge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/states";
import { Stars } from "@/components/reviews/stars";
import { submitReview, withdrawReview } from "@/app/account/review-actions";
import { requireUser } from "@/lib/auth/guards";
import { myReviews, reviewableProducts } from "@/lib/queries/reviews";
import { MAX_REVIEW_BODY, MAX_REVIEW_TITLE, REVIEW_STATUS_LABELS } from "@/lib/reviews";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Reviews" };

/**
 * Writing and managing your own reviews.
 *
 * The list of things you can review is not a search box over the catalogue —
 * it is your own order history, with what you have already reviewed removed.
 * That is the same rule the server action enforces, shown as an interface: a
 * customer never has to find out by being refused.
 *
 * Reviews you have written are listed underneath in whatever state they are in,
 * including rejected, because a review that quietly disappeared into moderation
 * is indistinguishable from one that was never sent.
 */
export default async function AccountReviewsPage() {
  const user = await requireUser("/account/reviews");
  const [pending, written] = await Promise.all([
    reviewableProducts(user.id),
    myReviews(user.id),
  ]);

  return (
    <div className="space-y-10">
      <section>
        <h2 className="text-[1.15rem]">Write a review</h2>
        <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-ink-600">
          Products from your orders that you have not reviewed yet. Reviews here are open only
          to customers who bought the product from us, which is why this list is your order
          history rather than the catalogue. Every review is read before it appears, and we
          never edit what you wrote.
        </p>

        {pending.length === 0 ? (
          <EmptyState
            title="Nothing waiting for a review"
            description={
              written.length > 0
                ? "You have reviewed everything on your orders. Thank you."
                : "Once an order is confirmed, the products on it appear here."
            }
          />
        ) : (
          <ul className="mt-6 flex flex-col gap-4">
            {pending.map((product) => (
              <li
                key={product.id}
                className="rounded-[--radius-lg] border border-line bg-white p-5"
              >
                <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="text-[15px] font-semibold text-graphite-900">
                    <Link href={`/products/${product.slug}`} className="hover:text-accent-700">
                      {product.name}
                    </Link>
                  </h3>
                  <p className="text-meta text-ink-500">
                    Order {product.order.reference}
                    {product.order.placedAt ? (
                      <>
                        <span aria-hidden="true"> · </span>
                        {formatDate(product.order.placedAt)}
                      </>
                    ) : null}
                  </p>
                </div>

                {/*
                  No order field. The action looks the purchase up from the
                  session, so there is nothing here for a browser to claim.
                */}
                <AccountForm
                  action={submitReview}
                  submitLabel="Send for review"
                  pendingLabel="Sending…"
                  compact
                  hidden={{ productId: product.id }}
                >
                  <div className="grid gap-4 sm:grid-cols-[10rem_1fr]">
                    <Field label="Rating" name="rating">
                      <Select name="rating" defaultValue="5" required>
                        <option value="5">5 — Excellent</option>
                        <option value="4">4 — Good</option>
                        <option value="3">3 — Fair</option>
                        <option value="2">2 — Poor</option>
                        <option value="1">1 — Very poor</option>
                      </Select>
                    </Field>
                    <Field label="Headline" name="title" hint="Optional.">
                      <Input name="title" maxLength={MAX_REVIEW_TITLE} />
                    </Field>
                  </div>

                  <Field
                    label="Your review"
                    name="body"
                    hint="What another buyer in your position would want to know."
                  >
                    <Textarea name="body" rows={4} maxLength={MAX_REVIEW_BODY} required />
                  </Field>

                  <Field
                    label="Your organisation"
                    name="organisation"
                    hint="Optional, and shown publicly beside your name. Leave it blank to be shown as a verified buyer."
                  >
                    <Input
                      name="organisation"
                      maxLength={120}
                      defaultValue={user.companyName ?? ""}
                    />
                  </Field>
                </AccountForm>
              </li>
            ))}
          </ul>
        )}
      </section>

      {written.length > 0 ? (
        <section>
          <h2 className="text-[1.15rem]">Your reviews</h2>
          <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-ink-600">
            Including any still waiting to be read, and any we did not publish. You can withdraw
            one at any time.
          </p>

          <ul className="mt-6 flex flex-col gap-4">
            {written.map((review) => (
              <li
                key={review.id}
                className="rounded-[--radius-lg] border border-line bg-white p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="text-[15px] font-semibold text-graphite-900">
                      <Link
                        href={`/products/${review.product.slug}`}
                        className="hover:text-accent-700"
                      >
                        {review.product.name}
                      </Link>
                    </h3>
                    <p className="mt-1.5 flex flex-wrap items-center gap-2">
                      <Stars rating={review.rating} size={14} />
                      <span className="text-meta text-ink-500">
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

                {review.response ? (
                  <div className="mt-3 rounded-[--radius-md] border-l-2 border-accent-600 bg-surface-muted px-4 py-3">
                    <p className="text-label font-semibold uppercase tracking-[0.08em] text-ink-500">
                      Our reply
                    </p>
                    <p className="mt-1.5 whitespace-pre-line text-[14px] leading-relaxed text-ink-700">
                      {review.response}
                    </p>
                  </div>
                ) : null}

                <div className="mt-4 border-t border-line pt-4">
                  <AccountForm
                    action={withdrawReview}
                    submitLabel="Withdraw"
                    pendingLabel="Withdrawing…"
                    variant="danger"
                    compact
                    hidden={{ id: review.id }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
