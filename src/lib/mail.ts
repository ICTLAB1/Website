import "server-only";
import nodemailer, { type Transporter } from "nodemailer";
import { getMailConfig, type MailConfig, mailIsConfigured, azureAcsConfigured } from "@/lib/mail-config";
import { resetGraphToken, sendViaGraph } from "@/lib/mail/graph";
import { resetAzureAcsClient, sendViaAzureAcs } from "@/lib/mail/azure-acs";
import { logger } from "@/lib/logger";

/**
 * Outbound email.
 *
 * When SMTP is not configured (development, CI, or a deployment where mail has
 * not been provisioned yet) messages are logged instead of sent, so no flow
 * silently fails and no fake delivery is reported to the user.
 */

let cachedTransport: Transporter | null = null;
let cachedKey: string | null = null;

/**
 * Built from the resolved configuration, and rebuilt when that changes.
 *
 * The settings are editable at runtime now, so a transport cached for the life
 * of the process would keep using the server that was configured when the
 * container started — an administrator would correct a wrong password, see
 * nothing change, and reasonably conclude the panel does not work. Keying the
 * cache on the settings themselves makes an edit take effect on the next
 * message without giving up connection pooling.
 */
function transport(config: MailConfig): Transporter | null {
  if (!config.host) return null;

  const key = [config.host, config.port, config.secure, config.username, config.password].join("\u0000");
  if (cachedTransport && cachedKey === key) return cachedTransport;

  cachedTransport = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    ...(config.username && config.password
      ? { auth: { user: config.username, pass: config.password } }
      : {}),

    /*
     * Timeouts, because the default is to wait a very long time.
     *
     * A refused connection fails fast and is easy to reason about. A silently
     * dropped one does not fail at all: the socket stays open, nothing arrives,
     * and the caller waits. That is not hypothetical here — hosting providers
     * routinely block outbound SMTP on new accounts, and a blocked port
     * blackholes packets rather than refusing them. DigitalOcean is one of them.
     *
     * Without these, registration hangs. It awaits the verification email, so a
     * blocked port turns "create an account" into a request that never returns,
     * and the customer sees a spinner rather than an account. The admin test
     * button did exactly this and span forever.
     *
     * Fifteen seconds is far longer than any healthy server needs and far
     * shorter than a person will wait.
     */
    connectionTimeout: 15_000,
    greetingTimeout: 15_000,
    socketTimeout: 20_000,
  });
  cachedKey = key;
  return cachedTransport;
}

/**
 * Whether *some* channel exists to send a message through — never whether
 * one particular send attempt succeeded.
 *
 * Delegates to `mail-config.ts`'s check for the active provider (which,
 * unlike the version this replaced, correctly reads a Graph registration
 * rather than looking for an SMTP host that Graph never sets) and adds Azure
 * Communication Services, which a "transactional" message can also go
 * through. A caller deciding whether to show a customer a code-entry screen,
 * or whether to enforce verification at all, needs exactly this — not the
 * outcome of a single network call, which fails transiently for reasons that
 * have nothing to do with whether mail is configured.
 */
export async function isMailConfigured(): Promise<boolean> {
  const [acs, base] = await Promise.all([azureAcsConfigured(), mailIsConfigured()]);
  return acs || base;
}

/**
 * Send a message and report *why* it failed.
 *
 * `sendMail` deliberately swallows transport detail, because its callers are
 * customer-facing flows and an SMTP error means nothing to a customer and can
 * name internal hosts. That is right for them and wrong for the one caller who
 * needs the truth: an administrator asking "is email working?".
 *
 * Without this the only way to find out was to read container logs, which is
 * not a thing the person running this business is going to do — so a
 * misconfigured mailbox looked exactly like a working one, and the first sign
 * of trouble was a customer saying they never got their licence keys.
 *
 * Returns a typed failure rather than a sentence. This module has no business
 * writing prose for a screen — and naming a setting in a string here would put
 * a configuration key into shared code that the public surfaces are checked
 * against. The wording lives beside the only page that shows it.
 */
