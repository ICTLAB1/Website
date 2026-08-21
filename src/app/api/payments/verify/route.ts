import { jsonError, jsonOk, withErrorHandling } from "@/lib/api";
import { hit, LIMITS } from "@/lib/auth/rate-limit";
import { ipFromRequest } from "@/lib/auth/request";
import { getPaymentConfig } from "@/lib/payments/config";
import { verifyCheckoutSignature } from "@/lib/payments/razorpay";
import { recordCapture } from "@/lib/payments/service";
import { logger } from "@/lib/logger";
import { z } from "zod";

/**
 * The browser's report that a payment succeeded.
 *
 * Razorpay Checkout hands the page three values when a payment goes through,
 * and this is where they are cashed in. The customer's browser is the least
 * trustworthy participant in the system, so nothing it says is believed: the
 * third value is an HMAC over the other two, computed with a key secret that
 * only Razorpay and this server hold. Either it verifies, in which case the
 * payment is real whoever posted it, or it does not, in which case nothing
 * happens.
 *
 * That signature is the entire authorisation. There is deliberately no session
 * check and no CSRF token:
 *
 *  - A session check would break the flow for anonymous purchases, which are
 *    supported, and would add nothing for signed-in ones — an attacker who
 *    could forge the signature would not be stopped by owning a session.
 *  - CSRF protects against a third-party page making a request *as* the user.
 *    Here that would mean a stranger's site causing us to record a genuine,
 *    correctly-signed payment against the order it belongs to. There is no
 *    harm in the other direction to protect against.
 *
 * What matters instead is that the amount is never taken from this request —
 * `recordCapture` reads it from the row written before the customer saw a
 * payment form — and that recording is idempotent, because the webhook reports
 * the same capture independently.
 */

const schema = z.object({
  razorpay_order_id: z.string().trim().min(1).max(80),
  razorpay_payment_id: z.string().trim().min(1).max(80),
  razorpay_signature: z.string().trim().min(1).max(200),
});

export const POST = withErrorHandling("payments.verify", async (request: Request) => {
  const ip = ipFromRequest(request);

  /*
   * Rate limited despite being signature-protected. Not to stop forgery — the
   * HMAC does that — but to stop an unauthenticated endpoint being used to
   * make this server compute thousands of hashes and database lookups.
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

  const genuine = verifyCheckoutSignature(config, {
    razorpayOrderId: parsed.data.razorpay_order_id,
    razorpayPaymentId: parsed.data.razorpay_payment_id,
    signature: parsed.data.razorpay_signature,
  });

  if (!genuine) {
    logger.warn("payment_signature_rejected", {
      providerOrderId: parsed.data.razorpay_order_id,
      ip,
    });
    // Says nothing about which part was wrong. Nothing useful can be learned
    // from the difference, and a probe should learn nothing at all.
    return jsonError("forbidden", "This payment could not be confirmed.");
  }

  const result = await recordCapture({
    providerOrderId: parsed.data.razorpay_order_id,
    providerPaymentId: parsed.data.razorpay_payment_id,
    source: "checkout",
  });

  if (!result.ok) {
    return jsonError("conflict", "This payment could not be confirmed. Our team will be in touch.");
  }

  return jsonOk({ reference: result.reference });
});
