"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { recordAudit } from "@/lib/audit";
import { clientIp } from "@/lib/auth/request";
import { guard, isFailure } from "@/lib/admin/guard";
import type { AdminActionState } from "@/lib/admin/types";
import { fieldErrorsOf } from "@/lib/validation";
import {
  completeActivity,
  createDeal,
  createDealFromEnquiry,
  logActivity,
  moveDealStage,
  updateDeal,
} from "@/lib/crm/deal-service";
import { ACTIVITY_KINDS, DEAL_SOURCES, DEAL_STAGES } from "@/lib/crm/pipeline";

/**
 * Writing to the pipeline.
 *
 * `guard("staff")` throughout: the pipeline is what the sales team does all
 * day, and an admin-only pipeline is a pipeline the sales team keeps in a
 * spreadsheet instead. Every action still re-checks on the server — the
 * navigation hiding a link is not a control.
 *
 * The rules that decide whether a write is allowed live in
 * `lib/crm/deal-service`, not here. These functions parse a form and hand it
 * over. That division is what lets the service be exercised without a browser,
 * and stops a second entry point (an import, a webhook) from having its own
 * slightly different idea of when a loss needs a reason.
 */

/** Rupees as typed, into paise. Shared by the two forms that take an amount. */
const amount = z
  .string()
  .trim()
  .regex(/^\d*(\.\d{1,2})?$/, "Enter an amount such as 250000 or 250000.50")
  .transform((value) => (value === "" ? 0 : Math.round(Number(value) * 100)));

/**
 * A date as typed by a person, or nothing.
 *
 * Parsed at UTC midday rather than midnight. A date-only value stored at
 * midnight UTC displays as the previous day for anyone behind UTC, and this
 * business is at +05:30 — midday is far enough from both edges that no
 * timezone in use turns "close on the 30th" into the 29th or the 31st.
 */
const dateOnly = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value ? new Date(`${value}T12:00:00.000Z`) : null))
  .refine((value) => value === null || !Number.isNaN(value.getTime()), "That is not a date.");

const dealSchema = z.object({
  title: z.string().trim().min(1, "Give this a title.").max(160),
  companyId: z.string().trim().optional(),
  companyName: z.string().trim().max(160).optional(),
  contactName: z.string().trim().max(120).optional(),
  contactEmail: z.union([z.literal(""), z.string().trim().email("That is not an email address.")]).optional(),
  contactPhone: z.string().trim().max(40).optional(),
  ownerId: z.string().trim().optional(),
  source: z.enum(DEAL_SOURCES as [string, ...string[]]).optional(),
  expectedValue: amount.optional(),
  expectedCloseOn: dateOnly,
  notes: z.string().trim().max(4000).optional(),
});

export async function createDealAction(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const staff = await guard("staff");
  if (isFailure(staff)) return staff;

  const parsed = dealSchema.safeParse({
    title: formData.get("title"),
    companyId: formData.get("companyId"),
    companyName: formData.get("companyName"),
    contactName: formData.get("contactName"),
    contactEmail: formData.get("contactEmail"),
    contactPhone: formData.get("contactPhone"),
    ownerId: formData.get("ownerId"),
    source: formData.get("source") || undefined,
    expectedValue: formData.get("expectedValue") ?? "",
    expectedCloseOn: formData.get("expectedCloseOn") ?? "",
    notes: formData.get("notes"),
  });
  if (!parsed.success) {
    return {
      status: "error",
      message: "Please correct the highlighted fields.",
      fieldErrors: fieldErrorsOf(parsed.error),
    };
  }

  const result = await createDeal({
    title: parsed.data.title,
    source: parsed.data.source as never,
    companyId: parsed.data.companyId || null,
    companyName: parsed.data.companyName || null,
    contactName: parsed.data.contactName || null,
    contactEmail: parsed.data.contactEmail || null,
    contactPhone: parsed.data.contactPhone || null,
    // Unowned deals are how a pipeline stops being anybody's job, so it
    // defaults to whoever created it rather than to nobody.
    ownerId: parsed.data.ownerId || staff.id,
    expectedValueMinor: parsed.data.expectedValue ?? 0,
    expectedCloseOn: parsed.data.expectedCloseOn,
    notes: parsed.data.notes || null,
    actorId: staff.id,
  });
  if (!result.ok) return { status: "error", message: result.reason };

  await recordAudit({
    actorId: staff.id,
    action: "admin.deal_created",
    entityType: "Deal",
    entityId: result.reference,
    metadata: { title: parsed.data.title },
    ip: await clientIp(),
  });

  revalidatePath("/admin/pipeline");
  redirect(`/admin/pipeline/${result.reference}`);
}

