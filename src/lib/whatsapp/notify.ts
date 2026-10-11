import "server-only";
import { logger } from "@/lib/logger";
import { formatMoney } from "@/lib/money";
import { getWhatsAppConfig } from "@/lib/whatsapp/config";
import { sendTemplateMessage } from "@/lib/whatsapp/client";
import { normaliseWhatsAppPhone } from "@/lib/whatsapp/phone";
import {
  ORDER_CONFIRMATION_TEMPLATE,
  PAYMENT_CONFIRMATION_TEMPLATE,
  orderConfirmationComponents,
  paymentConfirmationComponents,
} from "@/lib/whatsapp/templates";

/**
 * Order and payment confirmations over WhatsApp — additional to the email
 * `order-service.ts` and `payments/service.ts` already send, never instead of
 * it. Every function here is fire-and-forget and swallows its own failure:
 * WhatsApp not being configured, a phone number this deployment cannot parse,
 * or Meta rejecting a template that has not been approved yet are all the
 * same from an order's point of view — the email still went out, and this is
 * a bonus channel, not a dependency.
 */

async function send(
  billingPhone: string | null,
  templateName: string,
  languageCode: string,
  components: ReturnType<typeof orderConfirmationComponents>,
  logContext: Record<string, unknown>,
): Promise<void> {
  /*
   * The try is what makes the paragraph above true.
   *
   * "Swallows its own failure" described the three returns below and the
   * `result.ok` branch — every way Meta itself can say no. It did not cover
   * this function throwing, and `getWhatsAppConfig()` is a database read, so a
   * connection hiccup rejected the promise. Both callers are
   * `void notifyOrderWhatsApp(...)` with nothing attached, which is correct for
   * a bonus channel and makes that rejection an unhandled one — on the path
   * that has just taken a customer's money.
   *
   * Nothing above this needs to know: the order is committed and the email has
   * gone. So the failure is logged and the promise resolves, which is what the
   * callers were already written to expect.
   */
  try {
    const config = await getWhatsAppConfig();
    if (!config) return;

    const to = normaliseWhatsAppPhone(billingPhone);
    if (!to) return;

    const result = await sendTemplateMessage(config, { to, templateName, languageCode, components });
    if (result.ok) {
      logger.info("whatsapp_notification_sent", { ...logContext, template: templateName });
    } else {
      logger.warn("whatsapp_notification_failed", { ...logContext, template: templateName, detail: result.detail });
    }
  } catch (error) {
    logger.error("whatsapp_notification_threw", {
      ...logContext,
      template: templateName,
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

export async function notifyOrderWhatsApp(order: {
  reference: string;
  billingName: string;
  billingPhone: string | null;
  totalMinor: number;
  currency: string;
}): Promise<void> {
  await send(
    order.billingPhone,
    ORDER_CONFIRMATION_TEMPLATE.name,
    ORDER_CONFIRMATION_TEMPLATE.languageCode,
    orderConfirmationComponents(order.billingName, order.reference, formatMoney(order.totalMinor, order.currency)),
    { reference: order.reference },
  );
}

export async function notifyPaymentWhatsApp(order: {
  reference: string;
  billingName: string;
  billingPhone: string | null;
  amountMinor: number;
  currency: string;
}): Promise<void> {
  await send(
    order.billingPhone,
    PAYMENT_CONFIRMATION_TEMPLATE.name,
    PAYMENT_CONFIRMATION_TEMPLATE.languageCode,
    paymentConfirmationComponents(order.billingName, formatMoney(order.amountMinor, order.currency), order.reference),
    { reference: order.reference },
  );
}
