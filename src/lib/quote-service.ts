import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { publicReference } from "@/lib/auth/tokens";
import { defaultValidUntil, documentTotals, isQuoteExpired, priceLine } from "@/lib/pricing";
import { escapeHtml, salesInbox, sendMail } from "@/lib/mail";
import { getSiteConfig } from "@/lib/site-config";
import { appUrl } from "@/lib/env";
import { formatMoney } from "@/lib/money";
import { logger } from "@/lib/logger";

/**
 * Quotation workflow.
 *
 * Prices are read from the catalogue at the moment the quotation is drafted and
 * then frozen onto the quote lines. A later catalogue change therefore cannot
 * alter a quotation that has already been sent, which is what makes a stated
 * validity period meaningful.
 */

export type QuoteResult =
  | { ok: true; reference: string }
  | { ok: false; reason: string };

/** Drafts a quotation from an enquiry, pricing every line from the catalogue. */
export async function createQuoteFromEnquiry(
  enquiryReference: string,
  actorId: string,
): Promise<QuoteResult> {
  const enquiry = await prisma.enquiry.findUnique({
    where: { reference: enquiryReference },
    select: {
      id: true,
      userId: true,
      companyId: true,
      items: {
        select: {
          productId: true,
          variantId: true,
          productName: true,
          sku: true,
          quantity: true,
        },
      },
    },
  });

  if (!enquiry) return { ok: false, reason: "That enquiry no longer exists." };
  if (enquiry.items.length === 0) {
    return { ok: false, reason: "That enquiry has no line items to quote." };
  }

  // Re-read current pricing rather than trusting anything captured earlier.
  const variantIds = enquiry.items
    .map((item) => item.variantId)
    .filter((id): id is string => id !== null);

  const variants = await prisma.productVariant.findMany({
    where: { id: { in: variantIds } },
    select: {
      id: true,
      listPriceMinor: true,
      salePriceMinor: true,
      gstRatePercent: true,
      currency: true,
    },
  });
  const variantById = new Map(variants.map((variant) => [variant.id, variant]));

  const priced = enquiry.items.map((item) => {
    const variant = item.variantId ? variantById.get(item.variantId) : undefined;
    const unitPriceMinor =
      variant == null
        ? 0
        : variant.salePriceMinor != null &&
            variant.salePriceMinor > 0 &&
            variant.salePriceMinor < variant.listPriceMinor
          ? variant.salePriceMinor
          : variant.listPriceMinor;

    const line = priceLine({
      unitPriceMinor,
      quantity: item.quantity,
      gstRatePercent: variant?.gstRatePercent ?? 18,
    });

    return { item, line };
  });

  const totals = documentTotals(priced.map((entry) => entry.line));
  const reference = publicReference("QTE");

  await prisma.quote.create({
    data: {
      reference,
      status: "DRAFT",
      enquiryId: enquiry.id,
      userId: enquiry.userId,
      companyId: enquiry.companyId,
      currency: "INR",
      subtotalMinor: totals.subtotalMinor,
      discountMinor: totals.discountMinor,
      taxMinor: totals.taxMinor,
      totalMinor: totals.totalMinor,
      validUntil: defaultValidUntil(),
      items: {
        create: priced.map(({ item, line }) => ({
          productId: item.productId,
          variantId: item.variantId,
          productName: item.productName,
          sku: item.sku,
          quantity: line.quantity,
          unitPriceMinor: line.unitPriceMinor,
          discountMinor: line.discountMinor,
          gstRatePercent: line.gstRatePercent,
          lineTotalMinor: line.lineTotalMinor,
        })),
      },
    },
  });

  await prisma.enquiry.update({
    where: { id: enquiry.id },
    data: { status: "QUOTED" },
  });

  logger.info("quote_drafted", {
    reference,
    enquiryReference,
    lineCount: priced.length,
    actorId,
  });

  return { ok: true, reference };
}

/**
 * Recomputes and persists a quotation's totals from its current lines.
 * Called after any line edit so the header can never disagree with the detail.
 */
export async function recalculateQuote(
  quoteId: string,
  tx: Prisma.TransactionClient = prisma,
): Promise<void> {
  const items = await tx.quoteItem.findMany({
    where: { quoteId },
    select: {
      unitPriceMinor: true,
      quantity: true,
      discountMinor: true,
      gstRatePercent: true,
    },
  });

  const totals = documentTotals(items.map((item) => priceLine(item)));

  await tx.quote.update({
    where: { id: quoteId },
    data: {
      subtotalMinor: totals.subtotalMinor,
      discountMinor: totals.discountMinor,
      taxMinor: totals.taxMinor,
      totalMinor: totals.totalMinor,
    },
  });
}

