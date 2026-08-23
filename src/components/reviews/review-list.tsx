import { SectionHeader } from "@/components/ui/section-header";
import { Stars } from "@/components/reviews/stars";
import { MAX_RATING, reviewerLabel, type Aggregate } from "@/lib/reviews";
import { formatDate } from "@/lib/utils";

type Review = {
  id: string;
  rating: number;
  title: string | null;
  body: string;
  organisation: string | null;
  response: string | null;
  respondedAt: Date | null;
  createdAt: Date;
  user: { name: string | null };
};

/**
 * The reviews on a product page.
 *
 * ## What it says when there are none
 *
 * Something, and something true. The obvious alternative — render nothing —
 * leaves a reader unable to tell an unreviewed product from a site with no
 * reviews anywhere, and the second is a worse impression than the first. It
 * also says who can write one, because "only customers who bought it" is the
 * reason there are few and is worth a reader knowing.
 *
 * ## The distribution bars
 *
 * Shown from five reviews up. Below that they are noise — one review makes a
 * bar chart that is 100% of something — and the individual reviews are right
 * there to read instead.
 */
export function ReviewList({ reviews, summary }: { reviews: Review[]; summary: Aggregate }) {
  return (
    <section id="reviews" className="mt-16 scroll-mt-32">
      <SectionHeader
        title="Customer reviews"
        description="From customers who bought this through us. Every review is checked before it appears, and we do not edit what anybody wrote."
        as="h2"
        className="mb-6"
      />

      {summary.average === null ? (
        <div className="rounded-[--radius-lg] border border-line bg-surface-muted p-6">
          <p className="text-[15px] text-ink-600">
            No reviews for this yet. Reviews here are open only to customers who bought the
            product from us, so there are fewer of them than on a marketplace — and every one
            of them is from somebody who paid for it.
          </p>
        </div>
      ) : (
        <>
          <div className="mb-8 flex flex-col gap-6 rounded-[--radius-lg] border border-line bg-surface-muted p-6 sm:flex-row sm:items-center sm:gap-10">
            <div className="flex shrink-0 flex-col gap-1.5">
              <p className="flex items-baseline gap-2">
                <span className="text-3xl font-semibold tabular-nums text-graphite-900">
                  {summary.average.toFixed(1)}
                </span>
                <span className="text-meta text-ink-500">out of {MAX_RATING}</span>
              </p>
              <Stars rating={summary.average} size={18} />
              <p className="text-meta text-ink-600">
                {summary.count} verified {summary.count === 1 ? "review" : "reviews"}
              </p>
            </div>

            {summary.count >= 5 ? (
              <dl className="flex min-w-0 flex-1 flex-col gap-1.5">
                {[5, 4, 3, 2, 1].map((star) => {
                  const n = summary.distribution[star] ?? 0;
                  const percent = Math.round((n / summary.count) * 100);
                  return (
                    <div key={star} className="flex items-center gap-3">
                      <dt className="w-12 shrink-0 text-meta tabular-nums text-ink-600">
                        {star} star
                      </dt>
                      <dd className="flex min-w-0 flex-1 items-center gap-3">
                        <span
                          className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-graphite-200"
                          aria-hidden="true"
                        >
                          <span
                            className="block h-full rounded-full bg-accent-600"
                            style={{ width: `${percent}%` }}
                          />
                        </span>
                        <span className="w-8 shrink-0 text-right text-meta tabular-nums text-ink-500">
                          {n}
                        </span>
                      </dd>
                    </div>
                  );
                })}
              </dl>
            ) : null}
          </div>

          <ul className="flex flex-col gap-5">
            {reviews.map((review) => (
              <li
                key={review.id}
                className="rounded-[--radius-lg] border border-line bg-white p-5 sm:p-6"
              >
                <article className="flex flex-col gap-2.5">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <Stars rating={review.rating} size={15} />
                    {review.title ? (
                      <h3 className="text-[15px] font-semibold text-graphite-900">
                        {review.title}
                      </h3>
                    ) : null}
                  </div>

                  <p className="whitespace-pre-line text-[15px] leading-relaxed text-ink-700">
                    {review.body}
                  </p>

                  <p className="text-meta text-ink-500">
                    {reviewerLabel(review)}
                    <span aria-hidden="true"> · </span>
                    <time dateTime={review.createdAt.toISOString()}>
                      {formatDate(review.createdAt)}
                    </time>
                    {/*
                      Stated on every review, because it is the thing that makes
                      this list worth reading rather than a claim made once at
                      the top of the page and forgotten by the third review.
                    */}
                    <span aria-hidden="true"> · </span>
                    <span className="text-accent-700">Verified purchase</span>
                  </p>

                  {review.response ? (
                    <div className="mt-1.5 rounded-[--radius-md] border-l-2 border-accent-600 bg-surface-muted px-4 py-3">
                      <p className="text-label font-semibold uppercase tracking-[0.08em] text-ink-500">
                        Our reply
                        {review.respondedAt ? (
                          <>
                            <span aria-hidden="true"> · </span>
                            <time dateTime={review.respondedAt.toISOString()}>
                              {formatDate(review.respondedAt)}
                            </time>
                          </>
                        ) : null}
                      </p>
                      <p className="mt-1.5 whitespace-pre-line text-[15px] leading-relaxed text-ink-700">
                        {review.response}
                      </p>
                    </div>
                  ) : null}
                </article>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
