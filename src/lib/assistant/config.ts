import "server-only";
import { cache } from "react";
import { prisma } from "@/lib/db";
import { decryptSecret } from "@/lib/secret-box";

/**
 * The chat assistant's configuration, following the same shape as every other
 * integration credential here (payments, mail, GSTIN): a singleton row, a
 * secret encrypted at rest, and a config getter that fails closed — returns
 * null rather than throwing — so a widget with nothing to say about itself
 * simply does not render, instead of a public page breaking because a key was
 * never entered.
 */
export type AssistantConfig = {
  apiKey: string;
  assistantName: string;
};

async function load() {
  return prisma.assistantSettings.findUnique({ where: { id: "singleton" } });
}

export const getAssistantConfig = cache(async (): Promise<AssistantConfig | null> => {
  const row = await load();
  if (!row || !row.enabled) return null;

  const apiKey = decryptSecret(row.anthropicApiKey);
  if (!apiKey) return null;

  return { apiKey, assistantName: row.assistantName || "Zoey" };
});

export async function assistantAvailable(): Promise<boolean> {
  return (await getAssistantConfig()) !== null;
}

export type AssistantSettingsView = {
  enabled: boolean;
  assistantName: string;
  /** Masked. The key itself never leaves the server. */
  apiKeyHint: string | null;
  /** True when enabled but the key is missing or could not be read. */
  brokenConfiguration: boolean;
};

export async function getAssistantSettingsView(): Promise<AssistantSettingsView> {
  const row = await load();
  const apiKey = decryptSecret(row?.anthropicApiKey);

  return {
    enabled: row?.enabled ?? false,
    assistantName: row?.assistantName || "Zoey",
    apiKeyHint: apiKey ? `sk-ant-…${apiKey.slice(-4)}` : null,
    brokenConfiguration: Boolean(row?.enabled) && !apiKey,
  };
}
