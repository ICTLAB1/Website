import { withErrorHandling } from "@/lib/api";
import { NextResponse } from "next/server";
import { getPaymentConfig } from "@/lib/payments/config";
import { verifyWebhookSignature } from "@/lib/payments/stripe";
import { recordCapture, recordFailure } from "@/lib/payments/service";
import { logger } from "@/lib/logger";

/**
 * Stripe's own report of what happened.
 *
 * This exists because the browser's return cannot be relied on. A customer who
 * closes the tab at the moment their bank redirects back, loses signal on a
 * train, or is bounced through a 3-D Secure page that never returns, has still
 * been charged. Without this endpoint that money arrives in the account with no
 * order marked paid against it, and is found — if at all — during a manual
 * reconciliation weeks later.
 *
 * Configure it in the Stripe dashboard under Developers → Webhooks, pointed at
 * `/api/payments/webhook`, subscribed to `checkout.session.completed`,
 * `checkout.session.async_payment_succeeded` and
 * `checkout.session.async_payment_failed`, with the signing secret saved in the
 * admin panel. Until that secret is set this endpoint refuses everything, which
 * is the correct behaviour: an unauthenticated way to mark orders paid would be
 * worse than having no webhook at all.
 */

/**
 * Read the body as bytes, exactly as sent.
 *
 * The signature covers the raw payload. Parsing to JSON and re-serialising
 * changes key order, whitespace and number formatting, and the signature then
 * never matches — at which point the tempting fix is to stop checking it, which
 * turns this into an open endpoint for marking any order paid. So the raw text
 * is taken first and parsed only after the signature has verified against it.
 */
export const POST = withErrorHandling("payments.webhook", async (request: Request) => {
  const raw = await request.text();
  const signature = request.headers.get("stripe-signature");

  const config = await getPaymentConfig();
  if (!config?.webhookSecret) {
    logger.warn("payment_webhook_unconfigured", {});
    // 503, not 400: the call was well-formed and this end is not ready. Stripe
    // retries on 5xx for up to three days, so a webhook arriving during a brief
    // misconfiguration is delivered again rather than lost.
    return new NextResponse(null, { status: 503 });
  }

  if (!verifyWebhookSignature(config.webhookSecret, raw, signature)) {
    logger.warn("payment_webhook_signature_rejected", { hasSignature: Boolean(signature) });
    // 400, and never retried: an unsigned, wrongly-signed or stale call is not
    // something redelivery would fix.
    return new NextResponse(null, { status: 400 });
  }

  let event: { type?: unknown; data?: { object?: Record<string, unknown> } };
  try {
    event = JSON.parse(raw);
  } catch {
    return new NextResponse(null, { status: 400 });
  }

  const object = event.data?.object ?? {};
  /*
   * The session id is what `beginPayment` stored as `providerOrderId`, so it is
   * the key that finds the row. The PaymentIntent is what appears on a payout
   * and in a refund, so it is what gets recorded alongside.
   */
  const providerOrderId = typeof object.id === "string" ? object.id : null;
  const paymentIntent =
    typeof object.payment_intent === "string" ? object.payment_intent : null;

  if (!providerOrderId) {
    // Signed by us, so genuine, but not about a payment we can place. Accepted
    // rather than retried — redelivering it would not add the missing field.
    logger.warn("payment_webhook_unplaceable", { event: String(event.type ?? "") });
    return NextResponse.json({ ok: true });
  }

  switch (event.type) {
    /*
     * `completed` covers a card paid immediately. `async_payment_succeeded` is
     * the delayed methods — a bank debit that clears days later — which arrive
     * with no second `completed`, so both have to be handled or that money is
     * never recorded.
     */
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded": {
      /*
       * A session can complete without being paid: `payment_status` is
       * `unpaid` while an asynchronous method is still pending. Recording that
       * as a capture would mark an order paid for money that has not arrived
       * and may yet fail.
       */
      if (object.payment_status !== "paid") {
        logger.info("payment_webhook_not_yet_paid", { providerOrderId });
        return NextResponse.json({ ok: true });
      }

      const result = await recordCapture({
        providerOrderId,
        providerPaymentId: paymentIntent ?? providerOrderId,
        // Stripe reports the amount in minor units, the same representation
        // used here. Checked against what was stored, never adopted.
        reportedAmountMinor:
          typeof object.amount_total === "number" ? object.amount_total : null,
        // "card", "upi" and so on — the list Checkout actually offered, of
        // which the first is what was used in the single-method case this
        // site configures.
        method: Array.isArray(object.payment_method_types)
          ? (object.payment_method_types.find((value) => typeof value === "string") as
              | string
              | undefined) ?? null
          : null,
        source: "webhook",
      });

      if (!result.ok) {
        /*
         * A mismatch or an unknown order. Answering 200 stops Stripe retrying
         * something that will fail identically every time, and the error has
         * already been logged where somebody can act on it. Answering 5xx here
         * would bury the real problem under three days of retries.
         */
        logger.error("payment_webhook_capture_refused", { providerOrderId });
      }
      return NextResponse.json({ ok: true });
    }

    case "checkout.session.async_payment_failed":
    case "checkout.session.expired": {
      await recordFailure({
        providerOrderId,
        providerPaymentId: paymentIntent,
        reason: event.type === "checkout.session.expired" ? "Checkout expired" : "Payment failed",
      });
      return NextResponse.json({ ok: true });
    }

    default:
      // Subscribing to more events than these in the dashboard is harmless.
      return NextResponse.json({ ok: true });
  }
});
