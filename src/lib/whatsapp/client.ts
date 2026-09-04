import "server-only";
import { logger } from "@/lib/logger";

/**
 * Sending a WhatsApp message through Meta's Cloud API.
 *
 * There is no "send free text" here, and that is Meta's rule, not a
 * limitation of this file. A business may only message a customer outside an
 * active 24-hour conversation window using a pre-approved **template** — a
 * fixed piece of copy with named placeholders, submitted through
 * `createMessageTemplate` below and reviewed by Meta before it can be used.
 * `sendTemplateMessage` sends by template name; there is deliberately no path
 * that lets a caller compose the words a customer receives.
 *
 * ## Setting it up, once
 *
 *   1. developers.facebook.com → an app with the WhatsApp product added,
 *      linked to a Meta Business Account.
 *   2. WhatsApp → API Setup gives a free Meta-owned test number, its
 *      **Phone number ID**, and the **WhatsApp Business Account ID** — paste
 *      both into /admin/settings.
 *   3. A **token**: the temporary one shown on that same page works for about
 *      24 hours, enough to prove the connection. For anything longer,
 *      Business Settings → System Users → create one → assign it this app
 *      with `whatsapp_business_messaging` → generate a token with the
 *      longest expiry offered.
 *   4. Create and submit the templates this deployment needs — the "Create
 *      WhatsApp templates" button on the settings page does this, using the
 *      credentials just entered. Meta reviews every template before it can
 *      be sent; check WhatsApp Manager for approval.
 */

const GRAPH_VERSION = "v21.0";
const GRAPH = `https://graph.facebook.com/${GRAPH_VERSION}`;
const TIMEOUT_MS = 15_000;

export type WhatsAppConfig = {
  phoneNumberId: string;
  businessAccountId: string;
  accessToken: string;
};

export type WhatsAppResult = { ok: true; messageId: string } | { ok: false; detail: string };

async function graphRequest(
  path: string,
  accessToken: string,
  body: Record<string, unknown>,
): Promise<{ ok: true; body: Record<string, unknown> } | { ok: false; detail: string }> {
  let response: Response;
  try {
    response = await fetch(`${GRAPH}/${path}`, {
      method: "POST",
      headers: { authorization: `Bearer ${accessToken}`, "content-type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (error) {
    return {
      ok: false,
      detail: `Could not reach Meta: ${error instanceof Error ? error.message : String(error)}`,
    };
  }

  const payload = (await response.json().catch(() => null)) as Record<string, unknown> | null;

  if (!response.ok) {
    /*
     * Meta's `error.message` is genuinely actionable — "Re-engagement
     * message" for the 24-hour-window rule, "template name does not exist"
     * for one not yet approved — and reaches only the ADMIN-only settings
     * page or a server log, never a customer.
     */
    const error = payload?.error as { message?: unknown; error_user_msg?: unknown } | undefined;
    const described =
      (typeof error?.error_user_msg === "string" && error.error_user_msg) ||
      (typeof error?.message === "string" && error.message) ||
      `HTTP ${response.status}`;
    return { ok: false, detail: described };
  }

  return { ok: true, body: payload ?? {} };
}

export type TemplateComponent = {
  type: "body";
  parameters: Array<{ type: "text"; text: string }>;
};

/**
 * @param to Digits only, country code first, no leading `+` — see
 * `lib/whatsapp/phone`.
 */
export async function sendTemplateMessage(
  config: WhatsAppConfig,
  input: { to: string; templateName: string; languageCode: string; components: TemplateComponent[] },
): Promise<WhatsAppResult> {
  const result = await graphRequest(`${config.phoneNumberId}/messages`, config.accessToken, {
    messaging_product: "whatsapp",
    to: input.to,
    type: "template",
    template: {
      name: input.templateName,
      language: { code: input.languageCode },
      components: input.components,
    },
  });

  if (!result.ok) {
    logger.warn("whatsapp_send_failed", { template: input.templateName, detail: result.detail });
    return result;
  }

  const messages = result.body.messages as Array<{ id?: unknown }> | undefined;
  const messageId = typeof messages?.[0]?.id === "string" ? messages[0].id : "";
  return { ok: true, messageId };
}

export type TemplateDefinition = {
  name: string;
  languageCode: string;
  /** "UTILITY": a transaction the customer already agreed to, not marketing. */
  category: "UTILITY" | "MARKETING";
  bodyText: string;
  /** One example per `{{n}}` placeholder in `bodyText`, in order — Meta requires a sample to review against. */
  bodyExamples: string[];
};

export type CreateTemplateResult =
  | { ok: true; status: string }
  | { ok: false; detail: string };

/**
 * Submits a template for Meta's review. A template already submitted under
 * this name is reported by Meta as a duplicate, which this surfaces as an
 * ordinary failure rather than treating as success — re-submitting an
 * existing template is not this deployment's decision to paper over.
 */
export async function createMessageTemplate(
  config: WhatsAppConfig,
  template: TemplateDefinition,
): Promise<CreateTemplateResult> {
  const result = await graphRequest(`${config.businessAccountId}/message_templates`, config.accessToken, {
    name: template.name,
    language: template.languageCode,
    category: template.category,
    components: [
      {
        type: "BODY",
        text: template.bodyText,
        example: { body_text: [template.bodyExamples] },
      },
    ],
  });

  if (!result.ok) return result;

  const status = typeof result.body.status === "string" ? result.body.status : "SUBMITTED";
  return { ok: true, status };
}
