import { NextResponse, type NextRequest } from "next/server";

/**
 * Request proxy: security headers and Content Security Policy.
 *
 * (`proxy.ts` is the Next.js 16 replacement for the former `middleware.ts`
 * convention; it runs on every matched request before the route handler.)
 *
 * A fresh nonce is generated per request and placed on the request headers so
 * that Next.js applies it to the framework's own inline bootstrap scripts. That
 * lets script-src stay free of 'unsafe-inline'.
 *
 * Note on rendering: the site header renders session state, so pages are
 * already dynamically rendered. Nonce-based CSP therefore costs no static
 * generation that would otherwise have been available; data reads are cached
 * instead (see src/lib/cache.ts).
 */

const SESSION_COOKIE = "ictlab_session";
const CSRF_COOKIE = "csrf_token";

/** URL-safe random token, using the Web Crypto API available in this runtime. */
function randomToken(byteLength = 32): string {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/**
 * Pages on which the payment gateway's checkout can be opened.
 *
 * The Content-Security-Policy has to be widened for it — an iframe from
 * razorpay.com, calls out to their API — and that widening is confined to the
 * pages that actually need it rather than applied site-wide. A stored XSS on a
 * product page then still cannot frame a payment provider.
 *
 * It is a path test rather than a check of whether payments are switched on,
 * because this runs before any database is reachable and on every request. The
 * cost of being generous is three extra origins on two pages; the cost of
 * getting it wrong the other way is a checkout that silently refuses to open,
 * with the reason visible only in the browser console.
 */
function isPaymentPath(pathname: string): boolean {
  return pathname === "/buy" || pathname.startsWith("/buy/") || pathname.startsWith("/account/orders");
}

function buildCsp(nonce: string, isDevelopment: boolean, allowGateway: boolean): string {
  // Razorpay Checkout is loaded by a nonce-carrying script, so 'strict-dynamic'
  // covers the script itself; what it cannot cover is the iframe the script
  // opens and the requests that iframe makes.
  const gatewayFrame = allowGateway
    ? ["https://api.razorpay.com", "https://checkout.razorpay.com"]
    : [];
  const gatewayConnect = allowGateway
    ? ["https://api.razorpay.com", "https://lumberjack.razorpay.com", "https://lumberjack-cx.razorpay.com"]
    : [];

  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    "script-src": [
      "'self'",
      `'nonce-${nonce}'`,
      // Lets nonce-verified scripts load their own dependencies, and is ignored
      // by browsers too old to understand it.
      "'strict-dynamic'",
      // Next.js dev tooling evaluates code; never enabled in production.
      ...(isDevelopment ? ["'unsafe-eval'"] : []),
    ],
    // Tailwind emits a stylesheet, but React still sets some inline styles.
    "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
    "font-src": ["'self'", "https://fonts.gstatic.com", "data:"],
    "img-src": ["'self'", "data:", "blob:", ...(allowGateway ? ["https://cdn.razorpay.com"] : [])],
    "connect-src": ["'self'", ...gatewayConnect, ...(isDevelopment ? ["ws:", "wss:"] : [])],
    "form-action": ["'self'"],
    "frame-ancestors": ["'none'"],
    "frame-src": gatewayFrame.length > 0 ? gatewayFrame : ["'none'"],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "manifest-src": ["'self'"],
    "worker-src": ["'self'", "blob:"],
  };

  const policy = Object.entries(directives)
    .map(([directive, values]) => `${directive} ${values.join(" ")}`)
    .join("; ");

  // Upgrade mixed content only where the site is actually served over TLS.
  return isDevelopment ? policy : `${policy}; upgrade-insecure-requests`;
}

/**
 * The old shop's URL shapes, and whether anything here answers them.
 *
 * A path matching one of these has already failed to match every redirect in
 * `next.config.ts` — those run first — so by the time it reaches this file it
 * is a page of the previous site that nothing on this one replaces.
 *
 * It is answered 410 Gone rather than 404 Not Found, and the difference is not
 * cosmetic: 404 means "not here, ask again some time", and a crawler will keep
 * asking for months. 410 means "this is gone and is not coming back", which is
 * the truth about a product catalogue that was migrated, and search engines
 * drop the URL far faster for it.
 *
 * It is deliberately *not* a rule about anything else. `/products/nonexistent`
 * is a 404, because a product slug that does not resolve is far more likely to
 * be a typo than a page that once existed.
 */
