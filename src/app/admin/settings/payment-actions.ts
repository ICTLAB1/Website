"use server";

import { z } from "zod";

import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/guards";
import { recordAudit } from "@/lib/audit";
import { clientIp } from "@/lib/auth/request";
import { fieldErrorsOf } from "@/lib/validation";
import { hit, LIMITS } from "@/lib/auth/rate-limit";
import { encryptSecret } from "@/lib/secret-box";
import type { AdminActionState } from "@/lib/admin/types";

/**
 * Saving payment gateway credentials.
 *
 * ADMIN only. This is the highest-privilege form on the site: what it stores
 * can take money in the company's name, and pointing it at live keys is a
 * commercial act rather than a configuration tweak.
 *
 * Two rules shape the whole thing.
 *
 * A blank secret field means "leave the stored one alone", never "clear it".
 * The form cannot show what is saved — that is the point of it being
 * write-only — so a blank box is the normal state of the page, and treating
 * that as an instruction to delete would wipe the keys every time somebody
 * toggled Test to Live. Clearing is a separate, explicit checkbox.
 *
 * Nothing is stored in plain text. Both secrets go through `secret-box`, so a
 * database backup is not the ability to take payments.
 */

/**
 * `rzp_test_...` or `rzp_live_...`. Checked because a key id pasted with
 * surrounding whitespace or a truncated copy fails at the worst moment — in
 * front of a customer at checkout — rather than here.
 */
const keyIdField = z
  .string()
  .trim()
  .max(80)
  .transform((value) => (value.length > 0 ? value : null))
  .nullable()
  .refine((value) => value === null || /^rzp_(test|live)_[A-Za-z0-9]{10,}$/.test(value), {
    message: "A Razorpay key id looks like rzp_test_xxxxxxxxxxxx or rzp_live_xxxxxxxxxxxx.",
  });

/** Secrets are opaque; only length is worth checking. */
const secretField = z
  .string()
  .trim()
  .max(200)
  .transform((value) => (value.length > 0 ? value : null))
  .nullable()
  .refine((value) => value === null || value.length >= 12, {
    message: "That looks too short to be a secret. Paste the whole value.",
  });

const schema = z.object({
  enabled: z.coerce.boolean().default(false),
  mode: z.enum(["TEST", "LIVE"]),
  razorpayKeyId: keyIdField,
  razorpayKeySecret: secretField,
  razorpayWebhookSecret: secretField,
  clearKeySecret: z.coerce.boolean().default(false),
  clearWebhookSecret: z.coerce.boolean().default(false),
});

export async function savePaymentSettings(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const admin = await requireAdmin();

  const limit = hit(`payments:${admin.id}`, LIMITS.adminWrite.limit, LIMITS.adminWrite.windowSeconds);
  if (!limit.allowed) {
    return { status: "error", message: "Too many changes in a short period. Please slow down." };
  }

  const parsed = schema.safeParse({
    enabled: formData.get("enabled") === "on",
    mode: formData.get("mode"),
    razorpayKeyId: formData.get("razorpayKeyId") ?? "",
    razorpayKeySecret: formData.get("razorpayKeySecret") ?? "",
    razorpayWebhookSecret: formData.get("razorpayWebhookSecret") ?? "",
    clearKeySecret: formData.get("clearKeySecret") === "on",
    clearWebhookSecret: formData.get("clearWebhookSecret") === "on",
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Please correct the highlighted fields.",
      fieldErrors: fieldErrorsOf(parsed.error),
    };
  }

  const input = parsed.data;
  const existing = await prisma.paymentSettings.findUnique({
    where: { id: "singleton" },
    select: { razorpayKeySecret: true, razorpayWebhookSecret: true },
  });

  /** Blank leaves it; a value replaces it; the checkbox removes it. */
  function nextSecret(
    supplied: string | null,
    clear: boolean,
    stored: string | null | undefined,
  ): string | null {
    if (clear) return null;
    if (supplied) return encryptSecret(supplied);
    return stored ?? null;
  }

  const keySecret = nextSecret(input.razorpayKeySecret, input.clearKeySecret, existing?.razorpayKeySecret);
  const webhookSecret = nextSecret(
    input.razorpayWebhookSecret,
    input.clearWebhookSecret,
    existing?.razorpayWebhookSecret,
  );

  /*
   * Refuse to switch on a gateway that cannot work.
   *
   * Enabling with no key id or no secret would show customers a "Pay now"
   * button that fails when they press it. Better to refuse here, where the
   * person can fix it, than at checkout where they cannot.
   */
  if (input.enabled && (!input.razorpayKeyId || !keySecret)) {
    return {
      status: "error",
      message:
        "Add both the key id and the key secret before switching payments on. Until then customers see the purchase-order route only.",
    };
  }

  const data = {
    enabled: input.enabled,
    mode: input.mode,
    razorpayKeyId: input.razorpayKeyId,
    razorpayKeySecret: keySecret,
    razorpayWebhookSecret: webhookSecret,
    updatedById: admin.id,
  };

  await prisma.paymentSettings.upsert({
    where: { id: "singleton" },
    create: { id: "singleton", ...data },
    update: data,
  });

  /*
   * What changed, never what it changed to.
   *
   * The audit log is readable by any administrator and must not become a second
   * copy of the credentials. Recording that the secret was replaced, and the
   * mode it now runs in, answers the question an audit log exists for — who
   * pointed this at live keys, and when.
   */
  await recordAudit({
    actorId: admin.id,
    action: "payments.save",
    entityType: "PaymentSettings",
    entityId: "singleton",
    metadata: {
      enabled: input.enabled,
      mode: input.mode,
      keyIdSet: Boolean(input.razorpayKeyId),
      keySecretReplaced: Boolean(input.razorpayKeySecret),
      keySecretCleared: input.clearKeySecret,
      webhookSecretReplaced: Boolean(input.razorpayWebhookSecret),
      webhookSecretCleared: input.clearWebhookSecret,
    },
    ip: await clientIp(),
  });

  const state = !input.enabled
    ? "Saved. Card payments are off; customers see the purchase-order route only."
    : input.mode === "LIVE"
      ? "Saved. Card payments are LIVE — real money will be taken."
      : "Saved. Card payments are on in TEST mode; no real money moves.";

  return { status: "success", message: state };
}
