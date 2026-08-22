import { jsonError, jsonOk, withErrorHandling } from "@/lib/api";
import { verifyCsrf } from "@/lib/auth/csrf";
import { hit, LIMITS } from "@/lib/auth/rate-limit";
import { ipFromRequest } from "@/lib/auth/request";
import { getSessionUser } from "@/lib/auth/session";
import { canInCompany } from "@/lib/auth/capabilities";
import { canTransact } from "@/lib/auth/guards";
import { createDirectOrder } from "@/lib/order-service";
import { beginPayment } from "@/lib/payments/service";
import { directOrderSchema, fieldErrorsOf } from "@/lib/validation";
import { recordAudit } from "@/lib/audit";
import { logger } from "@/lib/logger";

/**
 * Direct purchase endpoint.
 *
 * Accepts a SKU and a quantity only. Pricing, GST and the product's purchase
 * mode are all resolved server-side, so a request carrying a price, a discount
 * or an enquiry-only SKU cannot produce a mispriced or unauthorised order.
 */
export const POST = withErrorHandling("orders.createDirect", async (request: Request) => {
  const csrfFailure = await verifyCsrf(request);
  if (csrfFailure) {
    logger.warn("order_csrf_rejected", { reason: csrfFailure });
    return jsonError("forbidden", "Your session has expired. Please reload the page and try again.");
  }

  const ip = ipFromRequest(request);
  const limit = hit(`order:${ip}`, LIMITS.enquiry.limit, LIMITS.enquiry.windowSeconds);
  if (!limit.allowed) {
    return jsonError("rate_limited", "Too many orders submitted recently. Please contact us directly.", {
      headers: { "retry-after": String(limit.retryAfterSeconds) },
    });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("bad_request", "The request could not be read.");
  }

  const parsed = directOrderSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("validation_failed", "Please correct the highlighted fields.", {
      fieldErrors: fieldErrorsOf(parsed.error),
    });
  }

  if (parsed.data.website) {
    logger.warn("order_honeypot_triggered", {});
    return jsonOk({ reference: "ORD-0000-XXXXXX" });
  }

  const user = await getSessionUser();

  /*
   * A signed-in account must have a confirmed address before it can order.
   *
   * The limit of this is worth stating rather than glossing: an anonymous
   * purchase is not gated, because there is no account to confirm, and someone
   * determined could sign out to get around it. That is not the threat this
   * guards. It guards a real customer whose address has a typo in it — the case
   * where an order is placed in their name, the licence keys go somewhere else,
   * and nobody finds out until they ask where their software is. Anonymous
   * purchases carry their own protections and are a separate, already-accepted
   * risk.
   */
  if (user && !(await canTransact(user))) {
    return jsonError(
      "forbidden",
      "Please confirm your email address before placing an order. We have sent you a link; you can request another from your account.",
    );
  }

  /*
   * A signed-in customer orders on behalf of their organisation, so the role
   * inside it applies. Somebody with no account is ordering for themselves and
   * has nobody to be restricted from.
   */
  if (user && !canInCompany(user, "orders.act")) {
    return jsonError(
      "forbidden",
      "Your access does not include placing orders. Ask a colleague with procurement access.",
    );
  }

  const result = await createDirectOrder(
    [{ sku: parsed.data.sku, quantity: parsed.data.quantity }],
    {
      name: parsed.data.companyName,
      email: parsed.data.contactEmail,
      phone: parsed.data.contactPhone,
      gstin: parsed.data.gstin || null,
      address: parsed.data.billingAddress || null,
      poNumber: parsed.data.poNumber || null,
    },
    // Never trusts a client-supplied account or company id.
    {
      userId: user?.id ?? null,
      companyId: user?.companyId ?? null,
      cardPaymentPending: parsed.data.payWithCard,
    },
  );

  if (!result.ok) return jsonError("conflict", result.reason);

  await recordAudit({
    actorId: user?.id ?? null,
    action: "order.created_direct",
    entityType: "Order",
    entityId: result.reference,
    metadata: {
      sku: parsed.data.sku,
      quantity: parsed.data.quantity,
      requestedCardPayment: parsed.data.payWithCard,
    },
    ip,
  });

  /*
   * The card payment is started here, in the same request that created the
   * order, rather than through an endpoint the browser calls afterwards.
   *
   * That second endpoint is the obvious design and it is the wrong one. It
   * would have to decide who is allowed to start a payment for a given order,
   * and for an anonymous purchase the only thing the caller holds is the order
   * reference — thirty bits of entropy, issued to be quoted in emails and read
   * out over the phone, not to authorise anything. Starting the payment inside
   * the request that created the order removes the question: the only party who
   * can reach this code is the one who just placed the order.
   *
   * A failure to start the payment is not a failure of the order. The order
   * exists, the customer has the confirmation email with transfer details, and
   * the response simply carries no payment block — the page then shows the
   * invoice route, which is where it started.
   */
  let payment: Awaited<ReturnType<typeof beginPayment>> | null = null;
  if (parsed.data.payWithCard) {
    payment = await beginPayment(result.orderId);
    if (!payment.ok) {
      logger.warn("order_card_payment_unavailable", {
        reference: result.reference,
        reason: payment.reason,
      });
    }
  }

  return jsonOk({
    reference: result.reference,
    payment:
      payment?.ok === true
        ? {
            keyId: payment.keyId,
            providerOrderId: payment.providerOrderId,
            amountMinor: payment.amountMinor,
            currency: payment.currency,
            mode: payment.mode,
            prefill: payment.prefill,
          }
        : null,
  });
});
