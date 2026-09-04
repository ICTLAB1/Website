"use server";

import { z } from "zod";

import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/guards";
import { recordAudit } from "@/lib/audit";
import { clientIp } from "@/lib/auth/request";
import { fieldErrorsOf } from "@/lib/validation";
import { hit, LIMITS } from "@/lib/auth/rate-limit";
import { encryptSecret } from "@/lib/secret-box";
import { getWhatsAppConfig } from "@/lib/whatsapp/config";
import { createMessageTemplate, sendTemplateMessage } from "@/lib/whatsapp/client";
import { WHATSAPP_TEMPLATES, orderConfirmationComponents } from "@/lib/whatsapp/templates";
import { normaliseWhatsAppPhone } from "@/lib/whatsapp/phone";
import { logger } from "@/lib/logger";
import type { AdminActionState } from "@/lib/admin/types";

const trimmed = (max: number) => z.string().trim().max(max);
const blankToNull = (max: number) =>
  trimmed(max)
    .transform((value) => (value.length > 0 ? value : null))
    .nullable();

const schema = z.object({
  enabled: z.coerce.boolean().default(false),
  phoneNumberId: blankToNull(40).refine((value) => value === null || /^\d+$/.test(value), {
    message: "The phone number ID is numeric, shown on the WhatsApp API Setup page.",
  }),
  businessAccountId: blankToNull(40).refine((value) => value === null || /^\d+$/.test(value), {
    message: "The WhatsApp Business Account ID is numeric, shown on the same page.",
  }),
  accessToken: blankToNull(1000),
  clearAccessToken: z.coerce.boolean().default(false),
});

export async function saveWhatsAppSettings(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const admin = await requireAdmin();

  const limit = hit(`whatsappsettings:${admin.id}`, LIMITS.adminWrite.limit, LIMITS.adminWrite.windowSeconds);
  if (!limit.allowed) {
    return { status: "error", message: "Too many changes in a short period. Please slow down." };
  }

  const parsed = schema.safeParse({
    enabled: formData.get("enabled") === "on",
    phoneNumberId: formData.get("phoneNumberId") ?? "",
    businessAccountId: formData.get("businessAccountId") ?? "",
    accessToken: formData.get("accessToken") ?? "",
    clearAccessToken: formData.get("clearAccessToken") === "on",
  });

  if (!parsed.success) {
    return { status: "error", message: "Please correct the highlighted fields.", fieldErrors: fieldErrorsOf(parsed.error) };
  }

  const input = parsed.data;
  const existing = await prisma.whatsAppSettings.findUnique({
    where: { id: "singleton" },
    select: { accessToken: true },
  });

  const accessToken = input.clearAccessToken
    ? null
    : input.accessToken
      ? encryptSecret(input.accessToken)
      : (existing?.accessToken ?? null);

  if (input.enabled) {
    const missing = [
      !input.phoneNumberId ? "the phone number ID" : null,
      !input.businessAccountId ? "the WhatsApp Business Account ID" : null,
      !accessToken ? "an access token" : null,
    ].filter((part): part is string => part !== null);

    if (missing.length > 0) {
      return { status: "error", message: `WhatsApp needs ${missing.join(", ")}. Nothing was saved.` };
    }
  }

  const data = {
    enabled: input.enabled,
    phoneNumberId: input.phoneNumberId,
    businessAccountId: input.businessAccountId,
    accessToken,
    updatedById: admin.id,
  };

  await prisma.whatsAppSettings.upsert({
    where: { id: "singleton" },
    create: { id: "singleton", ...data },
    update: data,
  });

  await recordAudit({
    actorId: admin.id,
    action: "settings.whatsapp_saved",
    entityType: "WhatsAppSettings",
    entityId: "singleton",
    metadata: {
      enabled: input.enabled,
      accessTokenReplaced: Boolean(input.accessToken),
      accessTokenCleared: input.clearAccessToken,
    },
    ip: await clientIp(),
  });

  return {
    status: "success",
    message: input.enabled
      ? "Saved. Before a real order or payment can message a customer, the two templates below need to be submitted and approved by Meta."
      : "Saved. WhatsApp notifications are switched off.",
  };
}

