"use server";

import { revalidatePath } from "next/cache";
import { notifyOrderStatus, notifyTicketUpdated } from "@/lib/emails/transactional";
import { redirect } from "next/navigation";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/auth/guards";
import { recordAudit } from "@/lib/audit";
import { clientIp } from "@/lib/auth/request";
import { hit, LIMITS } from "@/lib/auth/rate-limit";
import { fieldErrorsOf } from "@/lib/validation";
import { createQuoteFromEnquiry, recalculateQuote, sendQuote } from "@/lib/quote-service";
import { fulfilOrder } from "@/lib/order-service";
import { discountFromPercent, priceLine } from "@/lib/pricing";
import type { AdminActionState } from "@/app/admin/actions";

/**
 * Quotation and order administration.
 *
 * Every action re-checks the staff role on the server. Line pricing is
 * recomputed by the pricing engine on write, so a hand-edited form field cannot
 * put a quotation into a state where its header disagrees with its lines.
 */

const referenceSchema = (prefix: string) =>
  z.string().trim().regex(new RegExp(`^${prefix}-\\d{4}-[A-Z0-9]{6}$`), "Invalid reference.");

async function guard(): Promise<{ id: string } | AdminActionState> {
  const staff = await requireStaff();
  const limit = hit(`admin:${staff.id}`, LIMITS.adminWrite.limit, LIMITS.adminWrite.windowSeconds);
  if (!limit.allowed) {
    return { status: "error", message: "Too many changes in a short period. Please slow down." };
  }
  return { id: staff.id };
}

function isFailure(value: { id: string } | AdminActionState): value is AdminActionState {
  return "status" in value;
}

/** Drafts a quotation from an enquiry and opens it for editing. */
export async function draftQuote(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const staff = await guard();
  if (isFailure(staff)) return staff;

  const parsed = referenceSchema("ENQ").safeParse(formData.get("reference"));
  if (!parsed.success) return { status: "error", message: "That enquiry reference is not valid." };

  const result = await createQuoteFromEnquiry(parsed.data, staff.id);
  if (!result.ok) return { status: "error", message: result.reason };

  await recordAudit({
    actorId: staff.id,
    action: "admin.quote_drafted",
    entityType: "Quote",
    entityId: result.reference,
    metadata: { enquiry: parsed.data },
    ip: await clientIp(),
  });

  revalidatePath("/admin/enquiries");
  revalidatePath("/admin/quotes");
  redirect(`/admin/quotes/${result.reference}`);
}

const lineSchema = z.object({
  itemId: z.string().trim().min(1),
  quantity: z.coerce.number().int().min(1).max(100_000),
  unitPrice: z
    .string()
    .trim()
    .regex(/^\d+(\.\d{1,2})?$/, "Enter an amount such as 1250 or 1250.50")
    .transform((value) => Math.round(Number(value) * 100)),
  discountPercent: z.coerce.number().min(0).max(100).default(0),
});

/** Edits one quotation line, then recomputes the document totals. */
export async function updateQuoteLine(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const staff = await guard();
  if (isFailure(staff)) return staff;

  const parsed = lineSchema.safeParse({
    itemId: formData.get("itemId"),
    quantity: formData.get("quantity"),
    unitPrice: formData.get("unitPrice"),
    discountPercent: formData.get("discountPercent") || 0,
  });
  if (!parsed.success) {
    return {
      status: "error",
      message: "Please correct the highlighted fields.",
      fieldErrors: fieldErrorsOf(parsed.error),
    };
  }

  const item = await prisma.quoteItem.findUnique({
    where: { id: parsed.data.itemId },
    select: { id: true, gstRatePercent: true, quote: { select: { id: true, reference: true, status: true } } },
  });
  if (!item) return { status: "error", message: "That line no longer exists." };

  // A sent quotation is a commitment; re-pricing it silently would undermine
  // the validity period the customer was given.
  if (item.quote.status !== "DRAFT") {
    return {
      status: "error",
      message: "Only a draft quotation can be edited. Raise a new quotation instead.",
    };
  }

  const gross = parsed.data.unitPrice * parsed.data.quantity;
  const line = priceLine({
    unitPriceMinor: parsed.data.unitPrice,
    quantity: parsed.data.quantity,
    discountMinor: discountFromPercent(gross, parsed.data.discountPercent),
    gstRatePercent: item.gstRatePercent,
  });

  await prisma.$transaction(async (tx) => {
    await tx.quoteItem.update({
      where: { id: item.id },
      data: {
        quantity: line.quantity,
        unitPriceMinor: line.unitPriceMinor,
        discountMinor: line.discountMinor,
        lineTotalMinor: line.lineTotalMinor,
      },
    });
    await recalculateQuote(item.quote.id, tx);
  });

  await recordAudit({
    actorId: staff.id,
    action: "admin.quote_line_updated",
    entityType: "QuoteItem",
    entityId: item.id,
    metadata: { quote: item.quote.reference, unitPriceMinor: line.unitPriceMinor },
    ip: await clientIp(),
  });

  revalidatePath(`/admin/quotes/${item.quote.reference}`);
  return { status: "success", message: "Line updated and totals recalculated." };
}

