"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { recordAudit } from "@/lib/audit";
import { clientIp } from "@/lib/auth/request";
import { requireStaff } from "@/lib/auth/guards";
import { can } from "@/lib/auth/capabilities";
import { hit, LIMITS } from "@/lib/auth/rate-limit";
import { fieldErrorsOf, gstinSchema, phoneSchema, emailSchema } from "@/lib/validation";
import type { AdminActionState } from "@/lib/admin/types";

/**
 * Putting a name against a customer.
 *
 * An organisation with no account manager is one where a renewal notice goes to
 * a shared inbox and a quotation chase happens twice or not at all. The field
 * exists so every lead, quotation, order and ticket for that company has
 * somebody accountable for it.
 */

const schema = z.object({
  companyId: z.string().trim().min(1),
  /** Empty means "nobody", which is a legitimate state and not an error. */
  accountManagerId: z.string().trim().optional().or(z.literal("")),
});

export async function setAccountManager(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const staff = await requireStaff();
  if (!can(staff, "customers.write")) {
    return { status: "error", message: "Your role does not include changing customer records." };
  }

  const limit = hit(`admin:${staff.id}`, LIMITS.adminWrite.limit, LIMITS.adminWrite.windowSeconds);
  if (!limit.allowed) {
    return { status: "error", message: "Too many changes in a short period. Please slow down." };
  }

  const parsed = schema.safeParse({
    companyId: formData.get("companyId"),
    accountManagerId: formData.get("accountManagerId"),
  });
  if (!parsed.success) return { status: "error", message: "That change could not be applied." };

  const company = await prisma.company.findUnique({
    where: { id: parsed.data.companyId },
    select: { id: true, name: true, accountManagerId: true },
  });
  if (!company) return { status: "error", message: "That organisation no longer exists." };

  const managerId = parsed.data.accountManagerId?.trim() || null;

  if (managerId) {
    // Only somebody who works here, and only somebody who can actually see the
    // customer's records — otherwise the name against the account belongs to a
    // person with no way to act on it.
    const manager = await prisma.user.findFirst({
      where: { id: managerId, deletedAt: null, role: { not: "CUSTOMER" } },
      select: { id: true, name: true, role: true },
    });
    if (!manager || !can(manager, "customers.read")) {
      return { status: "error", message: "Choose a member of staff who handles customers." };
    }
  }

  await prisma.company.update({
    where: { id: company.id },
    data: { accountManagerId: managerId },
  });

  await recordAudit({
    actorId: staff.id,
    action: "admin.account_manager_set",
    entityType: "Company",
    entityId: company.id,
    metadata: { from: company.accountManagerId, to: managerId },
    ip: await clientIp(),
  });

  revalidatePath("/admin/organisations");
  return {
    status: "success",
    message: managerId
      ? `${company.name} is now managed by the selected account manager.`
      : `${company.name} no longer has an account manager.`,
  };
}

/**
 * The company record itself.
 *
 * Everything here used to be readable but not writable: an administrator
 * could see a customer's registered address and GSTIN, but never correct a
 * typo in either without a direct database write.
 */
const companySchema = z.object({
  companyId: z.string().trim().min(1),
  name: z.string().trim().min(1).max(200),
  pan: z.string().trim().max(20).optional(),
  gstin: gstinSchema.optional().or(z.literal("")),
  website: z.string().trim().max(300).optional(),
  phone: phoneSchema.optional().or(z.literal("")),
  addressLine1: z.string().trim().max(200).optional(),
  addressLine2: z.string().trim().max(200).optional(),
  city: z.string().trim().max(100).optional(),
  state: z.string().trim().max(100).optional(),
  postcode: z.string().trim().max(20).optional(),
  country: z.string().trim().max(100).default("India"),
  employeeCount: z.string().trim().optional(),
});

