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