export async function removeQuoteLine(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const staff = await guard();
  if (isFailure(staff)) return staff;

  const itemId = String(formData.get("itemId") ?? "").trim();
  if (!itemId) return { status: "error", message: "No line specified." };

  const item = await prisma.quoteItem.findUnique({
    where: { id: itemId },
    select: { id: true, quote: { select: { id: true, reference: true, status: true } } },
  });
  if (!item) return { status: "error", message: "That line no longer exists." };
  if (item.quote.status !== "DRAFT") {
    return { status: "error", message: "Only a draft quotation can be edited." };
  }

  await prisma.$transaction(async (tx) => {
    await tx.quoteItem.delete({ where: { id: item.id } });
    await recalculateQuote(item.quote.id, tx);
  });

  await recordAudit({
    actorId: staff.id,
    action: "admin.quote_line_removed",
    entityType: "QuoteItem",
    entityId: item.id,
    ip: await clientIp(),
  });

  revalidatePath(`/admin/quotes/${item.quote.reference}`);
  return { status: "success", message: "Line removed." };
}

const validitySchema = z.object({
  reference: referenceSchema("QTE"),
  validUntil: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, "Use the date picker."),
  notes: z.string().max(4000).optional(),
});

export async function updateQuoteTerms(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const staff = await guard();
  if (isFailure(staff)) return staff;

  const parsed = validitySchema.safeParse({
    reference: formData.get("reference"),
    validUntil: formData.get("validUntil"),
    notes: formData.get("notes"),
  });
  if (!parsed.success) {
    return {
      status: "error",
      message: "Please correct the highlighted fields.",
      fieldErrors: fieldErrorsOf(parsed.error),
    };
  }

  const validUntil = new Date(`${parsed.data.validUntil}T23:59:59Z`);
  if (Number.isNaN(validUntil.getTime())) {
    return { status: "error", message: "That validity date could not be read." };
  }

  await prisma.quote.update({
    where: { reference: parsed.data.reference },
    data: { validUntil, notes: parsed.data.notes?.trim() || null },
  });

  revalidatePath(`/admin/quotes/${parsed.data.reference}`);
  return { status: "success", message: "Quotation terms updated." };
}

export async function issueQuote(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const staff = await guard();
  if (isFailure(staff)) return staff;

  const parsed = referenceSchema("QTE").safeParse(formData.get("reference"));
  if (!parsed.success) return { status: "error", message: "That reference is not valid." };

  const result = await sendQuote(parsed.data, staff.id);
  if (!result.ok) return { status: "error", message: result.reason };

  await recordAudit({
    actorId: staff.id,
    action: "admin.quote_sent",
    entityType: "Quote",
    entityId: parsed.data,
    ip: await clientIp(),
  });

  revalidatePath(`/admin/quotes/${parsed.data}`);
  revalidatePath("/admin/quotes");
  return { status: "success", message: "Quotation issued and sent to the customer." };
}

const orderStatusSchema = z.object({
  reference: referenceSchema("ORD"),
  status: z.enum(["PENDING", "CONFIRMED", "PROVISIONING", "CANCELLED", "REFUNDED"]),
  internalNotes: z.string().max(4000).optional(),
});