export type MailFailure =
  /** No server configured at all. */
  | { kind: "no_host" }
  /** A server, but no address to send from. */
  | { kind: "no_from" }
  /** Microsoft is selected but some part of the registration is missing. */
  | { kind: "graph_incomplete" }
  /** Azure Communication Services is switched on but not fully configured. */
  | { kind: "acs_incomplete" }
  /** The server would not accept the connection or the credentials. */
  | { kind: "rejected_connection"; detail: string }
  /** Signed in, but the message itself was refused. */
  | { kind: "rejected_message"; detail: string };

export type VerboseMailResult = { delivered: true } | { delivered: false; failure: MailFailure };

/**
 * Sends through Azure Communication Services when this message asked for it
 * and ACS is actually configured — `null` otherwise, meaning "use the normal
 * path", which covers every message sent before ACS existed and every one
 * sent while it is unset, disabled, or half-configured.
 */
async function tryAzureAcs(
  message: MailMessage,
  config: MailConfig,
): Promise<{ ok: true } | { ok: false; detail: string } | null> {
  if (message.purpose !== "transactional" || !config.acs) return null;
  return sendViaAzureAcs(config.acs, message);
}

export async function sendMailVerbose(message: MailMessage): Promise<VerboseMailResult> {
  const config = await getMailConfig();

  const acs = await tryAzureAcs(message, config);
  if (acs) {
    return acs.ok ? { delivered: true } : { delivered: false, failure: { kind: "rejected_message", detail: acs.detail } };
  }

  if (config.provider === "MICROSOFT_GRAPH") {
    if (!config.graph) {
      return { delivered: false, failure: { kind: "graph_incomplete" } };
    }
    const result = await sendViaGraph(config.graph, { ...message, fromName: config.fromName });
    return result.ok
      ? { delivered: true }
      : { delivered: false, failure: { kind: "rejected_message", detail: result.detail } };
  }

  const from = config.from;
  const mailer = transport(config);

  if (!mailer) return { delivered: false, failure: { kind: "no_host" } };
  if (!from) return { delivered: false, failure: { kind: "no_from" } };

  const detail = (error: unknown) => (error instanceof Error ? error.message : String(error));

  /*
   * A second, outer bound on the whole exchange.
   *
   * The transport timeouts above cover connecting, the greeting and an idle
   * socket, which is every way this hangs that anyone has met. This exists
   * because the cost of being wrong about that is a button that spins forever
   * and an administrator who learns nothing — the precise failure this page was
   * built to remove. It never fires in a healthy send.
   */
  const bounded = <T,>(work: Promise<T>): Promise<T> =>
    Promise.race([
      work,
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Timed out waiting for the mail server.")), 45_000),
      ),
    ]);

  try {
    await bounded(mailer.verify());
  } catch (error) {
    return { delivered: false, failure: { kind: "rejected_connection", detail: detail(error) } };
  }

  try {
    await bounded(
      mailer.sendMail({
        from,
        to: message.to,
        ...(message.cc?.length ? { cc: message.cc } : {}),
        subject: message.subject,
        text: message.text,
        html: message.html,
        ...(message.attachments?.length ? { attachments: message.attachments } : {}),
      }),
    );
    return { delivered: true };
  } catch (error) {
    return { delivered: false, failure: { kind: "rejected_message", detail: detail(error) } };
  }
}

/**
 * Tests the Azure Communication Services channel specifically, rather than
 * whatever `sendMailVerbose` would actually pick.
 *
 * `sendMailVerbose` falls back to the sales mailbox when ACS is unset or
 * broken — the right behaviour for a real message, where getting a
 * verification code out matters more than which address it came from, but the
 * wrong one for a button whose entire purpose is "did the Azure setup work?".
 * Falling back there would report success for a test that sent through the
 * old path entirely, which is the one lie this page cannot afford to tell.
 */
export async function sendTestAzureAcsMail(message: MailMessage): Promise<VerboseMailResult> {
  const config = await getMailConfig();
  if (!config.acs) return { delivered: false, failure: { kind: "acs_incomplete" } };

  const result = await sendViaAzureAcs(config.acs, message);
  return result.ok
    ? { delivered: true }
    : { delivered: false, failure: { kind: "rejected_message", detail: result.detail } };
}

