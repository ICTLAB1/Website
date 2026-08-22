"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { recordAudit } from "@/lib/audit";
import { clientIp } from "@/lib/auth/request";
import { hashPassword } from "@/lib/auth/password";
import { issueInvite, undeliveredMessage } from "@/lib/auth/invitations";
import { requireUser } from "@/lib/auth/guards";
import { canInCompany, COMPANY_ROLE_LABELS } from "@/lib/auth/capabilities";
import { hit, LIMITS } from "@/lib/auth/rate-limit";
import { emailSchema, fieldErrorsOf, phoneSchema } from "@/lib/validation";
import type { ActionState } from "@/app/account/actions";

/**
 * A customer organisation administering itself.
 *
 * The alternative — every colleague registering separately and ending up with
 * their own unconnected "company" — is what makes portals useless to the
 * procurement departments they are built for: four people at one organisation,
 * four accounts, and no shared sight of a single quotation.
 *
 * Every action here re-resolves the session, resolves the company **from that
 * session** and never from the form, and refuses anybody without
 * `people.manage` or `company.manage`. A form field naming another company is
 * therefore not a thing that can be submitted; there is nowhere for it to be
 * read.
 */

/** Resolves the acting company administrator, or the reason they are not one. */
async function requireCompanyManager(
  capability: "people.manage" | "company.manage",
): Promise<{ ok: true; user: Awaited<ReturnType<typeof requireUser>>; companyId: string } | { ok: false; state: ActionState }> {
  const user = await requireUser("/account/company");

  if (!user.companyId) {
    return {
      ok: false,
      state: {
        status: "error",
        message: "Add your company details first — colleagues and addresses belong to a company.",
      },
    };
  }

  if (!canInCompany(user, capability)) {
    return {
      ok: false,
      state: {
        status: "error",
        message:
          "Only a company administrator can do that. Ask whoever manages your organisation's account.",
      },
    };
  }

  return { ok: true, user, companyId: user.companyId };
}

// ---------------------------------------------------------------- people ---

const inviteSchema = z.object({
  name: z.string().trim().min(2, "Enter their full name.").max(120),
  email: emailSchema,
  phone: phoneSchema.optional().or(z.literal("")),
  companyRole: z.enum(["ADMIN", "PROCUREMENT", "FINANCE", "IT", "VIEWER"]),
});

export async function inviteColleague(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const actor = await requireCompanyManager("people.manage");
  if (!actor.ok) return actor.state;

  const limit = hit(`invite:${actor.user.id}`, LIMITS.contact.limit, LIMITS.contact.windowSeconds);
  if (!limit.allowed) {
    return { status: "error", message: "Too many invitations in a short period. Try again shortly." };
  }

  const parsed = inviteSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    companyRole: formData.get("companyRole"),
  });
  if (!parsed.success) {
    return {
      status: "error",
      message: "Please correct the highlighted fields.",
      fieldErrors: fieldErrorsOf(parsed.error),
    };
  }

  const existing = await prisma.user.findUnique({
    where: { email: parsed.data.email },
    select: { id: true, companyId: true, deletedAt: true },
  });

  if (existing) {
    /*
     * Deliberately not "join them to this company automatically".
     *
     * An address already in use may be somebody at another organisation, or a
     * customer who signed up on their own. Attaching them here would move their
     * history — quotations, orders, licences — into a company they have not
     * agreed to join, which is a data transfer nobody asked for. It goes to us
     * to sort out instead.
     */
    return {
      status: "error",
      message:
        existing.companyId === actor.companyId
          ? "That colleague is already on your account."
          : "That address already has an account. Contact us and we will connect it to your organisation.",
      fieldErrors: { email: ["Already in use"] },
    };
  }

  // A random hash nobody holds the input to: the only route in is the emailed
  // link. Same reasoning as the administration panel's invitations.
  const unusable = await hashPassword(randomBytes(32).toString("hex"));

  const colleague = await prisma.user.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      phone: parsed.data.phone ? parsed.data.phone : null,
      role: "CUSTOMER",
      companyId: actor.companyId,
      companyRole: parsed.data.companyRole,
      passwordHash: unusable,
    },
    select: { id: true, name: true, email: true },
  });

  await recordAudit({
    actorId: actor.user.id,
    action: "company.colleague_invited",
    entityType: "User",
    entityId: colleague.id,
    metadata: { companyRole: parsed.data.companyRole },
    ip: await clientIp(),
  });

  const invite = await issueInvite(colleague);
  revalidatePath("/account/company/people");

  if (!invite.delivered) {
    return {
      status: "error",
      message: undeliveredMessage(
        colleague.email,
        invite.link,
        "If this keeps happening, tell us and we will look into it.",
      ),
    };
  }

  return {
    status: "success",
    message: `${colleague.name} has been invited as ${COMPANY_ROLE_LABELS[parsed.data.companyRole].toLowerCase()}. They have been emailed a link to choose a password.`,
  };
}

