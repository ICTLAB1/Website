import "server-only";
import { cache } from "react";
import { prisma } from "@/lib/db";
import { decryptSecret, secretHint } from "@/lib/secret-box";
import { logger } from "@/lib/logger";
import type { WhatsAppConfig } from "@/lib/whatsapp/client";

const load = cache(async () => {
  try {
    return await prisma.whatsAppSettings.findUnique({ where: { id: "singleton" } });
  } catch (error) {
    logger.warn(
      "whatsapp_settings_unreadable",
      error instanceof Error ? { message: error.message.split("\n")[0] } : {},
    );
    return null;
  }
});

/** The usable configuration, or null if a WhatsApp message cannot be sent right now. */
export const getWhatsAppConfig = cache(async (): Promise<WhatsAppConfig | null> => {
  const row = await load();
  if (!row?.enabled) return null;

  const phoneNumberId = row.phoneNumberId?.trim() || null;
  const businessAccountId = row.businessAccountId?.trim() || null;
  const accessToken = decryptSecret(row.accessToken);

  if (!phoneNumberId || !businessAccountId || !accessToken) {
    logger.warn("whatsapp_enabled_but_not_configured", {});
    return null;
  }

  return { phoneNumberId, businessAccountId, accessToken };
});

export async function whatsAppConfigured(): Promise<boolean> {
  return (await getWhatsAppConfig()) !== null;
}

export type WhatsAppSettingsView = {
  enabled: boolean;
  phoneNumberId: string;
  businessAccountId: string;
  /** Masked. The token itself never leaves the server. */
  accessTokenHint: string | null;
  brokenConfiguration: boolean;
  updatedAt: Date | null;
};

export async function getWhatsAppSettingsView(): Promise<WhatsAppSettingsView> {
  const row = await load();
  const accessToken = decryptSecret(row?.accessToken);

  return {
    enabled: row?.enabled ?? false,
    phoneNumberId: row?.phoneNumberId ?? "",
    businessAccountId: row?.businessAccountId ?? "",
    accessTokenHint: accessToken ? secretHint(accessToken) : null,
    brokenConfiguration:
      Boolean(row?.enabled) && !(row?.phoneNumberId?.trim() && row?.businessAccountId?.trim() && accessToken),
    updatedAt: row?.updatedAt ?? null,
  };
}
