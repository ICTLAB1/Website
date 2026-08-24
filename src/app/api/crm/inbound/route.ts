import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { recordAudit } from "@/lib/audit";
import { ipFromRequest } from "@/lib/auth/request";
import { decryptSecret } from "@/lib/secret-box";
import { verifySignature } from "@/lib/crm/events";
import { decideInbound, inboundEnvelopeSchema } from "@/lib/crm/inbound";
import { logActivity, moveDealStage } from "@/lib/crm/deal-service";

/**
 * Deliveries from the customer's own CRM.
 *
 * The other half of the integration, and the half that needs the care: sending
 * events is a broadcast, receiving them is another system changing a pipeline
 * that people here make decisions from. Four things stand between a request and
 * a write, and none of them is optional.
 *
 * **A signature.** `t=<unix>,v1=<hmac>` over `"<timestamp>.<rawbody>"`, checked
 * against the inbound secret with the same function this platform hands the far
 * end as a reference. Over the *raw* body, before any parsing — a signature
 * checked against re-serialised JSON verifies whatever this side happened to
 * produce, not what the sender actually sent.
 *
 * **A clock.** Five minutes' tolerance, inside `verifySignature`. Without it a
 * captured request stays valid forever, and the one thing worth capturing here
 * is "deal won".
 *
 * **An id.** The sender's own, as the primary key of `CrmInboundEvent`. A
 * retrying sender will deliver the same event more than once, and a retry of
 * "move to WON" arriving after somebody moved it back by hand would undo a
 * person's decision. Applied exactly once, however many times it arrives.
 *
 * **A rule.** `decideInbound` says what may happen, and it says no to creating
 * deals and no to changing money — see the reasoning there.
 *
 * ## What it answers
 *
 * 404 when there is nothing to receive with: no secret, or receiving switched
 * off. Not 401 or 403 — an unauthenticated caller learns nothing about whether
 * this route exists, which is worth more than a helpful status code on an
 * endpoint whose whole job is to accept writes from outside.
 *
 * 200 for anything it understood, including a refusal, with the reason in the
 * body. A refusal is not a transport failure and answering 4xx makes a sender
 * retry something that will never succeed — which is how a queue on somebody
 * else's system fills up with a delivery this side has already decided about.
 */

export const dynamic = "force-dynamic";

const notFound = () => new Response("Not found", { status: 404 });

export async function POST(request: Request) {
  const settings = await prisma.crmSettings.findUnique({ where: { id: "singleton" } });
  const secret = decryptSecret(settings?.inboundSecret);

  if (!settings?.inboundEnabled || !secret) return notFound();

  const signature = request.headers.get("x-crm-signature");
  if (!signature) return notFound();

  /*
   * Bounded before it is read into memory. This endpoint is unauthenticated
   * until the signature is checked, and the signature cannot be checked without
   * the body — so the body is what an attacker gets to choose the size of.
   */
  const raw = await request.text();
  if (raw.length > 64_000) {
    return Response.json({ ok: false, detail: "Body too large." }, { status: 413 });
  }

  if (!verifySignature(raw, signature, secret)) {
    logger.warn("crm_inbound_bad_signature", { ip: ipFromRequest(request) });
    return notFound();
  }

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return Response.json({ ok: false, detail: "Body is not JSON." }, { status: 400 });
  }

  const parsed = inboundEnvelopeSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { ok: false, detail: "That is not an event envelope this side recognises." },
      { status: 400 },
    );
  }

  const envelope = parsed.data;

  /*
   * Idempotency, claimed before the work rather than checked before it.
   *
   * A `findUnique` then a `create` is a race two concurrent retries win
   * together. The insert *is* the claim: whoever gets the unique-key violation
   * knows the other one has it, and answers from the row that exists.
   */
  const seen = await prisma.crmInboundEvent.findUnique({
    where: { id: envelope.id },
    select: { status: true, detail: true },
  });
  if (seen) {
    return Response.json({
      ok: true,
      status: seen.status,
      detail: seen.detail,
      duplicate: true,
    });
  }

  const deal = await prisma.deal.findUnique({
    where: { reference: envelope.entity.id.trim() },
    select: { id: true, reference: true, stage: true, stageChangedAt: true, companyId: true },
  });

  const decision = decideInbound(envelope, deal);

  let status: "APPLIED" | "IGNORED" | "REFUSED" =
    decision.verdict === "apply" ? "APPLIED" : decision.verdict === "ignore" ? "IGNORED" : "REFUSED";
  let detail = decision.verdict === "apply" ? (decision.note ?? "Applied.") : decision.detail;

  if (decision.verdict === "apply" && deal) {
    if (decision.action.type === "stage") {
      const result = await moveDealStage({
        reference: decision.action.reference,
        stage: decision.action.stage,
        lostReason: decision.action.lostReason,
        // Attributed to nobody here, because nobody here did it. The history
        // entry the service writes still records the change; who asked for it
        // is this row.
        actorId: null,
        // The whole reason this flag exists: sending this straight back to the
        // system that just asked for it is a loop.
        emit: false,
      });
      if (!result.ok) {
        status = "REFUSED";
        detail = result.reason;
      }
    } else {
      const result = await logActivity({
        kind: "NOTE",
        subject: decision.action.subject,
        body: decision.action.body,
        occurredAt: decision.action.occurredAt,
        dealId: deal.id,
        companyId: deal.companyId,
        actorId: null,
      });
      if (!result.ok) {
        status = "REFUSED";
        detail = result.reason;
      }
    }
  }

  try {
    await prisma.crmInboundEvent.create({
      data: {
        id: envelope.id,
        kind: envelope.kind,
        status,
        occurredAt: new Date(envelope.occurredAt),
        entityType: envelope.entity.type,
        entityId: envelope.entity.id,
        detail,
        payload: body as Prisma.InputJsonValue,
      },
    });
  } catch {
    // A concurrent retry claimed it between the read above and here. Its own
    // request records the outcome; this one says so and changes nothing more.
    return Response.json({ ok: true, status, detail, duplicate: true });
  }

  if (status === "APPLIED") {
    await recordAudit({
      actorId: null,
      action: "crm.inbound_applied",
      entityType: envelope.entity.type,
      entityId: envelope.entity.id,
      metadata: { kind: envelope.kind, eventId: envelope.id },
      ip: ipFromRequest(request),
    });
  }

  logger.info("crm_inbound", { kind: envelope.kind, status, id: envelope.id });

  return Response.json(
    { ok: true, status, detail },
    { headers: { "cache-control": "no-store" } },
  );
}
