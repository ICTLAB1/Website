import "server-only";
import { createHash } from "node:crypto";

import { logger } from "@/lib/logger";
import { META_PIXEL_ID, type MetaServerEvent } from "@/lib/meta";

/**
 * Meta's Conversions API: the server's copy of an event the browser also sent.
 *
 * Browsers lose events to ad blockers, Safari's tracking limits and closed tabs;
 * the server does not. Sending both, with one `event_id`, lets Meta count each
 * once and recover the ones the browser dropped. It also lets a hashed email and
 * phone travel, which is what makes a lead matchable to the person who clicked
 * the ad — the browser never has them at the moment the form is accepted.
 *
 * ## The token
 *
 * `META_CAPI_TOKEN`, read here from the environment and nowhere else. It is
 * sent in an `Authorization` header rather than a query string so it never
 * appears in a URL, a log line or a proxy's access record. Unset, this module
 * logs once per call and sends nothing, which is the supported state before the
 * token has been added.
 *
 * ## What is sent
 *
 * Only what Meta's matching needs: hashed email and phone (trimmed, lower-cased
 * and SHA-256'd first, as Meta requires), the request's IP address and user
 * agent, the `_fbp` and `_fbc` identifiers, and the page. Never a name, a
 * company, a message or a reference.
 */

const GRAPH_VERSION = "v21.0";
const TIMEOUT_MS = 5000;

export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

/** Meta wants an email lower-cased and trimmed before hashing. */
export function hashEmail(email: string): string | undefined {
  const normalised = email.trim().toLowerCase();
  return normalised.includes("@") ? sha256(normalised) : undefined;
}

/**
 * Meta wants digits only, with the country code. Ten digits is an Indian mobile
 * number written without it, which is how this site's forms mostly receive them.
 */
export function hashPhone(phone: string): string | undefined {
  let digits = phone.replace(/\D/g, "");
  digits = digits.replace(/^00/, "");
  if (digits.length === 10) digits = `91${digits}`;
  else if (digits.length === 11 && digits.startsWith("0")) digits = `91${digits.slice(1)}`;
  return digits.length >= 8 ? sha256(digits) : undefined;
}

const FBC_PATTERN = /^fb\.[0-2]\.\d{10,13}\.[A-Za-z0-9_-]{6,}$/;
const FBP_PATTERN = /^fb\.[0-2]\.\d{10,13}\.\d{4,20}$/;

/**
 * The click identifier: the `_fbc` cookie when the browser has it, else built
 * from the `fbclid` in the landing URL in the format Meta documents.
 */
export function resolveFbc(input: {
  fbc?: string;
  fbclid?: string;
  fbclidAt?: number;
}): string | undefined {
  if (input.fbc && FBC_PATTERN.test(input.fbc)) return input.fbc;
  if (input.fbclid && /^[A-Za-z0-9_-]{6,150}$/.test(input.fbclid)) {
    const at = input.fbclidAt && Number.isFinite(input.fbclidAt) ? input.fbclidAt : Date.now();
    return `fb.1.${Math.trunc(at)}.${input.fbclid}`;
  }
  return undefined;
}

export type CapiInput = {
  event: MetaServerEvent;
  eventId: string;
  sourceUrl: string;
  ip?: string;
  userAgent?: string;
  fbp?: string;
  fbc?: string;
  email?: string;
  phone?: string;
  contentName?: string;
};

export function buildPayload(input: CapiInput, now: Date = new Date()) {
  const userData: Record<string, unknown> = {};
  const em = input.email ? hashEmail(input.email) : undefined;
  const ph = input.phone ? hashPhone(input.phone) : undefined;
  if (em) userData.em = [em];
  if (ph) userData.ph = [ph];
  if (input.ip && input.ip !== "unknown") userData.client_ip_address = input.ip;
  if (input.userAgent) userData.client_user_agent = input.userAgent;
  if (input.fbp && FBP_PATTERN.test(input.fbp)) userData.fbp = input.fbp;
  if (input.fbc) userData.fbc = input.fbc;

  const data: Record<string, unknown> = {
    event_name: input.event,
    event_time: Math.floor(now.getTime() / 1000),
    event_id: input.eventId,
    event_source_url: input.sourceUrl,
    action_source: "website",
    user_data: userData,
  };
  if (input.contentName) data.custom_data = { content_name: input.contentName };

  const body: Record<string, unknown> = { data: [data] };
  // Set only while testing in Events Manager, so test traffic is shown there
  // and not counted against a campaign.
  const testCode = process.env.META_TEST_EVENT_CODE?.trim();
  if (testCode) body.test_event_code = testCode;
  return body;
}

/** Posts one event. Returns whether Meta accepted it; never throws. */
export async function sendCapiEvent(input: CapiInput): Promise<boolean> {
  const token = process.env.META_CAPI_TOKEN?.trim();
  if (!token) {
    logger.warn("meta_capi_not_configured", { event: input.event });
    return false;
  }

  try {
    const response = await fetch(
      `https://graph.facebook.com/${GRAPH_VERSION}/${META_PIXEL_ID}/events`,
      {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
        body: JSON.stringify(buildPayload(input)),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      },
    );
    if (!response.ok) {
      // Meta's error body says what was wrong with the request; it carries no secret.
      logger.warn("meta_capi_rejected", {
        event: input.event,
        status: response.status,
        detail: (await response.text()).slice(0, 300),
      });
      return false;
    }
    logger.info("meta_capi_sent", { event: input.event });
    return true;
  } catch (error) {
    logger.warn("meta_capi_failed", {
      event: input.event,
      message: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}
