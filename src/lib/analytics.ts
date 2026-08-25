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
 * The measurement ID, supplied by the business on 25 August 2026.
 *
 * Not a secret: it is served to every visitor in the page source, and it
 * identifies a property rather than granting access to one. It is settable by
 * environment for a second property — a staging site somebody genuinely wants
 * to measure — and an empty value switches analytics off entirely, which is the
 * supported way to run this application without it.
 */
export const GA_MEASUREMENT_ID = (
  process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ?? "G-P0H1WJDZ7Y"
).trim();

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
  if (!GA_MEASUREMENT_ID) return false;
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
    "https://www.googletagmanager.com",
    "https://www.google-analytics.com",
    "https://*.google-analytics.com",
    "https://*.analytics.google.com",
  ],
  img: ["https://www.googletagmanager.com", "https://*.google-analytics.com"],
} as const;
