import { timingSafeEqual } from "node:crypto";

import { logger } from "@/lib/logger";
import { runQuoteFollowUps } from "@/lib/quotes/follow-ups";

/**
 * Runs the quotation follow-up schedule. Point a scheduler at it.
 *
 * ## Why a route rather than a job runner
 *
 * The same reasoning as `api/crm/deliver`, and deliberately the same shape so
 * there is one thing to operate rather than two: this application is a Next.js
 * server with no scheduler in it, and a URL plus a line in cron is the honest
 * size of "once a day, chase what needs chasing". If the site restarts
 * mid-run, nothing is half-done — each follow-up is recorded before it is sent,
 * and whatever did not go out is simply still due on the next run.
 *
 * Daily is the right cadence. The schedule is expressed in days, so running it
 * hourly would send the same messages at the same times and only give twelve
 * more chances to hit a mail outage.
 *
 * ## The token
 *
 * `QUOTE_FOLLOWUP_TOKEN`, compared in constant time, in a header rather than
 * the query string — a URL with a secret in it ends up in access logs and in
 * whatever monitoring reads them. Without the variable set the route refuses
 * everything rather than defaulting to open: this endpoint sends email to
 * customers, and that is not something to leave reachable because somebody
 * forgot a variable.
 */

export const dynamic = "force-dynamic";

function authorised(request: Request): boolean {
  const expected = process.env.QUOTE_FOLLOWUP_TOKEN?.trim();
  if (!expected) return false;

  const provided = request.headers.get("x-follow-up-token")?.trim();
  if (!provided) return false;

  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(provided, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function POST(request: Request) {
  if (!authorised(request)) {
    // 404, not 401: an unauthenticated caller learns nothing about whether
    // this route exists, which is worth more than a helpful status code.
    return new Response("Not found", { status: 404 });
  }

  const report = await runQuoteFollowUps();
  logger.info("quote_follow_up_run", { ...report });

  return Response.json(report, { headers: { "cache-control": "no-store" } });
}
