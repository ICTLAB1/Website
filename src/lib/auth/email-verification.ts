import "server-only";
import { prisma } from "@/lib/db";
import { appUrl } from "@/lib/env";
import { generateToken, hashToken, safeEqual } from "@/lib/auth/tokens";
import {
  CODE_TTL_MINUTES,
  MAX_CODE_ATTEMPTS,
  checkCode,
  formatCodeForDisplay,
  generateCode,
  isWellFormedCode,
  normaliseCode,
  type CodeCheck,
} from "@/lib/auth/otp";
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

/*
 * The link's life, which is not the code's.
 *
 * Two mechanisms in one email with two different lifetimes, deliberately. A
 * six-digit code has to be short-lived — it is a million possibilities and the
 * only thing making that enough is that it dies quickly. A link is 256 bits and
 * does not need to; expiring it in ten minutes would only strand people who
 * came back to the email later, which is most of them.
 *
 * The row carries the link's expiry. The code's is derived from `createdAt`, so
 * a spent code cannot outlive its own window even though the row it lives on
 * stays valid for the link.
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
  const code = generateCode();
  const expiresAt = new Date(Date.now() + TOKEN_TTL_HOURS * 60 * 60 * 1000);

  await prisma.emailVerificationToken.create({
    data: {
      tokenHash: hashToken(token),
      codeHash: hashToken(code),
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
      `Your verification code is ${formatCodeForDisplay(code)}`,
      "",
      `It expires in ${CODE_TTL_MINUTES} minutes and can be entered ${MAX_CODE_ATTEMPTS} times.`,
      "",
      "Or open this link, which works for longer:",
      link,
      "",
      "If you did not create an account, you can ignore this message. Nobody",
      "can use this code without it.",
      "",
      config.tradingName,
    ].join("\n"),
    html: [
      `<p>Hello ${escapeHtml(user.name)},</p>`,
      "<p>Please confirm this address so we can send you quotations, order confirmations and licence details.</p>",
      /*
       * The code as text, not as an image and not in a table with a background
       * colour. It has to survive a plain-text client, a screen reader and a
       * long-press copy on a phone, and every one of those is a place a
       * prettier treatment fails.
       */
      `<p style="font-size:28px;font-weight:700;letter-spacing:0.12em;font-family:monospace">${escapeHtml(formatCodeForDisplay(code))}</p>`,
      `<p>It expires in ${CODE_TTL_MINUTES} minutes and can be entered ${MAX_CODE_ATTEMPTS} times.</p>`,
      `<p>Or <a href="${escapeHtml(link)}">open this link</a>, which works for longer.</p>`,
      "<p>If you did not create an account, you can ignore this message. Nobody can use this code without it.</p>",
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
    logger.info("verification_not_emailed", { userId: user.id, link, code });
  }

  return { delivered };
}

/**
 * Consumes a code, for the signed-in account it was issued to.
 *
 * Scoped by `userId` rather than looked up by the code itself, and that is the
 * design. A code is six digits; a global lookup by code would mean any six
 * digits that happen to be live for *some* account verify *that* account —
 * turning a per-account guess into a birthday problem across every pending
 * registration at once. Bound to one account, five guesses buy five of a
 * million.
 *
 * The attempt is counted before the answer is returned, and counted with a
 * database increment rather than a read-then-write, so two requests racing the
 * same code cannot both see `attempts: 4`.
 */
export async function verifyEmailCode(
  userId: string,
  entered: string,
): Promise<CodeCheck & { verified?: boolean }> {
  const code = normaliseCode(entered);
  if (!isWellFormedCode(code)) return { ok: false, reason: "malformed" };

  const record = await prisma.emailVerificationToken.findFirst({
    where: { userId, usedAt: null, codeHash: { not: null } },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      email: true,
      codeHash: true,
      usedAt: true,
      attempts: true,
      createdAt: true,
      user: { select: { email: true, emailVerified: true, deletedAt: true } },
    },
  });

  if (!record || record.user.deletedAt) return { ok: false, reason: "expired" };
  if (record.user.emailVerified) return { ok: true, verified: true };

  /*
   * The code's own window, measured from when it was issued.
   *
   * Not the row's `expiresAt`, which is the link's forty-eight hours. A code
   * that inherited that would be a six-digit secret with two days of guessing
   * against it.
   */
  const codeExpiresAt = new Date(record.createdAt.getTime() + CODE_TTL_MINUTES * 60_000);

  const matches = Boolean(record.codeHash) && safeEqual(record.codeHash!, hashToken(code));

  const verdict = checkCode(
    code,
    { expiresAt: codeExpiresAt, usedAt: record.usedAt, attempts: record.attempts, codeHash: record.codeHash },
    matches,
  );

  if (!verdict.ok) {
    // Only a genuine wrong guess costs an attempt. An expired or already-locked
    // record has nothing left to spend, and counting those would let somebody
    // burn a *new* code by hammering the old one.
    if (verdict.reason === "wrong") {
      await prisma.emailVerificationToken.update({
        where: { id: record.id },
        data: { attempts: { increment: 1 } },
      });
    }
    return verdict;
  }

  // The address the code was sent to must still be the account's address.
  if (record.email !== record.user.email) return { ok: false, reason: "expired" };

  await prisma.$transaction([
    prisma.emailVerificationToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    }),
    prisma.user.update({ where: { id: userId }, data: { emailVerified: new Date() } }),
  ]);

  return { ok: true, verified: true };
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
export async function verificationEnforced(): Promise<boolean> {
  return isMailConfigured();
}
