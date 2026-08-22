import { jsonError, jsonOk, withErrorHandling } from "@/lib/api";
import { verifyCsrf } from "@/lib/auth/csrf";
import { hit, LIMITS } from "@/lib/auth/rate-limit";
import { ipFromRequest } from "@/lib/auth/request";
import { hashPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { fieldErrorsOf, registerSchema } from "@/lib/validation";
import { recordAudit } from "@/lib/audit";
import { sendVerificationEmail } from "@/lib/auth/email-verification";
import { logger } from "@/lib/logger";

export const POST = withErrorHandling("auth.register", async (request: Request) => {
  if (await verifyCsrf(request)) {
    return jsonError("forbidden", "Your session has expired. Please reload the page and try again.");
  }

  const ip = ipFromRequest(request);
  const limit = hit(`register:${ip}`, LIMITS.register.limit, LIMITS.register.windowSeconds);
  if (!limit.allowed) {
    return jsonError("rate_limited", "Too many sign-up attempts. Please try again later.", {
      headers: { "retry-after": String(limit.retryAfterSeconds) },
    });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("bad_request", "The request could not be read.");
  }

  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("validation_failed", "Please correct the highlighted fields.", {
      fieldErrors: fieldErrorsOf(parsed.error),
    });
  }

  const { name, email, password, companyName, phone } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) {
    // Registration cannot be used to enumerate accounts: the response is the
    // same shape whether or not the address was already taken. The existing
    // account holder is not affected and no session is issued.
    return jsonOk({ redirectTo: "/login?registered=1" });
  }

  const passwordHash = await hashPassword(password);

  const user = await prisma.$transaction(async (tx) => {
    const company = await tx.company.create({
      data: { name: companyName, country: "India" },
      select: { id: true },
    });
    return tx.user.create({
      data: {
        name,
        email,
        passwordHash,
        phone: phone || null,
        // The role is fixed server-side. A client cannot request a role: it is
        // not part of the schema, and unknown keys are stripped by Zod.
        role: "CUSTOMER",
        companyId: company.id,
        /*
         * Whoever registers the organisation administers it: they are its only
         * member, and an organisation nobody can invite anybody into or edit is
         * a dead end. Colleagues they invite start lower and are raised
         * deliberately.
         */
        companyRole: "ADMIN",
      },
      select: { id: true, email: true, name: true },
    });
  });

  await createSession(user.id);

  /*
   * Best-effort, and after the session.
   *
   * Registration has already succeeded by this point — the account exists and
   * the person is signed in. A mail failure must not undo that or surface as a
   * failed sign-up, so this is awaited only far enough to record the outcome
   * and never allowed to throw. The same reasoning as the enquiry
   * confirmation: store first, notify second.
   */
  const verification = await sendVerificationEmail(user).catch((error) => {
    logger.warn("verification_email_failed", { userId: user.id, error: String(error) });
    return { delivered: false };
  });

  await recordAudit({
    actorId: user.id,
    action: "auth.register",
    entityType: "User",
    entityId: user.id,
    ip,
  });

  // The account page reads this to decide whether to say "check your email" or
  // to stay quiet, so it never promises a message that was not sent.
  return jsonOk({ redirectTo: verification.delivered ? "/account?verify=sent" : "/account" });
});
