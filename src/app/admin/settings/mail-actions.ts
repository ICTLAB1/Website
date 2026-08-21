"use server";

import { requireAdmin } from "@/lib/auth/guards";
import { hit } from "@/lib/auth/rate-limit";
import { recordAudit } from "@/lib/audit";
import { clientIp } from "@/lib/auth/request";
import { getSiteConfig } from "@/lib/site-config";
import { resetMailTransport, sendMailVerbose } from "@/lib/mail";
import { describeMailFailure } from "@/app/admin/settings/mail-hints";
import { logger } from "@/lib/logger";
import type { AdminActionState } from "@/lib/admin/types";

/**
 * "Is email actually working?"
 *
 * Until this existed the answer lived only in the container log. Every
 * customer-facing flow deliberately swallows mail errors — an enquiry is stored
 * before it is acknowledged, a registration succeeds whether or not the
 * verification link goes out — which is right, because losing an order to a
 * mail outage would be far worse. The cost is that a mailbox rejecting every
 * message looks exactly like one that is working, and stays that way until a
 * customer says they never received their licence keys.
 *
 * So this sends one real message to the administrator pressing the button, and
 * reports the provider's own rejection when it fails. It is safe to show that
 * detail here and nowhere else: the page is ADMIN-only, and the person reading
 * it is the person who can act on it.
 *
 * It sends only to the signed-in administrator's own address. Not a field —
 * an authenticated form that will send mail to an arbitrary address is a spam
 * relay with a login page in front of it.
 */
export async function sendTestEmail(
  _previous: AdminActionState,
  _formData: FormData,
): Promise<AdminActionState> {
  const admin = await requireAdmin();

  const limit = hit(`testmail:${admin.id}`, 5, 600);
  if (!limit.allowed) {
    return {
      status: "error",
      message: "Too many test messages. Please wait a few minutes before trying again.",
    };
  }

  // Credentials are usually corrected immediately before pressing this, and a
  // pooled transport built from the old ones would keep reporting the old
  // failure — the most confusing possible answer to having just fixed it.
  resetMailTransport();

  const config = await getSiteConfig();
  const result = await sendMailVerbose({
    to: admin.email,
    subject: `Test message from ${config.tradingName}`,
    text: [
      `This is a test message sent from the ${config.tradingName} admin panel.`,
      "",
      "If you are reading it, outbound email is working: enquiry confirmations,",
      "order confirmations, quotations and account verification links will all",
      "reach your customers.",
    ].join("\n"),
  });

  await recordAudit({
    actorId: admin.id,
    action: "settings.test_email",
    entityType: "SiteSettings",
    entityId: "singleton",
    metadata: { delivered: result.delivered },
    ip: await clientIp(),
  });

  if (result.delivered) {
    return {
      status: "success",
      message: `Sent. Check ${admin.email} — including the junk folder, since the first message from a new sender often lands there.`,
    };
  }

  logger.error("test_email_failed", { kind: result.failure.kind });

  return { status: "error", message: describeMailFailure(result.failure) };
}