export async function updateOrderStatus(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const staff = await guard();
  if (isFailure(staff)) return staff;

  const parsed = orderStatusSchema.safeParse({
    reference: formData.get("reference"),
    status: formData.get("status"),
    internalNotes: formData.get("internalNotes"),
  });
  if (!parsed.success) {
    return { status: "error", message: "That update could not be applied." };
  }

  const order = await prisma.order.findUnique({
    where: { reference: parsed.data.reference },
    select: { status: true, billingName: true, billingEmail: true },
  });
  if (!order) return { status: "error", message: "That order no longer exists." };
  // Fulfilment is a separate action because it creates licence records.
  if (order.status === "FULFILLED") {
    return { status: "error", message: "A fulfilled order's status cannot be changed here." };
  }

  await prisma.order.update({
    where: { reference: parsed.data.reference },
    data: {
      status: parsed.data.status,
      internalNotes: parsed.data.internalNotes?.trim() || null,
    },
  });

  await recordAudit({
    actorId: staff.id,
    action: "admin.order_status_changed",
    entityType: "Order",
    entityId: parsed.data.reference,
    metadata: { from: order.status, to: parsed.data.status },
    ip: await clientIp(),
  });

  /*
   * Tell the customer, unless nothing changed.
   *
   * Re-saving the form to edit an internal note would otherwise send them a
   * second "your order is confirmed" for an order that was already confirmed,
   * which is how a system trains people to ignore its email.
   */
  /*
   * PENDING is excluded deliberately. Moving an order *back* to awaiting is an
   * internal correction — a status set by mistake, an order reopened while
   * something is checked — and telling a customer "your order is now pending"
   * explains nothing and worries them. Every other transition is news they can
   * act on.
   */
  if (parsed.data.status !== order.status && parsed.data.status !== "PENDING") {
    await notifyOrderStatus({
      reference: parsed.data.reference,
      status: parsed.data.status,
      billingName: order.billingName,
      billingEmail: order.billingEmail,
    });
  }

  revalidatePath(`/admin/orders/${parsed.data.reference}`);
  revalidatePath("/admin/orders");
  return { status: "success", message: "Order updated." };
}

/** Fulfils an order, creating a licence per line and a renewal per term. */
export async function fulfilOrderAction(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const staff = await guard();
  if (isFailure(staff)) return staff;

  const parsed = referenceSchema("ORD").safeParse(formData.get("reference"));
  if (!parsed.success) return { status: "error", message: "That reference is not valid." };

  const result = await fulfilOrder(parsed.data, staff.id);
  if (!result.ok) return { status: "error", message: result.reason };

  await recordAudit({
    actorId: staff.id,
    action: "admin.order_fulfilled",
    entityType: "Order",
    entityId: parsed.data,
    ip: await clientIp(),
  });

  revalidatePath(`/admin/orders/${parsed.data}`);
  revalidatePath("/admin/orders");
  revalidatePath("/admin");
  return {
    status: "success",
    message: "Order fulfilled. Licence and renewal records have been created.",
  };
}

const ticketSchema = z.object({
  reference: referenceSchema("TKT"),
  status: z.enum(["OPEN", "IN_PROGRESS", "WAITING_ON_CUSTOMER", "RESOLVED", "CLOSED"]),
  priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]),
});

/** Updates a support ticket's status and priority. */
export async function updateSupportTicket(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const staff = await guard();
  if (isFailure(staff)) return staff;

  const parsed = ticketSchema.safeParse({
    reference: formData.get("reference"),
    status: formData.get("status"),
    priority: formData.get("priority"),
  });
  if (!parsed.success) {
    return { status: "error", message: "That update could not be applied." };
  }

  const existing = await prisma.supportTicket.findUnique({
    where: { reference: parsed.data.reference },
    select: {
      status: true,
      subject: true,
      user: { select: { name: true, email: true } },
    },
  });
  if (!existing) return { status: "error", message: "That ticket no longer exists." };

  await prisma.supportTicket.update({
    where: { reference: parsed.data.reference },
    data: { status: parsed.data.status, priority: parsed.data.priority },
  });

  await recordAudit({
    actorId: staff.id,
    action: "admin.ticket_updated",
    entityType: "SupportTicket",
    entityId: parsed.data.reference,
    metadata: { from: existing.status, to: parsed.data.status },
    ip: await clientIp(),
  });

  /*
   * Only on a real change, and only for the two states worth interrupting
   * somebody for — `notifyTicketUpdated` decides which. Silence on
   * WAITING_ON_CUSTOMER is the expensive one: a ticket parked waiting for a
   * customer who was never told they were the blocker.
   */
  if (parsed.data.status !== existing.status && existing.user) {
    await notifyTicketUpdated({
      reference: parsed.data.reference,
      subject: existing.subject,
      status: parsed.data.status,
      customerName: existing.user.name,
      customerEmail: existing.user.email,
    });
  }

  revalidatePath("/admin/support");
  return { status: "success", message: "Ticket updated." };
}
