import Link from "next/link";
import type { Metadata } from "next";

import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { requireStaff } from "@/lib/auth/guards";
import { pipelineBoard, pipelineSummary } from "@/lib/queries/crm";
import { DEAL_STAGE_HINTS, DEAL_STAGE_LABELS, daysInStage, isOverdue, isStale } from "@/lib/crm/pipeline";
import { formatMoney } from "@/lib/money";

export const metadata: Metadata = { title: "Pipeline" };

/**
 * Every open deal, in the column it is sitting in.
 *
 * ## Columns, not a table
 *
 * A pipeline answers one question — where is everything, and what is stuck —
 * and columns answer it at a glance in a way a sortable table does not. The
 * count and the value sit in each heading because "four deals in Negotiation"
 * and "four deals worth ₹80 lakh in Negotiation" lead to different mornings.
 *
 * ## What is flagged, and why only two things
 *
 * **Overdue**: the expected close date has passed and it is still open, so the
 * forecast this deal sits in is now definitely wrong. **Stale**: nothing has
 * moved for a month, so nobody has checked whether it is still real. Those are
 * the two ways a pipeline total quietly stops being true. Flagging a third
 * thing would make all three easy to ignore.
 *
 * Closed deals are absent by design. This is a working screen, not a report —
 * won and lost are on the deal itself and in the summary above.
 */
export default async function AdminPipelinePage() {
  await requireStaff();

  const [board, summary] = await Promise.all([pipelineBoard(), pipelineSummary()]);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl">Pipeline</h1>
          <p className="mt-1.5 text-[14px] text-ink-600">
            {summary.openCount === 0
              ? "Nothing open yet."
              : `${summary.openCount} open, worth ${formatMoney(summary.openValueMinor, "INR")} if everything lands.`}
          </p>
        </div>
        <ButtonLink href="/admin/pipeline/new">New deal</ButtonLink>
      </header>

      {/*
        The two warnings, or nothing at all. Rendered only when there is
        something to say: a permanently-present "0 overdue" is a badge people
        stop reading, and then a real number appears in the same place and is
        also not read.
      */}
      {summary.overdueCount > 0 || summary.staleCount > 0 ? (
        <p className="flex flex-wrap items-center gap-3 text-[13px] text-ink-600">
          {summary.overdueCount > 0 ? (
            <Badge tone="danger">
              {summary.overdueCount} past its close date
            </Badge>
          ) : null}
          {summary.staleCount > 0 ? (
            <Badge tone="warning">{summary.staleCount} untouched for a month</Badge>
          ) : null}
          {summary.winRatePercent !== null ? (
            <span>
              {summary.winRatePercent}% won of {summary.wonCount + summary.lostCount} closed.
            </span>
          ) : null}
        </p>
      ) : null}

      <div className="scroll-x">
        <div className="flex min-w-max gap-4 pb-2">
          {board.columns.map((column) => (
            <section key={column.stage} className="w-[19rem] shrink-0">
              <div className="rounded-t-[--radius-lg] border border-line bg-surface-muted px-4 py-3">
                <p className="flex items-baseline justify-between gap-2">
                  <span className="text-[14px] font-semibold text-graphite-900">
                    {DEAL_STAGE_LABELS[column.stage]}
                  </span>
                  <span className="text-meta text-ink-500">{column.count}</span>
                </p>
                <p className="mt-0.5 text-meta text-ink-500">
                  {column.count === 0 ? DEAL_STAGE_HINTS[column.stage] : formatMoney(column.valueMinor, "INR")}
                </p>
              </div>

              <ul className="space-y-2 rounded-b-[--radius-lg] border border-t-0 border-line bg-white p-2">
                {column.deals.length === 0 ? (
                  <li className="px-2 py-6 text-center text-meta text-ink-500">Nothing here.</li>
                ) : (
                  column.deals.map((deal) => {
                    const overdue = isOverdue(deal);
                    const stale = isStale(deal);
                    return (
                      <li key={deal.id}>
                        <Link
                          href={`/admin/pipeline/${deal.reference}`}
                          className="block rounded-[--radius-md] border border-line p-3 transition-colors hover:border-graphite-400"
                        >
                          <p className="text-[14px] font-medium leading-snug text-graphite-900">
                            {deal.title}
                          </p>
                          <p className="mt-1 text-meta text-ink-500">
                            {deal.company?.name ?? deal.companyName ?? "No organisation"}
                          </p>
                          <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-meta">
                            {deal.expectedValueMinor > 0 ? (
                              <span className="font-medium text-graphite-900">
                                {formatMoney(deal.expectedValueMinor, deal.currency)}
                              </span>
                            ) : (
                              <span className="text-ink-500">No value set</span>
                            )}
                            <span className="text-ink-500">· {daysInStage(deal)}d here</span>
                          </p>
                          {overdue || stale ? (
                            <p className="mt-2 flex flex-wrap gap-1.5">
                              {overdue ? <Badge tone="danger">Past close date</Badge> : null}
                              {stale ? <Badge tone="warning">Untouched</Badge> : null}
                            </p>
                          ) : null}
                          {deal.owner ? (
                            <p className="mt-2 text-meta text-ink-500">
                              {deal.owner.name ?? deal.owner.email}
                            </p>
                          ) : (
                            <p className="mt-2 text-meta text-warning-700">Unowned</p>
                          )}
                        </Link>
                      </li>
                    );
                  })
                )}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
