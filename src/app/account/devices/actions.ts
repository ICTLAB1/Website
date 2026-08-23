"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { recordAudit } from "@/lib/audit";
import { requireUser } from "@/lib/auth/guards";
import { canInCompany } from "@/lib/auth/capabilities";
import { orgScope } from "@/lib/auth/scope";
import { clientIp } from "@/lib/auth/request";
import { hit, LIMITS } from "@/lib/auth/rate-limit";
import { publicReference } from "@/lib/auth/tokens";
import { createDevice, parseDeviceForm, removeDeviceFor, updateDeviceFor } from "@/lib/device-service";
import { notifyTicketRaised } from "@/lib/emails/transactional";
import { fieldErrorsOf } from "@/lib/validation";
import type { ActionState } from "@/app/account/actions";

/**
 * A customer keeping their own device register.
 *
 * They may, and they should. We know what we sold them; we do not know which
 * machine went to which desk, which one has since been re-imaged for somebody
 * in Pune, or which one they bought elsewhere three years ago and would still
 * like us to support. Only they know that, so the register is theirs to write
 * and ours to read when a ticket arrives.
 *
 * Gated on `service.act`, the same capability that raises a ticket: a viewer
 * sees the register and cannot alter it.
 */

const referenceSchema = z
  .string()
  .trim()
  .regex(/^DEV-\d{4}-[A-Z0-9]{6}$/, "Invalid reference.");

async function guard(): Promise<
  { id: string; companyId: string | null; name: string; email: string } | ActionState
> {
  const user = await requireUser("/account/devices");

  if (!canInCompany(user, "service.act")) {
    return {
      status: "error",
      message:
        "Your access is read-only. Ask a colleague with IT or procurement access to change the register.",
    };
  }

  const limit = hit(`device:${user.id}`, LIMITS.adminWrite.limit, LIMITS.adminWrite.windowSeconds);
  if (!limit.allowed) {
    return { status: "error", message: "Too many changes in a short period. Please slow down." };
  }

  return { id: user.id, companyId: user.companyId ?? null, name: user.name, email: user.email };
}

function refused(value: unknown): value is ActionState {
  return typeof value === "object" && value !== null && "status" in value;
}

export async function recordDevice(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await guard();
  if (refused(user)) return user;

  const parsed = parseDeviceForm(formData);
  if (!parsed.success) {
    return {
      status: "error",
      message: "Please correct the highlighted fields.",
      fieldErrors: fieldErrorsOf(parsed.error),
    };
  }

  const device = await createDevice(user, parsed.data);

  await recordAudit({
    actorId: user.id,
    action: "device.recorded",
    entityType: "Device",
    entityId: device.reference,
    ip: await clientIp(),
  });

  revalidatePath("/account/devices");
  return {
    status: "success",
    message: `${parsed.data.brandName} ${parsed.data.model} has been added as ${device.reference}.`,
  };
}

export async function updateDevice(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await guard();
  if (refused(user)) return user;

  const reference = referenceSchema.safeParse(formData.get("reference"));
  if (!reference.success) return { status: "error", message: "That device could not be found." };

  const parsed = parseDeviceForm(formData);
  if (!parsed.success) {
    return {
      status: "error",
      message: "Please correct the highlighted fields.",
      fieldErrors: fieldErrorsOf(parsed.error),
    };
  }

  const changed = await updateDeviceFor(user, reference.data, parsed.data);
  if (!changed) return { status: "error", message: "That device could not be found." };

  await recordAudit({
    actorId: user.id,
    action: "device.updated",
    entityType: "Device",
    entityId: reference.data,
    ip: await clientIp(),
  });

  revalidatePath("/account/devices");
  revalidatePath(`/account/devices/${reference.data}`);
  return { status: "success", message: "The device record has been updated." };
}

export async function removeDevice(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await guard();
  if (refused(user)) return user;

  const reference = referenceSchema.safeParse(formData.get("reference"));
  if (!reference.success) return { status: "error", message: "That device could not be found." };

  const removed = await removeDeviceFor(user, reference.data);
  if (!removed) return { status: "error", message: "That device could not be found." };

  await recordAudit({
    actorId: user.id,
    action: "device.removed",
    entityType: "Device",
    entityId: reference.data,
    ip: await clientIp(),
  });

  revalidatePath("/account/devices");
  return {
    status: "success",
    message:
      "The device has been taken off your register. Any support history against it is kept.",
  };
}

// ---------------------------------------------------------------------------
// Raising a ticket about a particular device
// ---------------------------------------------------------------------------

const deviceTicketSchema = z.object({
  reference: referenceSchema,
  subject: z.string().trim().min(3, "Say what is wrong.").max(160),
  message: z.string().trim().min(10, "Tell us a little more.").max(4000),
});

/**
 * A ticket that already knows which machine it is about.
 *
 * The single most common exchange on a hardware support ticket is us asking for
 * the serial number and waiting a day for it. Raising the ticket from the
 * device removes that exchange entirely.
 */
export async function raiseDeviceTicket(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await guard();
  if (refused(user)) return user;

  const parsed = deviceTicketSchema.safeParse({
    reference: formData.get("reference"),
    subject: formData.get("subject"),
    message: formData.get("message"),
  });
  if (!parsed.success) {
    return {
      status: "error",
      message: "Please correct the highlighted fields.",
      fieldErrors: fieldErrorsOf(parsed.error),
    };
  }

  const device = await prisma.device.findFirst({
    where: { reference: parsed.data.reference, deletedAt: null, ...orgScope(user) },
    select: { id: true, reference: true, brandName: true, model: true, serial: true },
  });
  if (!device) return { status: "error", message: "That device could not be found." };

  /*
   * What the device is goes into the ticket body, not merely into the relation.
   * The relation is how the screens link the two; this is so that the notification
   * email, which carries no relations, still says which machine.
   */
  const identity = [
    `${device.brandName} ${device.model}`,
    device.serial ? `serial ${device.serial}` : "serial not recorded",
    device.reference,
  ].join(" · ");

  const body = `${parsed.data.message}\n\nDevice: ${identity}`;

  const ticket = await prisma.supportTicket.create({
    data: {
      reference: publicReference("TKT"),
      userId: user.id,
      companyId: user.companyId,
      subject: parsed.data.subject,
      category: "HARDWARE",
      message: body,
      deviceId: device.id,
    },
    select: { reference: true },
  });

  await notifyTicketRaised({
    reference: ticket.reference,
    subject: parsed.data.subject,
    category: "HARDWARE",
    message: body,
    customerName: user.name,
    customerEmail: user.email,
  });

  await recordAudit({
    actorId: user.id,
    action: "support.ticket_created",
    entityType: "SupportTicket",
    entityId: ticket.reference,
    metadata: { device: device.reference },
    ip: await clientIp(),
  });

  revalidatePath("/account/support");
  revalidatePath(`/account/devices/${device.reference}`);

  return {
    status: "success",
    message: `Ticket ${ticket.reference} has been raised against this device.`,
  };
}
