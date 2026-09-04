import type { TemplateComponent, TemplateDefinition } from "@/lib/whatsapp/client";

/**
 * The templates this deployment sends, and the one place their wording and
 * variable order are defined — `createMessageTemplate` submits them to Meta
 * from exactly this text, and `sendTemplateMessage` fills the same
 * placeholders in the same order, so the two can never drift apart.
 *
 * `{{1}}`, `{{2}}`, … are WhatsApp's own placeholder syntax; Meta requires an
 * example value for each when a template is submitted, which is what
 * `bodyExamples` supplies.
 */
export const ORDER_CONFIRMATION_TEMPLATE: TemplateDefinition = {
  name: "order_confirmation",
  languageCode: "en_US",
  category: "UTILITY",
  bodyText:
    "Hello {{1}}, thank you. Your order reference is {{2}}. Order total including GST: {{3}}. Our team is confirming availability and will be in touch with provisioning details and a GST invoice.",
  bodyExamples: ["Priya Sharma", "TZ-2026-00042", "₹1,18,000.00"],
};

export const PAYMENT_CONFIRMATION_TEMPLATE: TemplateDefinition = {
  name: "payment_confirmation",
  languageCode: "en_US",
  category: "UTILITY",
  bodyText:
    "Hello {{1}}, we have received your payment of {{2}} for order {{3}}. Your order is confirmed and we are provisioning it now.",
  bodyExamples: ["Priya Sharma", "₹1,18,000.00", "TZ-2026-00042"],
};

export const WHATSAPP_TEMPLATES: TemplateDefinition[] = [
  ORDER_CONFIRMATION_TEMPLATE,
  PAYMENT_CONFIRMATION_TEMPLATE,
];

function textParams(values: string[]): TemplateComponent[] {
  return [{ type: "body", parameters: values.map((text) => ({ type: "text", text })) }];
}

export function orderConfirmationComponents(name: string, reference: string, total: string): TemplateComponent[] {
  return textParams([name, reference, total]);
}

export function paymentConfirmationComponents(name: string, amount: string, reference: string): TemplateComponent[] {
  return textParams([name, amount, reference]);
}