export async function updateDealAction(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const staff = await guard("staff");
  if (isFailure(staff)) return staff;

  const reference = String(formData.get("reference") ?? "").trim();
  if (!reference) return { status: "error", message: "No deal specified." };

  const parsed = dealSchema.omit({ companyId: true, companyName: true }).safeParse({
    title: formData.get("title"),
    contactName: formData.get("contactName"),
    contactEmail: formData.get("contactEmail"),
    contactPhone: formData.get("contactPhone"),
    ownerId: formData.get("ownerId"),
    source: formData.get("source") || undefined,
    expectedValue: formData.get("expectedValue") ?? "",
    expectedCloseOn: formData.get("expectedCloseOn") ?? "",
    notes: formData.get("notes"),
  });
  if (!parsed.success) {
    return {
      status: "error",
      message: "Please correct the highlighted fields.",
      fieldErrors: fieldErrorsOf(parsed.error),
    };
  }

  const result = await updateDeal({
    reference,
    title: parsed.data.title,
    source: parsed.data.source as never,
    ownerId: parsed.data.ownerId || null,
    expectedValueMinor: parsed.data.expectedValue ?? 0,
    expectedCloseOn: parsed.data.expectedCloseOn,
    contactName: parsed.data.contactName ?? null,
    contactEmail: parsed.data.contactEmail ?? null,
    contactPhone: parsed.data.contactPhone ?? null,
    notes: parsed.data.notes ?? null,
    actorId: staff.id,
  });
  if (!result.ok) return { status: "error", message: result.reason };

  await recordAudit({
    actorId: staff.id,
    action: "admin.deal_updated",
    entityType: "Deal",
    entityId: reference,
    ip: await clientIp(),
  });

  revalidatePath("/admin/pipeline");
  revalidatePath(`/admin/pipeline/${reference}`);
  return { status: "success", message: "Deal updated." };
}

export async function moveDealStageAction(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const staff = await guard("staff");
  if (isFailure(staff)) return staff;

  const parsed = z
    .object({
      reference: z.string().trim().min(1),
      stage: z.enum(DEAL_STAGES as [string, ...string[]]),
      lostReason: z.string().trim().max(600).optional(),
    })
    .safeParse({
      reference: formData.get("reference"),
      stage: formData.get("stage"),
      lostReason: formData.get("lostReason"),
    });
  if (!parsed.success) {
    return { status: "error", message: "That is not a stage this pipeline has." };
  }

  const result = await moveDealStage({
    reference: parsed.data.reference,
    stage: parsed.data.stage as never,
    lostReason: parsed.data.lostReason,
    actorId: staff.id,
  });
  if (!result.ok) {
    return { status: "error", message: result.reason, fieldErrors: { lostReason: ["Required"] } };
  }

  await recordAudit({
    actorId: staff.id,
    action: "admin.deal_stage_changed",
    entityType: "Deal",
    entityId: parsed.data.reference,
    metadata: { stage: parsed.data.stage },
    ip: await clientIp(),
  });

  revalidatePath("/admin/pipeline");
  revalidatePath(`/admin/pipeline/${parsed.data.reference}`);
  return { status: "success", message: `Moved to ${parsed.data.stage}.` };
}

export async function createDealFromEnquiryAction(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const staff = await guard("staff");
  if (isFailure(staff)) return staff;

  const reference = String(formData.get("reference") ?? "").trim();
  if (!reference) return { status: "error", message: "No enquiry specified." };

  const result = await createDealFromEnquiry({
    enquiryReference: reference,
    ownerId: staff.id,
    actorId: staff.id,
  });
  if (!result.ok) return { status: "error", message: result.reason };

  await recordAudit({
    actorId: staff.id,
    action: "admin.deal_created",
    entityType: "Deal",
    entityId: result.reference,
    metadata: { fromEnquiry: reference },
    ip: await clientIp(),
  });

  revalidatePath("/admin/pipeline");
  revalidatePath(`/admin/enquiries/${reference}`);
  redirect(`/admin/pipeline/${result.reference}`);
}

const activitySchema = z.object({
  kind: z.enum(ACTIVITY_KINDS as [string, ...string[]]),
  subject: z.string().trim().min(1, "Say what happened.").max(200),
  body: z.string().trim().max(4000).optional(),
  occurredOn: dateOnly,
  dueOn: dateOnly,
  dealId: z.string().trim().optional(),
  companyId: z.string().trim().optional(),
});

export async function logActivityAction(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const staff = await guard("staff");
  if (isFailure(staff)) return staff;

  const parsed = activitySchema.safeParse({
    kind: formData.get("kind"),
    subject: formData.get("subject"),
    body: formData.get("body"),
    occurredOn: formData.get("occurredOn") ?? "",
    dueOn: formData.get("dueOn") ?? "",
    dealId: formData.get("dealId"),
    companyId: formData.get("companyId"),
  });
  if (!parsed.success) {
    return {
      status: "error",
      message: "Please correct the highlighted fields.",
      fieldErrors: fieldErrorsOf(parsed.error),
    };
  }

  const result = await logActivity({
    kind: parsed.data.kind as never,
    subject: parsed.data.subject,
    body: parsed.data.body || null,
    occurredAt: parsed.data.occurredOn ?? undefined,
    dueAt: parsed.data.dueOn,
    dealId: parsed.data.dealId || null,
    companyId: parsed.data.companyId || null,
    actorId: staff.id,
  });
  if (!result.ok) return { status: "error", message: result.reason };

  const reference = String(formData.get("reference") ?? "").trim();
  if (reference) revalidatePath(`/admin/pipeline/${reference}`);
  revalidatePath("/admin/pipeline");
  revalidatePath("/admin/follow-ups");
  return { status: "success", message: "Logged." };
}

export async function completeFollowUpAction(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const staff = await guard("staff");
  if (isFailure(staff)) return staff;

  const id = String(formData.get("activityId") ?? "").trim();
  if (!id) return { status: "error", message: "No follow-up specified." };

  const result = await completeActivity({ id, actorId: staff.id });
  if (!result.ok) return { status: "error", message: result.reason };

  revalidatePath("/admin/follow-ups");
  const reference = String(formData.get("reference") ?? "").trim();
  if (reference) revalidatePath(`/admin/pipeline/${reference}`);
  return { status: "success", message: "Done." };
}
