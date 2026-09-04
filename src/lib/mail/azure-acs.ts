import "server-only";
import { EmailClient } from "@azure/communication-email";
import { logger } from "@/lib/logger";

/**
 * Sending mail through Azure Communication Services (ACS).
 *
 * Used only for system mail — see the long comment on `MailSettings.acsEnabled`
 * in `schema.prisma` for what that covers and what it deliberately does not.
 * Everything a customer or sales team member would recognise as a document or
 * a conversation (quotations, the internal sales-inbox copies) keeps going
 * through the mailbox configured for those in `lib/mail-config`; this exists
 * so the rest — a one-time code, a receipt, a status update — comes from an
 * address that was never meant to receive a reply, rather than from a real
 * person's inbox.
 *
 * Setting it up, once, in the Azure portal:
 *
 *   1. Create a resource → "Email Communication Services", then, inside it,
 *      "Connect domain" → "Add domain" → Azure managed domain. This
 *      provisions a subdomain of azurecomm.net with SPF and DKIM already
 *      configured — nothing to verify, no DNS to edit — and a working sender
 *      address of the form `DoNotReply@<guid>.azurecomm.net` within a minute
 *      or two.
 *   2. Create a resource → "Communication Services", and under it "Email" →
 *      "Domains" → connect the Email Communication Service domain from step 1.
 *   3. Communication Services resource → "Keys" → copy the connection string.
 *   4. Paste the connection string and the sender address into /admin/settings.
 *
 * A custom domain (mail sent as `noreply@techzoidtechnologies.com`) is the
 * same resource with a custom domain connected in step 1 instead — which does
 * need the TXT/CNAME/MX records Azure lists once you start that flow. Nothing
 * here needs to change to move to one later; only the stored sender address
 * does.
 */

export type AzureAcsConfig = {
  /** `endpoint=https://<resource>.communication.azure.com/;accesskey=...` */
  connectionString: string;
  /** The verified sender, e.g. `DoNotReply@xxxxxxxx-xxxx-....azurecomm.net`. */
  senderAddress: string;
};

export type AzureAcsResult = { ok: true } | { ok: false; detail: string };

/** Long enough for a slow send, short enough that nothing appears to hang. */
const TIMEOUT_MS = 30_000;

/**
 * One client per set of credentials.
 *
 * The SDK's client is a thin, stateless wrapper over the connection string —
 * nothing here is a token that expires the way Graph's does — so this is
 * purely to avoid re-parsing the connection string on every send.
 */
let cached: { key: string; client: EmailClient } | null = null;

function clientFor(config: AzureAcsConfig): EmailClient {
  if (cached && cached.key === config.connectionString) return cached.client;
  const client = new EmailClient(config.connectionString);
  cached = { key: config.connectionString, client };
  return client;
}

/** Drops the cached client. Called when the credentials change. */
export function resetAzureAcsClient(): void {
  cached = null;
}

export async function sendViaAzureAcs(
  config: AzureAcsConfig,
  message: {
    to: string;
    cc?: string[];
    subject: string;
    text: string;
    html?: string;
    replyTo?: string;
    attachments?: { filename: string; content: Buffer; contentType: string }[];
  },
): Promise<AzureAcsResult> {
  const client = clientFor(config);

  let poller;
  try {
    poller = await client.beginSend(
      {
        senderAddress: config.senderAddress,
        content: {
          subject: message.subject,
          plainText: message.text,
          ...(message.html ? { html: message.html } : {}),
        },
        recipients: {
          to: [{ address: message.to }],
          ...(message.cc?.length ? { cc: message.cc.map((address) => ({ address })) } : {}),
        },
        ...(message.replyTo ? { replyTo: [{ address: message.replyTo }] } : {}),
        ...(message.attachments?.length
          ? {
              attachments: message.attachments.map((file) => ({
                name: file.filename,
                contentType: file.contentType,
                contentInBase64: file.content.toString("base64"),
              })),
            }
          : {}),
      },
      { abortSignal: AbortSignal.timeout(TIMEOUT_MS) },
    );
  } catch (error) {
    return {
      ok: false,
      detail: `Could not reach Azure Communication Services: ${error instanceof Error ? error.message : String(error)}`,
    };
  }

  let result;
  try {
    result = await poller.pollUntilDone();
  } catch (error) {
    return {
      ok: false,
      detail: `Azure Communication Services did not confirm the send: ${error instanceof Error ? error.message : String(error)}`,
    };
  }

  if (result.status === "Succeeded") return { ok: true };

  logger.error("azure_acs_send_failed", {
    status: result.status,
    code: result.error?.code ?? "",
  });

  return {
    ok: false,
    detail: result.error?.message ?? `Azure reported status "${result.status}".`,
  };
}
