import "server-only";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { formatMoney } from "@/lib/money";
import { escapeHtml, salesInbox, sendMail } from "@/lib/mail";
import { getSiteConfig } from "@/lib/site-config";
import { getPaymentConfig } from "@/lib/payments/config";
import { createRazorpayOrder } from "@/lib/payments/razorpay";

/**
 * Taking a card payment for an order.
 *
 * The purchase-order route is unchanged and remains the default: an order is
 * raised, an invoice follows, and the money arrives by transfer. Paying by card
 * is an additional route offered on the same order, and this module is the
 * whole of it.
 *
 * Two rules run through everything here.
 *
 * **The amount is never taken from a request.** It is read from the order row
 * when the attempt is created, and every later message about that attempt —
 * from the customer's browser or from the gateway's webhook — is checked
 * against the amount already stored. A request that says a ₹90,000 order was
 * paid for ₹1 is refused rather than reconciled.
 *
 * **Recording a capture is idempotent.** Razorpay reports a successful payment
 * twice by design: once to the browser and once to the webhook, in no
 * guaranteed order, and either can be lost or replayed. So capture is a
 * conditional update on `capturedAt IS NULL`, and the second report is a no-op
 * that returns success rather than a duplicate or an error.
 */

export type BeginPaymentResult =
  | {
      ok: true;
      keyId: string;
      providerOrderId: string;
      amountMinor: number;
      currency: string;
      mode: "TEST" | "LIVE";
      prefill: { name: string; email: string; contact: string };
    }
  | { ok: false; reason: string };

/**
 * Creates a gateway order for an order already stored here.
 *
 * Called with an order id the caller has already established the requester is
 * entitled to act on. It performs no authorisation of its own — that belongs at
 * the route, where the session is.
 */
export async function beginPayment(orderId: string): Promise<BeginPaymentResult> {
  const config = await getPaymentConfig();
  if (!config) return { ok: false, reason: "Card payment is not available at the moment." };

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      reference: true,
      status: true,
      currency: true,
      totalMinor: true,
      billingName: true,
      billingEmail: true,
      billingPhone: true,
      payments: { select: { id: true, status: true } },
    },
  });

  if (!order) return { ok: false, reason: "That order could not be found." };

  /*
   * Only an order that is still waiting can be paid.
   *
   * A cancelled or refunded order accepting a payment is the worst version of
   * this bug — money taken for something nobody will deliver — so the allowed
   * states are listed rather than the forbidden ones. A state added later is
   * then unpayable until somebody decides otherwise, which is the safe default.
   */
  if (order.status !== "PENDING") {
    return { ok: false, reason: "That order is no longer awaiting payment." };
  }

  if (order.payments.some((payment) => payment.status === "CAPTURED")) {
    return { ok: false, reason: "That order has already been paid." };
  }

  if (order.totalMinor <= 0) {
    return { ok: false, reason: "That order has no amount to pay." };
  }

  const created = await createRazorpayOrder(config, {
    amountMinor: order.totalMinor,
    currency: order.currency,
    receipt: order.reference,
    // Visible in the Razorpay dashboard, which is where somebody stands when
    // they are trying to match a payment to an order.
    notes: { order_reference: order.reference },
  });

  if (!created.ok) return { ok: false, reason: created.reason };

  await prisma.payment.create({
    data: {
      orderId: order.id,
      provider: "razorpay",
      providerOrderId: created.order.id,
      status: "CREATED",
      amountMinor: order.totalMinor,
      currency: order.currency,
      mode: config.mode,
    },
  });

  logger.info("payment_started", {
    reference: order.reference,
    providerOrderId: created.order.id,
    mode: config.mode,
  });

  return {
    ok: true,
    keyId: config.keyId,
    providerOrderId: created.order.id,
    amountMinor: order.totalMinor,
    currency: order.currency,
    mode: config.mode,
    prefill: {
      name: order.billingName,
      email: order.billingEmail,
      contact: order.billingPhone ?? "",
    },
  };
}

