import type { MailFailure } from "@/lib/mail";

/**
 * Turning a mail server's refusal into something an administrator can act on.
 *
 * Lives beside the page that shows it, not in `lib/mail`. Two reasons, and the
 * second is the one that decided it: writing prose for a screen is not that
 * module's job, and naming a configuration key in a string there would put it
 * into shared code — which the public-surface checks scan, correctly, because a
 * visitor must never be shown the name of a setting.
 *
 * Here it is not only safe but useful. The page is ADMIN-only, and the person
 * reading it is the person editing `.env`; naming the exact key is more
 * actionable than describing it, because they can search for it.
 *
 * The two rejections below account for nearly all of these, both arrive as an
 * opaque provider code, and neither is something anybody could be expected to
 * recognise. Matched on the provider's own wording rather than on our
 * configuration, because in both cases the configuration looks entirely
 * correct — which is precisely why they are hard to diagnose.
 */
export function describeMailFailure(failure: MailFailure): string {
  switch (failure.kind) {
    case "no_host":
      return "No mail server is configured. Set SMTP_HOST, SMTP_USER, SMTP_PASSWORD and MAIL_FROM in deploy/.env, then restart the app.";
    case "graph_incomplete":
      return "Microsoft 365 is selected but the registration is incomplete. All four are needed: tenant ID, client ID, client secret and the mailbox to send from.";
    case "acs_incomplete":
      return "Azure Communication Services is not fully configured. Both the connection string and the sender address are needed before system mail can go through it.";
    case "no_from":
      return "No sender address is configured. Set MAIL_FROM in deploy/.env, then restart the app.";
    case "rejected_connection":
      return `The mail server refused the connection or the sign-in: ${failure.detail}${hintFor(failure.detail)}`;
    case "rejected_message":
      return `The mail server accepted the sign-in but rejected the message: ${failure.detail}${hintFor(failure.detail)}`;
  }
}

/**
 * The sentence that explains a provider code, or nothing.
 *
 * Silence is the right answer for anything unrecognised. A guess dressed up as
 * advice sends somebody to change a setting that was never the problem.
 */
export function hintFor(detail: string): string {
  const lower = detail.toLowerCase();

  if (
    lower.includes("smtpauth") ||
    lower.includes("smtp auth") ||
    lower.includes("basic authentication") ||
    lower.includes("authentication unsuccessful") ||
    lower.includes("5.7.139")
  ) {
    return (
      "\n\nMicrosoft 365 turns SMTP AUTH off for every mailbox by default, and it has to be " +
      "switched on for this one specifically: Microsoft 365 admin centre → Users → Active users " +
      "→ the mailbox → Mail → Manage email apps → tick Authenticated SMTP. If that account also " +
      "has multi-factor authentication, its ordinary password will not work here and you need an " +
      "app password instead."
    );
  }

  /*
   * Microsoft's own codes, which are precise and unrecognisable in equal
   * measure. Each of these is a different mistake in the Azure setup and each
   * would otherwise send somebody to re-check the wrong one of the four fields.
   */
  if (lower.includes("aadsts7000215") || lower.includes("invalid client secret")) {
    return (
      "\n\nThe client secret is wrong. The most common cause is pasting the " +
      "secret's *ID* rather than its Value — Azure shows both, side by side, and " +
      "only reveals the Value once, at the moment you create it. If it has been " +
      "lost, create a new secret rather than trying to recover it."
    );
  }

  if (lower.includes("aadsts700016") || lower.includes("aadsts900023") || lower.includes("was not found in the directory")) {
    return (
      "\n\nMicrosoft does not recognise this application in this directory. " +
      "Check the tenant ID and client ID against Entra ID → App registrations → " +
      "Overview, where both are shown; they are easy to transpose."
    );
  }

  if (
    lower.includes("accessdenied") ||
    lower.includes("insufficient privileges") ||
    lower.includes("authorization_requestdenied")
  ) {
    return (
      "\n\nThe application exists but is not allowed to send mail. It needs the " +
      "Mail.Send **Application** permission — not Delegated, which requires a " +
      "signed-in user and there is not one — and an administrator must then " +
      "press Grant admin consent. Until consent is granted the permission is " +
      "listed but has no effect."
    );
  }

  if (lower.includes("mailboxnotenabledforrestapi") || lower.includes("resource could not be discovered")) {
    return (
      "\n\nThat mailbox is not one Microsoft can send from — usually because " +
      "the address is a distribution list or an alias rather than a real " +
      "mailbox, or the account has no Exchange licence. Use the primary address " +
      "of a licensed mailbox."
    );
  }

  if (
    lower.includes("timed out") ||
    lower.includes("timeout") ||
    lower.includes("etimedout") ||
    lower.includes("econnrefused")
  ) {
    return (
      "\n\nNothing answered at all, which usually means the connection never left " +
      "the server rather than that the credentials are wrong. Hosting providers " +
      "commonly block outbound mail ports on new accounts to stop them being " +
      "used for spam — DigitalOcean, AWS and Google Cloud all do, and it is " +
      "lifted by asking their support to enable outbound SMTP for the account. " +
      "Check from the server with:\n\n" +
      "    nc -vz smtp.office365.com 587\n\n" +
      "If that hangs or is refused, the port is blocked and no change here will " +
      "help. The alternative is a mail service that sends over HTTPS instead — " +
      "Resend, Postmark, SendGrid and Brevo all do, and none of them are affected."
    );
  }

  if (lower.includes("relay") || lower.includes("not permitted") || lower.includes("5.7.60")) {
    return (
      "\n\nThe mail server will not send on behalf of that sender address. MAIL_FROM usually has " +
      "to be the same mailbox as SMTP_USER, or a confirmed alias of it — both are in deploy/.env."
    );
  }

  return "";
}
