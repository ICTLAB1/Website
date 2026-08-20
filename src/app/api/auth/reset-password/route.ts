import { jsonError, jsonOk, withErrorHandling } from "@/lib/api";
import { verifyCsrf } from "@/lib/auth/csrf";
import { hit, LIMITS } from "@/lib/auth/rate-limit";
import { ipFromRequest } from "@/lib/auth/request";
import { hashPassword } from "@/lib/auth/password";
import { hashToken } from "@/lib/auth/tokens";
import { revokeAllSessions } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { fieldErrorsOf, resetPasswordSchema } from "@/lib/validation";
import { recordAudit } from "@/lib/audit";

export const POST = withErrorHandling("auth.resetPassword", async (request: Request) => {
  if (await verifyCsrf(request)) {
    return jsonError("forbidden", "Your session has expired. Please reload the page and try again.");
  }

  const ip = ipFromRequest(request);
  const limit = hit(`reset-submit:${ip}`, LIMITS.passwordReset.limit, LIMITS.passwordReset.windowSeconds);
  if (!limit.allowed) {
    return jsonError("rate_limited", "Too many attempts. Please try again later.", {
      headers: { "retry-after": String(limit.retryAfterSeconds) },
    });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("bad_request", "The request could not be read.");
  }

  const parsed = resetPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("validation_failed", "Please correct the highlighted fields.", {
      fieldErrors: fieldErrorsOf(parsed.error),
    });
  }

  const { token, password } = parsed.data;

  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashToken(token) },
    select: {
      id: true,
      userId: true,
      expiresAt: true,
      usedAt: true,
      user: { select: { deletedAt: true } },
    },
  });

  // Single generic message: a caller cannot distinguish an unknown token from
  // an expired or already-used one.
  const invalid = () =>
    jsonError(
      "bad_request",
      "This reset link is no longer valid. Request a new one and use the most recent email.",
    );

  if (!record) return invalid();
  if (record.usedAt) return invalid();
  if (record.expiresAt.getTime() <= Date.now()) return invalid();
  if (record.user.deletedAt) return invalid();

  const passwordHash = await hashPassword(password);

  await prisma.$transaction(async (tx) => {
    // Marking the token used inside the transaction makes it single-use even
    // under concurrent submissions of the same link.
    const claimed = await tx.passwordResetToken.updateMany({
      where: { id: record.id, usedAt: null },
      data: { usedAt: new Date() },
    });
    if (claimed.count === 0) throw new Error("token_already_used");

    await tx.user.update({
      where: { id: record.userId },
      data: { passwordHash, failedLogins: 0, lockedUntil: null },
    });
  });

  // Any session established before the reset is invalidated, which evicts an
  // attacker who already had one.
  await revokeAllSessions(record.userId);

  await recordAudit({
    actorId: record.userId,
    action: "auth.password_reset_completed",
    entityType: "User",
    entityId: record.userId,
    ip,
  });

  return jsonOk({
    message: "Your password has been changed. Please sign in with your new password.",
  });
});
