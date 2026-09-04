import "server-only";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { orgScope, type Scoped } from "@/lib/auth/scope";
import { publicReference } from "@/lib/auth/tokens";
import { documentTotals, lineIsStorable, priceLine, totalsAreStorable } from "@/lib/pricing";
import { resolveVariantsBySku } from "@/lib/queries/catalogue";
import { isDirectlyPurchasable } from "@/lib/catalogue/audience";
import { escapeHtml, salesInbox, sendMail } from "@/lib/mail";
import { getSiteConfig } from "@/lib/site-config";
import { getBankingDetails } from "@/lib/banking-config";
import { formatMoney } from "@/lib/money";
import { notifyOrderFulfilled } from "@/lib/emails/transactional";
import { logger } from "@/lib/logger";

/**
 * Order creation and fulfilment.
 *
 * Two entry points, both of which price server-side from records the customer
 * cannot edit:
 *
 *  - `createOrderFromQuote` copies frozen quote lines, so the customer is
 *    charged exactly what was quoted.
 *  - `createDirectOrder` re-reads the catalogue from SKUs, so a "buy now"
 *    request carrying a tampered price is priced correctly regardless.
 *
 * No payment is taken here, and no card details ever reach this system. An
 * order is raised against a purchase order and invoiced, which is how B2B
 * licensing is actually bought and remains the default. Paying by card is a
 * separate, optional step performed against an order that already exists — see
 * `lib/payments/service.ts` — so the two routes share one definition of what is
 * owed rather than each computing their own.
 */

export type OrderResult =
  | { ok: true; reference: string; orderId: string }
  | { ok: false; reason: string };

export type BillingDetails = {
  name: string;
  email: string;
  phone?: string | null;
  gstin?: string | null;
  address?: string | null;
  poNumber?: string | null;
};

async function notifyOrder(
  reference: string,
  billing: BillingDetails,
  totalMinor: number,
  /*
   * True when the customer chose to pay by card and is being handed to the
   * gateway as this sends.
   *
   * The email still goes out, and still carries the transfer details, because
   * a card payment can fail or be abandoned and a customer left with an order
   * and no way to pay it is worse than a slightly redundant email. One extra
   * sentence keeps it from reading as a demand for money they have just paid.
   */
  cardPaymentPending = false,
) {
  const config = await getSiteConfig();
  const banking = getBankingDetails();

  const internal = await salesInbox();
  if (internal) {
    void sendMail({
      to: internal,
      replyTo: billing.email,
      subject: `New order ${reference} — ${billing.name}`,
      text: [
        `Order reference: ${reference}`,
        `Customer:  ${billing.name}`,
        `Email:     ${billing.email}`,
        billing.phone ? `Phone:     ${billing.phone}` : null,
        billing.gstin ? `GSTIN:     ${billing.gstin}` : null,
        billing.poNumber ? `PO number: ${billing.poNumber}` : null,
        `Total:     ${formatMoney(totalMinor)}`,
      ]
        .filter((line) => line !== null)
        .join("\n"),
    });
  }

  // Payment instructions are appended only when every bank field is
  // configured, and only into this email to the customer who placed this
  // specific order - never onto any public page or API response.
  const paymentTextLines = banking
    ? [
        "",
        "Payment against the GST invoice can be made by bank transfer to:",
        `  Account name:   ${banking.accountName}`,
        `  Bank:           ${banking.bankName}, ${banking.branch}`,
        `  Account number: ${banking.accountNumber}`,
        `  IFSC:           ${banking.ifsc}`,
        `  Account type:   ${banking.accountType}`,
        banking.upiId ? `  UPI:            ${banking.upiId}` : null,
        "Please reference your order number with the payment.",
      ].filter((line) => line !== null)
    : [];

  const paymentHtmlBlock = banking
    ? `<p>Payment against the GST invoice can be made by bank transfer:</p>
       <table style="border-collapse:collapse;font-size:14px">
         <tr><td style="padding:2px 12px 2px 0;color:#555">Account name</td><td>${escapeHtml(banking.accountName)}</td></tr>
         <tr><td style="padding:2px 12px 2px 0;color:#555">Bank</td><td>${escapeHtml(banking.bankName)}, ${escapeHtml(banking.branch)}</td></tr>
         <tr><td style="padding:2px 12px 2px 0;color:#555">Account number</td><td>${escapeHtml(banking.accountNumber)}</td></tr>
         <tr><td style="padding:2px 12px 2px 0;color:#555">IFSC</td><td>${escapeHtml(banking.ifsc)}</td></tr>
         <tr><td style="padding:2px 12px 2px 0;color:#555">Account type</td><td>${escapeHtml(banking.accountType)}</td></tr>
         ${banking.upiId ? `<tr><td style="padding:2px 12px 2px 0;color:#555">UPI</td><td>${escapeHtml(banking.upiId)}</td></tr>` : ""}
       </table>
       <p>Please reference your order number with the payment.</p>`
    : "";

  void sendMail({
    to: billing.email,
    subject: `We have received your order (${reference})`,
    text: [
      `Hello ${billing.name},`,
      "",
      `Thank you. Your order reference is ${reference}.`,
      `Order total including GST: ${formatMoney(totalMinor)}`,
      "",
      "Our team is confirming availability and will be in touch with provisioning",
      "details and a GST invoice. Please quote your reference in any follow-up.",
      ...(cardPaymentPending
        ? ["", "If you have just paid by card, please disregard the transfer details below."]
        : []),
      ...paymentTextLines,
      "",
      config.tradingName,
    ].join("\n"),
    html: [
      `<p>Hello ${escapeHtml(billing.name)},</p>`,
      `<p>Thank you. Your order reference is <strong>${escapeHtml(reference)}</strong>.</p>`,
      `<p>Order total including GST: <strong>${escapeHtml(formatMoney(totalMinor))}</strong></p>`,
      "<p>Our team is confirming availability and will be in touch with provisioning details and a GST invoice.</p>",
      cardPaymentPending
        ? "<p>If you have just paid by card, please disregard the transfer details below.</p>"
        : "",
      paymentHtmlBlock,
      `<p>${escapeHtml(config.tradingName)}</p>`,
    ].join(""),
    purpose: "transactional",
  });
}

