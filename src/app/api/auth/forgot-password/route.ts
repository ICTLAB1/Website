import { jsonError, jsonOk, withErrorHandling } from "@/lib/api";
import { verifyCsrf } from "@/lib/auth/csrf";
import { hit, LIMITS } from "@/lib/auth/rate-limit";
import { ipFromRequest } from "@/lib/auth/request";
import { generateToken, hashToken } from "@/lib/auth/tokens";
import { prisma } from "@/lib/db";
import { fieldErrorsOf, forgotPasswordSchema } from "@/lib/validation";
import { escapeHtml, sendMail } from "@/lib/mail";
import { appUrl } from "@/lib/env";
import { getSiteConfig } from "@/lib/site-config";
import { recordAudit } from "@/lib/audit";
import { logger } from "@/lib/logger";

const TOKEN_TTL_MINUTES = 30;

export const POST = withErrorHandling("auth.forgotPassword", async (request: Request) => {
  if (await verifyCsrf(request)) {
    return jsonError("forbidden", "Your session has expired. Please reload the page and try again.");
  }

  const ip = ipFromRequest(request);
  const limit = hit(`reset:${ip}`, LIMITS.passwordReset.limit, LIMITS.passwordReset.windowSeconds);
  if (!limit.allowed) {
    return jsonError("rate_limited", "Too many reset requests. Please try again later.", {
      headers: { "retry-after": String(limit.retryAfterSeconds) },
    });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("bad_request", "The request could not be read.");
  }

  const parsed = forgotPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("validation_failed", "Enter a valid email address.", {
      fieldErrors: fieldErrorsOf(parsed.error),
    });
  }

  const { email } = parsed.data;
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, name: true, deletedAt: true },
  });

  // The response below is identical whether or not the address exists, so this
  // endpoint cannot be used to discover registered email addresses.
  if (user && !user.deletedAt) {
    // Invalidate any outstanding token so only the newest link works.
    await prisma.passwordResetToken.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: new Date() },
    });

    const token = generateToken(32);
    await prisma.passwordResetToken.create({
      data: {
        tokenHash: hashToken(token),
        userId: user.id,
        expiresAt: new Date(Date.now() + TOKEN_TTL_MINUTES * 60 * 1000),
      },
    });

    const config = getSiteConfig();
    const link = `${appUrl()}/reset-password?token=${encodeURIComponent(token)}`;

    // The raw token appears only in this email. The database holds its HMAC,
    // and it is never written to a log.
    await sendMail({
      to: email,
      subject: `Reset your ${config.tradingName} password`,
      text: [
        `Hello ${user.name},`,
        "",
        "We received a request to reset your password. Use the link below within",
        `${TOKEN_TTL_MINUTES} minutes:`,
        "",
        link,
        "",
        "If you did not request this, you can ignore this email. Your password will not change.",
        "",
        config.tradingName,
      ].join("\n"),
      html: [
        `<p>Hello ${escapeHtml(user.name)},</p>`,
        `<p>We received a request to reset your password. Use the link below within ${TOKEN_TTL_MINUTES} minutes:</p>`,
        `<p><a href="${escapeHtml(link)}">Reset your password</a></p>`,
        "<p>If you did not request this, you can ignore this email. Your password will not change.</p>",
        `<p>${escapeHtml(config.tradingName)}</p>`,
      ].join(""),
    });

    await recordAudit({
      actorId: user.id,
      action: "auth.password_reset_requested",
      entityType: "User",
      entityId: user.id,
      ip,
    });
  } else {
    logger.info("password_reset_requested_unknown_account", {});
  }

  return jsonOk({
    message:
      "If that email address has an account, we have sent a reset link. Check your inbox, including the spam folder.",
  });
});
