"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { requireCapability } from "@/lib/auth/guards";
import { recordAudit } from "@/lib/audit";
import { clientIp } from "@/lib/auth/request";
import { hit, LIMITS } from "@/lib/auth/rate-limit";
import { fieldErrorsOf } from "@/lib/validation";
import type { AdminActionState } from "@/lib/admin/types";

/**
 * Marking a renewal's own state — separate from raising the quotation that
 * usually causes it.
 *
 * Moving a renewal to QUOTED normally happens as a side effect of raising a
 * quotation against the licence (see Quotes), and RENEWED as a side effect of
 * that quotation being accepted. This exists for what neither of those covers:
 * a renewal the customer has said no to, one that lapsed with no response, a
 * quoted amount worth recording before the quotation itself exists, or a note
 * worth leaving for whoever looks at this next.
 */
const schema = z.object({
  renewalId: z.string().trim().min(1),
  status: z.enum(["UPCOMING", "QUOTED", "RENEWED", "LAPSED", "DECLINED"]),
  quotedMinor: z.string().trim().optional(),
  notes: z.string().trim().max(2000).optional(),
});

export async function updateRenewal(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const staff = await requireCapability("customers.write");

  const limit = hit(`admin:${staff.id}`, LIMITS.adminWrite.limit, LIMITS.adminWrite.windowSeconds);
  if (!limit.allowed) {
    return { status: "error", message: "Too many changes in a short period. Please slow down." };
  }

  const parsed = schema.safeParse({
    renewalId: formData.get("renewalId"),
    status: formData.get("status"),
    quotedMinor: formData.get("quotedMinor"),
    notes: formData.get("notes"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Please correct the highlighted fields.",
      fieldErrors: fieldErrorsOf(parsed.error),
    };
  }

  const input = parsed.data;
  let quotedMinor: number | null = null;
  if (input.quotedMinor && input.quotedMinor.trim() !== "") {
    const rupees = Number(input.quotedMinor);
    if (!Number.isFinite(rupees) || rupees < 0) {
      return {
        status: "error",
        message: "Enter a valid quoted amount, or leave it blank.",
        fieldErrors: { quotedMinor: ["Enter an amount such as 12500, or leave blank."] },
      };
    }
    quotedMinor = Math.round(rupees * 100);
  }

  const renewal = await prisma.renewal.update({
    where: { id: input.renewalId },
    data: { status: input.status, quotedMinor, notes: input.notes || null },
    select: { reference: true },
  });

  await recordAudit({
    actorId: staff.id,
    action: "admin.renewal_updated",
    entityType: "Renewal",
    entityId: renewal.reference,
    metadata: { status: input.status },
    ip: await clientIp(),
  });

  revalidatePath("/admin/renewals");
  return { status: "success", message: `${renewal.reference} updated.` };
}
