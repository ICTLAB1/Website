"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { recordAudit } from "@/lib/audit";
import { clientIp } from "@/lib/auth/request";
import { requireStaff } from "@/lib/auth/guards";
import { can } from "@/lib/auth/capabilities";
import { hit, LIMITS } from "@/lib/auth/rate-limit";
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
