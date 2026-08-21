import "server-only";
import nodemailer, { type Transporter } from "nodemailer";
import { getMailConfig, type MailConfig } from "@/lib/mail-config";
import { resetGraphToken, sendViaGraph } from "@/lib/mail/graph";
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

export async function isMailConfigured(): Promise<boolean> {
  const config = await getMailConfig();
  return Boolean(config.host && config.from);
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
  /** The server would not accept the connection or the credentials. */
  | { kind: "rejected_connection"; detail: string }
  /** Signed in, but the message itself was refused. */
  | { kind: "rejected_message"; detail: string };

export type VerboseMailResult = { delivered: true } | { delivered: false; failure: MailFailure };

export async function sendMailVerbose(message: MailMessage): Promise<VerboseMailResult> {
  const config = await getMailConfig();

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
        subject: message.subject,
        text: message.text,
        html: message.html,
      }),
    );
    return { delivered: true };
  } catch (error) {
    return { delivered: false, failure: { kind: "rejected_message", detail: detail(error) } };
  }
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
  // The Graph access token is cached for the same reason and goes stale for the
  // same one: credentials just changed.
  resetGraphToken();
}

export type MailMessage = {
  to: string;
  subject: string;
  text: string;
  html?: string;
  replyTo?: string;
};

export async function sendMail(message: MailMessage): Promise<{ delivered: boolean }> {
  const config = await getMailConfig();

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
      subject: message.subject,
      text: message.text,
      html: message.html,
      replyTo: message.replyTo,
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
