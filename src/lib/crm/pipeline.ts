import type { ActivityKind, DealSource, DealStage } from "@prisma/client";

/**
 * What the pipeline means, kept away from the screens that draw it.
 *
 * The rules here are the ones that would otherwise be re-derived slightly
 * differently on every surface — the dashboard, the deal page, the outbound
 * event — and drift until two numbers on one screen disagree.
 */

// ── stages ──────────────────────────────────────────────────────────────────

/**
 * Left to right, the order they are worked in.
 *
 * The order is data, not a `sort`: `DealStage`'s declaration order is an
 * implementation detail of an enum and a board drawn from it would silently
 * reorder itself if somebody inserted a stage in the middle of the schema.
 */
export const DEAL_STAGES: DealStage[] = [
  "NEW",
  "QUALIFYING",
  "QUOTED",
  "NEGOTIATION",
  "WON",
  "LOST",
];

/** The stages still being worked. What "pipeline value" is summed over. */
export const OPEN_STAGES: DealStage[] = ["NEW", "QUALIFYING", "QUOTED", "NEGOTIATION"];

/** The stages a deal stops at. */
export const CLOSED_STAGES: DealStage[] = ["WON", "LOST"];

export function isClosed(stage: DealStage): boolean {
  return CLOSED_STAGES.includes(stage);
}

export const DEAL_STAGE_LABELS: Record<DealStage, string> = {
  NEW: "New",
  QUALIFYING: "Qualifying",
  QUOTED: "Quoted",
  NEGOTIATION: "Negotiation",
  WON: "Won",
  LOST: "Lost",
};

/**
 * What each stage means, in the words somebody would use out loud.
 *
 * On the board, because the commonest failure of a sales pipeline is that two
 * people mean different things by "qualifying" and the forecast becomes
 * unreadable without anyone noticing.
 */
export const DEAL_STAGE_HINTS: Record<DealStage, string> = {
  NEW: "Logged, not yet worked. Somebody needs to pick this up.",
  QUALIFYING: "Working out what they need, whether it is real, and who decides.",
  QUOTED: "A quotation has gone out. Waiting on them.",
  NEGOTIATION: "They have come back on price, terms or a competitor.",
  WON: "Ordered.",
  LOST: "Not proceeding, with the reason recorded.",
};

/**
 * How confident a stage is, as a percentage.
 *
 * Used only to weight the forecast, and deliberately blunt. A weighted
 * forecast is a rough number that is useful; a weighted forecast to two decimal
 * places is a rough number that gets believed.
 *
 * These are conventional starting figures, not measured ones. They should be
 * replaced with this business's own win rates once there is enough closed
 * history to compute them — see `winRate` below, which is where that number
 * comes from.
 */
export const STAGE_CONFIDENCE: Record<DealStage, number> = {
  NEW: 10,
  QUALIFYING: 25,
  QUOTED: 50,
  NEGOTIATION: 75,
  WON: 100,
  LOST: 0,
};

// ── sources ─────────────────────────────────────────────────────────────────

export const DEAL_SOURCES: DealSource[] = [
  "WEBSITE_ENQUIRY",
  "DIRECT",
  "OUTBOUND",
  "RENEWAL",
  "REFERRAL",
  "TENDER",
  "OTHER",
];

export const DEAL_SOURCE_LABELS: Record<DealSource, string> = {
  WEBSITE_ENQUIRY: "Website enquiry",
  DIRECT: "Direct approach",
  OUTBOUND: "Outbound",
  RENEWAL: "Renewal",
  REFERRAL: "Referral",
  TENDER: "Tender or GeM bid",
  OTHER: "Other",
};

// ── activities ──────────────────────────────────────────────────────────────

export const ACTIVITY_KINDS: ActivityKind[] = ["CALL", "EMAIL", "MEETING", "NOTE", "TASK"];

export const ACTIVITY_KIND_LABELS: Record<ActivityKind, string> = {
  CALL: "Call",
  EMAIL: "Email",
  MEETING: "Meeting",
  NOTE: "Note",
  TASK: "Follow-up",
  SYSTEM: "System",
};

/**
 * The kinds a person may log.
 *
 * `SYSTEM` is absent on purpose: those entries are written by the application
 * to record what it did, and a person able to author one could put a false
 * "quotation sent" into a history that is supposed to be evidence.
 */
export function isLoggableKind(value: string): value is ActivityKind {
  return (ACTIVITY_KINDS as string[]).includes(value);
}

// ── derived numbers ─────────────────────────────────────────────────────────

/** The weighted value of one deal, in minor units. Rounded, never fractional. */
export function weightedValue(deal: { stage: DealStage; expectedValueMinor: number }): number {
  return Math.round((deal.expectedValueMinor * STAGE_CONFIDENCE[deal.stage]) / 100);
}

/**
 * How long a deal has been sitting where it is, in whole days.
 *
 * The number a pipeline is actually read for. Measured from `stageChangedAt`
 * rather than `updatedAt`, so correcting a typo in the title does not make a
 * five-week-old deal look fresh.
 */
export function daysInStage(deal: { stageChangedAt: Date }, now = new Date()): number {
  return Math.max(0, Math.floor((now.getTime() - deal.stageChangedAt.getTime()) / 86_400_000));
}

/**
 * Whether a deal has gone quiet.
 *
 * Not a rule about good salespeople; a rule about arithmetic. A forecast is the
 * sum of deals somebody believes in, and a deal untouched for a month is one
 * nobody has checked. Flagging it is how the total stays worth reading.
 *
 * Closed deals are never stale — they have stopped, which is the point of them.
 */
export const STALE_AFTER_DAYS = 30;

export function isStale(
  deal: { stage: DealStage; stageChangedAt: Date },
  now = new Date(),
): boolean {
  if (isClosed(deal.stage)) return false;
  return daysInStage(deal, now) >= STALE_AFTER_DAYS;
}

/**
 * Whether a deal's expected close date has passed while it is still open.
 *
 * Distinct from stale: a deal worked on yesterday can still be overdue, and it
 * is the more urgent of the two, because the forecast it sits in is now
 * definitely wrong.
 */
export function isOverdue(
  deal: { stage: DealStage; expectedCloseOn: Date | null },
  now = new Date(),
): boolean {
  if (isClosed(deal.stage) || !deal.expectedCloseOn) return false;
  return deal.expectedCloseOn.getTime() < now.getTime();
}

/**
 * Won as a share of everything closed, as a percentage.
 *
 * Null rather than zero when nothing has closed. "0% win rate" and "no closed
 * deals yet" look identical on a dashboard and mean opposite things, and the
 * first one is the sort of number somebody makes a decision on.
 */
export function winRate(counts: { won: number; lost: number }): number | null {
  const closed = counts.won + counts.lost;
  if (closed === 0) return null;
  return Math.round((counts.won / closed) * 100);
}

/**
 * Whether a follow-up is outstanding and its time has passed.
 *
 * An activity with no `dueAt` is not a follow-up, and one with `completedAt` is
 * done. Both return false rather than being treated as overdue, which is the
 * bug that would put every note ever written onto somebody's task list.
 */
export function isOutstanding(activity: { dueAt: Date | null; completedAt: Date | null }): boolean {
  return activity.dueAt !== null && activity.completedAt === null;
}

export function isOverdueTask(
  activity: { dueAt: Date | null; completedAt: Date | null },
  now = new Date(),
): boolean {
  return isOutstanding(activity) && activity.dueAt!.getTime() < now.getTime();
}
