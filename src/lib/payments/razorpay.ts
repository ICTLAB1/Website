import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { logger } from "@/lib/logger";
import type { PaymentConfig } from "@/lib/payments/config";

/**
 * The Razorpay API, as much of it as this site uses.
 *
 * Written against `fetch` and `node:crypto` rather than the official SDK. Three
 * reasons, in order of weight: the parts that matter are two HMAC comparisons
 * and one POST, and those are worth being able to read in full; an SDK in the
 * dependency tree of the code that takes money is a supply-chain surface with a
 * poor ratio of benefit to risk; and the SDK's error objects would have to be
 * translated into this codebase's result types anyway.
 *
 * Nothing here reads settings or touches the database. It is given a
 * `PaymentConfig` and returns plain data, which is what makes it testable
 * without a gateway.
 */

const API = "https://api.razorpay.com/v1";

/** Razorpay rejects an amount below ₹1, and there is no sense in a ₹0 order. */
const MIN_AMOUNT_MINOR = 100;

export type RazorpayOrder = {
  id: string;
  amountMinor: number;
  currency: string;
};

export type CreateOrderResult =
  | { ok: true; order: RazorpayOrder }
  | { ok: false; reason: string };

/**
 * Creates an order at the gateway.
 *
 * `receipt` is our own order reference, which is what makes a payment traceable
 * from the Razorpay dashboard back to a row here without a lookup table.
 *
 * The amount is passed in minor units, the same representation used everywhere
 * else in this codebase, so there is no unit conversion between the order total
 * and what the customer is asked to pay. That is deliberate: a conversion is
 * exactly where a factor of a hundred goes missing.
 */
export async function createRazorpayOrder(
  config: PaymentConfig,
  input: { amountMinor: number; currency: string; receipt: string; notes?: Record<string, string> },
): Promise<CreateOrderResult> {
  if (!Number.isSafeInteger(input.amountMinor) || input.amountMinor < MIN_AMOUNT_MINOR) {
    return { ok: false, reason: "That amount cannot be paid by card." };
  }

  let response: Response;
  try {
    response = await fetch(`${API}/orders`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Basic ${Buffer.from(`${config.keyId}:${config.keySecret}`).toString("base64")}`,
      },
      body: JSON.stringify({
        amount: input.amountMinor,
        currency: input.currency,
        receipt: input.receipt,
        // The gateway captures automatically on success. Without this a payment
        // is only authorised, and an authorisation that nobody captures is
        // released back to the customer days later — money the business
        // believes it has and does not.
        payment_capture: 1,
        notes: input.notes ?? {},
      }),
      // A gateway that has stopped answering must not hold a request open until
      // the platform's own timeout; the customer gets the invoice route instead.
      signal: AbortSignal.timeout(15_000),
    });
  } catch (error) {
    logger.error("razorpay_order_unreachable", {
      message: error instanceof Error ? error.message : "unknown",
    });
    return { ok: false, reason: "The payment provider could not be reached." };
  }

  const payload = (await response.json().catch(() => null)) as
    | { id?: unknown; amount?: unknown; currency?: unknown; error?: { description?: unknown } }
    | null;

  if (!response.ok) {
    /*
     * The gateway's own message is logged and deliberately not returned.
     *
     * It names key ids and account state, and a customer at checkout can do
     * nothing with any of it. They get the invoice route; the operator gets the
     * detail in the log.
     */
    logger.error("razorpay_order_rejected", {
      status: response.status,
      description: typeof payload?.error?.description === "string" ? payload.error.description : "",
    });
    return { ok: false, reason: "The payment provider declined to start this payment." };
  }

  if (typeof payload?.id !== "string" || typeof payload.amount !== "number") {
    logger.error("razorpay_order_malformed", { status: response.status });
    return { ok: false, reason: "The payment provider returned an unusable response." };
  }

  /*
   * Check the gateway agrees about the amount before anyone is shown a payment
   * form. It always has so far; the point is that if it ever does not, the
   * failure surfaces here rather than as a discrepancy discovered during a
   * reconciliation weeks later.
   */
  if (payload.amount !== input.amountMinor) {
    logger.error("razorpay_order_amount_mismatch", {
      requested: input.amountMinor,
      returned: payload.amount,
    });
    return { ok: false, reason: "The payment provider returned an unusable response." };
  }

  return {
    ok: true,
    order: {
      id: payload.id,
      amountMinor: payload.amount,
      currency: typeof payload.currency === "string" ? payload.currency : input.currency,
    },
  };
}

/** Constant-time compare of two hex digests. */
function digestsMatch(expected: string, supplied: string): boolean {
  // Reject anything that is not a plausible hex digest before allocating, and
  // compare lengths first: `timingSafeEqual` throws on a length mismatch rather
  // than returning false.
  if (!/^[0-9a-f]{64}$/i.test(supplied)) return false;
  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(supplied.toLowerCase(), "hex");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/**
 * The signature the browser is handed when a payment succeeds.
 *
 * Razorpay signs `orderId|paymentId` with the key secret. Only the two parties
 * holding that secret can produce it, which is what makes an assertion arriving
 * from a customer's browser — the least trustworthy place in the system —
 * safe to act on.
 *
 * The separator matters. Signing a concatenation without one would let a
 * different split of the same characters produce the same signature, so an
 * attacker able to influence either id could move the boundary between them.
 */
export function verifyCheckoutSignature(
  config: PaymentConfig,
  input: { razorpayOrderId: string; razorpayPaymentId: string; signature: string },
): boolean {
  const expected = createHmac("sha256", config.keySecret)
    .update(`${input.razorpayOrderId}|${input.razorpayPaymentId}`)
    .digest("hex");

  return digestsMatch(expected, input.signature);
}

/**
 * The signature on a webhook call.
 *
 * Signed over the raw request body, so the caller must pass the bytes as they
 * arrived. Parsing and re-serialising the JSON first would change key order and
 * whitespace and the signature would never match — and the natural way to
 * "fix" that is to stop checking the signature, which is how a webhook endpoint
 * becomes an unauthenticated way to mark any order paid.
 *
 * Uses the webhook secret, which is a different value from the key secret.
 */
export function verifyWebhookSignature(
  webhookSecret: string,
  rawBody: string,
  signature: string | null,
): boolean {
  if (!signature) return false;
  const expected = createHmac("sha256", webhookSecret).update(rawBody).digest("hex");
  return digestsMatch(expected, signature);
}
