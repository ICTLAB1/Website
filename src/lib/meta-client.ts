import { CONSENT_KEY } from "@/lib/analytics";
import { readAttribution } from "@/lib/attribution-client";
import { CSRF_HEADER, readCsrfCookie } from "@/lib/csrf-client";
import { leadEventId, META_EVENTS, type MetaServerEvent } from "@/lib/meta";

/**
 * Telling Meta, from the browser, and telling our own server to tell it too.
 *
 * Every function here does nothing unless the visitor has accepted analytics.
 * The pixel script is not even loaded before that (see `MetaPixel`), and the
 * server copy is only requested from here, so one check at the top of each path
 * keeps both halves under the same consent.
 */

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
    tzMetaLoad?: () => void;
  }
}

export function metaConsentGranted(): boolean {
  try {
    return window.localStorage.getItem(CONSENT_KEY) === "granted";
  } catch {
    return false;
  }
}

function cookie(name: string): string | undefined {
  const entry = document.cookie.split("; ").find((part) => part.startsWith(`${name}=`));
  return entry ? decodeURIComponent(entry.slice(name.length + 1)) : undefined;
}

export function newEventId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/** A browser event, with the id that lets Meta pair it with the server's. */
export function trackMeta(
  event: string,
  eventId: string,
  params?: Record<string, string | number>,
): void {
  if (!metaConsentGranted()) return;
  window.fbq?.("track", event, params ?? {}, { eventID: eventId });
}

/** The same event, sent by our server through the Conversions API. */
export function sendServerEvent(input: {
  event: MetaServerEvent;
  eventId: string;
  reference?: string;
  contentName?: string;
}): void {
  if (!metaConsentGranted()) return;
  const attribution = readAttribution();
  void fetch("/api/meta/events", {
    method: "POST",
    headers: { "content-type": "application/json", [CSRF_HEADER]: readCsrfCookie() },
    credentials: "same-origin",
    // The page may be about to navigate; this lets the request outlive it.
    keepalive: true,
    body: JSON.stringify({
      event: input.event,
      eventId: input.eventId,
      reference: input.reference,
      contentName: input.contentName,
      url: window.location.href,
      fbp: cookie("_fbp"),
      fbc: cookie("_fbc"),
      fbclid: attribution.fbclid,
      fbclidAt: attribution.at,
    }),
  }).catch(() => {
    // Measurement must never be the thing that breaks a page.
  });
}

const LEAD_PENDING_KEY = "techzoid.meta.pendingLead";

function sentKey(eventId: string): string {
  return `techzoid.meta.sent.${eventId}`;
}

function alreadySent(eventId: string): boolean {
  try {
    return window.sessionStorage.getItem(sentKey(eventId)) === "1";
  } catch {
    return false;
  }
}

/**
 * Remembers that a submission succeeded, so the thank-you page can report it if
 * the form page could not (consent given on the thank-you page itself, or the
 * navigation beat the request).
 *
 * The reference is stored, never read from the URL: a thank-you address typed
 * or guessed by hand has nothing stored behind it and reports nothing.
 */
export function rememberLead(reference: string): void {
  try {
    window.sessionStorage.setItem(LEAD_PENDING_KEY, reference);
  } catch {
    // Without storage the form page's own report is the only one.
  }
}

export function pendingLead(): string | null {
  try {
    return window.sessionStorage.getItem(LEAD_PENDING_KEY);
  } catch {
    return null;
  }
}

/**
 * Reports a submitted enquiry as a `Lead`, once.
 *
 * Called after the server's success response and again from the thank-you page;
 * the second call finds the id already recorded and does nothing, which is the
 * whole of the de-duplication on this side. Meta de-duplicates the browser and
 * server copies on the id itself.
 */
export function trackLead(reference: string, form?: string): void {
  if (!metaConsentGranted()) return;
  const eventId = leadEventId(reference);
  if (alreadySent(eventId)) return;
  try {
    window.sessionStorage.setItem(sentKey(eventId), "1");
  } catch {
    // Not remembered, so a refresh could report again; Meta drops the repeat by id.
  }
  trackMeta(META_EVENTS.lead, eventId, form ? { content_name: form } : undefined);
  sendServerEvent({ event: META_EVENTS.lead, eventId, reference, contentName: form });
}

/** A click on a phone, email or WhatsApp link. */
export function trackContact(channel: "phone" | "email" | "whatsapp"): void {
  if (!metaConsentGranted()) return;
  const eventId = newEventId();
  trackMeta(META_EVENTS.contact, eventId, { content_name: channel });
  sendServerEvent({ event: META_EVENTS.contact, eventId, contentName: channel });
}
