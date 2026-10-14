/**
 * Google Analytics, and the two questions worth settling before it loads.
 *
 * ## Where it runs
 *
 * Public pages only. Not `/admin`, not `/account`, not the API.
 *
 * That is a deliberate limit rather than tidiness. A page path is the main
 * thing an analytics property records, and the signed-in paths on this site
 * carry business identifiers in them — `/account/quotes/QTE-2026-4F7K2P`,
 * `/admin/organisations/…`. Sending those to a third party would export a map
 * of who is quoting what, which nobody asked for and no report needs. What the
 * business actually wants to know from analytics — which products are looked
 * at, which pages bring enquiries — all happens before anybody signs in.
 *
 * It also keeps staff activity out of the numbers, which is the other reason
 * every serious property ends up filtering its own office traffic.
 *
 * ## Where it does not run
 *
 * Development, and any host that is not a real domain. A production build is
 * what the verification suites run against, so without the host check every
 * local gate run would report a few hundred page views from `localhost` into
 * the live property.
 */

/**
 * The measurement IDs, supplied by the business on 25 August 2026.
 *
 * Two of them, and two is not a mistake: a business that has run more than one
 * property — an old site's, a new one's, an agency's — usually wants both fed
 * while it decides which to keep. gtag.js is loaded once and then configured
 * per property, which is Google's own answer to this and costs one extra line
 * rather than a second script.
 *
 * Not secret: they are served to every visitor in the page source, and each
 * identifies a property rather than granting access to one. Settable by
 * environment as a comma-separated list, and an empty value switches analytics
 * off entirely — which is the supported way to run this application without it.
 */
export const GA_MEASUREMENT_IDS = (
  process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ?? "G-P0H1WJDZ7Y,G-2CEL7BH689"
)
  .split(",")
  .map((id) => id.trim())
  /*
   * Checked here rather than at the point of use, because these end up inside
   * a `<script>` body. Nothing a visitor controls reaches this list today —
   * the values come from this file or from the server's environment — but a
   * value that is interpolated into script is validated on principle, so the
   * day somebody moves it into the settings table is not the day to remember.
   */
  .filter((id) => /^G-[A-Z0-9]{6,20}$/.test(id));

/**
 * The Tag Manager container, supplied by the business on 25 August 2026.
 *
 * A container is not a second analytics property. GA4 stays configured
 * directly, as it already was — a measurement that the business depends on
 * should not stop working because somebody publishes a broken container
 * version. The container is for everything else: conversion tags, remarketing,
 * a chat widget, whatever marketing wants to add without a deploy.
 *
 * Both load from the same script host and share one `dataLayer`, so the
 * consent defaults set below govern the container's tags exactly as they
 * govern GA4's.
 *
 * Not secret, for the same reason the measurement IDs are not: it is served to
 * every visitor in the page source. An empty value switches the container off.
 */
export const GTM_CONTAINER_ID = (
  process.env.NEXT_PUBLIC_GTM_CONTAINER_ID ?? "GTM-THHL334G"
).trim();

/** Validated for the same reason the measurement IDs are: it reaches a script body. */
export const GTM_ENABLED = /^GTM-[A-Z0-9]{4,12}$/.test(GTM_CONTAINER_ID);

/**
 * The Google Ads account, registered so this site's own tag can talk to it.
 *
 * ## What this does, and what it deliberately does not
 *
 * It emits one `gtag('config', 'AW-…')`. That registers the destination and
 * enables conversion linking from the site's own tag; it counts nothing. The
 * thing that counts a conversion is a `gtag('event', 'conversion', …)` call or
 * a tag in the container, and this file does not make one.
 *
 * That distinction is the whole reason this is safe to add. The published
 * container already holds an Ads conversion tag — `AW-18408190141`, an `awct`
 * tag and a Conversion Linker, triggered on `quote_form_submit`, confirmed by
 * reading the container payload rather than by assuming. A second *counting*
 * mechanism here would count every lead twice, and the inflated figure is what
 * an advertising budget gets set from. A second `config` is not that.
 *
 * ## Why it is worth having at all
 *
 * Without it the Ads destination exists only inside the container, so anything
 * the site itself ever needs to send — a conversion fired from code if the
 * container tag is ever retired, enhanced conversions, a value on a lead — has
 * nowhere to go. Registering it is the prerequisite for all of that and costs
 * one line.
 *
 * Not secret, for the same reason the measurement IDs are not: served to every
 * visitor in the page source, and it identifies an account rather than
 * granting access to one. An empty value switches it off.
 */
export const GOOGLE_ADS_ID = (process.env.NEXT_PUBLIC_GOOGLE_ADS_ID ?? "AW-18408190141").trim();

/** Validated before it reaches a script body, exactly like the two above. */
export const GOOGLE_ADS_ENABLED = /^AW-[0-9]{8,20}$/.test(GOOGLE_ADS_ID);

