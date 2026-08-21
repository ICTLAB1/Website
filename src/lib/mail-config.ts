import "server-only";
import { cache } from "react";
import { prisma } from "@/lib/db";
import { smtp } from "@/lib/env";
import { decryptSecret, secretHint } from "@/lib/secret-box";
import { logger } from "@/lib/logger";

/**
 * Which mail server this deployment sends through.
 *
 * Stored settings win; anything left unset falls back to its environment
 * variable. That rule is what lets this ship onto a running deployment without
 * a moment where email stops working: nothing is stored on the first deploy, so
 * every field falls through to the `.env` values that were already there, and
 * an administrator can then change them one at a time from the panel.
 *
 * Read with React's `cache` rather than the persistent one. A decrypted SMTP
 * password should live for one request and no longer, and mail is sent from a
 * handful of paths where there is nothing to gain from caching between
 * requests.
 */

export type MailConfig = {
  host: string | null;
  port: number;
  secure: boolean;
  username: string | null;
  password: string | null;
  from: string | null;
  salesNotification: string | null;
};

const load = cache(async () => {
  try {
    return await prisma.mailSettings.findUnique({ where: { id: "singleton" } });
  } catch (error) {
    /*
     * A database that cannot be read must not take email down with it.
     *
     * The environment values are still there, and falling back to them is
     * strictly better than sending nothing — the alternative is that a
     * transient database problem silently stops every order confirmation.
     */
    logger.warn(
      "mail_settings_unreadable",
      error instanceof Error ? { message: error.message.split("\n")[0] } : {},
    );
    return null;
  }
});

/** Stored value if set, environment value otherwise. */
function pick(stored: string | null | undefined, fallback: string | undefined | null): string | null {
  const value = stored?.trim();
  if (value) return value;
  return fallback?.trim() || null;
}

export const getMailConfig = cache(async (): Promise<MailConfig> => {
  const row = await load();

  /*
   * The From header is assembled here rather than stored as one string.
   *
   * A display name and an address are two different things to a mail server —
   * providers check the address against the mailbox you signed in as and
   * ignore the name — so asking for them separately means an administrator
   * cannot accidentally produce `TechZoid <TechZoid>` or paste a name into a
   * field that must contain an address.
   */
  const fromAddress = pick(row?.fromAddress, smtp.from());
  const fromName = row?.fromName?.trim() || null;
  const from =
    fromAddress && fromName && !fromAddress.includes("<")
      ? `${fromName} <${fromAddress}>`
      : fromAddress;

  return {
    host: pick(row?.host, smtp.host()),
    port: row?.port ?? smtp.port(),
    secure: row?.secure ?? smtp.secure(),
    username: pick(row?.username, smtp.user()),
    password: decryptSecret(row?.password) ?? smtp.password() ?? null,
    from,
    salesNotification: pick(row?.salesNotificationEmail, smtp.salesNotification()),
  };
});

/** True when there is both a server to send through and an address to send as. */
export async function mailIsConfigured(): Promise<boolean> {
  const config = await getMailConfig();
  return Boolean(config.host && config.from);
}

export type MailSettingsView = {
  host: string;
  port: number;
  secure: boolean;
  username: string;
  /** Masked. The password itself never leaves the server. */
  passwordHint: string | null;
  fromAddress: string;
  fromName: string;
  salesNotificationEmail: string;
  /**
   * True when a field is coming from the environment rather than from a stored
   * value, so the form can say so instead of showing a value that looks stored
   * and then behaving differently when cleared.
   */
  usingEnvironment: boolean;
  updatedAt: Date | null;
};

/**
 * What the admin form is allowed to see.
 *
 * The password is reduced to a hint before it crosses into a component, so
 * nothing that renders is ever handed one.
 */
export async function getMailSettingsView(): Promise<MailSettingsView> {
  const row = await load();
  const effective = await getMailConfig();
  const stored = decryptSecret(row?.password);

  return {
    host: row?.host ?? "",
    port: row?.port ?? effective.port,
    secure: row?.secure ?? effective.secure,
    username: row?.username ?? "",
    passwordHint: stored ? secretHint(stored) : null,
    fromAddress: row?.fromAddress ?? "",
    fromName: row?.fromName ?? "",
    salesNotificationEmail: row?.salesNotificationEmail ?? "",
    usingEnvironment: !row?.host && Boolean(smtp.host()),
    updatedAt: row?.updatedAt ?? null,
  };
}
