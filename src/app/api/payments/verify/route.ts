import { jsonError, jsonOk, withErrorHandling } from "@/lib/api";
import { hit, LIMITS } from "@/lib/auth/rate-limit";
import { ipFromRequest } from "@/lib/auth/request";
import { getPaymentConfig } from "@/lib/payments/config";
import { retrieveSession } from "@/lib/payments/stripe";
import { recordCapture } from "@/lib/payments/service";
import { logger } from "@/lib/logger";
import { z } from "zod";

/**
 * The browser's report that a payment succeeded.
 *
 * A customer returning from Stripe's hosted Checkout arrives with a session id
 * in the URL and nothing else. That id is a claim, not evidence — anyone can
 * type one — so it is not believed. It is used to ask Stripe, server to server,
 * what actually happened to that session, and only Stripe's answer decides
 * whether anything is recorded.
 *
 * That is a stronger arrangement than the signed assertion this replaced. Under
 * Razorpay the browser handed back an HMAC and the server checked it: the claim
 * still originated at the least trustworthy participant in the system, and was
 * believed because it could not have been forged. Here the claim carries no
 * authority at all and the answer comes from the gateway directly.
 *
 * There is deliberately no session check and no CSRF token:
 *
 *  - A session check would break the flow for anonymous purchases, which are
 *    supported, and would add nothing for signed-in ones — the authorisation is
 *    Stripe's answer, not the caller's identity.
 *  - CSRF protects against a third-party page making a request *as* the user.
 *    Here that would mean a stranger's site causing us to record a genuine,
 *    Stripe-confirmed payment against the order it belongs to. There is no harm
 *    in the other direction to protect against.
 *
 * What matters instead is that the amount is never taken from this request —
 * `recordCapture` reads it from the row written before the customer saw a
 * payment page — and that recording is idempotent, because the webhook reports
 * the same capture independently and in no guaranteed order.
 */

const schema = z.object({
  /*
   * `cs_test_…` / `cs_live_…`. Shape-checked before it is put in a URL path:
   * the id is interpolated into a request to Stripe, and a value that is not a
   * session id has no business being sent there.
   */
  session_id: z
    .string()
    .trim()
    .min(1)
    .max(200)
    .regex(/^cs_[A-Za-z0-9_]+$/, "not a checkout session id"),
});

export const POST = withErrorHandling("payments.verify", async (request: Request) => {
  const ip = ipFromRequest(request);

  /*
   * Rate limited despite being gateway-verified. Not to stop forgery — Stripe's
   * answer does that — but to stop an unauthenticated endpoint being used to
   * make this server issue thousands of outbound API calls on demand, which is
   * a sharper edge here than it was when verification was a local HMAC.
   */
  const limit = hit(`payverify:${ip}`, LIMITS.enquiry.limit, LIMITS.enquiry.windowSeconds);
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

  const config = await getPaymentConfig();
  if (!config) {
    /*
     * Payments were switched off, or the keys were changed, between the
     * customer starting the payment and finishing it. The money may well have
     * been taken, so this is an error-level event: the webhook is now the only
     * route by which it can be recorded, and if the keys changed that will not
     * verify either.
     */
    logger.error("payment_verify_no_config", {});
    return jsonError("conflict", "This payment could not be confirmed. Our team will be in touch.");
  }

  const looked = await retrieveSession(config, parsed.data.session_id);

  if (!looked.ok) {
    logger.warn("payment_session_lookup_rejected", { ip });
    // Says nothing about which part was wrong. Nothing useful can be learned
    // from the difference, and a probe should learn nothing at all.
    return jsonError("forbidden", "This payment could not be confirmed.");
  }

  if (looked.status.paymentStatus !== "paid") {
    /*
     * A real session that has not been paid. Not an error and not an attack —
     * a customer who reached Checkout and abandoned it lands here — so the
     * order stays payable and nothing is recorded.
     */
    return jsonError("conflict", "That payment has not completed.");
  }

  const result = await recordCapture({
    providerOrderId: parsed.data.session_id,
    /*
     * The PaymentIntent, not the session. It is the id that appears on the
     * payout and in a refund, so it is the one worth having on the row when
     * somebody is reconciling a statement.
     */
    providerPaymentId: looked.status.paymentIntentId ?? parsed.data.session_id,
    source: "checkout",
  });

  if (!result.ok) {
    return jsonError("conflict", "This payment could not be confirmed. Our team will be in touch.");
  }

  return jsonOk({ reference: result.reference });
});
