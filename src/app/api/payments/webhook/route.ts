import { withErrorHandling } from "@/lib/api";
import { NextResponse } from "next/server";
import { getPaymentConfig } from "@/lib/payments/config";
import { verifyWebhookSignature } from "@/lib/payments/razorpay";
import { recordCapture, recordFailure } from "@/lib/payments/service";
import { logger } from "@/lib/logger";

/**
 * Razorpay's own report of what happened.
 *
 * This exists because the browser callback cannot be relied on. A customer who
 * closes the tab at the moment their bank redirects back, loses signal on a
 * train, or is bounced through a 3-D Secure page that never returns, has still
 * been charged. Without this endpoint that money arrives in the account with no
 * order marked paid against it, and is found — if at all — during a manual
 * reconciliation weeks later.
 *
 * Configure it in the Razorpay dashboard under Settings → Webhooks, pointed at
 * `/api/payments/webhook`, subscribed to `payment.captured` and
 * `payment.failed`, with the secret saved in the admin panel. Until that secret
 * is set this endpoint refuses everything, which is the correct behaviour: an
 * unauthenticated way to mark orders paid would be worse than having no webhook
 * at all.
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
  const signature = request.headers.get("x-razorpay-signature");

  const config = await getPaymentConfig();
  if (!config?.webhookSecret) {
    logger.warn("payment_webhook_unconfigured", {});
    // 503, not 400: the call was well-formed and this end is not ready. Razorpay
    // retries on 5xx, so a webhook that arrives during a brief misconfiguration
    // is delivered again rather than lost.
    return new NextResponse(null, { status: 503 });
  }

  if (!verifyWebhookSignature(config.webhookSecret, raw, signature)) {
    logger.warn("payment_webhook_signature_rejected", { hasSignature: Boolean(signature) });
    // 400, and never retried: an unsigned or wrongly-signed call is not
    // something redelivery would fix.
    return new NextResponse(null, { status: 400 });
  }

  let event: {
    event?: unknown;
    payload?: { payment?: { entity?: Record<string, unknown> } };
  };
  try {
    event = JSON.parse(raw);
  } catch {
    return new NextResponse(null, { status: 400 });
  }

  const entity = event.payload?.payment?.entity ?? {};
  const providerOrderId = typeof entity.order_id === "string" ? entity.order_id : null;
  const providerPaymentId = typeof entity.id === "string" ? entity.id : null;

  if (!providerOrderId) {
    // Signed by us, so genuine, but not about a payment we can place. Accepted
    // rather than retried — redelivering it would not add the missing field.
    logger.warn("payment_webhook_unplaceable", { event: String(event.event ?? "") });
    return NextResponse.json({ ok: true });
  }

  switch (event.event) {
    case "payment.captured": {
      if (!providerPaymentId) return NextResponse.json({ ok: true });

      const result = await recordCapture({
        providerOrderId,
        providerPaymentId,
        // Razorpay reports the amount in minor units, the same representation
        // used here. Checked against what was stored, never adopted.
        reportedAmountMinor: typeof entity.amount === "number" ? entity.amount : null,
        method: typeof entity.method === "string" ? entity.method : null,
        source: "webhook",
      });

      if (!result.ok) {
        /*
         * A mismatch or an unknown order. Answering 200 stops Razorpay retrying
         * something that will fail identically every time, and the error has
         * already been logged where somebody can act on it. Answering 5xx here
         * would bury the real problem under a retry storm.
         */
        logger.error("payment_webhook_capture_refused", { providerOrderId });
      }
      return NextResponse.json({ ok: true });
    }

    case "payment.failed": {
      const description = entity.error_description;
      await recordFailure({
        providerOrderId,
        providerPaymentId,
        reason: typeof description === "string" ? description : null,
      });
      return NextResponse.json({ ok: true });
    }

    default:
      // Subscribing to more events than these in the dashboard is harmless.
      return NextResponse.json({ ok: true });
  }
});
