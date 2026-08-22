"use server";

import { revalidatePath } from "next/cache";
import { notifyQuoteDecision, notifyTicketRaised } from "@/lib/emails/transactional";
import { prisma } from "@/lib/db";
import { canTransact, requireUser } from "@/lib/auth/guards";
import { canInCompany } from "@/lib/auth/capabilities";
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

  /*
   * The company profile is what goes on every tax invoice we raise for this
   * organisation, so it is not something any colleague may edit. A viewer or a
   * finance user reading the page sees the details; only a company
   * administrator may change them.
   */
  if (!canInCompany(user, "company.manage")) {
    return {
      status: "error",
      message:
        "Only a company administrator can change these details. Ask whoever manages your organisation's account.",
    };
  }

  const parsed = companySchema.safeParse({
    name: formData.get("name"),
    gstin: String(formData.get("gstin") ?? "").toUpperCase(),
    pan: String(formData.get("pan") ?? "").toUpperCase(),
    phone: formData.get("phone"),
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
    pan: parsed.data.pan || null,
    phone: parsed.data.phone || null,
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
    /*
     * Whoever creates the organisation administers it. There is nobody else to
     * do it, and an organisation whose only member cannot invite anybody or
     * edit its own details is a dead end.
     */
    const company = await prisma.company.create({ data, select: { id: true } });
    await prisma.user.update({
      where: { id: user.id },
      data: { companyId: company.id, companyRole: "ADMIN" },
    });

    // No session to reissue: the session record is resolved against the user
    // row on every request, so the new company and role are in effect on the
    // next one. Signing somebody out for saving their own company details
    // would be a strange way to thank them.
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

  if (!canInCompany(user, "service.act")) {
    return {
      status: "error",
      message: "Your access is read-only. Ask a colleague with support access to raise this.",
    };
  }

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
      // So a colleague can pick the ticket up when the person who raised it is
      // not around to answer.
      companyId: user.companyId,
      subject: parsed.data.subject,
      category: parsed.data.category,
      message: parsed.data.message,
    },
    select: { reference: true },
  });

  /*
   * Both sides told, after the ticket exists.
   *
   * The contact form has always done this; the same form inside the account did
   * not, so a signed-in customer — the one most likely to be mid-purchase —
   * raised a ticket and heard nothing, and nobody here was alerted either.
   */
  await notifyTicketRaised({
    reference: ticket.reference,
    subject: parsed.data.subject,
    category: parsed.data.category,
    message: parsed.data.message,
    customerName: user.name,
    customerEmail: user.email,
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
/** Reads the decision straight off the form, before validation, for the guard. */
function parsedDecisionIsAccept(formData: FormData): boolean {
  return String(formData.get("decision") ?? "").toUpperCase() === "ACCEPTED";
}

export async function decideQuote(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser("/account/quotes");

  /*
   * Accepting a quotation raises an order in this account's name and puts
   * licences on their way to this address. Both are worth confirming the
   * address first.
   *
   * Rejecting is not gated — refusing a quotation costs nothing and commits
   * nobody, and there is no reason to trap somebody in a quotation they do not
   * want because their email has not arrived.
   */
  /*
   * Responding to a quotation commits the organisation, so it is gated on the
   * role inside it rather than on merely holding an account there. A viewer may
   * read the quotation and may not accept it.
   */
  if (!canInCompany(user, "quotes.act")) {
    return {
      status: "error",
      message:
        "Your access does not include responding to quotations. Ask a colleague with procurement access.",
    };
  }

  if (parsedDecisionIsAccept(formData) && !(await canTransact(user))) {
    return {
      status: "error",
      message:
        "Please confirm your email address before accepting a quotation. We have sent you a link; you can request another from your account.",
    };
  }

  const parsed = quoteDecisionSchema.safeParse({
    reference: formData.get("reference"),
    decision: formData.get("decision"),
    poNumber: formData.get("poNumber"),
  });
  if (!parsed.success) {
    return { status: "error", message: "That response could not be recorded." };
  }

  const decision = await decideOnQuote(parsed.data.reference, user, parsed.data.decision);
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
    await notifyQuoteDecision({
      reference: parsed.data.reference,
      decision: "DECLINED",
      totalMinor: decision.totalMinor,
      currency: decision.currency,
      customerName: user.name,
      customerEmail: user.email,
      orderReference: null,
    });

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

  const order = await createOrderFromQuote(parsed.data.reference, user, {
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

  /*
   * Sales find out that a quotation was accepted.
   *
   * Until now nobody did. An accepted quotation raised an order and sat in the
   * panel until somebody happened to look — which, for the single most
   * commercially significant thing a customer can do on this site, is not good
   * enough. The customer already has their order confirmation from
   * `createOrderFromQuote`; this is the other half.
   */
  await notifyQuoteDecision({
    reference: parsed.data.reference,
    decision: "ACCEPTED",
    totalMinor: decision.totalMinor,
    currency: decision.currency,
    customerName: user.name,
    customerEmail: user.email,
    orderReference: order.reference,
  });

  revalidatePath("/account/quotes");
  revalidatePath("/account/orders");
  revalidatePath(`/account/quotes/${parsed.data.reference}`);

  return {
    status: "success",
    message: `Quotation accepted. Your order reference is ${order.reference} — we will confirm provisioning shortly.`,
  };
}
