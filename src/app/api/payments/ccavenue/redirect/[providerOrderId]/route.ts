import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { getCCAvenueConfig } from "@/lib/payments/config";
import { buildCCAvenueRequest } from "@/lib/payments/ccavenue";
import { appUrl } from "@/lib/env";
import { escapeHtml } from "@/lib/mail";

/**
 * The second half of `beginCCAvenuePayment`'s `checkoutUrl`.
 *
 * `checkoutUrl` from `beginPayment` points here rather than at CCAvenue
 * directly, because CCAvenue's request can only be delivered as a browser
 * form POST — `encRequest` routinely exceeds what fits in a URL — and this is
 * what turns "the browser was sent to this URL" into that POST: a tiny page
 * whose one form submits itself on load. GET, not POST, because nothing here
 * is exempt from CSRF protection by accident — the attempt (the state change)
 * already happened in `beginPayment`; this route only ever renders the same
 * form for the same already-created attempt, so replaying it is harmless.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ providerOrderId: string }> },
) {
  const { providerOrderId } = await params;

  const config = await getCCAvenueConfig();
  if (!config) {
    logger.error("ccavenue_redirect_unconfigured", { providerOrderId });
    return new NextResponse("Card payment is not available at the moment.", { status: 503 });
  }

  const payment = await prisma.payment.findUnique({
    where: { providerOrderId },
    select: {
      provider: true,
      status: true,
      amountMinor: true,
      currency: true,
      order: { select: { reference: true, billingName: true, billingEmail: true, billingPhone: true } },
    },
  });

  if (!payment || payment.provider !== "ccavenue" || payment.status !== "CREATED") {
    // Not found, wrong gateway, or already resolved — an attempt is only ever
    // redirected to once in the normal flow, so any of these is stale or
    // guessed rather than something to explain in detail here.
    return new NextResponse("That payment attempt could not be found.", { status: 404 });
  }

  const base = appUrl();
  const { encRequest, accessCode, actionUrl } = buildCCAvenueRequest(config, {
    orderId: providerOrderId,
    amount: (payment.amountMinor / 100).toFixed(2),
    currency: payment.currency,
    redirectUrl: `${base}/api/payments/ccavenue/callback`,
    cancelUrl: `${base}/api/payments/ccavenue/callback`,
    billingName: payment.order.billingName,
    billingEmail: payment.order.billingEmail,
    billingTel: payment.order.billingPhone ?? "",
  });

  logger.info("ccavenue_redirect_rendered", { providerOrderId, reference: payment.order.reference });

  // Self-submitting rather than a clickable link: the customer already chose
  // "pay now" on the previous page, so a second click here would only be
  // friction. `noscript` covers the browsers — vanishingly few now — that
  // arrive with JavaScript off.
  const html = `<!doctype html>
<html><head><meta charset="utf-8"><title>Redirecting to CCAvenue…</title></head>
<body onload="document.forms[0].submit()">
<p>Redirecting to CCAvenue to complete your payment…</p>
<form method="post" action="${escapeHtml(actionUrl)}">
<input type="hidden" name="encRequest" value="${escapeHtml(encRequest)}">
<input type="hidden" name="access_code" value="${escapeHtml(accessCode)}">
<input type="hidden" name="command" value="initiateTransaction">
<noscript><button type="submit">Continue to payment</button></noscript>
</form>
</body></html>`;

  return new NextResponse(html, { headers: { "content-type": "text/html; charset=utf-8" } });
}
