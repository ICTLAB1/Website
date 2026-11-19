import { z } from "zod";

/**
 * The HR system's public jobs feed: what it says, and how far to trust it.
 *
 * The feed is written by another system, so every field is treated as input
 * from outside. Three rules follow from that, and all three are tested:
 *
 * - **Text is text.** Every string is trimmed, stripped of control characters
 *   and length-capped, and is only ever rendered as a React child, which
 *   escapes it. Nothing here produces HTML.
 * - **A link goes to the portal or nowhere.** `url` and `apply_url` are used
 *   only when they are https on the portal's own host. Anything else —
 *   `javascript:`, another site, a malformed string — is replaced with the
 *   portal's careers page rather than rendered. The feed is read-only and
 *   public, but a compromised or misconfigured source must not be able to turn
 *   this page into a redirector.
 * - **A bad entry degrades, it does not break.** A job missing a field the
 *   page cannot do without (an id or a title) is skipped; one with an odd
 *   optional field is shown without it. A response that is not the expected
 *   shape at all is "unavailable", never an exception.
 *
 * Pure functions, no network: the fetching and caching is in
 * `queries/hr-feed.ts`.
 */

export const PORTAL_HOST = "hr.techzoidtechnologies.com";
export const PORTAL_URL = `https://${PORTAL_HOST}/careers`;

const MAX_LINE = 400;
const MAX_LIST = 30;

/** Plain text: trimmed, control characters removed, and capped. */
function plain(max: number) {
  return z
    .string()
    .transform((value) =>
      value.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "").replace(/\s+/g, " ").trim().slice(0, max),
    );
}

// `.catch(null)`: an optional field of the wrong type is a field the job does
// not have, not a reason to lose the job.
const optionalText = (max: number) =>
  z
    .union([plain(max), z.null(), z.undefined()])
    .transform((value) => (value ? value : null))
    .catch(null);

const lines = z
  .union([z.array(z.unknown()), z.null(), z.undefined()])
  .transform((list) =>
    (list ?? [])
      .filter((entry): entry is string => typeof entry === "string")
      .map((entry) => plain(MAX_LINE).parse(entry))
      .filter(Boolean)
      .slice(0, MAX_LIST),
  )
  .catch([]);

const RawJob = z.object({
  id: z.union([z.string(), z.number()]).transform(String),
  title: plain(160).refine((value) => value.length > 0),
  department: optionalText(80),
  location: optionalText(120),
  employment_type: optionalText(60),
  experience: optionalText(60),
  salary: optionalText(80),
  openings: z.number().int().min(0).max(1000).optional().catch(undefined),
  summary: optionalText(600),
  responsibilities: lines,
  requirements: lines,
  posted_on: optionalText(20),
  apply_by: optionalText(20),
  url: z.string().optional().catch(undefined),
  apply_url: z.string().optional().catch(undefined),
});

export type HrJob = {
  id: string;
  title: string;
  department: string | null;
  location: string | null;
  employmentType: string | null;
  experience: string | null;
  salary: string | null;
  openings: number | null;
  summary: string | null;
  responsibilities: string[];
  requirements: string[];
  /** ISO date, `YYYY-MM-DD`. Named so the cache layer's date revival, which keys on `postedOn`, leaves it a string. */
  postedOnIso: string | null;
  applyByIso: string | null;
  url: string;
  applyUrl: string;
};

/** https, on the portal's host, and nothing that could smuggle a different one in. */
export function portalLink(value: string | null | undefined, fallback: string = PORTAL_URL): string {
  if (!value) return fallback;
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "https:") return fallback;
    if (url.hostname !== PORTAL_HOST) return fallback;
    if (url.username || url.password || url.port) return fallback;
    return url.toString();
  } catch {
    return fallback;
  }
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const validDate = (value: string | null): string | null => {
  if (!value || !ISO_DATE.test(value)) return null;
  const time = Date.parse(`${value}T00:00:00Z`);
  return Number.isNaN(time) ? null : value;
};

export type ParsedFeed = { jobs: HrJob[] };

/**
 * The feed body → jobs, or `null` when the body is not a feed at all.
 *
 * `count` is deliberately ignored: the number of jobs is the number of valid
 * jobs in the array, so a feed that claims three and carries two shows two.
 */
export function parseFeed(body: unknown): ParsedFeed | null {
  if (!body || typeof body !== "object" || !Array.isArray((body as { jobs?: unknown }).jobs)) return null;

  const jobs: HrJob[] = [];
  const seen = new Set<string>();
  for (const entry of (body as { jobs: unknown[] }).jobs) {
    const parsed = RawJob.safeParse(entry);
    if (!parsed.success) continue;
    const raw = parsed.data;
    if (!raw.id || seen.has(raw.id)) continue;
    seen.add(raw.id);

    const url = portalLink(raw.url);
    jobs.push({
      id: raw.id,
      title: raw.title,
      department: raw.department,
      location: raw.location,
      employmentType: raw.employment_type,
      experience: raw.experience,
      salary: raw.salary,
      openings: raw.openings ?? null,
      summary: raw.summary,
      responsibilities: raw.responsibilities,
      requirements: raw.requirements,
      postedOnIso: validDate(raw.posted_on),
      applyByIso: validDate(raw.apply_by),
      url,
      // An apply link that is not the portal's falls back to the job's own page,
      // which has the form on it, before the careers index.
      applyUrl: portalLink(raw.apply_url, url),
    });
  }
  return { jobs };
}

/** "Posted today", "Posted 1 day ago", "Posted 12 days ago". Null for a missing or future date. */
export function postedAgo(postedOnIso: string | null, now: Date): string | null {
  if (!postedOnIso) return null;
  const posted = Date.parse(`${postedOnIso}T00:00:00Z`);
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const days = Math.round((today - posted) / 86_400_000);
  if (days < 0) return null;
  if (days === 0) return "Posted today";
  if (days === 1) return "Posted 1 day ago";
  return `Posted ${days} days ago`;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** `2026-12-15` → "15 Dec 2026". Read as a calendar date, so no time zone can move it a day. */
export function applyByLabel(applyByIso: string | null): string | null {
  if (!applyByIso) return null;
  const [year, month, day] = applyByIso.split("-").map(Number) as [number, number, number];
  return `${day} ${MONTHS[month - 1] ?? ""} ${year}`;
}

/** The departments, in the order the jobs first mention them. */
export function departmentsOf(jobs: readonly HrJob[]): string[] {
  const seen: string[] = [];
  for (const job of jobs) if (job.department && !seen.includes(job.department)) seen.push(job.department);
  return seen;
}

/** "and 2 more roles", for the home-page strip. */
export function moreRoles(count: number): string {
  const rest = count - 1;
  if (rest <= 0) return "";
  return ` and ${rest} more ${rest === 1 ? "role" : "roles"}`;
}
