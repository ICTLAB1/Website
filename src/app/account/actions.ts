"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/guards";
import { companySchema, fieldErrorsOf, profileSchema, supportTicketSchema } from "@/lib/validation";
import { publicReference } from "@/lib/auth/tokens";
import { recordAudit } from "@/lib/audit";
import { clientIp } from "@/lib/auth/request";
import { hit, LIMITS } from "@/lib/auth/rate-limit";

/**
 * Account mutations.
 *
 * Server Actions carry Next.js's built-in Origin/Host verification, so they do
 * not need the separate double-submit token used by the JSON API routes. Each
 * action re-resolves the session itself rather than trusting anything the form
 * submitted - notably, neither the user id nor the company id is ever read
 * from the request body.
 */

export type ActionState = {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: Record<string, string[]>;
};

export async function updateProfile(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser("/account/profile");

  const parsed = profileSchema.safeParse({
    name: formData.get("name"),
    phone: formData.get("phone"),
  });
  if (!parsed.success) {
    return {
      status: "error",
      message: "Please correct the highlighted fields.",
      fieldErrors: fieldErrorsOf(parsed.error),
    };
  }

  await prisma.user.update({
    where: { id: user.id },
    // Only these two columns are writable here. Role, email and password hash
    // are deliberately not updatable through this action.
    data: { name: parsed.data.name, phone: parsed.data.phone || null },
  });

  await recordAudit({
    actorId: user.id,
    action: "account.profile_updated",
    entityType: "User",
    entityId: user.id,
    ip: await clientIp(),
  });

  revalidatePath("/account/profile");
  revalidatePath("/account");
  return { status: "success", message: "Your profile has been updated." };
}

export async function updateCompany(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser("/account/company");

  const parsed = companySchema.safeParse({
    name: formData.get("name"),
    gstin: String(formData.get("gstin") ?? "").toUpperCase(),
    website: formData.get("website"),
    addressLine1: formData.get("addressLine1"),
    addressLine2: formData.get("addressLine2"),
    city: formData.get("city"),
    state: formData.get("state"),
    postcode: formData.get("postcode"),
    country: formData.get("country") || "India",
  });
  if (!parsed.success) {
    return {
      status: "error",
      message: "Please correct the highlighted fields.",
      fieldErrors: fieldErrorsOf(parsed.error),
    };
  }

  const data = {
    name: parsed.data.name,
    gstin: parsed.data.gstin || null,
    website: parsed.data.website || null,
    addressLine1: parsed.data.addressLine1 || null,
    addressLine2: parsed.data.addressLine2 || null,
    city: parsed.data.city || null,
    state: parsed.data.state || null,
    postcode: parsed.data.postcode || null,
    country: parsed.data.country || "India",
  };

  if (user.companyId) {
    // Scoped by the company id resolved from the session, never from the form.
    await prisma.company.update({ where: { id: user.companyId }, data });
  } else {
    const company = await prisma.company.create({ data, select: { id: true } });
    await prisma.user.update({ where: { id: user.id }, data: { companyId: company.id } });
  }

  await recordAudit({
    actorId: user.id,
    action: "account.company_updated",
    entityType: "Company",
    entityId: user.companyId,
    ip: await clientIp(),
  });

  revalidatePath("/account/company");
  return { status: "success", message: "Your company details have been updated." };
}

export async function createSupportTicket(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser("/account/support");

  const ip = await clientIp();
  const limit = hit(`ticket:${user.id}`, LIMITS.contact.limit, LIMITS.contact.windowSeconds);
  if (!limit.allowed) {
    return {
      status: "error",
      message: "You have raised several tickets recently. Please contact us directly if this is urgent.",
    };
  }

  const parsed = supportTicketSchema.safeParse({
    subject: formData.get("subject"),
    category: formData.get("category"),
    message: formData.get("message"),
  });
  if (!parsed.success) {
    return {
      status: "error",
      message: "Please correct the highlighted fields.",
      fieldErrors: fieldErrorsOf(parsed.error),
    };
  }

  const ticket = await prisma.supportTicket.create({
    data: {
      reference: publicReference("TKT"),
      userId: user.id,
      subject: parsed.data.subject,
      category: parsed.data.category,
      message: parsed.data.message,
    },
    select: { reference: true },
  });

  await recordAudit({
    actorId: user.id,
    action: "support.ticket_created",
    entityType: "SupportTicket",
    entityId: ticket.reference,
    ip,
  });

  revalidatePath("/account/support");
  return {
    status: "success",
    message: `Ticket ${ticket.reference} has been raised. We will respond to the email address on your account.`,
  };
}
