import { jsonError, jsonOk, withErrorHandling } from "@/lib/api";
import { verifyCsrf } from "@/lib/auth/csrf";
import { hit, LIMITS, reset } from "@/lib/auth/rate-limit";
import { ipFromRequest } from "@/lib/auth/request";
import { fakeVerify, verifyPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { fieldErrorsOf, loginSchema } from "@/lib/validation";
import { recordAudit } from "@/lib/audit";
import { logger } from "@/lib/logger";
import { safeRedirectPath } from "@/lib/utils";

/** Consecutive failures before the account is temporarily locked. */
const LOCK_THRESHOLD = 10;
const LOCK_MINUTES = 15;

export const POST = withErrorHandling("auth.login", async (request: Request) => {
  if (await verifyCsrf(request)) {
    return jsonError("forbidden", "Your session has expired. Please reload the page and try again.");
  }

  const ip = ipFromRequest(request);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("bad_request", "The request could not be read.");
  }

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("validation_failed", "Please correct the highlighted fields.", {
      fieldErrors: fieldErrorsOf(parsed.error),
    });
  }

  const { email, password, next } = parsed.data;

  // Two independent limits: per IP (blocks a spray across many accounts) and
  // per account (blocks a focused attack from rotating addresses).
  const ipLimit = hit(`login:ip:${ip}`, LIMITS.login.limit * 3, LIMITS.login.windowSeconds);
  const accountLimit = hit(`login:acct:${email}`, LIMITS.login.limit, LIMITS.login.windowSeconds);
  if (!ipLimit.allowed || !accountLimit.allowed) {
    const retryAfter = Math.max(ipLimit.retryAfterSeconds, accountLimit.retryAfterSeconds);
    return jsonError("rate_limited", "Too many sign-in attempts. Please try again shortly.", {
      headers: { "retry-after": String(retryAfter) },
    });
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      passwordHash: true,
      role: true,
      deletedAt: true,
      failedLogins: true,
      lockedUntil: true,
    },
  });

  // One generic message for every failure path, so the response never reveals
  // whether an address is registered.
  const genericFailure = () =>
    jsonError("unauthorized", "That email address and password do not match an account.");

  if (!user || user.deletedAt) {
    // Spend comparable time so timing does not distinguish the cases.
    await fakeVerify();
    logger.warn("login_failed_unknown_account", {});
    return genericFailure();
  }

  if (user.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
    logger.warn("login_blocked_locked_account", { userId: user.id });
    return jsonError(
      "rate_limited",
      "This account is temporarily locked after repeated failed attempts. Please try again later or reset your password.",
    );
  }

  const valid = await verifyPassword(password, user.passwordHash);

  if (!valid) {
    const failedLogins = user.failedLogins + 1;
    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLogins,
        lockedUntil:
          failedLogins >= LOCK_THRESHOLD
            ? new Date(Date.now() + LOCK_MINUTES * 60 * 1000)
            : null,
      },
    });
    await recordAudit({
      actorId: user.id,
      action: "auth.login_failed",
      entityType: "User",
      entityId: user.id,
      metadata: { attempt: failedLogins },
      ip,
    });
    return genericFailure();
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { failedLogins: 0, lockedUntil: null, lastLoginAt: new Date() },
  });

  /*
   * A successful sign-in costs nothing, on either counter.
   *
   * The account bucket was already cleared here. The IP bucket was not, and
   * that is a lockout waiting to happen: an office behind one NAT address is a
   * single IP, so the twenty-fifth colleague to sign in within five minutes was
   * refused — every one of those attempts having succeeded. The bucket exists
   * to bound *guessing*, and a correct password is not a guess.
   *
   * Wrong attempts still count on both, which is what the limit is for, and the
   * durable `failedLogins` / `lockedUntil` lock on the account row is untouched
   * — that is the layer that actually stops a patient attacker, and it survives
   * a restart where an in-memory bucket does not.
   */
  reset(`login:acct:${email}`);
  reset(`login:ip:${ip}`);
  await createSession(user.id);

  await recordAudit({
    actorId: user.id,
    action: "auth.login",
    entityType: "User",
    entityId: user.id,
    ip,
  });

  // Staff land in the admin area; everyone else on their account, unless a safe
  // same-site `next` was supplied.
  const fallback = user.role === "ADMIN" || user.role === "SALES" ? "/admin" : "/account";
  return jsonOk({ redirectTo: safeRedirectPath(next, fallback) });
});