/** Raises an order from an accepted quotation, copying its frozen line prices. */
export async function createOrderFromQuote(
  quoteReference: string,
  actor: Scoped,
  billing: BillingDetails,
): Promise<OrderResult> {
  // Scoped to the organisation: another company's quotation simply does not
  // match, and a colleague's does.
  const quote = await prisma.quote.findFirst({
    where: { reference: quoteReference, ...orgScope(actor) },
    select: {
      id: true,
      status: true,
      currency: true,
      companyId: true,
      subtotalMinor: true,
      discountMinor: true,
      taxMinor: true,
      totalMinor: true,
      orders: { select: { reference: true } },
      items: {
        select: {
          productId: true,
          variantId: true,
          productName: true,
          sku: true,
          quantity: true,
          unitPriceMinor: true,
          discountMinor: true,
          gstRatePercent: true,
          lineTotalMinor: true,
        },
      },
    },
  });

  if (!quote) return { ok: false, reason: "That quotation could not be found." };
  if (quote.status !== "ACCEPTED") {
    return { ok: false, reason: "The quotation must be accepted before an order can be raised." };
  }
  // Fast path for the common case. The authoritative guarantee is the unique
  // index on Order.quoteId, checked below, because this test on its own is a
  // check-then-act that two concurrent acceptances could both pass.
  if (quote.orders.length > 0) {
    return { ok: false, reason: "An order has already been raised against that quotation." };
  }
  if (quote.items.length === 0) {
    return { ok: false, reason: "That quotation has no line items." };
  }

  const reference = publicReference("ORD");

  let created: { id: string };
  try {
    created = await prisma.order.create({
      select: { id: true },
      data: {
        reference,
        status: "PENDING",
        userId: actor.id,
        companyId: quote.companyId ?? actor.companyId ?? null,
        quoteId: quote.id,
        currency: quote.currency,
        subtotalMinor: quote.subtotalMinor,
        discountMinor: quote.discountMinor,
        taxMinor: quote.taxMinor,
        totalMinor: quote.totalMinor,
        poNumber: billing.poNumber ?? null,
        billingGstin: billing.gstin ?? null,
        billingName: billing.name,
        billingEmail: billing.email,
        billingPhone: billing.phone ?? null,
        billingAddress: billing.address ?? null,
        items: { create: quote.items },
      },
    });
  } catch (error) {
    // P2002 is a unique constraint violation: another request won the race and
    // has already raised the order for this quotation.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      logger.warn("order_duplicate_prevented", { quoteReference });
      return { ok: false, reason: "An order has already been raised against that quotation." };
    }
    throw error;
  }

  await notifyOrder(reference, billing, quote.totalMinor);
  logger.info("order_created_from_quote", { reference, quoteReference });
  return { ok: true, reference, orderId: created.id };
}