const colleagueRoleSchema = z.object({
  userId: z.string().trim().min(1),
  companyRole: z.enum(["ADMIN", "PROCUREMENT", "FINANCE", "IT", "VIEWER"]),
});

export async function setColleagueRole(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const actor = await requireCompanyManager("people.manage");
  if (!actor.ok) return actor.state;

  const parsed = colleagueRoleSchema.safeParse({
    userId: formData.get("userId"),
    companyRole: formData.get("companyRole"),
  });
  if (!parsed.success) return { status: "error", message: "That change could not be applied." };

  if (parsed.data.userId === actor.user.id) {
    return { status: "error", message: "You cannot change your own access." };
  }

  // Scoped to this company in the WHERE clause: a user id belonging to another
  // organisation matches nothing rather than matching and being rejected.
  const colleague = await prisma.user.findFirst({
    where: { id: parsed.data.userId, companyId: actor.companyId, deletedAt: null },
    select: { id: true, name: true, companyRole: true },
  });
  if (!colleague) return { status: "error", message: "That colleague is no longer on your account." };

  // Never leave an organisation with nobody who can administer it.
  if (colleague.companyRole === "ADMIN" && parsed.data.companyRole !== "ADMIN") {
    const admins = await prisma.user.count({
      where: { companyId: actor.companyId, companyRole: "ADMIN", deletedAt: null },
    });
    if (admins <= 1) {
      return { status: "error", message: "There must be at least one company administrator." };
    }
  }

  await prisma.user.update({
    where: { id: colleague.id },
    data: { companyRole: parsed.data.companyRole },
  });

  // Access changes now, not at their next sign-in. The session carries the
  // company role, so an open session would otherwise keep the old rights.
  await prisma.session.updateMany({
    where: { userId: colleague.id, revokedAt: null },
    data: { revokedAt: new Date() },
  });

  await recordAudit({
    actorId: actor.user.id,
    action: "company.colleague_role_changed",
    entityType: "User",
    entityId: colleague.id,
    metadata: { from: colleague.companyRole, to: parsed.data.companyRole },
    ip: await clientIp(),
  });

  revalidatePath("/account/company/people");
  return {
    status: "success",
    message: `${colleague.name} is now ${COMPANY_ROLE_LABELS[parsed.data.companyRole].toLowerCase()}. Any open session has been signed out.`,
  };
}