/** Moves a draft to SENT and notifies the customer. */
export async function sendQuote(reference: string, actorId: string): Promise<QuoteResult> {
  const quote = await prisma.quote.findUnique({
    where: { reference },
    select: {
      id: true,
      status: true,
      totalMinor: true,
      currency: true,
      validUntil: true,
      enquiry: { select: { contactEmail: true, contactName: true, companyName: true } },
      items: { select: { productName: true, sku: true, quantity: true, lineTotalMinor: true } },
    },
  });

  if (!quote) return { ok: false, reason: "That quotation no longer exists." };
  if (quote.status !== "DRAFT") {
    return { ok: false, reason: "Only a draft quotation can be sent." };
  }
  if (quote.items.length === 0) {
    return { ok: false, reason: "A quotation cannot be sent with no line items." };
  }

  await prisma.quote.update({
    where: { id: quote.id },
    data: { status: "SENT", sentAt: new Date() },
  });

  const recipient = quote.enquiry?.contactEmail;
  if (recipient) {
    const config = await getSiteConfig();
    const lines = quote.items
      .map(
        (item) =>
          `  • ${item.productName} (${item.sku}) x${item.quantity} — ${formatMoney(item.lineTotalMinor, quote.currency)}`,
      )
      .join("\n");

    void sendMail({
      to: recipient,
      subject: `Your quotation ${reference}`,
      text: [
        `Hello ${quote.enquiry?.contactName ?? "there"},`,
        "",
        `Your quotation ${reference} is ready.`,
        "",
        lines,
        "",
        `Total including GST: ${formatMoney(quote.totalMinor, quote.currency)}`,
        quote.validUntil ? `Valid until: ${quote.validUntil.toDateString()}` : "",
        "",
        `You can review and accept it here: ${appUrl()}/account/quotes/${reference}`,
        "",
        config.tradingName,
      ]
        .filter(Boolean)
        .join("\n"),
      html: [
        `<p>Hello ${escapeHtml(quote.enquiry?.contactName ?? "there")},</p>`,
        `<p>Your quotation <strong>${escapeHtml(reference)}</strong> is ready.</p>`,
        "<ul>",
        ...quote.items.map(
          (item) =>
            `<li>${escapeHtml(item.productName)} (${escapeHtml(item.sku)}) &times;${item.quantity} — ${escapeHtml(formatMoney(item.lineTotalMinor, quote.currency))}</li>`,
        ),
        "</ul>",
        `<p><strong>Total including GST: ${escapeHtml(formatMoney(quote.totalMinor, quote.currency))}</strong></p>`,
        `<p><a href="${escapeHtml(`${appUrl()}/account/quotes/${reference}`)}">Review and accept your quotation</a></p>`,
        `<p>${escapeHtml(config.tradingName)}</p>`,
      ].join(""),
    });
  }

  logger.info("quote_sent", { reference, actorId });
  return { ok: true, reference };
}

export type QuoteDecision = "ACCEPTED" | "DECLINED";

/**
 * Records a customer's decision on a quotation.
 *
 * The lookup is scoped by userId, so a reference belonging to another
 * organisation simply does not match. Status and expiry are re-checked here
 * rather than relying on the button the customer happened to be shown.
 */
export async function decideOnQuote(
  reference: string,
  userId: string,
  decision: QuoteDecision,
): Promise<QuoteResult> {
  const quote = await prisma.quote.findFirst({
    where: { reference, userId },
    select: { id: true, status: true, validUntil: true },
  });

  if (!quote) return { ok: false, reason: "That quotation could not be found." };

  if (quote.status !== "SENT") {
    return {
      ok: false,
      reason:
        quote.status === "DRAFT"
          ? "That quotation has not been issued yet."
          : "That quotation has already been responded to.",
    };
  }

  if (isQuoteExpired(quote.validUntil)) {
    await prisma.quote.update({ where: { id: quote.id }, data: { status: "EXPIRED" } });
    return {
      ok: false,
      reason: "That quotation has expired. Please request a new one and we will re-price it.",
    };
  }

  await prisma.quote.update({ where: { id: quote.id }, data: { status: decision } });

  const internal = salesInbox();
  if (internal) {
    void sendMail({
      to: internal,
      subject: `Quotation ${reference} ${decision.toLowerCase()}`,
      text: `Quotation ${reference} was ${decision.toLowerCase()} by the customer.`,
    });
  }

  logger.info("quote_decision", { reference, decision });
  return { ok: true, reference };
}

/** Marks quotations past their validity date as expired. Safe to schedule. */
export async function expireStaleQuotes(): Promise<number> {
  const result = await prisma.quote.updateMany({
    where: { status: "SENT", validUntil: { lt: new Date() } },
    data: { status: "EXPIRED" },
  });
  return result.count;
}