export async function saveCompany(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const staff = await requireStaff();
  if (!can(staff, "customers.write")) {
    return { status: "error", message: "Your role does not include changing customer records." };
  }

  const limit = hit(`admin:${staff.id}`, LIMITS.adminWrite.limit, LIMITS.adminWrite.windowSeconds);
  if (!limit.allowed) {
    return { status: "error", message: "Too many changes in a short period. Please slow down." };
  }

  const parsed = companySchema.safeParse({
    companyId: formData.get("companyId"),
    name: formData.get("name"),
    pan: formData.get("pan"),
    gstin: formData.get("gstin"),
    website: formData.get("website"),
    phone: formData.get("phone"),
    addressLine1: formData.get("addressLine1"),
    addressLine2: formData.get("addressLine2"),
    city: formData.get("city"),
    state: formData.get("state"),
    postcode: formData.get("postcode"),
    country: formData.get("country") || "India",
    employeeCount: formData.get("employeeCount"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Please correct the highlighted fields.",
      fieldErrors: fieldErrorsOf(parsed.error),
    };
  }

  const input = parsed.data;
  const employeeCount = input.employeeCount ? Number(input.employeeCount) : null;
  if (employeeCount !== null && (!Number.isInteger(employeeCount) || employeeCount < 0)) {
    return {
      status: "error",
      message: "Enter a whole number of employees, or leave it blank.",
      fieldErrors: { employeeCount: ["Enter a whole number, or leave blank."] },
    };
  }

  const company = await prisma.company.update({
    where: { id: input.companyId },
    data: {
      name: input.name,
      pan: input.pan || null,
      gstin: input.gstin || null,
      website: input.website || null,
      phone: input.phone || null,
      addressLine1: input.addressLine1 || null,
      addressLine2: input.addressLine2 || null,
      city: input.city || null,
      state: input.state || null,
      postcode: input.postcode || null,
      country: input.country,
      employeeCount,
    },
    select: { id: true },
  });

  await recordAudit({
    actorId: staff.id,
    action: "admin.company_updated",
    entityType: "Company",
    entityId: company.id,
    ip: await clientIp(),
  });

  revalidatePath(`/admin/organisations/${company.id}`);
  revalidatePath("/admin/organisations");
  return { status: "success", message: "Organisation details saved." };
}

// ──────────────────────────────────────────────────────────── addresses

const addressSchema = z.object({
  companyId: z.string().trim().min(1),
  label: z.string().trim().min(1).max(80),
  kind: z.enum(["BILLING", "DELIVERY", "BOTH"]),
  attention: z.string().trim().max(120).optional(),
  line1: z.string().trim().min(1).max(200),
  line2: z.string().trim().max(200).optional(),
  city: z.string().trim().min(1).max(100),
  state: z.string().trim().min(1).max(100),
  postcode: z.string().trim().min(1).max(20),
  country: z.string().trim().max(100).default("India"),
  gstin: gstinSchema.optional().or(z.literal("")),
  isDefault: z.coerce.boolean().default(false),
});

export async function saveCompanyAddress(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const staff = await requireStaff();
  if (!can(staff, "customers.write")) {
    return { status: "error", message: "Your role does not include changing customer records." };
  }

  const addressId = String(formData.get("addressId") ?? "").trim() || null;

  const parsed = addressSchema.safeParse({
    companyId: formData.get("companyId"),
    label: formData.get("label"),
    kind: formData.get("kind"),
    attention: formData.get("attention"),
    line1: formData.get("line1"),
    line2: formData.get("line2"),
    city: formData.get("city"),
    state: formData.get("state"),
    postcode: formData.get("postcode"),
    country: formData.get("country") || "India",
    gstin: formData.get("gstin"),
    isDefault: formData.get("isDefault") === "on",
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Please correct the highlighted fields.",
      fieldErrors: fieldErrorsOf(parsed.error),
    };
  }

  const input = parsed.data;
  const data = {
    companyId: input.companyId,
    label: input.label,
    kind: input.kind,
    attention: input.attention || null,
    line1: input.line1,
    line2: input.line2 || null,
    city: input.city,
    state: input.state,
    postcode: input.postcode,
    country: input.country,
    gstin: input.gstin || null,
    isDefault: input.isDefault,
  };

  await prisma.$transaction(async (tx) => {
    // "Exactly one default per kind" is a rule about the set, not a column
    // constraint — see the model's own comment — so it is enforced here.
    if (input.isDefault) {
      await tx.companyAddress.updateMany({
        where: {
          companyId: input.companyId,
          kind: input.kind,
          deletedAt: null,
          ...(addressId ? { id: { not: addressId } } : {}),
        },
        data: { isDefault: false },
      });
    }

    if (addressId) {
      await tx.companyAddress.update({ where: { id: addressId }, data });
    } else {
      await tx.companyAddress.create({ data });
    }
  });

  await recordAudit({
    actorId: staff.id,
    action: addressId ? "admin.company_address_updated" : "admin.company_address_created",
    entityType: "CompanyAddress",
    entityId: addressId ?? input.companyId,
    ip: await clientIp(),
  });

  revalidatePath(`/admin/organisations/${input.companyId}`);
  return { status: "success", message: "Address saved." };
}

export async function deleteCompanyAddress(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const staff = await requireStaff();
  if (!can(staff, "customers.write")) {
    return { status: "error", message: "Your role does not include changing customer records." };
  }

  const companyId = String(formData.get("companyId") ?? "").trim();
  const addressId = String(formData.get("addressId") ?? "").trim();
  if (!companyId || !addressId) return { status: "error", message: "Nothing to delete." };

  // Soft delete, matching the model's own deletedAt column — an address
  // named on a past quotation or order should still read back correctly
  // there, not point at a row that no longer exists.
  await prisma.companyAddress.update({
    where: { id: addressId, companyId },
    data: { deletedAt: new Date(), isDefault: false },
  });

  await recordAudit({
    actorId: staff.id,
    action: "admin.company_address_deleted",
    entityType: "CompanyAddress",
    entityId: addressId,
    ip: await clientIp(),
  });

  revalidatePath(`/admin/organisations/${companyId}`);
  return { status: "success", message: "Address removed." };
}

// ─────────────────────────────────────────────────────────────── contacts

const contactSchema = z.object({
  companyId: z.string().trim().min(1),
  kind: z.enum(["PROCUREMENT", "FINANCE", "IT", "ESCALATION"]),
  name: z.string().trim().min(1).max(160),
  email: emailSchema,
  phone: phoneSchema.optional().or(z.literal("")),
  note: z.string().trim().max(500).optional(),
});

export async function saveCompanyContact(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const staff = await requireStaff();
  if (!can(staff, "customers.write")) {
    return { status: "error", message: "Your role does not include changing customer records." };
  }

  const contactId = String(formData.get("contactId") ?? "").trim() || null;

  const parsed = contactSchema.safeParse({
    companyId: formData.get("companyId"),
    kind: formData.get("kind"),
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    note: formData.get("note"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Please correct the highlighted fields.",
      fieldErrors: fieldErrorsOf(parsed.error),
    };
  }

  const input = parsed.data;

  const clash = await prisma.companyContact.findFirst({
    where: {
      companyId: input.companyId,
      kind: input.kind,
      email: input.email,
      ...(contactId ? { id: { not: contactId } } : {}),
    },
    select: { id: true },
  });
  if (clash) {
    return {
      status: "error",
      message: "This company already has that person listed for this role.",
      fieldErrors: { email: ["Already listed — edit that row instead."] },
    };
  }

  const data = {
    companyId: input.companyId,
    kind: input.kind,
    name: input.name,
    email: input.email,
    phone: input.phone || null,
    note: input.note || null,
  };

  if (contactId) {
    await prisma.companyContact.update({ where: { id: contactId }, data });
  } else {
    await prisma.companyContact.create({ data });
  }

  await recordAudit({
    actorId: staff.id,
    action: contactId ? "admin.company_contact_updated" : "admin.company_contact_created",
    entityType: "CompanyContact",
    entityId: contactId ?? input.companyId,
    ip: await clientIp(),
  });

  revalidatePath(`/admin/organisations/${input.companyId}`);
  return { status: "success", message: "Contact saved." };
}

export async function deleteCompanyContact(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const staff = await requireStaff();
  if (!can(staff, "customers.write")) {
    return { status: "error", message: "Your role does not include changing customer records." };
  }

  const companyId = String(formData.get("companyId") ?? "").trim();
  const contactId = String(formData.get("contactId") ?? "").trim();
  if (!companyId || !contactId) return { status: "error", message: "Nothing to delete." };

  await prisma.companyContact.delete({ where: { id: contactId, companyId } });

  await recordAudit({
    actorId: staff.id,
    action: "admin.company_contact_deleted",
    entityType: "CompanyContact",
    entityId: contactId,
    ip: await clientIp(),
  });

  revalidatePath(`/admin/organisations/${companyId}`);
  return { status: "success", message: "Contact removed." };
}