export async function removeColleague(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const actor = await requireCompanyManager("people.manage");
  if (!actor.ok) return actor.state;

  const userId = String(formData.get("userId") ?? "").trim();
  if (!userId) return { status: "error", message: "Choose a colleague." };
  if (userId === actor.user.id) {
    return { status: "error", message: "You cannot remove yourself." };
  }

  const colleague = await prisma.user.findFirst({
    where: { id: userId, companyId: actor.companyId, deletedAt: null },
    select: { id: true, name: true, companyRole: true },
  });
  if (!colleague) return { status: "error", message: "That colleague is no longer on your account." };

  if (colleague.companyRole === "ADMIN") {
    const admins = await prisma.user.count({
      where: { companyId: actor.companyId, companyRole: "ADMIN", deletedAt: null },
    });
    if (admins <= 1) {
      return { status: "error", message: "There must be at least one company administrator." };
    }
  }

  /*
   * Detached, not deleted.
   *
   * The account stays, because it raised enquiries and accepted quotations and
   * those records name it. What ends is its access to this organisation: it
   * keeps whatever it raised itself and loses sight of everything else, which
   * is exactly what leaving an employer should mean.
   */
  await prisma.user.update({
    where: { id: colleague.id },
    data: { companyId: null, companyRole: "VIEWER" },
  });

  await prisma.session.updateMany({
    where: { userId: colleague.id, revokedAt: null },
    data: { revokedAt: new Date() },
  });

  await recordAudit({
    actorId: actor.user.id,
    action: "company.colleague_removed",
    entityType: "User",
    entityId: colleague.id,
    ip: await clientIp(),
  });

  revalidatePath("/account/company/people");
  return {
    status: "success",
    message: `${colleague.name} no longer has access to your organisation's account.`,
  };
}

// -------------------------------------------------------------- addresses ---

const addressSchema = z.object({
  id: z.string().trim().optional(),
  label: z.string().trim().min(2, "Name this address, e.g. Head office.").max(80),
  kind: z.enum(["BILLING", "DELIVERY", "BOTH"]),
  attention: z.string().trim().max(120).optional().or(z.literal("")),
  line1: z.string().trim().min(3, "Enter the address.").max(160),
  line2: z.string().trim().max(160).optional().or(z.literal("")),
  city: z.string().trim().min(2, "Enter the city.").max(80),
  state: z.string().trim().min(2, "Enter the state.").max(80),
  postcode: z.string().trim().min(4, "Enter the PIN code.").max(16),
  country: z.string().trim().min(2).max(60),
  gstin: z.string().trim().max(15).optional().or(z.literal("")),
  isDefault: z.boolean().optional().default(false),
});

export async function saveAddress(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const actor = await requireCompanyManager("company.manage");
  if (!actor.ok) return actor.state;

  const parsed = addressSchema.safeParse({
    id: formData.get("id") ?? undefined,
    label: formData.get("label"),
    kind: formData.get("kind"),
    attention: formData.get("attention"),
    line1: formData.get("line1"),
    line2: formData.get("line2"),
    city: formData.get("city"),
    state: formData.get("state"),
    postcode: formData.get("postcode"),
    country: formData.get("country") || "India",
    gstin: String(formData.get("gstin") ?? "").toUpperCase(),
    isDefault: formData.get("isDefault") === "on",
  });
  if (!parsed.success) {
    return {
      status: "error",
      message: "Please correct the highlighted fields.",
      fieldErrors: fieldErrorsOf(parsed.error),
    };
  }

  const data = {
    label: parsed.data.label,
    kind: parsed.data.kind,
    attention: parsed.data.attention || null,
    line1: parsed.data.line1,
    line2: parsed.data.line2 || null,
    city: parsed.data.city,
    state: parsed.data.state,
    postcode: parsed.data.postcode,
    country: parsed.data.country,
    gstin: parsed.data.gstin || null,
    isDefault: parsed.data.isDefault,
  };

  const existingId = parsed.data.id?.trim();

  if (existingId) {
    const owned = await prisma.companyAddress.findFirst({
      where: { id: existingId, companyId: actor.companyId, deletedAt: null },
      select: { id: true },
    });
    if (!owned) return { status: "error", message: "That address no longer exists." };
    await prisma.companyAddress.update({ where: { id: owned.id }, data });
  } else {
    await prisma.companyAddress.create({ data: { ...data, companyId: actor.companyId } });
  }

  /*
   * "Exactly one default per kind" is a rule about a set, so it is applied to
   * the set rather than declared on the row: everything else of this kind is
   * demoted after the write. Doing it the other way round would leave a window
   * with no default at all.
   */
  if (data.isDefault) {
    await prisma.companyAddress.updateMany({
      where: {
        companyId: actor.companyId,
        kind: data.kind,
        deletedAt: null,
        NOT: { id: existingId ?? "" },
      },
      data: { isDefault: false },
    });
  }

  await recordAudit({
    actorId: actor.user.id,
    action: existingId ? "company.address_updated" : "company.address_added",
    entityType: "CompanyAddress",
    entityId: existingId ?? null,
    ip: await clientIp(),
  });

  revalidatePath("/account/company/addresses");
  return { status: "success", message: "Address saved." };
}

