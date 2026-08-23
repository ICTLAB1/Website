import "server-only";

import { prisma } from "@/lib/db";
import { orgScope, type Scoped } from "@/lib/auth/scope";
import { logger } from "@/lib/logger";

/**
 * Revising a quotation, and talking about one.
 *
 * ## Why a revision is a new row
 *
 * The figures on a sent quotation went to somebody who may have forwarded them
 * to their finance team, attached them to a purchase order, or read them out in
 * a meeting. Editing that row in place answers "what does this quotation say"
 * and destroys the only question that matters when something goes wrong: what
 * did we quote, and when. So version 2 is a copy — new reference, new row, same
 * family — and version 1 is marked superseded and never touched again.
 *
 * ## What carries over
 *
 * Everything except the state: the lines, the customer, the enquiry it came
 * from, the currency. Not the status (a revision starts as a draft, because it
 * has not been sent), not the sent date, and not the acceptance. A version 2
 * that inherited version 1's acceptance would be an order nobody agreed to.
 */

export type RevisionResult =
  | { ok: true; reference: string; version: number }
  | { ok: false; reason: string };

/** The suffix a revised quotation's reference carries: QTE-2026-ABC123-2. */
function revisedReference(rootReference: string, version: number): string {
  const base = rootReference.replace(/-\d+$/, "");
  return `${base}-${version}`;
}

/**
 * Creates the next version of a quotation.
 *
 * The source may be any version in the family; the new one always follows the
 * highest. Revising an old version twice therefore cannot produce two things
 * both calling themselves version 3.
 */
export async function reviseQuote(
  reference: string,
  actorId: string,
  note: string | null,
): Promise<RevisionResult> {
  const source = await prisma.quote.findUnique({
    where: { reference },
    select: {
      id: true,
      rootId: true,
      status: true,
      enquiryId: true,
      userId: true,
      companyId: true,
      currency: true,
      subtotalMinor: true,
      discountMinor: true,
      taxMinor: true,
      totalMinor: true,
      validUntil: true,
      notes: true,
      paymentTerms: true,
      ownerId: true,
      documentNo: true,
      customerReference: true,
      root: { select: { reference: true } },
      /*
       * Every printed column, not just the priced ones.
       *
       * A revision that dropped the HSN codes and units would produce a
       * document that looked materially different from the one it replaced, on
       * the fields a customer's accounts department reads most closely.
       */
      items: {
        select: {
          productId: true,
          variantId: true,
          productName: true,
          description: true,
          brandName: true,
          sku: true,
          hsnCode: true,
          unitLabel: true,
          quantity: true,
          unitPriceMinor: true,
          discountMinor: true,
          gstRatePercent: true,
          lineTotalMinor: true,
        },
      },
    },
  });

  if (!source) return { ok: false, reason: "That quotation no longer exists." };
  if (source.items.length === 0) {
    return { ok: false, reason: "A quotation with no line items cannot be revised." };
  }

  /*
   * An accepted quotation is not revised — it is fulfilled.
   *
   * Once somebody has accepted, the agreement is the accepted document. A
   * revision at that point is a new negotiation and belongs to a new quotation
   * against the same requirement, which anybody may raise.
   */
  if (source.status === "ACCEPTED") {
    return {
      ok: false,
      reason: "That quotation has been accepted. Raise a new one against the requirement instead.",
    };
  }

  const rootId = source.rootId ?? source.id;
  const rootReference = source.root?.reference ?? reference;

  const latest = await prisma.quote.aggregate({
    where: { OR: [{ rootId }, { id: rootId }] },
    _max: { version: true },
  });
  const version = (latest._max.version ?? 1) + 1;

  const created = await prisma.quote.create({
    select: { reference: true, version: true },
    data: {
      reference: revisedReference(rootReference, version),
      status: "DRAFT",
      version,
      rootId,
      revisionNote: note?.trim() || null,
      enquiryId: source.enquiryId,
      userId: source.userId,
      companyId: source.companyId,
      currency: source.currency,
      subtotalMinor: source.subtotalMinor,
      discountMinor: source.discountMinor,
      taxMinor: source.taxMinor,
      totalMinor: source.totalMinor,
      validUntil: source.validUntil,
      notes: source.notes,
      // The commercial terms and the person answerable carry over; a revision
      // is the same conversation, not a fresh one.
      paymentTerms: source.paymentTerms,
      ownerId: source.ownerId,
      /*
       * The document number carries over too, and the version distinguishes
       * them. That is how a purchasing office expects it: one quotation number
       * with revisions against it, not three unrelated numbers they have to
       * work out are the same negotiation. Allocating a fresh number per
       * revision would also burn the series three times as fast.
       */
      documentNo: source.documentNo,
      customerReference: source.customerReference,
      items: { create: source.items },
    },
  });

  /*
   * Every earlier version is marked superseded, not just the one revised from.
   *
   * Revising version 1 while version 2 exists would otherwise leave two live
   * quotations for one requirement, and a customer holding whichever arrived
   * first.
   */
  await prisma.quote.updateMany({
    where: {
      OR: [{ rootId }, { id: rootId }],
      version: { lt: version },
      status: { notIn: ["ACCEPTED", "SUPERSEDED"] },
    },
    data: { status: "SUPERSEDED", supersededAt: new Date() },
  });

  logger.info("quote_revised", { from: reference, to: created.reference, version, actorId });
  return { ok: true, reference: created.reference, version: created.version };
}

/** Every version of one quotation, newest first. */
export async function quoteVersions(rootId: string) {
  return prisma.quote.findMany({
    where: { OR: [{ rootId }, { id: rootId }] },
    orderBy: { version: "desc" },
    select: {
      reference: true,
      version: true,
      status: true,
      totalMinor: true,
      currency: true,
      revisionNote: true,
      sentAt: true,
      supersededAt: true,
      createdAt: true,
    },
  });
}

export type MessageResult = { ok: true } | { ok: false; reason: string };

/**
 * Records a customer's question or revision request against a quotation.
 *
 * Scoped to the organisation in the lookup, like every other customer read: a
 * reference belonging to somebody else matches nothing rather than matching and
 * being refused.
 *
 * A revision request does not change the quotation. Somebody here reads it and
 * decides — the alternative, a customer's message silently invalidating a
 * document their finance team is holding, is worse for everybody.
 */
export async function addQuoteMessage(
  reference: string,
  actor: Scoped & { staff?: boolean },
  input: { kind: "QUESTION" | "REVISION_REQUEST" | "REPLY"; body: string },
): Promise<MessageResult> {
  const body = input.body.trim();
  if (body.length < 2) return { ok: false, reason: "Write your message first." };
  if (body.length > 4000) return { ok: false, reason: "That message is too long." };

  const quote = await prisma.quote.findFirst({
    where: actor.staff
      ? { reference }
      : { reference, status: { not: "DRAFT" }, ...orgScope(actor) },
    select: { id: true },
  });
  if (!quote) return { ok: false, reason: "That quotation could not be found." };

  await prisma.quoteMessage.create({
    data: {
      quoteId: quote.id,
      kind: input.kind,
      body,
      userId: actor.id,
      fromStaff: Boolean(actor.staff),
    },
  });

  logger.info("quote_message", { reference, kind: input.kind, fromStaff: Boolean(actor.staff) });
  return { ok: true };
}
