import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { logger } from "@/lib/logger";
import type { PaymentConfig } from "@/lib/payments/config";

/**
 * The Stripe API, as much of it as this site uses.
 *
 * Written against `fetch` and `node:crypto` rather than the official SDK, for
 * the reasons the Razorpay module gave and which did not change with the
 * gateway: the parts that matter are one HMAC comparison and two POSTs, and
 * those are worth being able to read in full; an SDK in the dependency tree of
 * the code that takes money is a supply-chain surface with a poor ratio of
 * benefit to risk; and its error objects would have to be translated into this
 * codebase's result types anyway.
 *
 * ## Hosted Checkout, not embedded fields
 *
 * A payment is a redirect to `checkout.stripe.com` and a redirect back. No card
 * field is ever rendered on this domain, no Stripe script is loaded into a page
 * here, and no Stripe credential reaches a browser — which is why replacing
 * Razorpay made the content security policy *smaller* rather than larger: a
 * script host, an API host and a frame source all came out of it and nothing
 * went in.
 *
 * The trade is one page transition at checkout. For a business whose main
 * route is a purchase order and an invoice, that is a better bargain than
 * hosting card inputs.
 *
 * Nothing here reads settings or touches the database. It is given a
 * `PaymentConfig` and returns plain data, which is what makes it testable
 * without a gateway.
 */

const API = "https://api.stripe.com/v1";

/**
 * Stripe's own minimum for an INR charge is ₹1, expressed in paise like every
 * other amount in this codebase. A zero-rupee payment is not a payment.
 */
const MIN_AMOUNT_MINOR = 100;

export type CheckoutSession = {
  id: string;
  /** Where to send the browser. */
  url: string;
  amountMinor: number;
  currency: string;
};

export type CreateSessionResult =
  | { ok: true; session: CheckoutSession }
  | { ok: false; reason: string };

/**
 * Form-encodes the nested shape Stripe's API takes.
 *
 * Stripe accepts `application/x-www-form-urlencoded` with bracketed keys —
 * `line_items[0][price_data][unit_amount]` — rather than JSON. Building that by
 * hand once, here, is preferable to a dependency or to string concatenation at
 * each call site.
 */
function formEncode(input: Record<string, string | number | undefined>): string {
  const body = new URLSearchParams();
  for (const [key, value] of Object.entries(input)) {
    if (value === undefined) continue;
    body.set(key, String(value));
  }
  return body.toString();
}

/**
 * Opens a Checkout session at the gateway.
 *
 * `receipt` is this site's own order reference. It goes into both
 * `client_reference_id` and the metadata, which is what makes a payment
 * traceable from the Stripe dashboard back to a row here without a lookup
 * table.
 *
 * The amount is passed in minor units, the same representation used everywhere
 * else in this codebase, so there is no unit conversion between the order total
 * and what the customer is asked to pay. That is deliberate: a conversion is
 * exactly where a factor of a hundred goes missing.
 */
export async function createCheckoutSession(
  config: PaymentConfig,
  input: {
    amountMinor: number;
    currency: string;
    receipt: string;
    productName: string;
    successUrl: string;
    cancelUrl: string;
    customerEmail?: string;
  },
): Promise<CreateSessionResult> {
  if (!Number.isSafeInteger(input.amountMinor) || input.amountMinor < MIN_AMOUNT_MINOR) {
    return { ok: false, reason: "That amount cannot be paid by card." };
  }

  let response: Response;
  try {
    response = await fetch(`${API}/checkout/sessions`, {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        authorization: `Bearer ${config.secretKey}`,
        /*
         * Pinned rather than left to whatever Stripe defaults the account to.
         * An account-level API upgrade is otherwise a silent change to the
         * shape of every response this file parses.
         */
        "stripe-version": "2025-07-30.basil",
      },
      body: formEncode({
        mode: "payment",
        // One line, priced inline. This site does not maintain a Stripe product
        // catalogue: the order total is already computed here, with GST, and a
        // second source of prices is a second thing to reconcile.
        "line_items[0][price_data][currency]": input.currency.toLowerCase(),
        "line_items[0][price_data][unit_amount]": input.amountMinor,
        "line_items[0][price_data][product_data][name]": input.productName,
        "line_items[0][quantity]": 1,
        client_reference_id: input.receipt,
        "metadata[order_reference]": input.receipt,
        success_url: input.successUrl,
        cancel_url: input.cancelUrl,
        customer_email: input.customerEmail,
      }),
      // A gateway that has stopped answering must not hold a request open until
      // the platform's own timeout; the customer gets the invoice route instead.
      signal: AbortSignal.timeout(15_000),
    });
  } catch (error) {
    logger.error("stripe_session_unreachable", {
      message: error instanceof Error ? error.message : "unknown",
    });
    return { ok: false, reason: "The payment provider could not be reached." };
  }

  const payload = (await response.json().catch(() => null)) as {
    id?: unknown;
    url?: unknown;
    amount_total?: unknown;
    currency?: unknown;
    error?: { message?: unknown };
  } | null;

  if (!response.ok) {
    /*
     * The gateway's own message is logged and deliberately not returned. It
     * names key state and account configuration, and a customer at checkout can
     * do nothing with any of it. They get the invoice route; the operator gets
     * the detail in the log.
     */
    logger.error("stripe_session_rejected", {
      status: response.status,
      message: typeof payload?.error?.message === "string" ? payload.error.message : "",
    });
    return { ok: false, reason: "The payment provider declined to start this payment." };
  }

  if (typeof payload?.id !== "string" || typeof payload.url !== "string") {
    logger.error("stripe_session_malformed", { status: response.status });
    return { ok: false, reason: "The payment provider returned an unusable response." };
  }

  /*
   * Check the gateway agrees about the amount before anyone is shown a payment
   * page. It always has so far; the point is that if it ever does not, the
   * failure surfaces here rather than as a discrepancy discovered during a
   * reconciliation weeks later.
   */
  if (payload.amount_total !== input.amountMinor) {
    logger.error("stripe_session_amount_mismatch", {
      requested: input.amountMinor,
      returned: typeof payload.amount_total === "number" ? payload.amount_total : -1,
    });
    return { ok: false, reason: "The payment provider returned an unusable response." };
  }

  return {
    ok: true,
    session: {
      id: payload.id,
      url: payload.url,
      amountMinor: payload.amount_total,
      currency:
        typeof payload.currency === "string" ? payload.currency.toUpperCase() : input.currency,
    },
  };
}