export async function deleteAddress(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const actor = await requireCompanyManager("company.manage");
  if (!actor.ok) return actor.state;

  const id = String(formData.get("id") ?? "").trim();
  const owned = await prisma.companyAddress.findFirst({
    where: { id, companyId: actor.companyId, deletedAt: null },
    select: { id: true },
  });
  if (!owned) return { status: "error", message: "That address no longer exists." };

  // Soft delete: orders already shipped there refer to it, and a hard delete
  // would rewrite where they went.
  await prisma.companyAddress.update({
    where: { id: owned.id },
    data: { deletedAt: new Date(), isDefault: false },
  });

  await recordAudit({
    actorId: actor.user.id,
    action: "company.address_removed",
    entityType: "CompanyAddress",
    entityId: owned.id,
    ip: await clientIp(),
  });

  revalidatePath("/account/company/addresses");
  return { status: "success", message: "Address removed." };
}

// --------------------------------------------------------------- contacts ---

const contactSchema = z.object({
  kind: z.enum(["PROCUREMENT", "FINANCE", "IT", "ESCALATION"]),
  name: z.string().trim().max(120),
  email: z.string().trim().max(200),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
});

/**
 * Saves one functional contact, or clears it.
 *
 * A contact is not an account: the person who signs the purchase order often
 * has no reason to hold a login here, and quotations still have to reach them.
 * Clearing the name and address removes the contact rather than storing a blank
 * one.
 */
export async function saveContact(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const actor = await requireCompanyManager("company.manage");
  if (!actor.ok) return actor.state;

  const parsed = contactSchema.safeParse({
    kind: formData.get("kind"),
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
  });
  if (!parsed.success) return { status: "error", message: "That contact could not be saved." };

  const { kind, name, email, phone } = parsed.data;
  const clearing = name.length === 0 && email.length === 0;

  if (clearing) {
    await prisma.companyContact.deleteMany({ where: { companyId: actor.companyId, kind } });
    revalidatePath("/account/company");
    return { status: "success", message: "Contact removed." };
  }

  const checked = z
    .object({ name: z.string().trim().min(2, "Enter their name."), email: emailSchema })
    .safeParse({ name, email });
  if (!checked.success) {
    return {
      status: "error",
      message: "Please correct the highlighted fields.",
      fieldErrors: fieldErrorsOf(checked.error),
    };
  }

  const existing = await prisma.companyContact.findFirst({
    where: { companyId: actor.companyId, kind },
    select: { id: true },
  });

  if (existing) {
    await prisma.companyContact.update({
      where: { id: existing.id },
      data: { name: checked.data.name, email: checked.data.email, phone: phone || null },
    });
  } else {
    await prisma.companyContact.create({
      data: {
        companyId: actor.companyId,
        kind,
        name: checked.data.name,
        email: checked.data.email,
        phone: phone || null,
      },
    });
  }

  await recordAudit({
    actorId: actor.user.id,
    action: "company.contact_saved",
    entityType: "CompanyContact",
    entityId: existing?.id ?? null,
    metadata: { kind },
    ip: await clientIp(),
  });

  revalidatePath("/account/company");
  return { status: "success", message: "Contact saved." };
}
