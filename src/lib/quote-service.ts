import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { publicReference } from "@/lib/auth/tokens";
import {
  defaultValidUntil,
  documentTotals,
  isQuoteExpired,
  priceLine,
  totalsAreStorable,
} from "@/lib/pricing";
import { sendMail } from "@/lib/mail";
import {
  quotationHtml,
  quotationSubject,
  quotationText,
  type QuotationEmailInput,
} from "@/lib/emails/quotation";
import { getSiteConfig } from "@/lib/site-config";
import { appUrl } from "@/lib/env";
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

  /*
   * The same 32-bit ceiling that limits a direct purchase.
   *
   * Staff hit it differently: an enquiry for enough seats produces a draft that
   * cannot be written, and without this the drafting screen returned an
   * unexplained failure. The message names the constraint, because the person
   * reading it can act on it — splitting the enquiry into two quotations is a
   * normal thing to do and it is not obvious that it is what is needed.
   */
  if (!totalsAreStorable(totals)) {
    logger.warn("quote_above_storable_total", { enquiryReference, totalMinor: totals.totalMinor });
    return {
      ok: false,
      reason:
        "This enquiry totals more than a single quotation can hold (about ₹2.14 crore). Please split it across two quotations.",
    };
  }

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
      subtotalMinor: true,
      discountMinor: true,
      taxMinor: true,
      notes: true,
      enquiry: { select: { contactEmail: true, contactName: true, companyName: true } },
      company: { select: { name: true, gstin: true } },
      items: {
        select: {
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
    const sentAt = new Date();

    /*
     * A quotation, not a notification.
     *
     * This document is forwarded to finance teams and attached to purchase
     * orders, so it carries the letterhead, every line's unit price and GST
     * rate, a totals block that reconciles against those lines, and whatever
     * terms an administrator has written. See lib/emails/quotation.ts for why
     * none of that is invented when it is unset.
     */
    const input: QuotationEmailInput = {
      reference,
      currency: quote.currency,
      subtotalMinor: quote.subtotalMinor,
      discountMinor: quote.discountMinor,
      taxMinor: quote.taxMinor,
      totalMinor: quote.totalMinor,
      validUntil: quote.validUntil,
      sentAt,
      notes: quote.notes,
      customer: {
        name: quote.enquiry?.contactName ?? "there",
        companyName: quote.company?.name ?? quote.enquiry?.companyName ?? null,
        email: recipient,
        gstin: quote.company?.gstin ?? null,
      },
      lines: quote.items,
      acceptUrl: `${appUrl()}/account/quotes/${reference}`,
      termsUrl: `${appUrl()}/terms`,
      config,
      terms: config.quoteTerms,
    };

    void sendMail({
      to: recipient,
      subject: quotationSubject(input),
      text: quotationText(input),
      html: quotationHtml(input),
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
export type QuoteDecisionResult =
  | { ok: true; reference: string; totalMinor: number; currency: string }
  | { ok: false; reason: string };

export async function decideOnQuote(
  reference: string,
  userId: string,
  decision: QuoteDecision,
): Promise<QuoteDecisionResult> {
  const quote = await prisma.quote.findFirst({
    where: { reference, userId },
    select: { id: true, status: true, validUntil: true, totalMinor: true, currency: true },
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

  /*
   * The notification is sent by the caller, not here.
   *
   * There was one at this point: a single line of text with no value, no
   * customer and no link — enough to know something happened and not enough to
   * act on. Acceptance also raises an order, and the order reference is the
   * most useful thing the message can carry, so it belongs where that reference
   * is known. See `decideQuote` in app/account/actions.ts.
   */
  logger.info("quote_decision", { reference, decision });
  return { ok: true, reference, totalMinor: quote.totalMinor, currency: quote.currency };
}

/** Marks quotations past their validity date as expired. Safe to schedule. */
export async function expireStaleQuotes(): Promise<number> {
  const result = await prisma.quote.updateMany({
    where: { status: "SENT", validUntil: { lt: new Date() } },
    data: { status: "EXPIRED" },
  });
  return result.count;
}
