import { renewalCalendar, URGENCY_LABELS, URGENCY_TONES } from "@/lib/renewals";
import { cn } from "@/lib/utils";

const BARS: Record<"danger" | "warning" | "brand" | "neutral", string> = {
  danger: "bg-danger-600",
  warning: "bg-warning-600",
  brand: "bg-accent-700",
  neutral: "bg-ink-300",
};

/**
 * The year ahead, month by month.
 *
 * A table of dates answers "when is this one due"; it does not answer "when is
 * the expensive quarter", which is the question a finance team actually asks in
 * October. This does, by putting the months in a row and letting the empty ones
 * stay visibly empty.
 *
 * Every month states its count in words as well as in a bar. A calendar that
 * signals only with colour and height says nothing to a screen reader and
 * nothing at all on paper, and this is a page people print for a budget
 * meeting.
 */
export function RenewalCalendar({
  renewals,
  now,
}: {
  renewals: Array<{ dueAt: Date | string }>;
  /** Injectable so the tests and the page agree on "today". */
  now?: Date;
}) {
  const months = renewalCalendar(renewals, now);
  if (months.length === 0) return null;

  const busiest = Math.max(...months.map((month) => month.count), 1);

  return (
    <div className="scroll-x">
      <ol className="flex min-w-max items-end gap-2">
        {months.map((month) => (
          <li key={month.start.toISOString()} className="w-24 shrink-0 text-center">
            <div className="flex h-24 items-end justify-center">
              {month.count > 0 ? (
                <div
                  className={cn("w-8 rounded-t-[--radius-sm]", BARS[URGENCY_TONES[month.urgency]])}
                  style={{ height: `${Math.max(12, (month.count / busiest) * 96)}px` }}
                />
              ) : (
                <div className="h-px w-8 bg-line-strong" />
              )}
            </div>
            <p className="mt-2 text-[12px] font-medium text-graphite-900">
              {month.count > 0 ? month.count : "—"}
            </p>
            <p className="text-[11px] leading-tight text-ink-500">{month.label}</p>
            {month.count > 0 ? (
              <p className="sr-only">
                {month.count} {month.count === 1 ? "renewal" : "renewals"} due in {month.label},{" "}
                {URGENCY_LABELS[month.urgency].toLowerCase()}
              </p>
            ) : (
              <p className="sr-only">Nothing due in {month.label}</p>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}
