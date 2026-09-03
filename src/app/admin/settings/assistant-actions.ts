"use server";

import { z } from "zod";

import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/guards";
import { recordAudit } from "@/lib/audit";
import { clientIp } from "@/lib/auth/request";
import { fieldErrorsOf } from "@/lib/validation";
import { hit, LIMITS } from "@/lib/auth/rate-limit";
import { encryptSecret } from "@/lib/secret-box";
import type { AdminActionState } from "@/lib/admin/types";

/**
 * Saving the chat assistant's configuration.
 *
 * ADMIN only, same as the payment and mail forms: this key can run up a real
 * bill against this business's Anthropic account, and a blank field means
 * "leave the stored one alone" for the same reason a blank Stripe secret does
 * — the form cannot show what is saved.
 */

const secretField = z
  .string()
  .trim()
  .max(200)
  .transform((value) => (value.length > 0 ? value : null))
  .nullable()
  .refine((value) => value === null || value.length >= 16, {
    message: "That looks too short to be a real API key.",
  });

const schema = z.object({
  enabled: z.coerce.boolean().default(false),
  assistantName: z.string().trim().min(1).max(40).default("Zoey"),
  anthropicApiKey: secretField,
  clearApiKey: z.coerce.boolean().default(false),
});

export async function saveAssistantSettings(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const admin = await requireAdmin();

  const limit = hit(`assistant:${admin.id}`, LIMITS.adminWrite.limit, LIMITS.adminWrite.windowSeconds);
  if (!limit.allowed) {
    return { status: "error", message: "Too many changes in a short period. Please slow down." };
  }

  const parsed = schema.safeParse({
    enabled: formData.get("enabled") === "on",
    assistantName: formData.get("assistantName") ?? "Zoey",
    anthropicApiKey: formData.get("anthropicApiKey") ?? "",
    clearApiKey: formData.get("clearApiKey") === "on",
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Please correct the highlighted fields.",
      fieldErrors: fieldErrorsOf(parsed.error),
    };
  }

  const input = parsed.data;
  const existing = await prisma.assistantSettings.findUnique({
    where: { id: "singleton" },
    select: { anthropicApiKey: true },
  });

  const apiKey = input.clearApiKey
    ? null
    : input.anthropicApiKey
      ? encryptSecret(input.anthropicApiKey)
      : (existing?.anthropicApiKey ?? null);

  if (input.enabled && !apiKey) {
    return {
      status: "error",
      message: "Add an Anthropic API key before switching the assistant on. Until then the widget stays hidden.",
    };
  }

  const data = {
    enabled: input.enabled,
    assistantName: input.assistantName,
    anthropicApiKey: apiKey,
    updatedById: admin.id,
  };

  await prisma.assistantSettings.upsert({
    where: { id: "singleton" },
    create: { id: "singleton", ...data },
    update: data,
  });

  await recordAudit({
    actorId: admin.id,
    action: "assistant.save",
    entityType: "AssistantSettings",
    entityId: "singleton",
    metadata: {
      enabled: input.enabled,
      assistantName: input.assistantName,
      apiKeyReplaced: Boolean(input.anthropicApiKey),
      apiKeyCleared: input.clearApiKey,
    },
    ip: await clientIp(),
  });

  return {
    status: "success",
    message: input.enabled
      ? `Saved. ${input.assistantName} is live on the public site.`
      : "Saved. The chat widget is off.",
  };
}
