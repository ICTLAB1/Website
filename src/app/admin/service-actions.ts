"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { requireCapability } from "@/lib/auth/guards";
import { recordAudit } from "@/lib/audit";
import { clientIp } from "@/lib/auth/request";
import { hit, LIMITS } from "@/lib/auth/rate-limit";
import { fieldErrorsOf } from "@/lib/validation";
import { safeTrackingUrl } from "@/lib/delivery";
import { addStaffMessage } from "@/lib/ticket-service";
import { parseDeviceForm } from "@/lib/device-service";
import { publicReference } from "@/lib/auth/tokens";
import { notifyOrderDelivery, notifyTicketReply } from "@/lib/emails/transactional";
import type { AdminActionState } from "@/app/admin/actions";
import type { Capability } from "@/lib/auth/capabilities";

/**
 * Fulfilment and service, from our side.
 *
 * Three jobs that were being done in email and are now done against the record:
 * saying where a consignment is, answering a ticket, and keeping a customer's
 * device register straight when they would rather we did it for them.
 *
 * Each action asks for the capability the job needs rather than for a role, so
 * an operations account can record a delivery without also being able to write
 * on a support ticket.
 */

async function guard(
  capability: Capability,
): Promise<{ id: string; name: string } | AdminActionState> {
  const staff = await requireCapability(capability);
  const limit = hit(`admin:${staff.id}`, LIMITS.adminWrite.limit, LIMITS.adminWrite.windowSeconds);
  if (!limit.allowed) {
    return { status: "error", message: "Too many changes in a short period. Please slow down." };
  }
  return { id: staff.id, name: staff.name };
}

function refused(value: { id: string } | AdminActionState): value is AdminActionState {
  return "status" in value;
}

// ---------------------------------------------------------------------------
// Delivery
// ---------------------------------------------------------------------------

/**
 * A date somebody typed, or nothing.
 *
 * `datetime-local` sends a value with no timezone, which `new Date` reads as
 * local time on the server. That is what is wanted here — whoever is recording
 * the dispatch is recording it in their own working day — but it does mean an
 * unparseable value must become null rather than an Invalid Date the database
 * would refuse at the far end of a long form.
 */
const optionalMoment = z
  .string()
  .trim()
  .optional()
  .transform((value) => {
    if (!value) return null;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  });

const deliverySchema = z
  .object({
    reference: z.string().trim().regex(/^ORD-\d{4}-[A-Z0-9]{6}$/, "Invalid reference."),
    courier: z.string().trim().max(80).optional(),
    trackingNumber: z.string().trim().max(120).optional(),
    trackingUrl: z.string().trim().max(500).optional(),
    dispatchedAt: optionalMoment,
    expectedAt: optionalMoment,
    deliveredAt: optionalMoment,
    deliveryNote: z.string().trim().max(500).optional(),
  })
  /*
   * Delivered before dispatched is a data-entry error, and one that would make
   * the customer's timeline read backwards. Refused rather than reordered.
   */
  .refine(
    (value) =>
      !value.dispatchedAt ||
      !value.deliveredAt ||
      value.deliveredAt.getTime() >= value.dispatchedAt.getTime(),
    { message: "It cannot have been delivered before it was dispatched.", path: ["deliveredAt"] },
  );

/**
 * Records where a consignment has got to.
 *
 * The customer sees every field of this, so a tracking URL that is not an
 * ordinary web address is dropped rather than rendered — a link a panel user
 * can point at `javascript:` is a hole aimed at the customer, not at us.
 */
export async function recordDelivery(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const staff = await guard("orders.write");
  if (refused(staff)) return staff;

  const parsed = deliverySchema.safeParse({
    reference: formData.get("reference"),
    courier: formData.get("courier"),
    trackingNumber: formData.get("trackingNumber"),
    trackingUrl: formData.get("trackingUrl"),
    dispatchedAt: formData.get("dispatchedAt"),
    expectedAt: formData.get("expectedAt"),
    deliveredAt: formData.get("deliveredAt"),
    deliveryNote: formData.get("deliveryNote"),
  });
  if (!parsed.success) {
    return {
      status: "error",
      message: "Please correct the highlighted fields.",
      fieldErrors: fieldErrorsOf(parsed.error),
    };
  }

  const submittedUrl = parsed.data.trackingUrl?.trim();
  const trackingUrl = safeTrackingUrl(submittedUrl);
  if (submittedUrl && !trackingUrl) {
    return {
      status: "error",
      message: "That tracking link is not a web address.",
      fieldErrors: { trackingUrl: ["Enter a link starting http:// or https://"] },
    };
  }

  const order = await prisma.order.findUnique({
    where: { reference: parsed.data.reference },
    select: {
      id: true,
      reference: true,
      status: true,
      dispatchedAt: true,
      deliveredAt: true,
      billingEmail: true,
      billingName: true,
    },
  });
  if (!order) return { status: "error", message: "That order could not be found." };

  await prisma.order.update({
    where: { id: order.id },
    data: {
      courier: parsed.data.courier || null,
      trackingNumber: parsed.data.trackingNumber || null,
      trackingUrl,
      dispatchedAt: parsed.data.dispatchedAt,
      expectedAt: parsed.data.expectedAt,
      deliveredAt: parsed.data.deliveredAt,
      deliveryNote: parsed.data.deliveryNote || null,
    },
  });

  await recordAudit({
    actorId: staff.id,
    action: "order.delivery_recorded",
    entityType: "Order",
    entityId: order.reference,
    metadata: { courier: parsed.data.courier ?? null },
    ip: await clientIp(),
  });

  /*
   * Told once per moment, on the transition into it. Every later correction to
   * a courier name or a note is ours to make quietly; a second "your order has
   * been delivered" email a week afterwards would only worry somebody.
   */
  const moment = parsed.data.deliveredAt && !order.deliveredAt
    ? "DELIVERED"
    : parsed.data.dispatchedAt && !order.dispatchedAt
      ? "DISPATCHED"
      : null;

  if (moment) {
    await notifyOrderDelivery({
      reference: order.reference,
      moment,
      courier: parsed.data.courier || null,
      trackingNumber: parsed.data.trackingNumber || null,
      expectedAt: parsed.data.expectedAt,
      billingName: order.billingName,
      billingEmail: order.billingEmail,
    });
  }

  revalidatePath(`/admin/orders/${order.reference}`);
  revalidatePath(`/account/orders/${order.reference}`);
  revalidatePath("/account/orders");

  return { status: "success", message: "Delivery details saved." };
}

