"use server";

import { redirect } from "next/navigation";

import { requireUser } from "@/lib/auth/guards";
import { sendVerificationEmail, verifyEmailCode } from "@/lib/auth/email-verification";
import { CODE_TTL_MINUTES, MAX_CODE_ATTEMPTS } from "@/lib/auth/otp";
import { hit, LIMITS } from "@/lib/auth/rate-limit";
import { recordAudit } from "@/lib/audit";
import { clientIp } from "@/lib/auth/request";
import type { AdminActionState } from "@/lib/admin/types";

/**
 * Sends a fresh verification link to the signed-in account's own address.
 *
 * It takes no email parameter, deliberately. The address comes from the
 * session, so this cannot be used to send mail to an arbitrary recipient — an
 * endpoint that accepts an address and sends it a message is a spam relay
 * wearing a helpful face.
 *
 * Rate limited per user rather than per IP. Two colleagues behind one office
 * address should not exhaust each other's attempts, and the thing being
 * protected here is one mailbox rather than the server.
 */
export async function resendVerificationEmail(
  _previous: AdminActionState,
  _formData: FormData,
): Promise<AdminActionState> {
  const user = await requireUser("/verify-email/required");

  // Same reasoning as the code form: an account that is already confirmed has
  // no business on a page about confirming it.
  if (user.emailVerified) redirect("/account");

  const limit = hit(
    `verify:${user.id}`,
    LIMITS.passwordReset.limit,
    LIMITS.passwordReset.windowSeconds,
  );
  if (!limit.allowed) {
    return {
      status: "error",
      message: "A link was sent recently. Please check your inbox, including spam, before asking for another.",
    };
  }

  const { delivered } = await sendVerificationEmail(user);

  await recordAudit({
    actorId: user.id,
    action: "auth.verification_resent",
    entityType: "User",
    entityId: user.id,
    ip: await clientIp(),
  });

  // Never claim an email is on its way when it is not.
  return delivered
    ? { status: "success", message: `Sent. Check ${user.email}, including your spam folder.` }
    : {
        status: "error",
        message:
          "We could not send the message just now. Please contact support and we will confirm your address for you.",
      };
}


/**
 * Checks the code the account was emailed.
 *
 * Rate limited on top of the per-code attempt cap, and the two guard different
 * things. The cap bounds guesses against one code; this bounds how fast
 * somebody can burn through codes by alternating guess, resend, guess. Without
 * it the cap is a speed bump rather than a wall.
 *
 * Like the resend above it takes no address and no user id — the account comes
 * from the session, so a code can only ever be checked against the account it
 * was issued to.
 */
export async function confirmVerificationCode(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const user = await requireUser("/verify-email/required");

  /*
   * Already confirmed is a reason to leave, not a message to sit under.
   *
   * This page exists to be a door. Reporting "already confirmed" and leaving
   * the code form on screen is the state a customer met after entering a
   * correct code: the verification had worked, the page said so, and the form
   * they had just finished with was still in front of them — which reads as
   * having failed.
   */
  if (user.emailVerified) redirect("/account");

  const limit = hit(`verify-code:${user.id}`, 12, 600);
  if (!limit.allowed) {
    return {
      status: "error",
      message: "Too many attempts. Wait a few minutes, then ask for a new code.",
    };
  }

  const result = await verifyEmailCode(user.id, String(formData.get("code") ?? ""));

  if (result.ok) {
    await recordAudit({
      actorId: user.id,
      action: "auth.email_verified",
      entityType: "User",
      entityId: user.id,
      metadata: { method: "code" },
      ip: await clientIp(),
    });
    /*
     * Straight to the account, rather than a success message on the form.
     *
     * `redirect` throws, so nothing below runs and the client navigates —
     * which is the point: the next thing the customer needs is their account,
     * not a confirmation that they may now go and find it. The account page
     * greets a freshly verified customer.
     */
    redirect("/account?verified=1");
  }

  /*
   * Each refusal names the action that fixes it.
   *
   * "Invalid code" is the unhelpful default: it does not tell somebody whether
   * to look harder at the email, ask for a new one, or wait. Nothing here leaks
   * anything either — the person is already signed in as the account being
   * verified, so there is no existence to disclose.
   */
  const message =
    result.reason === "wrong"
      ? result.remaining && result.remaining > 0
        ? `That code is not right. ${result.remaining} ${result.remaining === 1 ? "attempt" : "attempts"} left before you need a new one.`
        : "That code is not right, and it has no attempts left. Ask for a new one below."
      : result.reason === "expired"
        ? `That code has expired — they last ${CODE_TTL_MINUTES} minutes. Ask for a new one below.`
        : result.reason === "locked"
          ? `That code has been entered ${MAX_CODE_ATTEMPTS} times. Ask for a new one below.`
          : result.reason === "used"
            ? "That code has already been used. Ask for a new one below."
            : "Enter the six digits from the email.";

  return { status: "error", message };
}
