import "server-only";

import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { decryptSecret } from "@/lib/secret-box";
import {
  buildEnvelope,
  endpointProblem,
  retryDelaySeconds,
  shouldAbandon,
  signPayload,
  type CrmEventKind,
} from "@/lib/crm/events";

/**
 * The outbox: recording what happened, and getting it to the customer's CRM.
 *
 * ## Recording and sending are separate on purpose
 *
 * A salesperson moving a deal must not wait on somebody else's server, and must
 * not have their change fail because that server is down. So `recordCrmEvent`
 * writes a row inside the same transaction as the change it describes — either
 * both happen or neither does — and delivery is a separate pass that can fail,
 * retry and be looked at, without ever being able to roll back the thing it is
 * reporting.
 *
 * ## Nothing is sent until somebody says so
 *
 * Events accumulate from the day the pipeline is used. Delivery happens only
 * when an endpoint is configured *and* enabled, and every surface says "Not
 * connected" until then rather than implying a link that does not exist. The
 * queue is real; the integration is not, until credentials are.
 */

export type CrmConnection =
  | { connected: false; reason: "unset" | "disabled" | "invalid"; detail: string }
  | { connected: true; endpointUrl: string; signingSecret: string };

/**
 * Whether events can actually go anywhere, and if not, why in plain words.
 *
 * One function so that the settings screen, the delivery pass and the outbox
 * list all give the same answer. Three screens each deciding "is this
 * connected" separately is how one of them ends up saying yes while another
 * says no.
 */
export async function crmConnection(): Promise<CrmConnection> {
  const settings = await prisma.crmSettings.findUnique({ where: { id: "singleton" } });

  if (!settings?.endpointUrl) {
    return {
      connected: false,
      reason: "unset",
      detail: "No endpoint is configured. Events are recorded here and sent nowhere.",
    };
  }

  const problem = endpointProblem(settings.endpointUrl);
  if (problem) {
    return { connected: false, reason: "invalid", detail: problem };
  }

  const secret = decryptSecret(settings.signingSecret);
  if (!secret) {
    return {
      connected: false,
      reason: "invalid",
      detail:
        "No signing secret is set. Without one the receiving system cannot tell a real event from anyone who guessed the URL, so nothing is sent.",
    };
  }

  if (!settings.enabled) {
    return {
      connected: false,
      reason: "disabled",
      detail: "An endpoint is configured but sending is switched off.",
    };
  }

  return { connected: true, endpointUrl: settings.endpointUrl, signingSecret: secret };
}

/**
 * Queues an event.
 *
 * Takes a transaction client so it can be called inside the same transaction as
 * the change it reports. An event written outside that transaction can describe
 * something that then rolled back, which is worse than no event: the far end
 * believes a deal was won that was not.
 */
export async function recordCrmEvent(
  tx: Prisma.TransactionClient,
  input: {
    kind: CrmEventKind;
    entityType: string;
    entityId: string;
    data: Record<string, unknown>;
  },
): Promise<void> {
  await tx.crmEvent.create({
    data: {
      kind: input.kind,
      entityType: input.entityType,
      entityId: input.entityId,
      payload: input.data as Prisma.InputJsonValue,
    },
  });
}

export type DeliveryReport = {
  attempted: number;
  delivered: number;
  failed: number;
  abandoned: number;
  /** Set when nothing was attempted because there is nowhere to send. */
  skipped?: string;
};

/**
 * Sends what is waiting.
 *
 * Called from the admin screen and from the scheduled endpoint. Sequential
 * rather than parallel: the receiving system is somebody else's, order is
 * meaningful (`deal.created` before `deal.won`), and twenty concurrent posts to
 * a small CRM is a way to take it down.
 */
export async function deliverPendingCrmEvents(limit = 25): Promise<DeliveryReport> {
  const connection = await crmConnection();
  if (!connection.connected) {
    return { attempted: 0, delivered: 0, failed: 0, abandoned: 0, skipped: connection.detail };
  }

  const now = new Date();
  const due = await prisma.crmEvent.findMany({
    where: {
      status: { in: ["PENDING", "FAILED"] },
      /*
       * Either never tried, or tried long enough ago. The backoff is applied
       * here rather than by a scheduler, so running this pass more often than
       * necessary is harmless — it simply finds nothing due.
       */
      OR: [{ lastAttemptAt: null }, { lastAttemptAt: { lt: new Date(now.getTime() - 60_000) } }],
    },
    orderBy: { createdAt: "asc" },
    take: limit,
  });

  const report: DeliveryReport = { attempted: 0, delivered: 0, failed: 0, abandoned: 0 };

  for (const event of due) {
    // The backoff, checked per event because they have different attempt counts.
    if (event.lastAttemptAt) {
      const waited = (now.getTime() - event.lastAttemptAt.getTime()) / 1000;
      if (waited < retryDelaySeconds(event.attempts)) continue;
    }

    report.attempted += 1;

    const body = JSON.stringify(
      buildEnvelope({
        id: event.id,
        kind: event.kind as CrmEventKind,
        occurredAt: event.createdAt,
        entityType: event.entityType,
        entityId: event.entityId,
        data: (event.payload ?? {}) as Record<string, unknown>,
      }),
    );

    let failure: string | null = null;
    try {
      const response = await fetch(connection.endpointUrl, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-techzoid-signature": signPayload(body, connection.signingSecret),
          /*
           * The event id, so a receiver can make delivery idempotent without
           * reading the body. Retries reuse it — that is the whole point of it
           * being the row's own id rather than a fresh one per attempt.
           */
          "x-techzoid-event-id": event.id,
        },
        body,
        signal: AbortSignal.timeout(10_000),
      });

      if (!response.ok) {
        // Bounded: a receiver returning an HTML error page would otherwise put
        // a whole document into a column somebody reads on a screen.
        const text = (await response.text().catch(() => "")).slice(0, 300);
        failure = `HTTP ${response.status}${text ? `: ${text}` : ""}`;
      }
    } catch (error) {
      failure = error instanceof Error ? error.message.slice(0, 300) : "Unreachable";
    }

    const attempts = event.attempts + 1;

    if (!failure) {
      await prisma.crmEvent.update({
        where: { id: event.id },
        data: { status: "DELIVERED", attempts, lastAttemptAt: now, deliveredAt: now, lastError: null },
      });
      report.delivered += 1;
      continue;
    }

    const abandon = shouldAbandon(attempts);
    await prisma.crmEvent.update({
      where: { id: event.id },
      data: {
        status: abandon ? "ABANDONED" : "FAILED",
        attempts,
        lastAttemptAt: now,
        lastError: failure,
      },
    });

    if (abandon) report.abandoned += 1;
    else report.failed += 1;

    logger.error("crm_event_delivery_failed", {
      event: event.id,
      kind: event.kind,
      attempts,
      abandoned: abandon,
      error: failure,
    });
  }

  return report;
}

/** What the outbox looks like, for the settings screen. */
export async function outboxSummary() {
  const [pending, failed, abandoned, delivered, recent] = await Promise.all([
    prisma.crmEvent.count({ where: { status: "PENDING" } }),
    prisma.crmEvent.count({ where: { status: "FAILED" } }),
    prisma.crmEvent.count({ where: { status: "ABANDONED" } }),
    prisma.crmEvent.count({ where: { status: "DELIVERED" } }),
    prisma.crmEvent.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        kind: true,
        status: true,
        entityType: true,
        entityId: true,
        attempts: true,
        lastError: true,
        createdAt: true,
        deliveredAt: true,
      },
    }),
  ]);

  return { pending, failed, abandoned, delivered, recent };
}
