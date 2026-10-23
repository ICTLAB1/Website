import { timingSafeEqual } from "node:crypto";

import { logger } from "@/lib/logger";
import { runRetention } from "@/lib/privacy/retention";

/**
 * Applies the retention periods the privacy policy publishes. Point a
 * scheduler at it.
 *
 * Deliberately the same shape as `api/quotes/follow-ups` and
 * `api/crm/deliver`: a token in a header, compared in constant time, 404 to
 * everyone else, and a line in cron. Three scheduled routes that look alike
 * are one thing to operate.
 *
 * ## It reports unless told to delete
 *
 * `POST` with no body counts what the rules cover and deletes nothing. Add
 * `{"apply":true}` and it deletes. That asymmetry is the point: the first run
 * against production meets years of backlog, and the counts are the only way
 * to find out whether the rules mean what they say before the deletion is
 * irreversible.
 *
 * A daily cron should call it without `apply` until somebody has read a report
 * and agreed with it, and with `apply` afterwards. Both are safe to run daily
 * — once the backlog is gone, a day's worth of newly-expired rows is a handful.
 *
 * ## The token
 *
 * `RETENTION_TOKEN`, in a header rather than the query string, because a URL
 * with a secret in it ends up in access logs. Unset refuses everything rather
 * than defaulting to open, which matters more here than on the other two
 * routes: this one deletes customer records.
 */

export const dynamic = "force-dynamic";

function authorised(request: Request): boolean {
  const expected = process.env.RETENTION_TOKEN?.trim();
  if (!expected) return false;

  const provided = request.headers.get("x-retention-token")?.trim();
  if (!provided) return false;

  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(provided, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/**
 * `apply` is read strictly: the literal boolean `true` and nothing else. Not
 * `"true"`, not `1`, not a truthy string — a deletion of customer data should
 * not be triggered by a client that sent a query parameter where a JSON body
 * was expected. A body that is absent, empty or unparseable means report.
 */
async function wantsApply(request: Request): Promise<boolean> {
  try {
    const body: unknown = await request.json();
    return typeof body === "object" && body !== null && (body as { apply?: unknown }).apply === true;
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  if (!authorised(request)) {
    return new Response("Not found", { status: 404 });
  }

  const apply = await wantsApply(request);
  const report = await runRetention({ apply });

  logger.info("retention_run", {
    dryRun: report.dryRun,
    rules: report.rules.map(({ id, eligible, heldBack, deleted }) => ({
      id,
      eligible,
      heldBack,
      deleted,
    })),
  });

  return Response.json(report, { headers: { "cache-control": "no-store" } });
}
