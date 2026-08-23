import type { ActivityKind } from "@prisma/client";

import { AdminForm } from "@/components/admin/admin-form";
import { Badge } from "@/components/ui/badge";
import { completeFollowUpAction } from "@/app/admin/crm-actions";
import { ACTIVITY_KIND_LABELS, isOutstanding, isOverdueTask } from "@/lib/crm/pipeline";

type TimelineEntry = {
  id: string;
  kind: ActivityKind;
  subject: string;
  body: string | null;
  occurredAt: Date;
  dueAt: Date | null;
  completedAt: Date | null;
  user: { name: string | null; email: string } | null;
  deal?: { reference: string; title: string } | null;
};

const day = (value: Date) =>
  value.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

/**
 * What has happened, newest first, with the outstanding follow-ups marked.
 *
 * ## One list, not two
 *
 * Calls, notes, meetings, follow-ups and the entries the application writes
 * itself all appear here together. Splitting "history" from "tasks" means
 * reading two lists and interleaving them by date in your head to answer the
 * only question anybody has, which is *what is going on with this*.
 *
 * ## System entries look different on purpose
 *
 * A stage change written by the application and a note written by a person are
 * different kinds of evidence. The first is a fact about what the system did;
 * the second is somebody's account of a conversation. Rendering them
 * identically would let the second borrow the authority of the first.
 */
export function ActivityTimeline({
  activities,
  reference,
  emptyMessage = "Nothing logged yet.",
}: {
  activities: TimelineEntry[];
  /** The deal being viewed, so completing a follow-up refreshes this page. */
  reference?: string;
  emptyMessage?: string;
}) {
  if (activities.length === 0) {
    return (
      <p className="rounded-[--radius-lg] border border-dashed border-line-strong bg-surface-muted p-5 text-[14px] text-ink-600">
        {emptyMessage}
      </p>
    );
  }

  return (
    <ol className="space-y-3">
      {activities.map((activity) => {
        const system = activity.kind === "SYSTEM";
        const outstanding = isOutstanding(activity);
        const overdue = isOverdueTask(activity);

        return (
          <li
            key={activity.id}
            className={
              system
                ? "rounded-[--radius-md] border border-line bg-surface-muted px-4 py-2.5"
                : "rounded-[--radius-lg] border border-line bg-white p-4"
            }
          >
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
              <p
                className={
                  system
                    ? "text-meta text-ink-600"
                    : "text-[14px] font-medium text-graphite-900"
                }
              >
                {system ? null : (
                  <span className="mr-2 text-label font-semibold uppercase tracking-wide text-ink-500">
                    {ACTIVITY_KIND_LABELS[activity.kind]}
                  </span>
                )}
                {activity.subject}
              </p>
              <p className="flex shrink-0 items-center gap-2 text-meta text-ink-500">
                {overdue ? (
                  <Badge tone="danger">Overdue</Badge>
                ) : outstanding ? (
                  <Badge tone="warning">Due {day(activity.dueAt!)}</Badge>
                ) : activity.completedAt ? (
                  <Badge tone="success">Done</Badge>
                ) : null}
                <span>{day(activity.occurredAt)}</span>
              </p>
            </div>

            {activity.body ? (
              <p className="mt-2 whitespace-pre-wrap text-[13px] leading-relaxed text-ink-700">
                {activity.body}
              </p>
            ) : null}

            <p className="mt-2 text-meta text-ink-500">
              {activity.user?.name ?? activity.user?.email ?? "Unknown"}
              {activity.deal ? ` · ${activity.deal.reference}` : ""}
            </p>

            {outstanding ? (
              <div className="mt-3">
                <AdminForm
                  action={completeFollowUpAction}
                  submitLabel="Mark done"
                  pendingLabel="Saving…"
                  variant="outline"
                  hidden={{ activityId: activity.id, reference: reference ?? "" }}
                  compact
                />
              </div>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
