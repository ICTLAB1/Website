import { jsonError, jsonOk, withErrorHandling } from "@/lib/api";
import { verifyCsrf } from "@/lib/auth/csrf";
import { hit, LIMITS } from "@/lib/auth/rate-limit";
import { ipFromRequest } from "@/lib/auth/request";
import { getSessionUser } from "@/lib/auth/session";
import { canTransact } from "@/lib/auth/guards";
import { createDirectOrder } from "@/lib/order-service";
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
  if (user && !canTransact(user)) {
    return jsonError(
      "forbidden",
      "Please confirm your email address before placing an order. We have sent you a link; you can request another from your account.",
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
    { userId: user?.id ?? null, companyId: user?.companyId ?? null },
  );

  if (!result.ok) return jsonError("conflict", result.reason);

  await recordAudit({
    actorId: user?.id ?? null,
    action: "order.created_direct",
    entityType: "Order",
    entityId: result.reference,
    metadata: { sku: parsed.data.sku, quantity: parsed.data.quantity },
    ip,
  });

  return jsonOk({ reference: result.reference });
});
