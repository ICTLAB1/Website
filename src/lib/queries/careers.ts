import "server-only";

import { prisma } from "@/lib/db";

/**
 * Open roles, for the public careers pages.
 *
 * The "is it live" rule is expressed here as a `where` clause rather than by
 * loading everything and filtering in `lib/careers`. Both would work; this one
 * is what keeps a closed role out of the *sitemap* as well as off the page,
 * because the sitemap asks the same query rather than reimplementing the rule.
 *
 * `isLive` still exists and is still the authority — it is what the tests are
 * written against, and what the admin screen uses on rows it has already
 * loaded. These two must agree, which is why the clause below is written to
 * mirror it condition for condition.
 */
function liveWhere(now: Date) {
  return {
    deletedAt: null,
    closedAt: null,
    postedOn: { lte: now },
    OR: [{ closesOn: null }, { closesOn: { gte: now } }],
  };
}

const JOB_CARD = {
  id: true,
  slug: true,
  title: true,
  team: true,
  summary: true,
  employmentType: true,
  workArrangement: true,
  location: true,
  experienceMinYears: true,
  experienceMaxYears: true,
  salaryMinMinor: true,
  salaryMaxMinor: true,
  salaryCurrency: true,
  salaryPeriod: true,
  postedOn: true,
  closesOn: true,
} as const;

/**
 * Uncached, deliberately, unlike the catalogue.
 *
 * A role that has closed must stop being advertised immediately — that is the
 * whole reason `closesOn` exists — and an hour of cache is an hour of
 * advertising a job that is gone. There are a handful of rows and the query is
 * indexed; there is nothing here worth a stale read.
 */
export async function liveJobs(now = new Date()) {
  return prisma.jobPosting.findMany({
    where: liveWhere(now),
    orderBy: [{ displayOrder: "asc" }, { postedOn: "desc" }],
    select: JOB_CARD,
  });
}

export async function liveJobBySlug(slug: string, now = new Date()) {
  return prisma.jobPosting.findFirst({
    where: { slug, ...liveWhere(now) },
    select: { ...JOB_CARD, description: true, applyEmail: true },
  });
}

/**
 * Slugs for the sitemap. Uncached, and the reasoning is worth keeping.
 *
 * This was cached under `tags.jobs`, on the argument that a sitemap is read by
 * crawlers rather than candidates and a role appearing in it an hour late costs
 * nothing. That is true and it is the wrong way round: the cost is a role
 * *leaving* it late.
 *
 * A role closed by hand writes to the table and invalidates the tag. A role
 * that expires by `closesOn` does not — no write happens at all, that is the
 * entire point of the field — so a cached sitemap would keep submitting a
 * closed vacancy to Google as live for up to an hour after its own page had
 * started saying it was closed. A sitemap that contradicts the page it points
 * at is how a site's `JobPosting` markup stops being trusted.
 *
 * `scripts/verify/careers.mjs` caught this, and still asserts it.
 */
export async function liveJobSlugs(now = new Date()) {
  return prisma.jobPosting.findMany({
    where: liveWhere(now),
    select: { slug: true, updatedAt: true },
  });
}
