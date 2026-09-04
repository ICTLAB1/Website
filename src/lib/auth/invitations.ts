import "server-only";

import { prisma } from "@/lib/db";
import { generateToken, hashToken } from "@/lib/auth/tokens";
import { renderEmailHtml, renderEmailText } from "@/lib/emails/shell";
import { sendMailVerbose } from "@/lib/mail";
import { getSiteConfig } from "@/lib/site-config";
import { appUrl } from "@/lib/env";

/**
 * Inviting somebody to an account they will hold themselves.
 *
 * Shared by the two places that create an account for another person: an
 * administrator adding a colleague here, and a customer's own administrator
 * adding a colleague at their organisation. Both need the same guarantee, so
 * both use the same code rather than two implementations that drift.
 *
 * ## No password is set by the inviter
 *
 * The account is created with an unusable random hash and the person is emailed
 * a link to set their own. An inviter typing a password for somebody else means
 * that password exists in a second head, gets sent over WhatsApp, and is usually
 * still in use a year later.
 *
 * ## The address is proven, not asserted
 *
 * `emailVerified` stays null at creation even though the inviter vouched for the
 * address. Following the link proves control of the mailbox, which is the only
 * thing that actually establishes it — and it is set at that point, in the
 * reset-password route, so an invited colleague is not asked to verify
 * separately afterwards.
 */

export const INVITE_TTL_HOURS = 72;

/**
 * Issues a fresh invitation and emails it.
 *
 * Returns the link so the caller can show it when mail fails. Any outstanding
 * token is retired first, so the newest email is always the one that works —
 * otherwise a resend leaves two live links and the person uses whichever
 * arrived first.
 */
export async function issueInvite(user: { id: string; name: string; email: string }): Promise<{
  link: string;
  delivered: boolean;
}> {
  await prisma.passwordResetToken.updateMany({
    where: { userId: user.id, usedAt: null },
    data: { usedAt: new Date() },
  });

  const token = generateToken(32);
  await prisma.passwordResetToken.create({
    data: {
      tokenHash: hashToken(token),
      userId: user.id,
      expiresAt: new Date(Date.now() + INVITE_TTL_HOURS * 60 * 60 * 1000),
    },
  });

  // The raw token exists only in this email and in the value returned here. The
  // database holds its hash, and it is never written to a log.
  const link = `${appUrl()}/reset-password?token=${encodeURIComponent(token)}`;
  const config = await getSiteConfig();

  const content = {
    heading: `Set up your ${config.tradingName} account`,
    greetingName: user.name,
    paragraphs: [
      `An account has been created for you at ${config.tradingName}. Choose a password to finish setting it up.`,
      `This link works once and expires in ${INVITE_TTL_HOURS} hours. If it has expired by the time you get to it, ask for another.`,
    ],
    action: { label: "Choose your password", url: link },
    footnote: `If you were not expecting this, you can ignore it — the account cannot be used until a password is set.`,
  };

  const result = await sendMailVerbose({
    to: user.email,
    subject: `Set up your ${config.tradingName} account`,
    text: renderEmailText(content, config),
    html: renderEmailHtml(content, config),
    purpose: "transactional",
  });

  return { link, delivered: result.delivered };
}

/**
 * The message shown when the invitation could not be sent.
 *
 * It carries the link, because the alternative is an account nobody can reach
 * and an inviter with no way to fix it. The link is a credential for the next
 * three days, so the wording says so rather than presenting it as a
 * convenience.
 */
export function undeliveredMessage(email: string, link: string, hint: string): string {
  return [
    `The account was created, but the invitation to ${email} could not be sent.`,
    `Send them this link yourself — it lets them set a password, so treat it like one and send it privately:`,
    link,
    hint,
  ].join("\n\n");
}
