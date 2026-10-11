import "server-only";
import nodemailer, { type Transporter } from "nodemailer";
import { getMailConfig, type MailConfig, mailIsConfigured, azureAcsConfigured } from "@/lib/mail-config";
import { resetGraphToken, sendViaGraph } from "@/lib/mail/graph";
import { resetAzureAcsClient, sendViaAzureAcs } from "@/lib/mail/azure-acs";
import { logger } from "@/lib/logger";
import { getSiteConfig } from "@/lib/site-config";

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
        /*
         * Not optional, though it was missing here until a lead notification
         * came through this path and arrived with nothing to reply to.
         *
         * `sendMail` has always passed it; this function is the verbose twin
         * used by the admin test button, where nobody replies to anything, so
         * the omission was invisible. It stopped being invisible the moment a
         * real message was sent through it: on an internal notification the
         * reply-to *is* the customer, and without it hitting Reply reaches the
         * site's own no-reply address instead of the person who wrote in.
         */
        replyTo: message.replyTo,
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

/**
 * Recipient for internal sales notifications.
 *
 * Two sources, in order of how deliberate they are.
 *
 * The mail settings carry an explicit "send a copy of enquiries and orders to"
 * address, and when somebody has set one that is the answer — it is the field
 * whose entire job is this, and an administrator who typed an address there
 * meant that address.
 *
 * When nobody has, this falls back to the sales address the business already
 * publishes. That is a change from returning null, and the reason is what null
 * actually did: the contact route and the enquiry service both guard on
 * `if (internal)`, so an unset field meant every enquiry was acknowledged to
 * the customer and mentioned to nobody here. Silently — the ticket was stored,
 * the request succeeded, and the only symptom was leads that never got called
 * back. Between "tell the address on the contact page" and "tell no one", the
 * first is plainly closer to what an unconfigured site intends.
 *
 * It is a fallback and not a default: setting the field overrides it, and
 * clearing the published sales address turns it off again. Nothing is invented
 * — `email.sales` is the address already printed on the contact page, in the
 * footer and in the Organization structured data, so mail reaching it is mail
 * reaching a mailbox this business has told the public to use.
 */
export async function salesInbox(): Promise<string | null> {
  const configured = (await getMailConfig()).salesNotification;
  if (configured) return configured;
  return (await getSiteConfig()).email.sales;
}

/**
 * The copy that tells this business a customer did something.
 *
 * Every inbound path had written the same eight lines: resolve `salesInbox()`,
 * guard on `if (internal)`, build the message, `void sendMail(...)`. That shape
 * is why leads went missing, and it failed in three separate ways that all look
 * identical from outside — nothing bounces, nothing errors, the customer is
 * acknowledged as normal, and the only symptom is an enquiry nobody calls back:
 *
 *   1. No recipient. An unset optional field made `salesInbox()` null and the
 *      guard skipped the send. `salesInbox()` now falls back to the published
 *      sales address, so this is rare — but the guard lived at eight call
 *      sites, and the ninth one somebody writes next year would have had to
 *      remember it. It lives here once instead.
 *   2. No channel. These were all `purpose: "sales"`, which is SMTP or Graph
 *      and never Azure. A deployment whose only working channel is Azure
 *      Communication Services — which is a supported way to run this, and the
 *      customer-facing transactional mail is already happy on it — had every
 *      internal notification logged and dropped.
 *   3. No trace of success. A bare `void sendMail(...)` logs on failure and
 *      says nothing when it works, so "did the notification go, and where?"
 *      was unanswerable after the fact. Now it is one log line per lead.
 *
 * Recipient resolution and both channels are decided in this one function, so
 * a call site cannot get any of it wrong by omission. It never throws: the
 * thing being reported has already happened and been stored, and no lead is
 * worth failing a customer's request over.
 */
export async function notifyInternal(
  message: Omit<MailMessage, "to" | "purpose">,
): Promise<{ delivered: boolean }> {
  try {
    const to = await salesInbox();
    if (!to) {
      /*
       * Reachable only when the business publishes no sales address anywhere —
       * neither the notification field nor the address on its own contact
       * page. Warned per notification rather than once at boot, because this
       * is precisely the silence that gets mistaken for "no enquiries came
       * in", and a single startup line scrolls away.
       */
      logger.warn("internal_notification_no_recipient", { subject: message.subject });
      return { delivered: false };
    }

    const primary = await sendMailVerbose({ ...message, to, purpose: "sales" });
    if (primary.delivered) {
      logger.info("internal_notification_sent", { to, subject: message.subject, via: "mailbox" });
      return { delivered: true };
    }

    /*
     * Azure as a second channel, but only for the failures that mean "this
     * deployment has no sales mailbox" — not for a mailbox that exists and
     * refused the message.
     *
     * That line matters. A rejection is a configured server saying no: a wrong
     * password, a relay refusal, a recipient it will not accept. Retrying
     * those over Azure would paper over a fault somebody needs to fix, and
     * where the rejection came after the server had already accepted the
     * message it would deliver the lead twice. Absence of configuration is the
     * opposite — there is nothing to fix and nothing was sent, so the only
     * question is whether another working channel exists.
     */
    const unconfigured =
      primary.failure.kind === "no_host" ||
      primary.failure.kind === "no_from" ||
      primary.failure.kind === "graph_incomplete";

    const config = await getMailConfig();
    if (unconfigured && config.acs) {
      const acs = await sendViaAzureAcs(config.acs, { ...message, to });
      if (acs.ok) {
        logger.info("internal_notification_sent", { to, subject: message.subject, via: "azure" });
        return { delivered: true };
      }
      logger.error("internal_notification_failed", {
        to,
        subject: message.subject,
        via: "azure",
        message: acs.detail,
      });
      return { delivered: false };
    }

    logger.error("internal_notification_failed", {
      to,
      subject: message.subject,
      via: "mailbox",
      failure: primary.failure.kind,
      ...("detail" in primary.failure ? { message: primary.failure.detail } : {}),
    });
    return { delivered: false };
  } catch (error) {
    logger.error("internal_notification_failed", {
      subject: message.subject,
      message: error instanceof Error ? error.message : String(error),
    });
    return { delivered: false };
  }
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
