"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { recordAudit } from "@/lib/audit";
import { clientIp } from "@/lib/auth/request";
import { guard, isFailure } from "@/lib/admin/guard";
import type { AdminActionState } from "@/lib/admin/types";
import { encryptSecret } from "@/lib/secret-box";
import { endpointProblem } from "@/lib/crm/events";
import { deliverPendingCrmEvents } from "@/lib/crm/outbox";

/**
 * Where deal events are sent, and whether they are sent at all.
 *
 * `guard("admin")` rather than "staff", unlike the rest of the pipeline. This
 * points the business's commercial data at a URL; that is a different kind of
 * decision from moving a deal to Negotiation, and it belongs with the other
 * integration credentials.
 */

const settingsSchema = z.object({
  endpointUrl: z.string().trim().max(500).optional(),
  signingSecret: z.string().trim().max(200).optional(),
  enabled: z.coerce.boolean().default(false),
});

export async function saveCrmSettings(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const staff = await guard("admin");
  if (isFailure(staff)) return staff;

  const parsed = settingsSchema.safeParse({
    endpointUrl: formData.get("endpointUrl"),
    signingSecret: formData.get("signingSecret"),
    enabled: formData.get("enabled") === "on",
  });
  if (!parsed.success) {
    return { status: "error", message: "Please correct the highlighted fields." };
  }

  const endpointUrl = parsed.data.endpointUrl?.trim() || null;
  if (endpointUrl) {
    const problem = endpointProblem(endpointUrl);
    if (problem) {
      return { status: "error", message: problem, fieldErrors: { endpointUrl: ["Not usable"] } };
    }
  }

  /*
   * A blank secret field leaves the stored one alone rather than clearing it.
   *
   * The field renders empty because the secret is never sent to the browser,
   * so "blank" means "not retyped" far more often than it means "remove it".
   * Treating it as a clear would silently disconnect the integration every time
   * somebody edited the endpoint.
   */
  const secret = parsed.data.signingSecret?.trim();
  const existing = await prisma.crmSettings.findUnique({
    where: { id: "singleton" },
    select: { signingSecret: true },
  });

  const signingSecret = secret ? encryptSecret(secret) : (existing?.signingSecret ?? null);

  await prisma.crmSettings.upsert({
    where: { id: "singleton" },
    create: {
      id: "singleton",
      endpointUrl,
      signingSecret,
      enabled: parsed.data.enabled,
      updatedById: staff.id,
    },
    update: { endpointUrl, signingSecret, enabled: parsed.data.enabled, updatedById: staff.id },
  });

  await recordAudit({
    actorId: staff.id,
    action: "admin.crm_settings_saved",
    entityType: "CrmSettings",
    entityId: "singleton",
    // The endpoint, never the secret. An audit log is read by more people than
    // the settings screen is.
    metadata: { endpointUrl, enabled: parsed.data.enabled, secretChanged: Boolean(secret) },
    ip: await clientIp(),
  });

  revalidatePath("/admin/settings/crm");
  return { status: "success", message: "Saved." };
}

/**
 * Sends whatever is waiting, now.
 *
 * Here because there is no background worker in this application. The scheduled
 * route (`/api/crm/deliver`) does the same thing on a timer; this button is
 * what somebody presses after fixing an endpoint, rather than waiting to find
 * out whether the fix worked.
 */
export async function deliverCrmEventsAction(
  _previous: AdminActionState,
  _formData: FormData,
): Promise<AdminActionState> {
  const staff = await guard("admin");
  if (isFailure(staff)) return staff;

  const report = await deliverPendingCrmEvents();

  revalidatePath("/admin/settings/crm");

  if (report.skipped) {
    return { status: "error", message: `Nothing sent. ${report.skipped}` };
  }
  if (report.attempted === 0) {
    return { status: "success", message: "Nothing was waiting." };
  }

  return {
    status: report.delivered === report.attempted ? "success" : "error",
    message:
      `${report.delivered} of ${report.attempted} delivered` +
      (report.failed ? `, ${report.failed} will be retried` : "") +
      (report.abandoned ? `, ${report.abandoned} given up on` : "") +
      ".",
  };
}
