"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { recordAudit } from "@/lib/audit";
import { requireUser } from "@/lib/auth/guards";
import { canInCompany } from "@/lib/auth/capabilities";
import { clientIp } from "@/lib/auth/request";
import { hit, LIMITS } from "@/lib/auth/rate-limit";
import { addCustomerMessage, getTicketFor, ticketIsClosed } from "@/lib/ticket-service";
import { MAX_DOCUMENT_BYTES, storeDocument } from "@/lib/documents";
import { prisma } from "@/lib/db";
import { orgScope } from "@/lib/auth/scope";
import { fieldErrorsOf } from "@/lib/validation";
import type { ActionState } from "@/app/account/actions";

/**
 * The customer's half of a support conversation.
 *
 * Two things they could not do before: answer a question we asked, and send the
 * screenshot that would have answered it faster. Both land against the ticket
 * rather than in an inbox, so whoever picks the ticket up next has the whole
 * exchange in front of them.
 */

const referenceSchema = z
  .string()
  .trim()
  .regex(/^TKT-\d{4}-[A-Z0-9]{6}$/, "Invalid reference.");

const replySchema = z.object({
  reference: referenceSchema,
  body: z.string().trim().min(2, "Write your reply first.").max(4000),
});

export async function replyOnTicket(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser("/account/support");

  if (!canInCompany(user, "service.act")) {
    return {
      status: "error",
      message: "Your access is read-only. A colleague with support access can reply.",
    };
  }

  const parsed = replySchema.safeParse({
    reference: formData.get("reference"),
    body: formData.get("body"),
  });
  if (!parsed.success) {
    return {
      status: "error",
      message: "Please correct the highlighted fields.",
      fieldErrors: fieldErrorsOf(parsed.error),
    };
  }

  const limit = hit(`ticket-reply:${user.id}`, LIMITS.contact.limit, LIMITS.contact.windowSeconds);
  if (!limit.allowed) {
    return { status: "error", message: "Too many messages in a short period. Please try again shortly." };
  }

  const result = await addCustomerMessage(parsed.data.reference, user, parsed.data.body);
  if (!result.ok) return { status: "error", message: result.reason };

  await recordAudit({
    actorId: user.id,
    action: "support.customer_replied",
    entityType: "SupportTicket",
    entityId: parsed.data.reference,
    ip: await clientIp(),
  });

  revalidatePath(`/account/support/${parsed.data.reference}`);
  revalidatePath("/account/support");

  return { status: "success", message: "Thank you — your reply is on the ticket." };
}

/**
 * A file on a ticket.
 *
 * A screenshot of an error, a photograph of a damaged carton, a log file. Same
 * store and the same access rule as every other business document: the bytes
 * live outside the web root and are only ever served through a route that
 * resolves the organisation first.
 */
export async function attachToTicket(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser("/account/support");

  if (!canInCompany(user, "service.act")) {
    return {
      status: "error",
      message: "Your access is read-only. A colleague with support access can attach files.",
    };
  }

  const reference = referenceSchema.safeParse(formData.get("reference"));
  if (!reference.success) return { status: "error", message: "That ticket could not be found." };

  const limit = hit(`ticket-file:${user.id}`, LIMITS.contact.limit, LIMITS.contact.windowSeconds);
  if (!limit.allowed) {
    return { status: "error", message: "Too many uploads in a short period. Please try again shortly." };
  }

  const ticket = await getTicketFor(user, reference.data);
  if (!ticket) return { status: "error", message: "That ticket could not be found." };

  if (ticketIsClosed(ticket.status)) {
    return {
      status: "error",
      message: "This ticket has been closed. Please raise a new one and attach the file there.",
    };
  }

  const file = formData.get("document");
  if (!(file instanceof File) || file.size === 0) {
    return {
      status: "error",
      message: "Choose a file first.",
      fieldErrors: { document: ["Choose a file."] },
    };
  }
  if (file.size > MAX_DOCUMENT_BYTES) {
    return {
      status: "error",
      message: "That file is larger than 10 MB.",
      fieldErrors: { document: ["Too large"] },
    };
  }

  // Re-read with the id, still scoped, because the thread select deliberately
  // does not expose one.
  const row = await prisma.supportTicket.findFirst({
    where: { reference: reference.data, ...orgScope(user) },
    select: { id: true },
  });
  if (!row) return { status: "error", message: "That ticket could not be found." };

  const stored = await storeDocument({
    buffer: Buffer.from(await file.arrayBuffer()),
    filename: file.name,
    kind: "SUPPORT_ATTACHMENT",
    companyId: user.companyId,
    userId: user.id,
    ticketId: row.id,
  });

  if (!stored.ok) {
    return {
      status: "error",
      message:
        stored.reason === "unsupported"
          ? "We could not read that file. Send a PDF, an image or an Office document."
          : "That file could not be stored. Please try again.",
      fieldErrors: { document: ["Not accepted"] },
    };
  }

  await recordAudit({
    actorId: user.id,
    action: "support.attachment_added",
    entityType: "SupportTicket",
    entityId: reference.data,
    ip: await clientIp(),
  });

  revalidatePath(`/account/support/${reference.data}`);
  return { status: "success", message: "Your file is on the ticket." };
}
