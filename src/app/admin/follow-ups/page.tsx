import Link from "next/link";
import type { Metadata } from "next";

import { AdminForm } from "@/components/admin/admin-form";
import { Badge } from "@/components/ui/badge";
import { completeFollowUpAction } from "@/app/admin/crm-actions";
import { requireStaff } from "@/lib/auth/guards";
import { outstandingFollowUps } from "@/lib/queries/crm";
import { ACTIVITY_KIND_LABELS, isOverdueTask } from "@/lib/crm/pipeline";

export const metadata: Metadata = { title: "Follow-ups" };

const day = (value: Date) =>
  value.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

/**
 * Everything somebody said they would do and has not done.
 *
 * ## Everyone's, not just yours
 *
 * Deliberately unscoped. On a team of this size a follow-up nobody does is a
 * worse outcome than a follow-up on somebody else's list, and a screen that
 * shows only your own hides the one that has been sitting there for a fortnight
 * because the person who logged it is on leave. Each row names its owner, which
 * is enough to know whose it is without hiding the rest.
 *
 * ## Overdue first, by date
 *
 * Oldest due date at the top, which puts the overdue ones there without needing
 * a separate section. The badge distinguishes them; the ordering means the list
 * is already in the order it should be worked.
 */
export default async function AdminFollowUpsPage() {
  await requireStaff();

  const followUps = await outstandingFollowUps({ limit: 200 });
  const overdue = followUps.filter((activity) => isOverdueTask(activity)).length;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl">Follow-ups</h1>
        <p className="mt-1.5 text-[14px] text-ink-600">
          {followUps.length === 0
            ? "Nothing outstanding."
            : `${followUps.length} outstanding${overdue > 0 ? `, ${overdue} of them overdue` : ""}.`}
        </p>
      </header>

      {followUps.length === 0 ? (
        <p className="rounded-[--radius-lg] border border-dashed border-line-strong bg-surface-muted p-5 text-[14px] text-ink-600">
          Nothing outstanding. Follow-ups are logged against a deal — set a date when you log a
          call and it appears here until it is done.
        </p>
      ) : (
        <ul className="space-y-3">
          {followUps.map((activity) => (
            <li
              key={activity.id}
              className="rounded-[--radius-lg] border border-line bg-white p-4"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <p className="text-[14px] font-medium text-graphite-900">
                  <span className="mr-2 text-label font-semibold uppercase tracking-wide text-ink-500">
                    {ACTIVITY_KIND_LABELS[activity.kind]}
                  </span>
                  {activity.subject}
                </p>
                <p className="flex shrink-0 items-center gap-2 text-meta text-ink-500">
                  {isOverdueTask(activity) ? (
                    <Badge tone="danger">Overdue</Badge>
                  ) : (
                    <Badge tone="warning">Due</Badge>
                  )}
                  <span>{day(activity.dueAt!)}</span>
                </p>
              </div>

              {activity.body ? (
                <p className="mt-2 whitespace-pre-wrap text-[13px] leading-relaxed text-ink-700">
                  {activity.body}
                </p>
              ) : null}

              <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-meta text-ink-500">
                <span>{activity.user?.name ?? activity.user?.email ?? "Unassigned"}</span>
                {activity.deal ? (
                  <Link
                    href={`/admin/pipeline/${activity.deal.reference}`}
                    className="text-accent-700 hover:underline"
                  >
                    {activity.deal.title}
                  </Link>
                ) : null}
                {activity.company ? (
                  <Link
                    href={`/admin/organisations/${activity.company.id}`}
                    className="text-accent-700 hover:underline"
                  >
                    {activity.company.name}
                  </Link>
                ) : null}
              </p>

              <div className="mt-3">
                <AdminForm
                  action={completeFollowUpAction}
                  submitLabel="Mark done"
                  pendingLabel="Saving…"
                  variant="outline"
                  hidden={{ activityId: activity.id }}
                  compact
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
