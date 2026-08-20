"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/guards";
import { companySchema, fieldErrorsOf, profileSchema, supportTicketSchema } from "@/lib/validation";
import { publicReference } from "@/lib/auth/tokens";
import { recordAudit } from "@/lib/audit";
import { clientIp } from "@/lib/auth/request";
import { hit, LIMITS } from "@/lib/auth/rate-limit";
import { decideOnQuote } from "@/lib/quote-service";
import { createOrderFromQuote } from "@/lib/order-service";
import { z } from "zod";

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

// ---------------------------------------------------------------------------
// Quotation decisions
// ---------------------------------------------------------------------------

const quoteDecisionSchema = z.object({
  reference: z.string().trim().regex(/^QTE-\d{4}-[A-Z0-9]{6}$/, "Invalid reference."),
  decision: z.enum(["ACCEPTED", "DECLINED"]),
  poNumber: z.string().trim().max(64).optional(),
});

/**
 * Records the customer's decision on a quotation and, on acceptance, raises the
 * order.
 *
 * Both steps re-resolve the session and scope by user id, so a reference
 * belonging to another organisation matches nothing. Status, expiry and
 * duplicate-order checks all happen server-side in the services, never on the
 * strength of which button the browser rendered.
 */
export async function decideQuote(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser("/account/quotes");

  const parsed = quoteDecisionSchema.safeParse({
    reference: formData.get("reference"),
    decision: formData.get("decision"),
    poNumber: formData.get("poNumber"),
  });
  if (!parsed.success) {
    return { status: "error", message: "That response could not be recorded." };
  }

  const decision = await decideOnQuote(parsed.data.reference, user.id, parsed.data.decision);
  if (!decision.ok) return { status: "error", message: decision.reason };

  const ip = await clientIp();

  await recordAudit({
    actorId: user.id,
    action: `quote.${parsed.data.decision.toLowerCase()}`,
    entityType: "Quote",
    entityId: parsed.data.reference,
    ip,
  });

  if (parsed.data.decision === "DECLINED") {
    revalidatePath("/account/quotes");
    revalidatePath(`/account/quotes/${parsed.data.reference}`);
    return {
      status: "success",
      message: "Thank you — we have recorded that you are not proceeding.",
    };
  }

  const profile = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      name: true,
      email: true,
      phone: true,
      company: {
        select: {
          name: true,
          gstin: true,
          addressLine1: true,
          addressLine2: true,
          city: true,
          state: true,
          postcode: true,
          country: true,
        },
      },
    },
  });

  const address = profile?.company
    ? [
        profile.company.addressLine1,
        profile.company.addressLine2,
        [profile.company.city, profile.company.state, profile.company.postcode]
          .filter(Boolean)
          .join(" "),
        profile.company.country,
      ]
        .filter(Boolean)
        .join(", ")
    : null;

  const order = await createOrderFromQuote(parsed.data.reference, user.id, {
    // Billing identity comes from the account, never from the submitted form.
    name: profile?.company?.name ?? profile?.name ?? user.name,
    email: profile?.email ?? user.email,
    phone: profile?.phone ?? null,
    gstin: profile?.company?.gstin ?? null,
    address,
    poNumber: parsed.data.poNumber || null,
  });

  if (!order.ok) return { status: "error", message: order.reason };

  await recordAudit({
    actorId: user.id,
    action: "order.created",
    entityType: "Order",
    entityId: order.reference,
    metadata: { quote: parsed.data.reference },
    ip,
  });

  revalidatePath("/account/quotes");
  revalidatePath("/account/orders");
  revalidatePath(`/account/quotes/${parsed.data.reference}`);

  return {
    status: "success",
    message: `Quotation accepted. Your order reference is ${order.reference} — we will confirm provisioning shortly.`,
  };
}