export type CaptureResult =
  | { ok: true; reference: string; alreadyRecorded: boolean }
  | { ok: false; reason: string };

/**
 * Records a captured payment.
 *
 * `source` is only for the log — a capture arriving by webhook and one arriving
 * from the browser are treated identically, because both have been proved
 * genuine by an HMAC before reaching here. Which arrived first is a useful
 * thing to be able to read afterwards and nothing more.
 */
export async function recordCapture(input: {
  providerOrderId: string;
  providerPaymentId: string;
  /** What the gateway says it took, when it says. Checked, never trusted. */
  reportedAmountMinor?: number | null;
  method?: string | null;
  source: "checkout" | "webhook";
}): Promise<CaptureResult> {
  const payment = await prisma.payment.findUnique({
    where: { providerOrderId: input.providerOrderId },
    select: {
      id: true,
      status: true,
      amountMinor: true,
      capturedAt: true,
      providerPaymentId: true,
      order: { select: { id: true, reference: true, status: true, billingName: true, billingEmail: true } },
    },
  });

  if (!payment) {
    /*
     * A signature that verified against our key secret, for a gateway order we
     * have no record of.
     *
     * Not an attack — the signature could not have been forged — but a genuine
     * inconsistency: most likely a payment made against a different deployment
     * sharing these keys, or a row lost. Either way a customer may have been
     * charged for something this system will not fulfil, so it is logged at
     * error rather than swallowed.
     */
    logger.error("payment_capture_unknown_order", {
      providerOrderId: input.providerOrderId,
      source: input.source,
    });
    return { ok: false, reason: "That payment does not match an order here." };
  }

  /*
   * The amount check.
   *
   * `payment.amountMinor` was copied from the order before the customer saw a
   * payment form. If the gateway reports capturing something else, the two
   * disagree about what was owed and no automated resolution is correct: mark
   * it nothing, confirm nothing, and make it loud. Silently accepting the
   * smaller figure is how an order ships for a fraction of its price.
   */
  if (
    typeof input.reportedAmountMinor === "number" &&
    input.reportedAmountMinor !== payment.amountMinor
  ) {
    logger.error("payment_amount_mismatch", {
      reference: payment.order.reference,
      expected: payment.amountMinor,
      reported: input.reportedAmountMinor,
      source: input.source,
    });
    return { ok: false, reason: "The amount paid does not match the order." };
  }

  /*
   * The idempotent write.
   *
   * `updateMany` with `capturedAt: null` in the filter makes this a compare-
   * and-set in the database rather than a check followed by a write. Two
   * reports arriving at once — the browser callback and the webhook, which is
   * the normal case, not an edge case — leave exactly one of them updating a
   * row.
   */
  const captured = await prisma.payment.updateMany({
    where: { id: payment.id, capturedAt: null },
    data: {
      status: "CAPTURED",
      providerPaymentId: input.providerPaymentId,
      method: input.method ?? null,
      failureReason: null,
      capturedAt: new Date(),
    },
  });

  if (captured.count === 0) {
    logger.info("payment_capture_duplicate", {
      reference: payment.order.reference,
      source: input.source,
    });
    return { ok: true, reference: payment.order.reference, alreadyRecorded: true };
  }

  /*
   * Move the order on, but only from PENDING.
   *
   * An administrator may have advanced it in the meantime — a payment that
   * arrives while the order is already being provisioned must not drag it
   * backwards to CONFIRMED.
   */
  await prisma.order.updateMany({
    where: { id: payment.order.id, status: "PENDING" },
    data: { status: "CONFIRMED" },
  });

  logger.info("payment_captured", {
    reference: payment.order.reference,
    providerPaymentId: input.providerPaymentId,
    amountMinor: payment.amountMinor,
    source: input.source,
  });

  await notifyPaid(payment.order.reference, payment.order.billingName, payment.order.billingEmail, payment.amountMinor);

  return { ok: true, reference: payment.order.reference, alreadyRecorded: false };
}

/**
 * Records a failed or abandoned attempt.
 *
 * Never touches the order. A failed payment leaves it PENDING and payable — by
 * card again, or against a purchase order — which is the whole reason attempts
 * are separate rows.
 */