export type DirectOrderLine = { sku: string; quantity: number };

/**
 * Raises an order directly from SKUs, for products whose purchase mode permits
 * it. Prices are read from the catalogue here; nothing about the price comes
 * from the request.
 */
export async function createDirectOrder(
  lines: DirectOrderLine[],
  billing: BillingDetails,
  context: {
    userId?: string | null;
    companyId?: string | null;
    /** Only changes the wording of the confirmation email. See notifyOrder. */
    cardPaymentPending?: boolean;
  },
): Promise<OrderResult> {
  if (lines.length === 0) return { ok: false, reason: "There is nothing to order." };

  const variants = await resolveVariantsBySku([...new Set(lines.map((line) => line.sku))]);
  const bySku = new Map(variants.map((variant) => [variant.sku, variant]));

  const resolved = lines
    .map((line) => {
      const variant = bySku.get(line.sku);
      if (!variant) return null;
      // Enquiry-only products can never be bought directly, whatever the
      // request says.
      if (variant.product.purchaseMode === "ENQUIRY") return null;

      /*
       * Nor can a price somebody has to be entitled to.
       *
       * Academic and non-profit rates are a fraction of the commercial one —
       * an eighth, in places — and this site has no way to establish that a
       * buyer qualifies. Selling one to a buyer who does not is a licence the
       * publisher will not honour and a refund this business funds. They stay
       * visible and enquirable; they are not checkout lines.
       */
      if (!isDirectlyPurchasable(variant.audience)) return null;

      const unitPriceMinor =
        variant.salePriceMinor != null &&
        variant.salePriceMinor > 0 &&
        variant.salePriceMinor < variant.listPriceMinor
          ? variant.salePriceMinor
          : variant.listPriceMinor;

      // A zero-priced SKU is quote-only in practice and must not become a
      // free order.
      if (unitPriceMinor <= 0) return null;

      const priced = priceLine({
        unitPriceMinor,
        quantity: line.quantity,
        gstRatePercent: variant.gstRatePercent,
      });

      return {
        priced,
        data: {
          productId: variant.product.id,
          variantId: variant.id,
          productName: `${variant.product.name} — ${variant.name}`,
          sku: variant.sku,
          quantity: priced.quantity,
          unitPriceMinor: priced.unitPriceMinor,
          discountMinor: priced.discountMinor,
          gstRatePercent: priced.gstRatePercent,
          lineTotalMinor: priced.lineTotalMinor,
        },
      };
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null);

  if (resolved.length === 0) {
    return {
      ok: false,
      reason:
        "None of these products can be ordered directly. Please request a quotation instead.",
    };
  }

  const totals = documentTotals(resolved.map((entry) => entry.priced));

  /*
   * An order too large to store.
   *
   * Every money column is a 32-bit integer, so a total above about ₹2.14 crore
   * cannot be written — and until this check existed the attempt reached the
   * database and came back as an unexplained 500 with the customer staring at
   * "Something went wrong". Eight seats of the most expensive licence in the
   * catalogue was enough.
   *
   * The message sends them to the quotation route, which is where an order of
   * that size belongs anyway: it needs negotiated pricing, a named account
   * manager and a purchase order, none of which a self-service form provides.
   * That makes this a limit worth stating plainly rather than one to apologise
   * for.
   */
  if (!totalsAreStorable(totals) || !resolved.every((entry) => lineIsStorable(entry.priced))) {
    logger.info("order_above_direct_purchase_limit", { totalMinor: totals.totalMinor });
    return {
      ok: false,
      reason:
        "An order this large needs a quotation rather than a direct purchase. Please request one and our team will price it for you.",
    };
  }

  const reference = publicReference("ORD");

  const created = await prisma.order.create({
    select: { id: true },
    data: {
      reference,
      status: "PENDING",
      userId: context.userId ?? null,
      companyId: context.companyId ?? null,
      currency: "INR",
      subtotalMinor: totals.subtotalMinor,
      discountMinor: totals.discountMinor,
      taxMinor: totals.taxMinor,
      totalMinor: totals.totalMinor,
      poNumber: billing.poNumber ?? null,
      billingGstin: billing.gstin ?? null,
      billingName: billing.name,
      billingEmail: billing.email,
      billingPhone: billing.phone ?? null,
      billingAddress: billing.address ?? null,
      items: { create: resolved.map((entry) => entry.data) },
    },
  });

  await notifyOrder(reference, billing, totals.totalMinor, context.cardPaymentPending ?? false);
  logger.info("order_created_direct", { reference, lineCount: resolved.length });
  return { ok: true, reference, orderId: created.id };
}

/**
 * Marks an order fulfilled and materialises a licence record per line, plus a
 * renewal reminder for subscription terms. This is what populates the
 * customer's licence and renewal views.
 */
export async function fulfilOrder(reference: string, actorId: string): Promise<OrderResult> {
  const order = await prisma.order.findUnique({
    where: { reference },
    select: {
      id: true,
      status: true,
      userId: true,
      companyId: true,
      // Needed to tell the customer their licences are ready.
      billingName: true,
      billingEmail: true,
      items: {
        select: {
          productId: true,
          variantId: true,
          productName: true,
          sku: true,
          quantity: true,
          variant: { select: { termMonths: true, seats: true } },
        },
      },
    },
  });

  if (!order) return { ok: false, reason: "That order no longer exists." };
  if (order.status === "FULFILLED") {
    return { ok: false, reason: "That order is already fulfilled." };
  }
  if (order.status === "CANCELLED" || order.status === "REFUNDED") {
    return { ok: false, reason: "A cancelled or refunded order cannot be fulfilled." };
  }

  const startsAt = new Date();
  const issued: Array<{ reference: string; productName: string; seats: number; expiresAt: Date | null }> = [];

  await prisma.$transaction(async (tx) => {
    for (const item of order.items) {
      const termMonths = item.variant?.termMonths ?? null;
      const expiresAt = termMonths
        ? new Date(
            Date.UTC(
              startsAt.getUTCFullYear(),
              startsAt.getUTCMonth() + termMonths,
              startsAt.getUTCDate(),
            ),
          )
        : null;

      const seats = item.quantity * (item.variant?.seats ?? 1);

      const licenceReference = publicReference("LIC");
      const licence = await tx.licence.create({
        data: {
          reference: licenceReference,
          status: "ACTIVE",
          userId: order.userId,
          companyId: order.companyId,
          orderId: order.id,
          productId: item.productId,
          variantId: item.variantId,
          productName: item.productName,
          sku: item.sku,
          seats,
          startsAt,
          expiresAt,
        },
        select: { id: true },
      });

      issued.push({ reference: licenceReference, productName: item.productName, seats, expiresAt });

      // Perpetual licences never expire, so they get no renewal row.
      if (expiresAt) {
        await tx.renewal.create({
          data: {
            reference: publicReference("REN"),
            licenceId: licence.id,
            status: "UPCOMING",
            dueAt: expiresAt,
            seats,
          },
        });
      }
    }

    await tx.order.update({
      where: { id: order.id },
      data: { status: "FULFILLED", fulfilledAt: new Date() },
    });
  });

  /*
   * The message the customer has actually been waiting for.
   *
   * Fulfilment was silent: licences were created, renewals scheduled, the order
   * marked done — and the person who paid for it was told none of it. They
   * could find it by signing in and looking, which is not the same as being
   * told, and is not what anyone does after buying something.
   *
   * Sent after the transaction commits, never inside it. A mail server that is
   * slow or unreachable must not hold a database transaction open, and the
   * licences exist whether or not the email leaves.
   */
  await notifyOrderFulfilled({
    reference,
    billingName: order.billingName,
    billingEmail: order.billingEmail,
    licences: issued,
  });

  logger.info("order_fulfilled", { reference, lineCount: order.items.length, actorId });
  return { ok: true, reference, orderId: order.id };
}
