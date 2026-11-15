/**
 * Campaigns: the rules for what is shown, where, and when.
 *
 * Everything here is a pure function of its arguments — no clock, no database,
 * no browser — so the rules that decide what a visitor sees can be tested
 * without any of them, and the same file serves the server (which decides what
 * is live) and the client (which decides where it appears and whether this
 * visitor has already dismissed it).
 *
 * ## Time is India time
 *
 * Schedules are written by people in India for visitors in India, and India has
 * no daylight saving, so the offset is a constant +05:30. The admin's date
 * field used to read "20 Nov" as UTC midnight, which is 05:30 on the 20th: a
 * campaign meant to end at the close of the 19th ran into the morning of the
 * 20th. That is the same mistake that kept the Diwali greeting on past its last
 * day, so the date-and-time field converts to and from IST explicitly and a
 * campaign's window is an instant, not a calendar date.
 */

export type CampaignFormat = "BANNER" | "MODAL";
export type CampaignFrequency = "EVERY_VISIT" | "ONCE_PER_DAY" | "ONCE";
export type CampaignTone = "INFO" | "PROMO" | "WARNING";

/** What the browser is given. No internal name, no admin-only column. */
export type PublicCampaign = {
  id: string;
  format: CampaignFormat;
  tone: CampaignTone;
  title: string | null;
  message: string;
  linkLabel: string | null;
  href: string | null;
  pages: string[];
  frequency: CampaignFrequency;
  delaySeconds: number;
  /** Changes whenever the campaign is edited, so an edit shows again. */
  version: number;
};

/** The columns the selection needs from a stored row. */
export type CampaignRow = {
  id: string;
  message: string;
  href: string | null;
  linkLabel: string | null;
  tone: CampaignTone;
  startsAt: Date | null;
  endsAt: Date | null;
  active: boolean;
  displayOrder: number;
  updatedAt: Date;
  format: CampaignFormat | null;
  title: string | null;
  pages: string[];
  frequency: CampaignFrequency;
  delaySeconds: number;
};

const IST_OFFSET_MINUTES = 5 * 60 + 30;
const IST_LOCAL = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;

/** `2026-11-20T23:59` typed in India → the instant it names. Null if invalid. */
export function parseIstLocal(text: string): Date | null {
  const match = IST_LOCAL.exec(text.trim());
  if (!match) return null;
  const [, y, mo, d, h, mi] = match.map(Number) as [number, number, number, number, number, number];
  const utc = Date.UTC(y, mo - 1, d, h, mi) - IST_OFFSET_MINUTES * 60_000;
  const date = new Date(utc);
  // Reject 31 February and 25:00 rather than letting Date roll them over.
  const back = toIstLocal(date);
  return back === text.trim() ? date : null;
}

/** An instant → the `datetime-local` value it reads as in India. */
export function toIstLocal(date: Date): string {
  const shifted = new Date(date.getTime() + IST_OFFSET_MINUTES * 60_000);
  return shifted.toISOString().slice(0, 16);
}

/** Pages a pop-up must never land on: somebody there is mid-task. */
export const BUSY_PATHS = [
  "/admin",
  "/account",
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
  "/enquiry",
  "/contact",
  "/buy",
  "/checkout",
  "/track-order",
  "/requirement",
  "/uploads",
  "/documents",
  "/api",
];

/** A banner is quieter, so it is only kept off the admin and the API. */
const NEVER_PATHS = ["/admin", "/api", "/documents"];

function underAny(pathname: string, roots: readonly string[]): boolean {
  return roots.some((root) => pathname === root || pathname.startsWith(`${root}/`));
}