/**
 * Drops the cached transport.
 *
 * The cache is keyed on the settings, so an edit already takes effect on its
 * own. This forces the issue for the one caller that cannot wait for that: the
 * test button, pressed immediately after a correction, where a pooled socket
 * that is open but doomed would report the old failure — the most confusing
 * possible response to having just fixed the problem.
 */
export function resetMailTransport(): void {
  cachedTransport = null;
  cachedKey = null;
  // The Graph access token and the ACS client are cached for the same reason
  // and go stale for the same one: credentials just changed.
  resetGraphToken();
  resetAzureAcsClient();
}

/**
 * A file sent with a message.
 *
 * Held in memory as bytes rather than as a path, because the one thing that
 * gets attached here — a quotation — is generated per request and never written
 * to disk. Anything that took a path would need a file to exist, and a file
 * that exists is a file somebody else can read.
 */
export type MailAttachment = {
  filename: string;
  content: Buffer;
  contentType: string;
};

export type MailMessage = {
  to: string;
  /**
   * Visible copies. Empty and absent mean the same thing.
   *
   * Cc rather than Bcc: on a commercial document the customer should be able to
   * see who else at the supplier is on the thread, and reply-all should reach
   * them. Never used for authentication mail — a verification code or a reset
   * link belongs to one person, and copying it to a colleague's mailbox would
   * hand them somebody else's credential.
   */
  cc?: string[];
  subject: string;
  text: string;
  html?: string;
  replyTo?: string;
  attachments?: MailAttachment[];
  /**
   * "sales" (the default, and every call site written before this existed):
   * quotations and the internal notifications sales already reads day to
   * day — these keep coming from the mailbox configured for them, because a
   * customer replying to a quotation or a colleague replying to a lead
   * notification should reach a person.
   *
   * "transactional": a one-time code, a receipt, a status update — sent
   * through Azure Communication Services when it is configured, and through
   * the same mailbox as "sales" when it is not. Nothing here can regress a
   * deployment onto ACS by accident: a message must ask for this explicitly.
   */
  purpose?: "sales" | "transactional";
};

export async function sendMail(message: MailMessage): Promise<{ delivered: boolean }> {
  const config = await getMailConfig();

  const acs = await tryAzureAcs(message, config);
  if (acs) {
    if (!acs.ok) {
      logger.error("mail_send_failed", { to: message.to, subject: message.subject, message: acs.detail });
    }
    return { delivered: acs.ok };
  }

  if (config.provider === "MICROSOFT_GRAPH") {
    if (!config.graph) {
      logger.info("mail_not_configured_message_skipped", {
        to: message.to,
        subject: message.subject,
      });
      return { delivered: false };
    }
    const result = await sendViaGraph(config.graph, { ...message, fromName: config.fromName });
    if (!result.ok) {
      // Same contract as the SMTP path: the detail goes to the log, never to
      // the caller, because every caller here is a customer-facing flow.
      logger.error("mail_send_failed", {
        to: message.to,
        subject: message.subject,
        message: result.detail,
      });
    }
    return { delivered: result.ok };
  }

  const from = config.from;
  const mailer = transport(config);

  if (!mailer || !from) {
    logger.info("mail_not_configured_message_skipped", {
      to: message.to,
      subject: message.subject,
    });
    return { delivered: false };
  }

  try {
    await mailer.sendMail({
      from,
      to: message.to,
      ...(message.cc?.length ? { cc: message.cc } : {}),
      subject: message.subject,
      text: message.text,
      html: message.html,
      replyTo: message.replyTo,
      ...(message.attachments?.length ? { attachments: message.attachments } : {}),
    });
    return { delivered: true };
  } catch (error) {
    // Never surface transport detail to the caller.
    logger.error("mail_send_failed", {
      to: message.to,
      subject: message.subject,
      message: error instanceof Error ? error.message : String(error),
    });
    return { delivered: false };
  }
}

/** Recipient for internal sales notifications, when configured. */
export async function salesInbox(): Promise<string | null> {
  return (await getMailConfig()).salesNotification;
}

/** Minimal HTML escape for values interpolated into email bodies. */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