const RETIRED_PREFIXES = [
  "/product-page/",
  "/service-page/",
  "/blog/categories/",
  "/post/",
];

const RETIRED_EXACT = new Set(["/shop-1"]);

function isRetired(pathname: string): boolean {
  if (RETIRED_EXACT.has(pathname)) return true;
  return RETIRED_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export function proxy(request: NextRequest) {
  const isDevelopment = process.env.NODE_ENV === "development";
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const { pathname, search } = request.nextUrl;

  /*
   * Before anything else, because a retired URL needs no nonce, no CSP and no
   * session: it needs to stop existing.
   */
  if (isRetired(pathname)) {
    return new NextResponse(
      "This page has been permanently removed. The current catalogue is at /products.",
      {
        status: 410,
        headers: {
          "content-type": "text/plain; charset=utf-8",
          // Not cached at the edge for long: the list above is expected to
          // grow a redirect where a replacement later appears, and a 410 held
          // for a year would outlive the decision behind it.
          "cache-control": "public, max-age=0, s-maxage=3600",
          "x-robots-tag": "noindex",
        },
      },
    );
  }

  const csp = buildCsp(nonce, isDevelopment, isPaymentPath(pathname));

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("content-security-policy", csp);

  /**
   * Convenience redirect only. This checks for the presence of a cookie, not
   * its validity, and is NOT an access control - every /admin and /account
   * page and API route independently verifies the session and role on the
   * server. Its only job is to send a signed-out visitor to the sign-in page
   * instead of rendering a redirect one layer deeper.
   */
  const isProtected = pathname.startsWith("/admin") || pathname.startsWith("/account");
  if (isProtected && !request.cookies.has(SESSION_COOKIE)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url);
  }

  const response = NextResponse.next({ request: { headers: requestHeaders } });

  /**
   * Issue the double-submit CSRF token here rather than in a page, because a
   * Server Component cannot set cookies. The value is deliberately readable by
   * our own scripts (so it can be echoed in the x-csrf-token header); the
   * same-origin policy is what stops a third-party page from reading it.
   */
  if (!request.cookies.has(CSRF_COOKIE)) {
    response.cookies.set(CSRF_COOKIE, randomToken(), {
      httpOnly: false,
      sameSite: "lax",
      secure: !isDevelopment,
      path: "/",
      maxAge: 60 * 60 * 8,
    });
  }

  response.headers.set("content-security-policy", csp);
  response.headers.set("x-content-type-options", "nosniff");
  response.headers.set("x-frame-options", "DENY");
  response.headers.set("referrer-policy", "strict-origin-when-cross-origin");
  /*
   * The Payment Request API is disabled everywhere except the checkout pages,
   * where the gateway's iframe uses it to offer saved cards and Google Pay.
   * Denying it there does not break the payment — it silently removes those
   * options — which is exactly the kind of degradation nobody notices until a
   * customer mentions it months later.
   */
  const paymentDirective = isPaymentPath(pathname)
    ? 'payment=(self "https://api.razorpay.com" "https://checkout.razorpay.com")'
    : "payment=()";
  response.headers.set(
    "permissions-policy",
    `camera=(), microphone=(), geolocation=(), ${paymentDirective}, usb=(), interest-cohort=()`,
  );
  response.headers.set("x-dns-prefetch-control", "off");
  response.headers.set("cross-origin-opener-policy", "same-origin");
  if (!isDevelopment) {
    response.headers.set(
      "strict-transport-security",
      "max-age=63072000; includeSubDomains; preload",
    );
  }

  // Never let an intermediary cache a page rendered for a signed-in user.
  if (isProtected) {
    response.headers.set("cache-control", "private, no-store, max-age=0, must-revalidate");
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Everything except Next's static output and common static assets, which
     * do not need a per-request nonce.
     */
    {
      source: "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2)$).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
