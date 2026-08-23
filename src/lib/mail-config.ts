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
  provider: "SMTP" | "MICROSOFT_GRAPH";
  /** Present and complete only when the provider is MICROSOFT_GRAPH. */
  graph: {
    tenantId: string;
    clientId: string;
    clientSecret: string;
    sender: string;
  } | null;
  /** Display name for the From header. Graph uses the mailbox's own otherwise. */
  fromName: string | null;
  host: string | null;
  port: number;
  secure: boolean;
  username: string | null;
  password: string | null;
  from: string | null;
  salesNotification: string | null;
  /** Copied on every quotation. Null means nobody is. */
  quoteCopy: string | null;
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
  // On Graph the sending mailbox *is* the From address; Microsoft will not let
  // an application send as an address it has no mailbox for, so taking it from
  // a separate field would only create a way to configure a rejection.
  const fromAddress =
    row?.provider === "MICROSOFT_GRAPH"
      ? (row.graphSender?.trim() || null)
      : pick(row?.fromAddress, smtp.from());
  const fromName = row?.fromName?.trim() || null;
  const from =
    fromAddress && fromName && !fromAddress.includes("<")
      ? `${fromName} <${fromAddress}>`
      : fromAddress;

  /*
   * Graph is offered only when every part of it is present.
   *
   * A half-configured gateway that silently falls back to SMTP would be the
   * worst outcome: an administrator switches to Microsoft, saves without a
   * secret, and mail keeps going out over the old path while the panel says
   * Microsoft. Incomplete means the graph block is null, and `mailIsConfigured`
   * reports the deployment as unable to send — which is true.
   */
  const graphSecret = decryptSecret(row?.graphClientSecret);
  const graph =
    row?.provider === "MICROSOFT_GRAPH" &&
    row.graphTenantId &&
    row.graphClientId &&
    graphSecret &&
    row.graphSender
      ? {
          tenantId: row.graphTenantId,
          clientId: row.graphClientId,
          clientSecret: graphSecret,
          sender: row.graphSender,
        }
      : null;

  return {
    provider: row?.provider ?? "SMTP",
    graph,
    fromName,
    host: pick(row?.host, smtp.host()),
    port: row?.port ?? smtp.port(),
    secure: row?.secure ?? smtp.secure(),
    username: pick(row?.username, smtp.user()),
    password: decryptSecret(row?.password) ?? smtp.password() ?? null,
    from,
    salesNotification: pick(row?.salesNotificationEmail, smtp.salesNotification()),
    quoteCopy: row?.quoteCopyEmail?.trim() || null,
  };
});

/** True when there is both a server to send through and an address to send as. */
export async function mailIsConfigured(): Promise<boolean> {
  const config = await getMailConfig();
  if (config.provider === "MICROSOFT_GRAPH") return config.graph !== null;
  return Boolean(config.host && config.from);
}

export type MailSettingsView = {
  provider: "SMTP" | "MICROSOFT_GRAPH";
  graphTenantId: string;
  graphClientId: string;
  /** Masked. The secret itself never leaves the server. */
  graphClientSecretHint: string | null;
  graphSender: string;
  host: string;
  port: number;
  secure: boolean;
  username: string;
  /** Masked. The password itself never leaves the server. */
  passwordHint: string | null;
  fromAddress: string;
  fromName: string;
  salesNotificationEmail: string;
  quoteCopyEmail: string;
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
  const storedPassword = decryptSecret(row?.password);

  const graphSecret = decryptSecret(row?.graphClientSecret);

  return {
    provider: row?.provider ?? "SMTP",
    graphTenantId: row?.graphTenantId ?? "",
    graphClientId: row?.graphClientId ?? "",
    graphClientSecretHint: graphSecret ? secretHint(graphSecret) : null,
    graphSender: row?.graphSender ?? "",
    host: row?.host ?? "",
    port: row?.port ?? effective.port,
    secure: row?.secure ?? effective.secure,
    username: row?.username ?? "",
    passwordHint: storedPassword ? secretHint(storedPassword) : null,
    fromAddress: row?.fromAddress ?? "",
    fromName: row?.fromName ?? "",
    salesNotificationEmail: row?.salesNotificationEmail ?? "",
    quoteCopyEmail: row?.quoteCopyEmail ?? "",
    usingEnvironment: !row?.host && Boolean(smtp.host()),
    updatedAt: row?.updatedAt ?? null,
  };
}
