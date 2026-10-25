"use server";

import { z } from "zod";

import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/guards";
import { recordAudit } from "@/lib/audit";
import { clientIp } from "@/lib/auth/request";
import { fieldErrorsOf } from "@/lib/validation";
import { hit, LIMITS } from "@/lib/auth/rate-limit";
import { encryptSecret } from "@/lib/secret-box";
import { getAssistantConfig } from "@/lib/assistant/config";
import { ASSISTANT_MODEL, createMessage } from "@/lib/assistant/anthropic";
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

/**
 * Asks the model one question and says exactly what came back.
 *
 * ## Why this exists at all
 *
 * The widget tells a visitor "something went wrong", and it should: the state
 * of this business's API credentials is not something to publish on a public
 * page. But that left the person who can fix it with the same single bit of
 * information as the visitor, and four very different causes behind it — a
 * revoked key, an account with no credit, a model the account cannot use, or a
 * request the API would not take. They are told apart by one line of text that
 * only ever existed in the container log.
 *
 * So this puts that line on the screen, for somebody who has already proved
 * they are an administrator. It is the shortest path from "the chat is broken"
 * to knowing which thing to go and fix.
 *
 * ## What it costs and what it touches
 *
 * One model call with a four-word prompt, no tools and a sixteen-token ceiling
 * — a fraction of a penny. It writes nothing: no conversation row, no lead, no
 * change to the stored settings. A test that altered what it was testing would
 * be worse than no test.
 *
 * Rate limited on the admin write budget, because it spends money on somebody
 * else's bill and a button that does that should not be holdable.
 */
export async function testAssistantConnection(
  _previous: AdminActionState,
  _formData: FormData,
): Promise<AdminActionState> {
  const admin = await requireAdmin();

  const limit = hit(`assistant-test:${admin.id}`, LIMITS.adminWrite.limit, LIMITS.adminWrite.windowSeconds);
  if (!limit.allowed) {
    return { status: "error", message: "Too many tests in a short period. Please slow down." };
  }

  const config = await getAssistantConfig();
  if (!config) {
    return {
      status: "error",
      message:
        "No usable configuration: either the assistant is switched off, or no API key is saved. Save a key above and try again.",
    };
  }

  const result = await createMessage(config.apiKey, {
    system: "Reply with the single word: ready.",
    messages: [{ role: "user", content: "ready?" }],
    maxTokens: 16,
  });

  if (result.ok) {
    return {
      status: "success",
      message: `The API accepted the request and answered. ${config.assistantName} is working — model ${ASSISTANT_MODEL}.`,
    };
  }

  /*
   * The API's own words, not a translation of them. Rephrasing "your credit
   * balance is too low" into a tidier sentence is how somebody ends up
   * replacing a key that was never the problem.
   */
  const said = [result.status ? `HTTP ${result.status}` : null, result.detail || null]
    .filter(Boolean)
    .join(" — ");

  return {
    status: "error",
    message:
      `The API refused the request${said ? `: ${said}` : "."}` +
      `\n\nModel asked for: ${ASSISTANT_MODEL}.` +
      "\n\n401 or an authentication message means the saved key is wrong or revoked — paste a new one above. " +
      "A message about credit or billing means the key is fine and the Anthropic account needs funding. " +
      "A message naming the model means this account cannot use it. " +
      "A timeout or a connection error means the server could not reach the API at all, which is a network question rather than a key one.",
  };
}
