"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { recordAudit } from "@/lib/audit";
import { clientIp } from "@/lib/auth/request";
import { guard, isFailure } from "@/lib/admin/guard";
import type { AdminActionState } from "@/lib/admin/types";
import { prisma } from "@/lib/db";

/**
 * The cadence for chasing an unanswered quotation.
 *
 * `guard("admin")` rather than "staff". This decides how often every customer
 * of this business is emailed by a machine, which is a different kind of
 * decision from chasing one quotation by hand — that one any member of sales
 * may take, and it lives on the quotation itself.
 */

/**
 * The schedule, typed as people write it: "3, 7, 14".
 *
 * A free-text list rather than three numbered boxes, because the number of
 * chases is part of the decision and a fixed set of boxes quietly fixes it.
 * Empty is allowed and means "manual only" — a legitimate answer that would
 * otherwise force somebody to switch the whole feature off.
 */
const scheduleSchema = z
  .string()
  .trim()
  .max(120)
  .transform((value) =>
    value
      .split(/[,\s]+/)
      .filter(Boolean)
      .map((part) => Number(part)),
  )
  .refine((days) => days.every((day) => Number.isInteger(day) && day >= 1 && day <= 365), {
    message: "Give whole numbers of days between 1 and 365, separated by commas.",
  })
  .refine((days) => days.length <= 6, {
    message: "Six follow-ups is already more than most customers will thank you for.",
  })
  .transform((days) => [...new Set(days)].sort((a, b) => a - b));

const settingsSchema = z.object({
  enabled: z.boolean(),
  schedule: scheduleSchema,
  minimumGapDays: z.coerce.number().int().min(1).max(90),
  stopOnReply: z.boolean(),
});

export async function saveFollowUpSettings(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const staff = await guard("admin");
  if (isFailure(staff)) return staff;

  const parsed = settingsSchema.safeParse({
    enabled: formData.get("enabled") === "on",
    schedule: formData.get("schedule") ?? "",
    minimumGapDays: formData.get("minimumGapDays") ?? "2",
    stopOnReply: formData.get("stopOnReply") === "on",
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Those settings could not be saved.",
    };
  }

  const data = {
    enabled: parsed.data.enabled,
    schedule: parsed.data.schedule,
    minimumGapDays: parsed.data.minimumGapDays,
    stopOnReply: parsed.data.stopOnReply,
    updatedById: staff.id,
  };

  await prisma.quoteFollowUpSettings.upsert({
    where: { id: "singleton" },
    create: { id: "singleton", ...data },
    update: data,
  });

  await recordAudit({
    actorId: staff.id,
    action: "admin.follow_up_settings_saved",
    entityType: "QuoteFollowUpSettings",
    entityId: "singleton",
    metadata: {
      enabled: parsed.data.enabled,
      schedule: parsed.data.schedule.join(","),
    },
    ip: await clientIp(),
  });

  revalidatePath("/admin/settings/follow-ups");
  return {
    status: "success",
    message: parsed.data.enabled
      ? `Saved. ${parsed.data.schedule.length} follow-up(s) will be sent on the schedule.`
      : "Saved. Automatic follow-ups are off; staff can still send one by hand.",
  };
}
