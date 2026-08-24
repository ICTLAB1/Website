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

/**
 * Two forms, one action, and each owns only its own half.
 *
 * Sending and receiving are configured in separate sections of the screen, and
 * a form only submits the fields it renders. So the section says which half is
 * being saved, and the other half's columns are left untouched — because the
 * alternatives are both wrong: reading a missing field as empty makes saving
 * the endpoint silently switch receiving off, and carrying the other half
 * through as hidden inputs puts a stored secret's field name in the page and
 * makes every save a write to both.
 */
const SECTIONS = ["send", "receive"] as const;

const sendSchema = z.object({
  endpointUrl: z.string().trim().max(500).optional(),
  signingSecret: z.string().trim().max(200).optional(),
  enabled: z.boolean(),
});

const receiveSchema = z.object({
  inboundSecret: z.string().trim().max(200).optional(),
  inboundEnabled: z.boolean(),
});

/** A form field that was not rendered is absent, not empty. */
const text = (formData: FormData, name: string): string | undefined => {
  const value = formData.get(name);
  return typeof value === "string" ? value : undefined;
};

export async function saveCrmSettings(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const staff = await guard("admin");
  if (isFailure(staff)) return staff;

  const requested = text(formData, "section") ?? "send";
  const section = (SECTIONS as readonly string[]).includes(requested)
    ? (requested as (typeof SECTIONS)[number])
    : "send";

  const existing = await prisma.crmSettings.findUnique({
    where: { id: "singleton" },
    select: { signingSecret: true, inboundSecret: true },
  });

  const data: {
    endpointUrl?: string | null;
    signingSecret?: string | null;
    enabled?: boolean;
    inboundSecret?: string | null;
    inboundEnabled?: boolean;
  } = {};

  let secretChanged = false;
  let inboundSecretChanged = false;

  if (section === "send") {
    const parsed = sendSchema.safeParse({
      endpointUrl: text(formData, "endpointUrl"),
      signingSecret: text(formData, "signingSecret"),
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
     * Treating it as a clear would silently disconnect the integration every
     * time somebody edited the endpoint.
     */
    const secret = parsed.data.signingSecret?.trim();
    secretChanged = Boolean(secret);

    data.endpointUrl = endpointUrl;
    data.enabled = parsed.data.enabled;
    data.signingSecret = secret ? encryptSecret(secret) : (existing?.signingSecret ?? null);
  } else {
    const parsed = receiveSchema.safeParse({
      inboundSecret: text(formData, "inboundSecret"),
      inboundEnabled: formData.get("inboundEnabled") === "on",
    });
    if (!parsed.success) {
      return { status: "error", message: "Please correct the highlighted fields." };
    }

    const inbound = parsed.data.inboundSecret?.trim();
    inboundSecretChanged = Boolean(inbound);
    const inboundSecret = inbound ? encryptSecret(inbound) : (existing?.inboundSecret ?? null);

    /*
     * Receiving cannot be switched on without a secret to verify with.
     *
     * Refused rather than quietly ignored: an administrator who ticks the box,
     * sees "Saved", and tells the CRM team to go ahead has been misled. The
     * route would answer 404 to every delivery and the far end would report an
     * outage nobody here could explain.
     */
    if (parsed.data.inboundEnabled && !inboundSecret) {
      return {
        status: "error",
        message: "Set the secret your CRM signs with before switching receiving on.",
        fieldErrors: { inboundSecret: ["Required to receive"] },
      };
    }

    data.inboundSecret = inboundSecret;
    data.inboundEnabled = parsed.data.inboundEnabled;
  }

  await prisma.crmSettings.upsert({
    where: { id: "singleton" },
    create: { id: "singleton", ...data, updatedById: staff.id },
    update: { ...data, updatedById: staff.id },
  });

  await recordAudit({
    actorId: staff.id,
    action: "admin.crm_settings_saved",
    entityType: "CrmSettings",
    entityId: "singleton",
    // The endpoint, never the secret. An audit log is read by more people than
    // the settings screen is.
    metadata: {
      section,
      endpointUrl: data.endpointUrl,
      enabled: data.enabled,
      secretChanged,
      inboundEnabled: data.inboundEnabled,
      inboundSecretChanged,
    },
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
