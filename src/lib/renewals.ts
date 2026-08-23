import type { RenewalStatus } from "@prisma/client";

/**
 * When a renewal starts to matter, and how it is described.
 *
 * The cadence in the brief — 120, 90, 60, 30, 15, 7 and 1 days — is not seven
 * different notifications so much as seven points at which the answer to "is
 * this urgent yet" changes. Expressed here once so the dashboard, the calendar
 * and anything that later sends a reminder all agree; a customer told
 * "critical" on a page and "90 days" in an email would trust neither.
 */

const DAY = 24 * 60 * 60 * 1000;

/** The points at which a renewal is worth saying something about. */
export const REMINDER_DAYS = [120, 90, 60, 30, 15, 7, 1] as const;

export type RenewalUrgency = "overdue" | "critical" | "soon" | "approaching" | "planned" | "distant";

export function daysUntil(due: Date | string, now: Date = new Date()): number {
  const date = new Date(due);
  if (Number.isNaN(date.getTime())) return Number.POSITIVE_INFINITY;
  return Math.ceil((date.getTime() - now.getTime()) / DAY);
}

/**
 * How urgent a renewal is.
 *
 * Bands rather than a number, because "in 34 days" is not a decision and
 * "within the month" is. The boundaries are the reminder points above.
 */
export function renewalUrgency(due: Date | string, now: Date = new Date()): RenewalUrgency {
  const days = daysUntil(due, now);
  if (days < 0) return "overdue";
  if (days <= 7) return "critical";
  if (days <= 30) return "soon";
  if (days <= 60) return "approaching";
  if (days <= 120) return "planned";
  return "distant";
}

export const URGENCY_LABELS: Record<RenewalUrgency, string> = {
  overdue: "Overdue",
  critical: "Within a week",
  soon: "Within a month",
  approaching: "Within two months",
  planned: "Within four months",
  distant: "Later",
};

/** The tone each band uses, so one meaning has one colour everywhere. */
export const URGENCY_TONES: Record<RenewalUrgency, "danger" | "warning" | "brand" | "neutral"> = {
  overdue: "danger",
  critical: "danger",
  soon: "warning",
  approaching: "warning",
  planned: "brand",
  distant: "neutral",
};

/**
 * What to say about a renewal, in words rather than a colour.
 *
 * A calendar that only signals with colour is a calendar that says nothing to
 * anybody using a screen reader, and nothing at all when printed.
 */
export function renewalSummary(due: Date | string, now: Date = new Date()): string {
  const days = daysUntil(due, now);
  if (days < 0) return `${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"} overdue`;
  if (days === 0) return "Due today";
  if (days === 1) return "Due tomorrow";
  if (days <= 60) return `Due in ${days} days`;

  const months = Math.round(days / 30);
  return `Due in about ${months} month${months === 1 ? "" : "s"}`;
}

/** Renewals still worth acting on. */
export const RENEWAL_OPEN_STATUSES: RenewalStatus[] = ["UPCOMING", "QUOTED"];

export const RENEWAL_STATUS_LABELS: Record<RenewalStatus, string> = {
  UPCOMING: "Upcoming",
  QUOTED: "Quotation sent",
  RENEWED: "Renewed",
  LAPSED: "Lapsed",
  DECLINED: "Not renewing",
};

export type CalendarMonth = {
  /** First day of the month, for keys and for sorting. */
  start: Date;
  label: string;
  count: number;
  /** The most urgent band any renewal in the month falls into. */
  urgency: RenewalUrgency;
};

const URGENCY_ORDER: RenewalUrgency[] = [
  "overdue",
  "critical",
  "soon",
  "approaching",
  "planned",
  "distant",
];

/**
 * Groups renewals into the months they fall in.
 *
 * Months with nothing due are included between the ones that have something, so
 * the gap between September and November is visible rather than implied — a
 * calendar that silently omits October reads as a calendar with no October.
 */
export function renewalCalendar(
  renewals: Array<{ dueAt: Date | string }>,
  now: Date = new Date(),
): CalendarMonth[] {
  if (renewals.length === 0) return [];

  const byMonth = new Map<string, { start: Date; count: number; urgency: RenewalUrgency }>();

  const keyOf = (date: Date) => `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;

  let earliest: Date | null = null;
  let latest: Date | null = null;

  for (const renewal of renewals) {
    const due = new Date(renewal.dueAt);
    if (Number.isNaN(due.getTime())) continue;

    const start = new Date(Date.UTC(due.getUTCFullYear(), due.getUTCMonth(), 1));
    if (!earliest || start < earliest) earliest = start;
    if (!latest || start > latest) latest = start;

    const key = keyOf(start);
    const urgency = renewalUrgency(due, now);
    const existing = byMonth.get(key);

    if (!existing) {
      byMonth.set(key, { start, count: 1, urgency });
    } else {
      existing.count += 1;
      if (URGENCY_ORDER.indexOf(urgency) < URGENCY_ORDER.indexOf(existing.urgency)) {
        existing.urgency = urgency;
      }
    }
  }

  if (!earliest || !latest) return [];

  const months: CalendarMonth[] = [];
  const cursor = new Date(earliest);

  while (cursor <= latest) {
    const key = keyOf(cursor);
    const entry = byMonth.get(key);
    months.push({
      start: new Date(cursor),
      label: new Intl.DateTimeFormat("en-GB", {
        month: "long",
        year: "numeric",
        timeZone: "UTC",
      }).format(cursor),
      count: entry?.count ?? 0,
      urgency: entry?.urgency ?? "distant",
    });
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }

  return months;
}
