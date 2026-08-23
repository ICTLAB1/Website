import type { EmploymentType, WorkArrangement } from "@prisma/client";

/**
 * Open roles: what makes one live, and how its details read.
 *
 * Kept away from the screens because two surfaces consume the same answers —
 * the careers page and the `JobPosting` structured data Google reads — and a
 * listing that is live on one and not the other is the sort of discrepancy
 * that gets a site's job markup ignored entirely.
 */

export const EMPLOYMENT_TYPE_LABELS: Record<EmploymentType, string> = {
  FULL_TIME: "Full time",
  PART_TIME: "Part time",
  CONTRACT: "Contract",
  INTERNSHIP: "Internship",
};

export const WORK_ARRANGEMENT_LABELS: Record<WorkArrangement, string> = {
  ON_SITE: "On site",
  HYBRID: "Hybrid",
  REMOTE: "Remote",
};

/**
 * Schema.org's vocabulary, which is not this application's.
 *
 * Google validates against these exact strings and silently drops a posting
 * that uses anything else, so the mapping is explicit rather than a
 * `replace("_", "")` that would happen to work until an enum value with two
 * underscores was added.
 */
export const EMPLOYMENT_TYPE_SCHEMA: Record<EmploymentType, string> = {
  FULL_TIME: "FULL_TIME",
  PART_TIME: "PART_TIME",
  CONTRACT: "CONTRACTOR",
  INTERNSHIP: "INTERN",
};

export type LiveJob = {
  closedAt: Date | null;
  closesOn: Date | null;
  postedOn: Date;
  deletedAt?: Date | null;
};

/**
 * Whether a role is still being advertised.
 *
 * Three ways to stop: closed by hand, past its own closing date, or deleted.
 * The middle one is the important one — Google downranks a site that leaves
 * filled roles up, and the commonest cause is that the person who posted it
 * has moved on and nobody else knows it is stale. A date closes it whether or
 * not anybody remembers.
 *
 * A future `postedOn` is also not live. That is what lets a role be written
 * today and appear on Monday, rather than being typed at 8am on the day.
 */
export function isLive(job: LiveJob, now = new Date()): boolean {
  if (job.deletedAt) return false;
  if (job.closedAt) return false;
  if (job.postedOn.getTime() > now.getTime()) return false;
  if (job.closesOn && job.closesOn.getTime() < now.getTime()) return false;
  return true;
}

/** Days a live role has been open. Used to flag one that has gone stale. */
export function daysOpen(job: { postedOn: Date }, now = new Date()): number {
  return Math.max(0, Math.floor((now.getTime() - job.postedOn.getTime()) / 86_400_000));
}

/**
 * Roles are pulled from Google's index after a while regardless, and one that
 * has been up this long is usually filled rather than genuinely still open.
 * Surfaced in the admin list rather than closed automatically — a long
 * recruitment is a real thing and this is a prompt, not a rule.
 */
export const STALE_AFTER_DAYS = 90;

export type Pay = {
  salaryMinMinor: number | null;
  salaryMaxMinor: number | null;
  salaryCurrency: string;
  salaryPeriod: string | null;
};

/**
 * The advertised pay, or null where none is advertised.
 *
 * Returns null unless there is something complete to say. A range with one end
 * missing, or an amount with no period, is worse than silence: "₹6,00,000" is
 * a wildly different offer per year than per month, and a reader will assume
 * whichever suits them. Indian advertisements routinely omit pay, so absent is
 * an ordinary state rather than an error.
 */
export function payRange(pay: Pay): { min: number; max: number | null; period: string } | null {
  if (!pay.salaryMinMinor || !pay.salaryPeriod) return null;
  const max = pay.salaryMaxMinor && pay.salaryMaxMinor > pay.salaryMinMinor ? pay.salaryMaxMinor : null;
  return { min: pay.salaryMinMinor, max, period: pay.salaryPeriod };
}

/**
 * The experience line: "2–5 years", "3+ years", "No experience required".
 *
 * Null when neither bound is set, which means the role has not said — quite
 * different from asking for none, and the reason a zero minimum is treated as
 * a real answer rather than as absence.
 */
export function experienceLabel(job: {
  experienceMinYears: number | null;
  experienceMaxYears: number | null;
}): string | null {
  const { experienceMinYears: min, experienceMaxYears: max } = job;
  if (min === null && max === null) return null;
  if (min !== null && max !== null) return `${min}–${max} years`;
  if (min !== null) return min === 0 ? "No experience required" : `${min}+ years`;
  return `Up to ${max} years`;
}

/**
 * Where the role is, in one phrase.
 *
 * A remote role with no location says "Remote", not "Remote, null" and not
 * "Remote, New Delhi" — the second is a contradiction a reader has to resolve,
 * and the point of the arrangement field is that they should not have to.
 */
export function locationLabel(job: {
  workArrangement: WorkArrangement;
  location: string | null;
}): string {
  const arrangement = WORK_ARRANGEMENT_LABELS[job.workArrangement];
  if (!job.location) return arrangement;
  if (job.workArrangement === "REMOTE") return `${arrangement} · ${job.location}`;
  return `${arrangement} · ${job.location}`;
}
