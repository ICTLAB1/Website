import "server-only";
import { prisma } from "@/lib/db";
import { appUrl } from "@/lib/env";
import { generateToken, hashToken } from "@/lib/auth/tokens";
import { escapeHtml, isMailConfigured, sendMail } from "@/lib/mail";
import { getSiteConfig } from "@/lib/site-config";
import { logger } from "@/lib/logger";

/**
 * Proving that whoever registered can read the address they gave.
 *
 * `User.emailVerified` has existed in the schema since the beginning and was
 * never written or read — a column that looked like a feature and was not. This
 * is that feature.
 *
 * What it is for, concretely: every quotation, order confirmation and licence
 * key this business sends goes to that address. An unverified one is a typo
 * waiting to send somebody else's licence keys to a stranger, or a dead end
 * where a quotation vanishes and the customer thinks you ignored them.
 *
 * What it is *not* for: blocking sign-in. An unverified account can sign in and
 * look around; it cannot transact. That line is drawn in `requireVerified`
 * below, and the reasoning is that a mail delivery problem should cost a
 * customer some features, never their access.
 */

const TOKEN_TTL_HOURS = 48;

/**
 * Issues a fresh link and sends it.
 *
 * Any outstanding token is spent first, so only the newest link works — the
 * same rule the password reset flow uses, and for the same reason: a link
 * forwarded, logged or left in an old inbox should stop working the moment a
 * new one is requested.
 *
 * Returns whether the mail was actually delivered, so callers can tell the
 * truth about what just happened rather than claiming an email is on its way
 * when SMTP is not configured.
 */
export async function sendVerificationEmail(user: {
  id: string;
  email: string;
  name: string;
}): Promise<{ delivered: boolean }> {
  await prisma.emailVerificationToken.updateMany({
    where: { userId: user.id, usedAt: null },
    data: { usedAt: new Date() },
  });

  const token = generateToken(32);
  const expiresAt = new Date(Date.now() + TOKEN_TTL_HOURS * 60 * 60 * 1000);

  await prisma.emailVerificationToken.create({
    data: {
      tokenHash: hashToken(token),
      userId: user.id,
      email: user.email,
      expiresAt,
    },
  });

  const config = await getSiteConfig();
  const link = `${appUrl()}/verify-email?token=${token}`;

  const { delivered } = await sendMail({
    to: user.email,
    subject: `Confirm your email address — ${config.tradingName}`,
    text: [
      `Hello ${user.name},`,
      "",
      "Please confirm this address so we can send you quotations, order",
      "confirmations and licence details.",
      "",
      link,
      "",
      `This link works once and expires in ${TOKEN_TTL_HOURS} hours.`,
      "",
      "If you did not create an account, you can ignore this message.",
      "",
      config.tradingName,
    ].join("\n"),
    html: [
      `<p>Hello ${escapeHtml(user.name)},</p>`,
      "<p>Please confirm this address so we can send you quotations, order confirmations and licence details.</p>",
      `<p><a href="${escapeHtml(link)}">Confirm my email address</a></p>`,
      `<p>This link works once and expires in ${TOKEN_TTL_HOURS} hours.</p>`,
      "<p>If you did not create an account, you can ignore this message.</p>",
      `<p>${escapeHtml(config.tradingName)}</p>`,
    ].join(""),
  });

  if (!delivered) {
    /*
     * The link is written to the log rather than lost.
     *
     * On a deployment without SMTP this is the only way an administrator can
     * complete a registration — and it is far better than the alternative,
     * which is a customer permanently unable to transact with no way for anyone
     * to help them. The token is single-use and short-lived, and the server log
     * is already privileged: it holds session identifiers and reset links for
     * the same reason.
     */
    logger.info("verification_link_not_emailed", { userId: user.id, link });
  }

  return { delivered };
}

export type VerificationResult =
  | { ok: true; alreadyVerified: boolean }
  | { ok: false; reason: "invalid" | "expired" | "used" | "address_changed" };

/**
 * Consumes a link.
 *
 * Every failure is distinguishable *to the person holding the link*, because
 * each needs a different action from them: request a new one, sign in, or check
 * they opened the newest email. None of them reveals whether an account exists,
 * because a token nobody was issued simply does not match a hash.
 */
export async function verifyEmailToken(token: string): Promise<VerificationResult> {
  if (!token || token.length < 16) return { ok: false, reason: "invalid" };

  const record = await prisma.emailVerificationToken.findUnique({
    where: { tokenHash: hashToken(token) },
    select: {
      id: true,
      userId: true,
      email: true,
      expiresAt: true,
      usedAt: true,
      user: { select: { email: true, emailVerified: true, deletedAt: true } },
    },
  });

  if (!record || record.user.deletedAt) return { ok: false, reason: "invalid" };
  if (record.usedAt) {
    // Already spent. If the account is verified, the person is simply clicking
    // an old link and there is nothing wrong; say so rather than alarm them.
    return record.user.emailVerified
      ? { ok: true, alreadyVerified: true }
      : { ok: false, reason: "used" };
  }
  if (record.expiresAt.getTime() < Date.now()) return { ok: false, reason: "expired" };

  // The token names the address it was sent to. If the account has since moved
  // to a different address, this link proves nothing about the current one.
  if (record.email !== record.user.email) return { ok: false, reason: "address_changed" };

  await prisma.$transaction([
    prisma.emailVerificationToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    }),
    prisma.user.update({
      where: { id: record.userId },
      data: { emailVerified: new Date() },
    }),
  ]);

  return { ok: true, alreadyVerified: false };
}

/**
 * Whether verification is being enforced at all.
 *
 * With no SMTP there is no way to receive a link, so enforcing it would lock
 * every new customer out of transacting with no route back. On such a
 * deployment the check stands down, and `/admin` reports that mail is
 * unconfigured — which is the actual problem to fix.
 *
 * This is the one place that decision is made, so it cannot be enforced in one
 * code path and skipped in another.
 */
export function verificationEnforced(): boolean {
  return isMailConfigured();
}
