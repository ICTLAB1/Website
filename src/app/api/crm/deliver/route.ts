import { timingSafeEqual } from "node:crypto";

import { logger } from "@/lib/logger";
import { deliverPendingCrmEvents } from "@/lib/crm/outbox";

/**
 * Sends whatever is waiting in the CRM outbox. Point a scheduler at it.
 *
 * ## Why a route rather than a background worker
 *
 * This application is a Next.js server with no job runner in it, and adding one
 * for a queue that carries a few events a day would be a second thing to
 * operate. A URL and a `curl` in cron is the honest size of the problem, and it
 * has the property a worker inside the web process would not: if the site is
 * restarted mid-delivery, nothing is half-sent — the event is simply still
 * pending on the next run.
 *
 * ## The token
 *
 * `CRM_DELIVER_TOKEN`, compared in constant time. Without it set, the route
 * refuses everything rather than defaulting to open: an endpoint that both
 * triggers outbound HTTP and reports what is in the queue is not one to leave
 * unauthenticated because somebody forgot a variable.
 *
 * The token goes in a header, not the query string. A URL with a secret in it
 * ends up in access logs, in a scheduler's UI, and in whatever monitoring reads
 * either.
 */

export const dynamic = "force-dynamic";

function authorised(request: Request): boolean {
  const expected = process.env.CRM_DELIVER_TOKEN?.trim();
  if (!expected) return false;

  const provided = request.headers.get("x-crm-token")?.trim();
  if (!provided) return false;

  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(provided, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function POST(request: Request) {
  if (!authorised(request)) {
    // 404, not 401. An unauthenticated caller learns nothing about whether this
    // route exists, which is worth more here than a helpful status code.
    return new Response("Not found", { status: 404 });
  }

  const report = await deliverPendingCrmEvents();
  logger.info("crm_delivery_run", { ...report });

  return Response.json(report, {
    headers: { "cache-control": "no-store" },
  });
}