// ---------------------------------------------------------------------------
// Support
// ---------------------------------------------------------------------------

const replySchema = z.object({
  reference: z.string().trim().regex(/^TKT-\d{4}-[A-Z0-9]{6}$/, "Invalid reference."),
  body: z.string().trim().min(2, "Write the reply first.").max(4000),
  status: z
    .enum(["OPEN", "IN_PROGRESS", "WAITING_ON_CUSTOMER", "RESOLVED", "CLOSED"])
    .optional(),
});

/** Answers a ticket, on the ticket, and tells the customer it was answered. */
export async function replyToTicket(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const staff = await guard("support.write");
  if (refused(staff)) return staff;

  const parsed = replySchema.safeParse({
    reference: formData.get("reference"),
    body: formData.get("body"),
    status: formData.get("status") || undefined,
  });
  if (!parsed.success) {
    return {
      status: "error",
      message: "Please correct the highlighted fields.",
      fieldErrors: fieldErrorsOf(parsed.error),
    };
  }

  const result = await addStaffMessage(parsed.data.reference, staff.id, parsed.data.body, {
    status: parsed.data.status,
  });
  if (!result.ok) return { status: "error", message: result.reason };

  const ticket = await prisma.supportTicket.findUnique({
    where: { reference: parsed.data.reference },
    select: { reference: true, subject: true, status: true, user: { select: { email: true, name: true } } },
  });

  if (ticket?.user?.email) {
    await notifyTicketReply({
      reference: ticket.reference,
      subject: ticket.subject,
      body: parsed.data.body,
      customerName: ticket.user.name,
      customerEmail: ticket.user.email,
    });
  }

  await recordAudit({
    actorId: staff.id,
    action: "support.staff_replied",
    entityType: "SupportTicket",
    entityId: parsed.data.reference,
    ip: await clientIp(),
  });

  revalidatePath(`/admin/support/${parsed.data.reference}`);
  revalidatePath("/admin/support");
  revalidatePath(`/account/support/${parsed.data.reference}`);

  return { status: "success", message: "Your reply is on the ticket and the customer has been told." };
}

// ---------------------------------------------------------------------------
// Devices
// ---------------------------------------------------------------------------

const companySchema = z.string().trim().min(1, "Choose an organisation.").max(60);

/**
 * Records a device on a customer's register for them.
 *
 * Most customers will never fill in a register of three hundred machines by
 * hand, and asking them to is how a register ends up empty and useless. So
 * whoever delivers the order can enter them here — against the organisation
 * chosen from the list, never against an id typed into the form by hand.
 */
export async function recordDeviceForCompany(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const staff = await guard("customers.write");
  if (refused(staff)) return staff;

  const company = companySchema.safeParse(formData.get("companyId"));
  if (!company.success) {
    return {
      status: "error",
      message: "Choose which organisation this device belongs to.",
      fieldErrors: { companyId: ["Choose an organisation."] },
    };
  }

  const parsed = parseDeviceForm(formData);
  if (!parsed.success) {
    return {
      status: "error",
      message: "Please correct the highlighted fields.",
      fieldErrors: fieldErrorsOf(parsed.error),
    };
  }

  // The organisation has to exist. A device attached to a company id that does
  // not is a device nobody will ever see.
  const exists = await prisma.company.findUnique({
    where: { id: company.data },
    select: { id: true, name: true },
  });
  if (!exists) return { status: "error", message: "That organisation could not be found." };

  const device = await prisma.device.create({
    data: {
      reference: publicReference("DEV"),
      companyId: exists.id,
      ...parsed.data,
    },
    select: { reference: true },
  });

  await recordAudit({
    actorId: staff.id,
    action: "device.recorded_by_staff",
    entityType: "Device",
    entityId: device.reference,
    metadata: { company: exists.name },
    ip: await clientIp(),
  });

  revalidatePath("/admin/devices");
  return {
    status: "success",
    message: `${parsed.data.brandName} ${parsed.data.model} recorded for ${exists.name} as ${device.reference}.`,
  };
}
