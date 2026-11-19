import "server-only";
import { cached } from "@/lib/queries/cached";
import {
  PORTAL_URL,
  applyByLabel,
  departmentsOf,
  parseFeed,
  postedAgo,
  type HrJob,
} from "@/lib/hr-feed";

/**
 * The HR feed, fetched on the server.
 *
 * ## Why on the server
 *
 * The jobs are in the HTML a visitor (and a crawler) receives, rather than
 * appearing after a script runs, and the browser never contacts the HR system —
 * so the page works with the portal's CORS rules whatever they are, and a
 * visitor's address is not shown to a second host.
 *
 * ## Freshness, and what happens when HR is down
 *
 * The result is cached for 60 seconds, so a job HR opens or closes is on this
 * site within about a minute, and a thousand visitors cost one request a
 * minute rather than a thousand.
 *
 * A failure is cached too — as "unavailable", for the same minute. That is
 * deliberate and it matters more than it looks: a header that waited five
 * seconds for a dead feed on every page would make an HR outage into a slow
 * website. Cached, one request in a minute pays for the timeout and the rest
 * are instant, and Next serves the stale value while it refreshes.
 *
 * ## Nothing is stored
 *
 * No job is written to this site's files or database. The feed is the only
 * source; when HR closes a job it leaves the feed and so leaves the site.
 */

const DEFAULT_FEED = "https://hr.techzoidtechnologies.com/api/public/jobs";
const TIMEOUT_MS = 5_000;
const REVALIDATE_SECONDS = 60;

/** Overridable for testing against a local copy; unset everywhere it matters. */
const feedUrl = () => process.env.CAREERS_FEED_URL?.trim() || DEFAULT_FEED;

type Loaded = { status: "ok"; jobs: HrJob[] } | { status: "unavailable" };

const loadFeed = cached(
  async (): Promise<Loaded> => {
    try {
      const response = await fetch(feedUrl(), {
        signal: AbortSignal.timeout(TIMEOUT_MS),
        headers: { accept: "application/json" },
        // `cached()` is the cache; a second one underneath would double the
        // staleness, with the inner one's lifetime unaccounted for.
        cache: "no-store",
      });
      if (!response.ok) return { status: "unavailable" };
      const parsed = parseFeed(await response.json());
      return parsed ? { status: "ok", jobs: parsed.jobs } : { status: "unavailable" };
    } catch {
      // Timeout, DNS, TLS, a body that is not JSON. None of them is the
      // visitor's to see.
      return { status: "unavailable" };
    }
  },
  ["hr-careers-feed", feedUrl()],
  ["hr-careers-feed"],
  REVALIDATE_SECONDS,
);

/** A job as the page shows it: the feed's fields plus the two labels that depend on today's date. */
export type DisplayJob = HrJob & { postedLabel: string | null; applyByLabel: string | null };

export type Careers =
  | { state: "jobs"; jobs: DisplayJob[]; departments: string[] }
  | { state: "empty" }
  | { state: "unavailable" };

export async function getCareers(now: Date = new Date()): Promise<Careers> {
  const loaded = await loadFeed();
  if (loaded.status === "unavailable") return { state: "unavailable" };
  if (loaded.jobs.length === 0) return { state: "empty" };
  return {
    state: "jobs",
    jobs: loaded.jobs.map((job) => ({
      ...job,
      postedLabel: postedAgo(job.postedOnIso, now),
      applyByLabel: applyByLabel(job.applyByIso),
    })),
    departments: departmentsOf(loaded.jobs),
  };
}

/**
 * The number of open jobs, for the menu badge, and never more than 1.5 seconds
 * of anyone's time.
 *
 * The header is on every page, so it must not wait on the feed the way the
 * careers page may. On a cold cache with a slow feed this returns 0 — "Careers"
 * with no badge — while the fetch carries on and fills the cache for the next
 * request.
 */
export async function getOpenJobCount(): Promise<number> {
  try {
    const result = await Promise.race([
      getCareers(),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 1_500)),
    ]);
    return result?.state === "jobs" ? result.jobs.length : 0;
  } catch {
    return 0;
  }
}

export { PORTAL_URL };