/**
 * The conversion action a submitted quote request counts towards.
 *
 * Paired with the account id above as `AW-…/LABEL`, which is the single string
 * Google calls `send_to`. Built in one place so the id is never written twice.
 *
 * ## This is the counting half
 *
 * Unlike `config`, firing this records a conversion. The published container
 * also holds a tag that counts the same event, so with both active every lead
 * counts twice — set this empty to leave the counting to the container, or
 * pause the container's tag and leave this set. One or the other.
 */
export const GOOGLE_ADS_CONVERSION_LABEL = (
  process.env.NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_LABEL ?? "HBAhCJCc0OccEL3h2slE"
).trim();

/**
 * The `send_to` value, or null when either half is missing.
 *
 * Null rather than a half-built string: `AW-123/` and `/LABEL` are both
 * accepted by `gtag` and both silently count nothing, which is the failure
 * this is meant to make impossible.
 */
export const ADS_CONVERSION_SEND_TO =
  GOOGLE_ADS_ENABLED && /^[A-Za-z0-9_-]{8,40}$/.test(GOOGLE_ADS_CONVERSION_LABEL)
    ? `${GOOGLE_ADS_ID}/${GOOGLE_ADS_CONVERSION_LABEL}`
    : null;

/** Paths analytics never sees. */
const PRIVATE_PREFIXES = ["/admin", "/account", "/api", "/login", "/register", "/reset-password"];

