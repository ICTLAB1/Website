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
  if (GA_MEASUREMENT_IDS.length === 0) return false;
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
  ],
  img: ["https://www.googletagmanager.com", "https://*.google-analytics.com"],
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
