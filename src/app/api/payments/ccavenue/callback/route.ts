import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { getCCAvenueConfig } from "@/lib/payments/config";
import { decryptCCAvenueResponse } from "@/lib/payments/ccavenue";
import { recordCapture, recordFailure } from "@/lib/payments/service";
import { appUrl } from "@/lib/env";

/**
 * CCAvenue's own report of what happened — both the browser's return and the
 * only asynchronous confirmation this gateway offers, because CCAvenue posts
 * to one URL for both. There is no separate webhook to subscribe to the way
 * Stripe has one.
 *
 * The trust model is different from Stripe's HMAC-signed webhook, and worth
 * being explicit about: there is no signature here, only the fact that the
 * body decrypts at all. See the long comment in `lib/payments/ccavenue` for
 * why that is CCAvenue's own documented design rather than a shortcut, and why
 * `recordCapture`'s independent amount check (identical to the one Stripe's
 * path goes through) is what keeps a decrypted-but-wrong claim from being
 * believed regardless.
 *
 * Configure this URL in the CCAvenue dashboard, or simply rely on the
 * `redirect_url`/`cancel_url` this deployment already sends with every
 * request — CCAvenue posts back to whichever one applies, and both point
 * here, since which happened is exactly what `order_status` in the decrypted
 * body says.
 */
export async function POST(request: Request) {
  const raw = await request.text();
  const params = new URLSearchParams(raw);
  const encResponse = params.get("encResp");

  const config = await getCCAvenueConfig();
  if (!config || !encResponse) {
    logger.error("ccavenue_callback_unconfigured", { hasBody: Boolean(encResponse) });
    return new NextResponse("Card payment is not available at the moment.", { status: 503 });
  }

  const result = decryptCCAvenueResponse(encResponse, config.workingKey);
  if (!result) {
    // Could not have come from CCAvenue with this working key. Nothing to
    // redirect to — there is no order reference this can be trusted to name —
    // so this is where it ends, as a plain response rather than a redirect
    // that would send someone's browser wherever a forged order_id said to.
    logger.error("ccavenue_callback_undecryptable", {});
    return new NextResponse("That response could not be verified.", { status: 400 });
  }

  const payment = await prisma.payment.findUnique({
    where: { providerOrderId: result.orderId },
    select: { order: { select: { reference: true } } },
  });

  if (!payment) {
    logger.error("ccavenue_callback_unknown_order", { providerOrderId: result.orderId });
    return new NextResponse("That payment does not match an order here.", { status: 404 });
  }

  const reference = payment.order.reference;
  const returnUrl = `${appUrl()}/account/orders/${reference}`;

  /*
   * CCAvenue's amount is decimal rupees, e.g. "1234.50" — converted to minor
   * units the same way it was sent, so `recordCapture`'s own comparison is
   * exact rather than off by floating-point rounding.
   */
  const reportedAmountMinor = Math.round(Number.parseFloat(result.amount) * 100);

  if (result.orderStatus === "Success") {
    const captured = await recordCapture({
      providerOrderId: result.orderId,
      providerPaymentId: result.trackingId,
      reportedAmountMinor: Number.isFinite(reportedAmountMinor) ? reportedAmountMinor : null,
      method: result.paymentMode,
      source: "webhook",
    });
    if (!captured.ok) {
      logger.error("ccavenue_capture_rejected", { providerOrderId: result.orderId, reason: captured.reason });
    }
  } else {
    await recordFailure({
      providerOrderId: result.orderId,
      providerPaymentId: result.trackingId,
      reason: result.orderStatus,
    });
  }

  return NextResponse.redirect(returnUrl, { status: 303 });
}