export async function recordFailure(input: {
  providerOrderId: string;
  providerPaymentId?: string | null;
  reason?: string | null;
}): Promise<void> {
  const updated = await prisma.payment.updateMany({
    // Not a captured one. A `payment.failed` webhook arriving after a capture —
    // out of order, or for a retried attempt — must not undo it.
    where: { providerOrderId: input.providerOrderId, capturedAt: null },
    data: {
      status: "FAILED",
      providerPaymentId: input.providerPaymentId ?? undefined,
      failureReason: (input.reason ?? "").slice(0, 300) || null,
    },
  });

  if (updated.count > 0) {
    logger.info("payment_failed", {
      providerOrderId: input.providerOrderId,
      reason: input.reason ?? "",
    });
  }
}

/**
 * What the confirmation page is allowed to say about an order.
 *
 * "unknown" is the default and means the page says nothing specific, which is
 * how that page has always behaved: it echoes the reference and no more, so a
 * guessed or altered reference in the URL discloses nothing about anyone's
 * order.
 *
 * Two narrow cases earn a real answer, and the trade-off in each is worth
 * stating rather than burying.
 *
 *  - The order belongs to the signed-in visitor. No disclosure at all; they can
 *    already see it under their account.
 *
 *  - It was paid within the last few minutes. This is the anonymous customer
 *    who has just handed over money and deserves to be told it arrived. It does
 *    concede one bit — whether a reference was paid — to somebody who has
 *    already guessed a valid reference out of a billion, and only during the
 *    minutes after that particular order was paid. Set against telling a
 *    customer who has just paid ₹90,000 nothing at all, that is the right way
 *    round.
 */
const RECENT_CAPTURE_MS = 15 * 60 * 1000;

export type ConfirmationOutcome = "paid" | "awaiting_payment" | "unknown";

export async function confirmationOutcome(
  reference: string,
  viewerId: string | null,
): Promise<ConfirmationOutcome> {
  const order = await prisma.order.findUnique({
    where: { reference },
    select: {
      userId: true,
      payments: {
        where: { status: "CAPTURED" },
        select: { capturedAt: true },
        orderBy: { capturedAt: "desc" },
        take: 1,
      },
    },
  });

  if (!order) return "unknown";

  const captured = order.payments[0]?.capturedAt ?? null;
  const owned = viewerId !== null && order.userId === viewerId;
  const recent = captured !== null && Date.now() - captured.getTime() < RECENT_CAPTURE_MS;

  if (!owned && !recent) return "unknown";
  return captured ? "paid" : "awaiting_payment";
}

/** Confirmation that the money arrived — to the customer, and to sales. */
async function notifyPaid(
  reference: string,
  name: string,
  email: string,
  amountMinor: number,
): Promise<void> {
  const config = await getSiteConfig();
  const amount = formatMoney(amountMinor);

  void sendMail({
    to: email,
    subject: `Payment received for order ${reference}`,
    text: [
      `Hello ${name},`,
      "",
      `We have received your payment of ${amount} for order ${reference}.`,
      "",
      "Your order is confirmed. We are provisioning it now and will send the",
      "licence details and your GST invoice shortly.",
      "",
      config.tradingName,
    ].join("\n"),
    html: [
      `<p>Hello ${escapeHtml(name)},</p>`,
      `<p>We have received your payment of <strong>${escapeHtml(amount)}</strong> for order <strong>${escapeHtml(reference)}</strong>.</p>`,
      "<p>Your order is confirmed. We are provisioning it now and will send the licence details and your GST invoice shortly.</p>",
      `<p>${escapeHtml(config.tradingName)}</p>`,
    ].join(""),
  });

  const internal = await salesInbox();
  if (internal) {
    void sendMail({
      to: internal,
      subject: `Payment received — ${reference} — ${amount}`,
      text: [`Order:    ${reference}`, `Customer: ${name} <${email}>`, `Amount:   ${amount}`].join("\n"),
    });
  }
}