function normalisePath(path: string): string {
  const clean = (path.split(/[?#]/)[0] ?? "").trim();
  if (clean.length > 1 && clean.endsWith("/")) return clean.slice(0, -1);
  return clean || "/";
}

/**
 * Whether one page-list entry matches a path. `/products/*` matches the section
 * and everything under it; anything else must match exactly. A bare `*` is
 * every page.
 */
export function pathMatches(pattern: string, pathname: string): boolean {
  const entry = pattern.trim();
  if (!entry) return false;
  if (entry === "*") return true;
  const path = normalisePath(pathname);
  if (entry.endsWith("/*")) {
    const root = normalisePath(entry.slice(0, -2));
    return root === "/" ? true : path === root || path.startsWith(`${root}/`);
  }
  return normalisePath(entry) === path;
}

/** Whether a campaign is allowed on a page. An empty list means every page. */
export function appearsOn(campaign: Pick<PublicCampaign, "format" | "pages">, pathname: string): boolean {
  const path = normalisePath(pathname);
  if (underAny(path, NEVER_PATHS)) return false;
  if (campaign.format === "MODAL" && underAny(path, BUSY_PATHS)) return false;
  if (campaign.pages.length === 0) return true;
  return campaign.pages.some((pattern) => pathMatches(pattern, path));
}

/** Only an on-site path or an https URL may be a campaign's link. */
export function safeCampaignHref(value: string | null | undefined): string | null {
  const href = value?.trim();
  if (!href) return null;
  if (href.startsWith("/") && !/^\/[/\\]/.test(href)) return href;
  if (href.startsWith("https://")) return href;
  return null;
}

/** Whether the schedule lets a campaign run at `now`. */
export function isLive(row: Pick<CampaignRow, "active" | "format" | "startsAt" | "endsAt">, now: Date): boolean {
  if (!row.active || row.format === null) return false;
  if (row.startsAt && now < row.startsAt) return false;
  if (row.endsAt && now >= row.endsAt) return false;
  return true;
}

const MAX_LIVE = 12;

/** The live rows, in display order, reduced to what a browser may see. */
export function liveCampaigns(rows: readonly CampaignRow[], now: Date): PublicCampaign[] {
  return rows
    .filter((row) => isLive(row, now))
    .sort((a, b) => a.displayOrder - b.displayOrder || a.id.localeCompare(b.id))
    .slice(0, MAX_LIVE)
    .map((row) => ({
      id: row.id,
      format: row.format as CampaignFormat,
      tone: row.tone,
      title: row.title?.trim() || null,
      message: row.message,
      linkLabel: row.linkLabel?.trim() || null,
      // A link with no label, or a label with no link, is not a call to action.
      href: row.linkLabel?.trim() ? safeCampaignHref(row.href) : null,
      pages: row.pages.map((page) => page.trim()).filter(Boolean),
      frequency: row.frequency,
      delaySeconds: Math.min(Math.max(row.delaySeconds, 0), 60),
      version: row.updatedAt.getTime(),
    }))
    .map((campaign) => (campaign.href ? campaign : { ...campaign, linkLabel: null }));
}

/** The one campaign of a format that applies to this page, if any. */
export function pickFor(
  campaigns: readonly PublicCampaign[],
  format: CampaignFormat,
  pathname: string,
  isHidden: (campaign: PublicCampaign) => boolean = () => false,
): PublicCampaign | null {
  return (
    campaigns.find(
      (campaign) => campaign.format === format && appearsOn(campaign, pathname) && !isHidden(campaign),
    ) ?? null
  );
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** Whether a dismissal at `dismissedAt` still hides the campaign at `now`. */
export function dismissalHolds(
  frequency: CampaignFrequency,
  dismissedAt: number | null,
  now: number,
): boolean {
  if (dismissedAt === null || !Number.isFinite(dismissedAt)) return false;
  if (frequency === "ONCE") return true;
  if (frequency === "ONCE_PER_DAY") return now - dismissedAt < DAY_MS;
  // EVERY_VISIT: the record lives in sessionStorage, so it only has to hold
  // for the rest of this visit.
  return true;
}

/** The key a campaign is remembered under. Editing it changes `version`, so it shows again. */
export const storageKey = (campaign: Pick<PublicCampaign, "id" | "version">) =>
  `${campaign.id}.${campaign.version}`;

/*
 * ## Remembering a dismissal
 *
 * In a cookie rather than localStorage, because the server has to know. A
 * banner is part of the page's first paint; if only the browser knew it had
 * been closed, every returning visitor would see it arrive and then jump away,
 * which is layout shift on the page the whole performance programme exists to
 * keep still. The cookie is readable by the server, so a closed banner is
 * simply not rendered.
 *
 * Two cookies, because they live for different lengths of time: one lasting a
 * year for "once" and "once a day", one lasting the visit for "every visit".
 */
export const DISMISS_COOKIE = "tz_cmp";
export const DISMISS_SESSION_COOKIE = "tz_cmp_s";
const MAX_REMEMBERED = 12;

/** `key:timestamp` pairs joined by `~`. Anything malformed is dropped. */
export function parseDismissals(raw: string | null | undefined): Record<string, number> {
  const result: Record<string, number> = {};
  if (!raw) return result;
  for (const part of raw.split("~").slice(0, 40)) {
    const [key, stamp] = part.split(":");
    const at = Number(stamp);
    if (key && /^[A-Za-z0-9.]{1,80}$/.test(key) && Number.isFinite(at) && at > 0) result[key] = at;
  }
  return result;
}

export function serialiseDismissals(entries: Record<string, number>): string {
  return Object.entries(entries)
    .sort((a, b) => b[1] - a[1])
    .slice(0, MAX_REMEMBERED)
    .map(([key, at]) => `${key}:${at}`)
    .join("~");
}

/** The campaigns this visitor has closed and who should therefore not see them. */
export function hiddenCampaignIds(
  campaigns: readonly PublicCampaign[],
  remembered: Record<string, number>,
  now: number,
): string[] {
  return campaigns
    .filter((campaign) => dismissalHolds(campaign.frequency, remembered[storageKey(campaign)] ?? null, now))
    .map((campaign) => campaign.id);
}
