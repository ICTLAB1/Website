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

function buildCsp(nonce: string, isDevelopment: boolean): string {
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
    "img-src": ["'self'", "data:", "blob:"],
    "connect-src": ["'self'", ...(isDevelopment ? ["ws:", "wss:"] : [])],
    "form-action": ["'self'"],
    "frame-ancestors": ["'none'"],
    "frame-src": ["'none'"],
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

export function proxy(request: NextRequest) {
  const isDevelopment = process.env.NODE_ENV === "development";
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const csp = buildCsp(nonce, isDevelopment);

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("content-security-policy", csp);

  const { pathname, search } = request.nextUrl;

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
  response.headers.set(
    "permissions-policy",
    "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()",
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