/**
 * Submits the order and payment confirmation templates for Meta's review.
 *
 * Idempotent by consequence rather than by design: Meta refuses a template
 * name already submitted under this WhatsApp Business Account, which surfaces
 * here as an ordinary per-template failure — "already exists" for one already
 * submitted is not a problem to hide, it is the useful half of the answer to
 * "did this work".
 */
export async function createWhatsAppTemplates(
  _previous: AdminActionState,
  _formData: FormData,
): Promise<AdminActionState> {
  const admin = await requireAdmin();

  const limit = hit(`whatsapptemplates:${admin.id}`, 5, 600);
  if (!limit.allowed) {
    return { status: "error", message: "Too many attempts in a short period. Please wait a few minutes." };
  }

  const config = await getWhatsAppConfig();
  if (!config) {
    return { status: "error", message: "Save and switch on WhatsApp with valid credentials first." };
  }

  const results: string[] = [];
  let anyFailed = false;

  for (const template of WHATSAPP_TEMPLATES) {
    const result = await createMessageTemplate(config, template);
    if (result.ok) {
      results.push(`${template.name}: ${result.status}`);
    } else {
      anyFailed = true;
      results.push(`${template.name}: ${result.detail}`);
      logger.warn("whatsapp_template_create_failed", { template: template.name, detail: result.detail });
    }
  }

  await recordAudit({
    actorId: admin.id,
    action: "settings.whatsapp_templates_created",
    entityType: "WhatsAppSettings",
    entityId: "singleton",
    metadata: { results },
    ip: await clientIp(),
  });

  return {
    status: anyFailed ? "error" : "success",
    message: `${results.join(" — ")}. Check WhatsApp Manager → Message templates for review status; a template cannot send until Meta approves it.`,
  };
}

/**
 * "Is WhatsApp actually working?" — sends the order-confirmation template to
 * the signed-in administrator's own number, the same trust model as the mail
 * test buttons: real detail from the provider, shown only to the one person
 * who can act on it.
 */
export async function sendTestWhatsAppMessage(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const admin = await requireAdmin();

  const limit = hit(`testwhatsapp:${admin.id}`, 5, 600);
  if (!limit.allowed) {
    return { status: "error", message: "Too many test messages. Please wait a few minutes before trying again." };
  }

  const config = await getWhatsAppConfig();
  if (!config) {
    return { status: "error", message: "Save and switch on WhatsApp with valid credentials first." };
  }

  const rawPhone = formData.get("testPhone");
  const to = normaliseWhatsAppPhone(typeof rawPhone === "string" ? rawPhone : null);
  if (!to) {
    return {
      status: "error",
      message: "Enter a phone number to send the test to — a 10-digit Indian mobile number, or one with its country code.",
      fieldErrors: { testPhone: ["Enter a valid phone number."] },
    };
  }

  const result = await sendTemplateMessage(config, {
    to,
    templateName: "order_confirmation",
    languageCode: "en_US",
    components: orderConfirmationComponents(admin.name ?? "there", "TEST-0001", "₹1.00"),
  });

  await recordAudit({
    actorId: admin.id,
    action: "settings.test_whatsapp",
    entityType: "WhatsAppSettings",
    entityId: "singleton",
    metadata: { delivered: result.ok },
    ip: await clientIp(),
  });

  if (result.ok) {
    return { status: "success", message: `Sent to ${to}. If it does not arrive, the template may still be awaiting Meta's approval.` };
  }

  logger.error("test_whatsapp_failed", { detail: result.detail });
  return { status: "error", message: `WhatsApp refused the message: ${result.detail}` };
}
