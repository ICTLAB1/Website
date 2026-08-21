import "server-only";
import nodemailer, { type Transporter } from "nodemailer";
import { smtp } from "@/lib/env";
import { logger } from "@/lib/logger";

/**
 * Outbound email.
 *
 * When SMTP is not configured (development, CI, or a deployment where mail has
 * not been provisioned yet) messages are logged instead of sent, so no flow
 * silently fails and no fake delivery is reported to the user.
 */

let cachedTransport: Transporter | null = null;

function transport(): Transporter | null {
  const host = smtp.host();
  if (!host) return null;
  if (cachedTransport) return cachedTransport;

  const user = smtp.user();
  const password = smtp.password();
  cachedTransport = nodemailer.createTransport({
    host,
    port: smtp.port(),
    secure: smtp.secure(),
    ...(user && password ? { auth: { user, pass: password } } : {}),
  });
  return cachedTransport;
}

export function isMailConfigured(): boolean {
  return Boolean(smtp.host() && smtp.from());
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
  /** The server would not accept the connection or the credentials. */
  | { kind: "rejected_connection"; detail: string }
  /** Signed in, but the message itself was refused. */
  | { kind: "rejected_message"; detail: string };

export type VerboseMailResult = { delivered: true } | { delivered: false; failure: MailFailure };

export async function sendMailVerbose(message: MailMessage): Promise<VerboseMailResult> {
  const from = smtp.from();
  const mailer = transport();

  if (!mailer) return { delivered: false, failure: { kind: "no_host" } };
  if (!from) return { delivered: false, failure: { kind: "no_from" } };

  const detail = (error: unknown) => (error instanceof Error ? error.message : String(error));

  try {
    await mailer.verify();
  } catch (error) {
    return { delivered: false, failure: { kind: "rejected_connection", detail: detail(error) } };
  }

  try {
    await mailer.sendMail({
      from,
      to: message.to,
      subject: message.subject,
      text: message.text,
      html: message.html,
    });
    return { delivered: true };
  } catch (error) {
    return { delivered: false, failure: { kind: "rejected_message", detail: detail(error) } };
  }
}

/**
 * Drops the cached transport.
 *
 * Nodemailer pools connections, and a transport built from a wrong password
 * keeps failing with that password for the life of the process. Without this,
 * correcting the credentials and testing again would keep reporting the old
 * failure — which is the most confusing possible response to having just fixed
 * the problem.
 */
export function resetMailTransport(): void {
  cachedTransport = null;
}

export type MailMessage = {
  to: string;
  subject: string;
  text: string;
  html?: string;
  replyTo?: string;
};

export async function sendMail(message: MailMessage): Promise<{ delivered: boolean }> {
  const from = smtp.from();
  const mailer = transport();

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
export function salesInbox(): string | null {
  return smtp.salesNotification() ?? null;
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
