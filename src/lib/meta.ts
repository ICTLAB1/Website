/**
 * Meta (Facebook and Instagram) advertising measurement: the constants, and the
 * two rules that must be the same on the browser and the server.
 *
 * ## What this is for
 *
 * A Meta campaign can only optimise for what Meta is told about. With the pixel
 * reporting page views alone, the delivery system learns to find people who
 * click, not people who ask for a quotation. This file names the three events
 * that close that gap — `ViewContent`, `Contact`, `Lead` — and how each is
 * identified, so that the browser's copy and the server's copy of the same
 * event carry the same id and Meta counts it once.
 *
 * ## Consent comes first
 *
 * Nothing here loads Meta's script, sets its cookies or sends it anything until
 * the visitor has pressed "Accept analytics" on the site's own banner. That is
 * stricter than Google's tag, which this site lets run by default outside the
 * EEA, and it is deliberate: there is no region signal on the server to hang
 * that exception on, and the instruction was to fire after consent. The cost is
 * that Meta sees only visitors who accepted. See docs/meta-tracking.md.
 *
 * Not secret: the pixel id is served to every visitor in the page source. The
 * secret half, the Conversions API token, is read only on the server from
 * `META_CAPI_TOKEN` and appears nowhere in this file.
 */

/** The dataset ("pixel") events are reported to. An empty value switches Meta off. */
export const META_PIXEL_ID = (process.env.NEXT_PUBLIC_META_PIXEL_ID ?? "1143158141004040").trim();

/** Validated because it reaches a script body. */
export const META_ENABLED = /^[0-9]{10,20}$/.test(META_PIXEL_ID);

/**
 * The hosts the pixel needs, widened only on pages where analytics runs.
 *
 * `connect.facebook.net` serves `fbevents.js`; `www.facebook.com/tr` receives
 * the events, as an image where the browser prefers one and as a request
 * otherwise, so the host is allowed under both directives for the same reason
 * the Google measurement hosts are — which transport carries a ping is the
 * browser's choice, not ours.
 */
export const META_CSP = {
  script: ["https://connect.facebook.net"],
  connect: ["https://www.facebook.com", "https://connect.facebook.net"],
  img: ["https://www.facebook.com"],
} as const;

export const META_EVENTS = {
  lead: "Lead",
  contact: "Contact",
  viewContent: "ViewContent",
} as const;

export type MetaServerEvent = typeof META_EVENTS.lead | typeof META_EVENTS.contact;

/**
 * The id a submitted enquiry's `Lead` carries, on the browser and the server.
 *
 * Derived from the reference the server issued, so the two sides agree without
 * having to exchange anything, and so a refresh or a second tab cannot mint a
 * second lead for the same enquiry.
 */
export function leadEventId(reference: string): string {
  return `lead-${reference}`;
}

/** What a real enquiry reference looks like: ENQ- (requirements, basket) or TKT- (contact form). */
export const REFERENCE_PATTERN = /^(ENQ|TKT)-\d{4}-[A-Z0-9]{6}$/;

/**
 * Pages about something to buy, which is what `ViewContent` is for.
 *
 * A list rather than every page: a view of the careers page or the privacy
 * policy teaches the delivery system nothing about who wants a licence.
 * Product detail pages, the brand and service pages, the hardware pages, and
 * the Microsoft, Adobe, Autodesk, cloud and security landing pages.
 */
const CONTENT_PATH =
  /^\/(products|brands|services|hardware|solutions|microsoft[\w-]*|adobe[\w-]*|autodesk[\w-]*|aws[\w-]*|zoho[\w-]*|cloud[\w-]*|security[\w-]*|cybersecurity[\w-]*|enterprise-it-hardware|corporate-it-solutions)(\/|$)/;

export function isContentPath(pathname: string): boolean {
  return CONTENT_PATH.test(pathname);
}

/** A page's name for `content_name`: its title without the site suffix. */
export function contentName(title: string, pathname: string): string {
  const cleaned = title.replace(/\s*\|\s*TechZoid.*$/i, "").trim();
  return (cleaned || pathname).slice(0, 120);
}
