import { z } from "zod";

import { jsonError, jsonOk, withErrorHandling } from "@/lib/api";
import { verifyCsrf } from "@/lib/auth/csrf";
import { hit, LIMITS } from "@/lib/auth/rate-limit";
import { ipFromRequest } from "@/lib/auth/request";
import { getSessionUser } from "@/lib/auth/session";
import { canTransact } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { beginPayment } from "@/lib/payments/service";
import { recordAudit } from "@/lib/audit";
import { logger } from "@/lib/logger";

/**
 * Paying for an order that already exists.
 *
 * The checkout page starts its payment inside the request that creates the
 * order, so this is not that path — it is the second attempt: a card that was
 * declined, a tab closed at the wrong moment, an invoice somebody has decided
 * to settle by card after all. It is reached from the customer's own order
 * list.
 *
 * Unlike `/api/payments/verify`, this one is fully guarded. It is a request to
 * *begin* something rather than a signed statement about something that already
 * happened, so there is no signature to stand in for authorisation:
 *
 *  - a session is required, and the order must belong to it. Not merely
 *    "supply a valid reference" — a reference is issued to be quoted in emails
 *    and read out over the phone, and is far too weak to be a bearer token;
 *  - the email address must be confirmed, the same rule that gates placing an
 *    order in the first place;
 *  - CSRF is checked, because this is a state-changing request made with the
 *    customer's own cookies.
 */

const schema = z.object({ reference: z.string().trim().regex(/^ORD-\d{4}-[A-Z0-9]{6}$/) });

export const POST = withErrorHandling("payments.start", async (request: Request) => {
  const csrfFailure = await verifyCsrf(request);
  if (csrfFailure) {
    return jsonError("forbidden", "Your session has expired. Please reload the page and try again.");
  }

  const user = await getSessionUser();
  if (!user) return jsonError("unauthorized", "Please sign in to pay for this order.");

  if (!(await canTransact(user))) {
    return jsonError(
      "forbidden",
      "Please confirm your email address before paying. We have sent you a link; you can request another from your account.",
    );
  }

  const limit = hit(`paystart:${user.id}`, LIMITS.enquiry.limit, LIMITS.enquiry.windowSeconds);
  if (!limit.allowed) {
    return jsonError("rate_limited", "Too many attempts. Please wait a moment.", {
      headers: { "retry-after": String(limit.retryAfterSeconds) },
    });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("bad_request", "The request could not be read.");
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) return jsonError("bad_request", "The request could not be read.");

  /*
   * Scoped by userId in the query itself, so somebody else's order does not
   * match rather than matching and then being rejected. The two are equivalent
   * here, but only one of them stays equivalent when this code is edited later.
   */
  const order = await prisma.order.findFirst({
    where: { reference: parsed.data.reference, userId: user.id },
    select: { id: true },
  });

  // Deliberately the same answer whether the order does not exist or belongs to
  // somebody else. The difference is not the caller's business.
  if (!order) return jsonError("not_found", "That order could not be found.");

  const payment = await beginPayment(order.id);
  if (!payment.ok) {
    logger.info("payment_retry_refused", {
      reference: parsed.data.reference,
      reason: payment.reason,
    });
    return jsonError("conflict", payment.reason);
  }

  await recordAudit({
    actorId: user.id,
    action: "payment.retry_started",
    entityType: "Order",
    entityId: parsed.data.reference,
    ip: ipFromRequest(request),
  });

  return jsonOk({
    keyId: payment.keyId,
    providerOrderId: payment.providerOrderId,
    amountMinor: payment.amountMinor,
    currency: payment.currency,
    mode: payment.mode,
    prefill: payment.prefill,
  });
});