export type SessionStatus = {
  /** Stripe's own word: "paid", "unpaid" or "no_payment_required". */
  paymentStatus: string;
  amountMinor: number;
  currency: string;
  /** The PaymentIntent, which is the id worth recording against the order. */
  paymentIntentId: string | null;
  /** Our order reference, echoed back. */
  receipt: string | null;
};

export type RetrieveResult =
  | { ok: true; status: SessionStatus }
  | { ok: false; reason: string };

/**
 * Asks Stripe what actually happened to a session.
 *
 * This is what replaces Razorpay's returned signature, and it is a better trust
 * model rather than merely a different one. There, a browser handed back an
 * HMAC and the server checked it; the assertion still originated at the least
 * trustworthy point in the system, and was believed because it could not have
 * been forged. Here the browser hands back only a session id — a claim with no
 * authority at all — and the server asks Stripe directly.
 *
 * A forged or guessed id therefore gets whatever Stripe says about it, which
 * for anything not genuinely paid is not "paid".
 */
export async function retrieveSession(
  config: PaymentConfig,
  sessionId: string,
): Promise<RetrieveResult> {
  let response: Response;
  try {
    response = await fetch(`${API}/checkout/sessions/${encodeURIComponent(sessionId)}`, {
      headers: {
        authorization: `Bearer ${config.secretKey}`,
        "stripe-version": "2025-07-30.basil",
      },
      signal: AbortSignal.timeout(15_000),
    });
  } catch (error) {
    logger.error("stripe_session_lookup_unreachable", {
      message: error instanceof Error ? error.message : "unknown",
    });
    return { ok: false, reason: "The payment provider could not be reached." };
  }

  const payload = (await response.json().catch(() => null)) as {
    payment_status?: unknown;
    amount_total?: unknown;
    currency?: unknown;
    payment_intent?: unknown;
    client_reference_id?: unknown;
  } | null;

  if (!response.ok || typeof payload?.payment_status !== "string") {
    logger.error("stripe_session_lookup_failed", { status: response.status });
    return { ok: false, reason: "The payment could not be confirmed." };
  }

  return {
    ok: true,
    status: {
      paymentStatus: payload.payment_status,
      amountMinor: typeof payload.amount_total === "number" ? payload.amount_total : 0,
      currency: typeof payload.currency === "string" ? payload.currency.toUpperCase() : "INR",
      // Expanded objects arrive as an object; unexpanded as a bare id string.
      paymentIntentId:
        typeof payload.payment_intent === "string"
          ? payload.payment_intent
          : typeof (payload.payment_intent as { id?: unknown } | null)?.id === "string"
            ? ((payload.payment_intent as { id: string }).id)
            : null,
      receipt:
        typeof payload.client_reference_id === "string" ? payload.client_reference_id : null,
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
 * How long a signed webhook stays acceptable.
 *
 * Stripe signs a timestamp alongside the body precisely so a captured call
 * cannot be replayed later, and that protection only exists if somebody checks
 * the timestamp. Five minutes is Stripe's own suggested tolerance and is ample
 * for a retry.
 */
const WEBHOOK_TOLERANCE_SECONDS = 300;

/**
 * The signature on a webhook call.
 *
 * `Stripe-Signature: t=1699999999,v1=<hex>,v1=<hex>` — a timestamp and one or
 * more scheme-1 digests, taken over `${t}.${rawBody}`.
 *
 * Signed over the raw request body, so the caller must pass the bytes as they
 * arrived. Parsing and re-serialising the JSON first would change key order and
 * whitespace and the signature would never match — and the natural way to "fix"
 * that is to stop checking the signature, which is how a webhook endpoint
 * becomes an unauthenticated way to mark any order paid.
 *
 * More than one `v1` may be present while a secret is being rotated, so every
 * one is tried. `now` is injectable for the tests, which need to age a
 * signature deliberately.
 */
export function verifyWebhookSignature(
  webhookSecret: string,
  rawBody: string,
  header: string | null,
  now: number = Date.now(),
): boolean {
  if (!header) return false;

  let timestamp: string | null = null;
  const digests: string[] = [];

  for (const part of header.split(",")) {
    const [key, value] = part.trim().split("=", 2);
    if (!key || !value) continue;
    if (key === "t") timestamp = value;
    else if (key === "v1") digests.push(value);
  }

  if (!timestamp || digests.length === 0) return false;

  const signedAt = Number.parseInt(timestamp, 10);
  if (!Number.isFinite(signedAt)) return false;

  /*
   * Rejected in both directions. A call from too far in the future is as
   * suspect as one from too far in the past, and a clock that has drifted
   * should fail loudly here rather than quietly widen the replay window.
   */
  const age = Math.abs(Math.floor(now / 1000) - signedAt);
  if (age > WEBHOOK_TOLERANCE_SECONDS) return false;

  const expected = createHmac("sha256", webhookSecret)
    .update(`${timestamp}.${rawBody}`)
    .digest("hex");

  return digests.some((digest) => digestsMatch(expected, digest));
}
