import "server-only";
import { cache } from "react";
import { prisma } from "@/lib/db";
import { decryptSecret, secretHint } from "@/lib/secret-box";
import { logger } from "@/lib/logger";

/**
 * Whether this deployment can take a card payment, and with what.
 *
 * The gateway is Stripe. It replaced Razorpay, and the credentials did not
 * carry over — the migration cleared them and switched the gateway off, because
 * a Razorpay key sitting in a column Stripe will be asked to authenticate with
 * is precisely the enabled-but-unusable state this file exists to prevent.
 *
 * The site's original premise is unchanged: orders are raised against a
 * purchase order and invoiced. Paying by card is an *additional* route, offered
 * only when a gateway is both switched on and fully configured, and the
 * purchase-order route never goes away. Government and enterprise buyers
 * generally cannot pay by card at all, so removing that would have cost more
 * customers than card payment gains.
 *
 * Everything here fails closed. A missing row, a missing key, a secret that
 * will not decrypt — each results in `null`, which every caller reads as "no
 * card payments", and the site carries on invoicing. There is no state in which
 * a half-configured gateway is offered to a customer.
 */

export type PaymentConfig = {
  mode: "TEST" | "LIVE";
  /**
   * Stripe's secret key. There is no publishable key beside it, because hosted
   * Checkout hands nothing to the browser — see `lib/payments/stripe`.
   */
  secretKey: string;
  /** Null when no webhook secret is set: the return page works, webhooks do not. */
  webhookSecret: string | null;
};

/**
 * Not cached with `cached()` and a tag, unlike most reads.
 *
 * Two reasons. It is only consulted on the few pages that offer payment and by
 * the payment routes themselves, so there is nothing to gain from a persistent
 * cache; and credentials in a shared cache that survives between requests is a
 * larger surface than a per-request `cache()`, for no benefit. React's `cache`
 * deduplicates within one request and forgets afterwards, which is exactly the
 * lifetime a decrypted secret should have.
 */
const load = cache(async () => {
  try {
    return await prisma.paymentSettings.findUnique({ where: { id: "singleton" } });
  } catch (error) {
    logger.warn(
      "payment_settings_unreadable",
      error instanceof Error ? { message: error.message.split("\n")[0] } : {},
    );
    return null;
  }
});

/** The usable configuration, or null if card payment is not available. */
export const getPaymentConfig = cache(async (): Promise<PaymentConfig | null> => {
  const row = await load();
  if (!row || !row.enabled) return null;

  const secretKey = decryptSecret(row.stripeSecretKey);

  if (!secretKey) {
    /*
     * Enabled but not usable.
     *
     * Worth a log line rather than silence: somebody has turned payments on and
     * believes customers can pay, and they cannot. The admin page says so too,
     * but a deployment where the AUTH_SECRET was rotated would show this
     * without anyone touching the form.
     */
    logger.warn("payment_enabled_but_not_configured", {});
    return null;
  }

  return {
    mode: row.mode,
    secretKey,
    webhookSecret: decryptSecret(row.stripeWebhookSecret),
  };
});

/** True when a customer can be offered "pay now". */
export async function cardPaymentsAvailable(): Promise<boolean> {
  return (await getPaymentConfig()) !== null;
}

export type PaymentSettingsView = {
  enabled: boolean;
  mode: "TEST" | "LIVE";
  /** Masked. The secret itself never leaves the server. */
  secretKeyHint: string | null;
  webhookSecretHint: string | null;
  /** True when enabled but the credentials cannot actually be used. */
  brokenConfiguration: boolean;
  updatedAt: Date | null;
};

/**
 * What the admin form is allowed to see.
 *
 * A deliberately narrower shape than the row: the two secrets are reduced to a
 * hint before they cross into a component. Nothing that renders can accidentally
 * print one, because nothing that renders is ever given one.
 */
export async function getPaymentSettingsView(): Promise<PaymentSettingsView> {
  const row = await load();

  const secretKey = decryptSecret(row?.stripeSecretKey);
  const webhookSecret = decryptSecret(row?.stripeWebhookSecret);

  return {
    enabled: row?.enabled ?? false,
    mode: row?.mode ?? "TEST",
    secretKeyHint: secretKey ? secretHint(secretKey) : null,
    webhookSecretHint: webhookSecret ? secretHint(webhookSecret) : null,
    brokenConfiguration: Boolean(row?.enabled) && !secretKey,
    updatedAt: row?.updatedAt ?? null,
  };
}
