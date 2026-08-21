"use server";

import { requireUser } from "@/lib/auth/guards";
import { sendVerificationEmail } from "@/lib/auth/email-verification";
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

  if (user.emailVerified) {
    return { status: "success", message: "This address is already confirmed." };
  }

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
