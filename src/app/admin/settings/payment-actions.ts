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
 * `sk_test_…` or `sk_live_…`. Shaped-checked because a key pasted with
 * surrounding whitespace or truncated in the copy fails at the worst possible
 * moment — in front of a customer at checkout — rather than here.
 *
 * The prefix is also the one place the TEST/LIVE mode field can be contradicted
 * by the credential itself, which the save path checks below.
 */
const secretKeyField = z
  .string()
  .trim()
  .max(200)
  .transform((value) => (value.length > 0 ? value : null))
  .nullable()
  .refine((value) => value === null || /^sk_(test|live)_[A-Za-z0-9]{16,}$/.test(value), {
    message: "A Stripe secret key looks like sk_test_… or sk_live_….",
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

/** Not a secret — just kept reasonable so a pasted paragraph is rejected as the wrong field. */
const idField = z
  .string()
  .trim()
  .max(64)
  .transform((value) => (value.length > 0 ? value : null))
  .nullable();

const schema = z.object({
  enabled: z.coerce.boolean().default(false),
  mode: z.enum(["TEST", "LIVE"]),
  stripeSecretKey: secretKeyField,
  stripeWebhookSecret: secretField,
  clearSecretKey: z.coerce.boolean().default(false),
  clearWebhookSecret: z.coerce.boolean().default(false),

  ccavenueEnabled: z.coerce.boolean().default(false),
  ccavenueMerchantId: idField,
  ccavenueAccessCode: idField,
  ccavenueWorkingKey: secretField,
  clearCcavenueWorkingKey: z.coerce.boolean().default(false),
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
    stripeSecretKey: formData.get("stripeSecretKey") ?? "",
    stripeWebhookSecret: formData.get("stripeWebhookSecret") ?? "",
    clearSecretKey: formData.get("clearSecretKey") === "on",
    clearWebhookSecret: formData.get("clearWebhookSecret") === "on",

    ccavenueEnabled: formData.get("ccavenueEnabled") === "on",
    ccavenueMerchantId: formData.get("ccavenueMerchantId") ?? "",
    ccavenueAccessCode: formData.get("ccavenueAccessCode") ?? "",
    ccavenueWorkingKey: formData.get("ccavenueWorkingKey") ?? "",
    clearCcavenueWorkingKey: formData.get("clearCcavenueWorkingKey") === "on",
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
    select: { stripeSecretKey: true, stripeWebhookSecret: true, ccavenueWorkingKey: true },
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

  const secretKey = nextSecret(input.stripeSecretKey, input.clearSecretKey, existing?.stripeSecretKey);
  const webhookSecret = nextSecret(
    input.stripeWebhookSecret,
    input.clearWebhookSecret,
    existing?.stripeWebhookSecret,
  );
  const ccavenueWorkingKey = nextSecret(
    input.ccavenueWorkingKey,
    input.clearCcavenueWorkingKey,
    existing?.ccavenueWorkingKey,
  );

  /*
   * Refuse to switch on a gateway that cannot work.
   *
   * Enabling with no secret key would show customers a "Pay now" button that
   * fails when they press it. Better to refuse here, where the person can fix
   * it, than at checkout where they cannot.
   */
  if (input.enabled && !secretKey) {
    return {
      status: "error",
      message:
        "Add the Stripe secret key before switching payments on. Until then customers see the purchase-order route only.",
    };
  }

  /*
   * And refuse a key that disagrees with the mode.
   *
   * `sk_live_…` selected while the mode says TEST is somebody about to take
   * real money believing they are rehearsing; `sk_test_…` under LIVE is a
   * checkout that declines every card. The prefix is the only part of a Stripe
   * credential that says which it is, so it is worth reading.
   */
  if (input.stripeSecretKey) {
    const keyIsLive = input.stripeSecretKey.startsWith("sk_live_");
    if (keyIsLive !== (input.mode === "LIVE")) {
      return {
        status: "error",
        message: keyIsLive
          ? "That is a live secret key but the mode is set to TEST. Set the mode to LIVE, or paste a test key."
          : "That is a test secret key but the mode is set to LIVE. Set the mode to TEST, or paste a live key.",
        fieldErrors: { stripeSecretKey: ["The key and the mode disagree."] },
      };
    }
  }

  /*
   * Same refusal, for CCAvenue: on with any of the three pieces missing shows
   * a customer a button that fails when pressed.
   */
  const ccavenueMerchantId = input.ccavenueMerchantId;
  const ccavenueAccessCode = input.ccavenueAccessCode;
  if (input.ccavenueEnabled && !(ccavenueMerchantId && ccavenueAccessCode && ccavenueWorkingKey)) {
    return {
      status: "error",
      message:
        "Add the merchant id, access code and working key before switching CCAvenue on. Until then customers do not see it as an option.",
    };
  }

  const data = {
    enabled: input.enabled,
    mode: input.mode,
    stripeSecretKey: secretKey,
    stripeWebhookSecret: webhookSecret,
    ccavenueEnabled: input.ccavenueEnabled,
    ccavenueMerchantId,
    ccavenueAccessCode,
    ccavenueWorkingKey,
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
      secretKeyReplaced: Boolean(input.stripeSecretKey),
      secretKeyCleared: input.clearSecretKey,
      webhookSecretReplaced: Boolean(input.stripeWebhookSecret),
      webhookSecretCleared: input.clearWebhookSecret,
      ccavenueEnabled: input.ccavenueEnabled,
      ccavenueWorkingKeyReplaced: Boolean(input.ccavenueWorkingKey),
      ccavenueWorkingKeyCleared: input.clearCcavenueWorkingKey,
    },
    ip: await clientIp(),
  });

  const stripeState = !input.enabled
    ? "Stripe is off"
    : input.mode === "LIVE"
      ? "Stripe is LIVE"
      : "Stripe is on in TEST mode";
  const ccavenueState = !input.ccavenueEnabled
    ? "CCAvenue is off"
    : input.mode === "LIVE"
      ? "CCAvenue is LIVE"
      : "CCAvenue is on in TEST mode";
  const anyLive = (input.enabled && input.mode === "LIVE") || (input.ccavenueEnabled && input.mode === "LIVE");

  return {
    status: "success",
    message: `Saved. ${stripeState}; ${ccavenueState}.${anyLive ? " Real money will be taken." : ""}`,
  };
}