function isPrivatePath(pathname: string): boolean {
  return PRIVATE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

/**
 * Hosts that are somebody's machine rather than the website.
 *
 * Matched on the hostname alone, so a port does not defeat it.
 */
function isLocalHost(host: string): boolean {
  const name = host.split(":")[0]?.toLowerCase() ?? "";
  return (
    name === "localhost" ||
    name === "127.0.0.1" ||
    name === "0.0.0.0" ||
    name === "[::1]" ||
    name.endsWith(".local")
  );
}

/**
 * Whether the tag belongs on this request.
 *
 * Shared by the layout, which decides whether to render the script, and the
 * proxy, which decides whether to widen the content security policy for it.
 * One function so the two cannot disagree — a policy that allows Google on
 * every page would be a wider policy than the site actually needs, and a page
 * that loads the tag under a policy that forbids it is a console full of
 * errors and no data.
 */
export function analyticsEnabled(options: {
  pathname: string;
  host: string | null;
  isDevelopment: boolean;
}): boolean {
  if (GA_MEASUREMENT_IDS.length === 0 && !GTM_ENABLED) return false;
  if (options.isDevelopment) return false;
  if (!options.host || isLocalHost(options.host)) return false;
  return !isPrivatePath(options.pathname);
}

/**
 * The hosts the tag needs, by directive.
 *
 * `script-src` is listed for browsers that do not understand `strict-dynamic`;
 * ones that do ignore host sources there and rely on the nonce instead.
 * `connect-src` is the one that actually matters — without it the tag loads,
 * runs, and every measurement it tries to send is refused.
 */
export const ANALYTICS_CSP = {
  script: ["https://www.googletagmanager.com"],
  connect: [
    /*
     * The advertising hosts, allowed as of 25 August 2026.
     *
     * `stats.g.doubleclick.net` and `www.google.com` are what GA4 contacts when
     * Google Signals or an Ads link is on: cross-device identity, demographics,
     * remarketing audiences. They were deliberately blocked while this site had
     * no consent mechanism, because a cookie policy that says "no advertising
     * or remarketing pixel" and a page that quietly contacts an ad network are
     * not both true.
     *
     * What changed is not the appetite for advertising, it is that consent now
     * gates it: `ad_storage`, `ad_user_data` and `ad_personalization` default
     * to denied on every page, so nothing reaches these hosts in a form that
     * can identify anybody until a visitor says yes. The policy says exactly
     * that.
     */
    "https://stats.g.doubleclick.net",
    "https://www.google.com",
    "https://www.googletagmanager.com",
    "https://www.google-analytics.com",
    "https://*.google-analytics.com",
    /*
     * Both the bare host and the wildcard, which are not the same thing.
     *
     * A CSP wildcard stands for one or more subdomain labels, so
     * `*.analytics.google.com` matches `region1.analytics.google.com` and does
     * *not* match `analytics.google.com` itself. Listing only the wildcard is
     * what Google's own tag diagnostics reported as a blocked resource on the
     * live site, and it is an easy thing to get wrong twice.
     */
    "https://analytics.google.com",
    "https://*.analytics.google.com",
    /*
     * Where an Ads conversion actually goes, and the reason one never arrived.
     *
     * `gtag('event','conversion')` — and the equivalent tag inside the
     * container — reports to `www.googleadservices.com/pagead/conversion/…`
     * and `googleads.g.doubleclick.net/pagead/viewthroughconversion/…`.
     * Neither host was listed here, so the tag ran, the request was made, and
     * the policy refused it. Nothing in Google Ads says "blocked by the site's
     * content policy"; the conversion action simply reports that it has never
     * received data, which is exactly what it did report.
     *
     * Listed under `connect` and `img` both, because which one is used depends
     * on the browser: the ping goes out through `fetch`/`sendBeacon` where
     * they are available and falls back to an image request where they are
     * not, and a policy that allows only the first silently drops the
     * fallback.
     */
    "https://www.googleadservices.com",
    "https://googleads.g.doubleclick.net",
  ],
  img: [
    "https://www.googletagmanager.com",
    "https://*.google-analytics.com",
    "https://www.googleadservices.com",
    "https://googleads.g.doubleclick.net",
  ],
  /*
   * For the Tag Manager `<noscript>` frame, and nothing else.
   *
   * This is the one directive here that is widened for every visitor rather
   * than for a debugging session, so it is worth being exact about what it
   * does and does not do. `frame-src` governs what this page may put in a
   * frame; `frame-ancestors` governs who may put this page in one, stays
   * `'none'`, and is untouched. Allowing one Google host to be framed does not
   * make this site embeddable anywhere.
   */
  frame: ["https://www.googletagmanager.com"],
} as const;

/**
 * The extra hosts a Google Tag Assistant session needs, and only it.
 *
 * Tag Assistant opens the site in a window with `?gtm_debug=<timestamp>`, and
 * the tag then injects an iframe from `tagassistant.google.com` to talk back
 * through. This site sends `frame-src 'none'`, so that iframe never loads and
 * the session times out with "could not connect" — which reads as "you have no
 * tag" and is really "your policy will not let me look".
 *
 * Granted only on a request that carries the debug parameter, rather than
 * widened for every visitor. Somebody could of course add `?gtm_debug=1` to a
 * URL themselves; what they would gain is the ability to frame two Google
 * hosts inside a page they are already looking at. `frame-ancestors` stays
 * `'none'` either way, so nothing here affects who may embed this site — which
 * is the direction that would matter.
 */
export const ANALYTICS_DEBUG_HOSTS = [
  "https://tagassistant.google.com",
  "https://www.googletagmanager.com",
] as const;

/** Whether this request is a Google tag debugging session. */
export function analyticsDebugging(search: URLSearchParams): boolean {
  return search.has("gtm_debug");
}

/**
 * What every page denies until a visitor says otherwise.
 *
 * Google Consent Mode v2. These four are sent as `consent: default` before any
 * `config`, so the tag knows the answer before it has anything to report — a
 * default set after the first measurement is a default that arrived too late.
 *
 * All denied. Not because analytics is unwelcome, but because "denied unless
 * asked" is the only default that matches what the cookie policy says: nothing
 * that is not strictly necessary happens to a visitor who has not been asked.
 * Under denial the tag still sends a cookieless ping, so aggregate traffic is
 * still counted and no `_ga` cookie is written.
 *
 * `wait_for_update` gives the banner half a second to answer on a page where
 * the visitor has already decided, so a returning visitor's own choice is
 * applied before the first page view rather than after it.
 *
 * ## One default, not one per region
 *
 * Consent Mode takes region-scoped defaults — deny in the EEA, allow
 * elsewhere — and this deliberately does not use them. A single global denial
 * is the only version that matches what the cookie policy promises every
 * reader, and a policy that quietly means something different depending on
 * where you are reading it from is not one worth publishing. If the business
 * ever decides to grant by default outside the EEA, it is one additional
 * `consent default` command carrying a `region` array; the wording on the
 * cookie policy has to change with it.
 */
export const CONSENT_DEFAULTS = {
  ad_storage: "denied",
  ad_user_data: "denied",
  ad_personalization: "denied",
  analytics_storage: "denied",
  wait_for_update: 500,
} as const;

/**
 * The events the Tag Manager container listens for.
 *
 * Named here rather than typed into a call site, because the string is a
 * contract with a trigger configured in Google's web UI — a rename on this side
 * is silent on that side, and the only symptom is a conversion that stops being
 * recorded. Nothing in this file makes them fire; they are pushed from the
 * place that knows the thing happened.
 *
 * `whatsappClick` is reserved, not wired. It is here so the name is settled
 * before the CTA is instrumented, rather than negotiated afterwards against a
 * trigger somebody has already built.
 */
export const CONVERSION_EVENTS = {
  /** A quote request the server accepted and issued a reference for. */
  quoteFormSubmit: "quote_form_submit",
  /** Reserved for the WhatsApp CTA. Nothing pushes this yet. */
  whatsappClick: "whatsapp_click",
} as const;

/**
 * Where a visitor's answer is kept.
 *
 * Their browser, not a cookie and not this application's database. A record of
 * who refused tracking is itself a record about a person, and keeping one on
 * the server to remember that somebody did not want to be remembered is the
 * kind of thing this file exists to avoid.
 */
export const CONSENT_KEY = "techzoid.consent.v1";
export type ConsentChoice = "granted" | "denied";

/** Every consent type, answered the same way. */
const answer = (value: ConsentChoice) => ({
  ad_storage: value,
  ad_user_data: value,
  ad_personalization: value,
  analytics_storage: value,
});

/**
 * What "yes" and "no" send.
 *
 * Both are explicit updates. A refusal is not silence — Consent Mode does not
 * remember anything between page loads, so a visitor who said no must be told
 * so again on the next page, exactly as one who said yes is.
 */
export const GRANTED = answer("granted");
export const DENIED = answer("denied");
