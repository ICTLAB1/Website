import "server-only";
import { headers } from "next/headers";
import { appUrl } from "@/lib/env";

/**
 * The client IP, for rate-limit keys and audit logs. Only ever stored as a
 * keyed hash.
 *
 * ## The header this trusts, and the one it does not
 *
 * The edge (Caddy, see deploy/Caddyfile) sets `X-Real-IP` to the real
 * connection address on every request, replacing anything the client sent, and
 * the application is not reachable except through that edge. So `X-Real-IP` is
 * the one address here a client cannot choose, and it is what this trusts.
 *
 * `X-Forwarded-For` is NOT trusted as its left-most entry, and that is a
 * correction. The edge *appends* the real address to whatever the client sent,
 * so a request arriving with `X-Forwarded-For: 1.2.3.4` reaches the app as
 * `1.2.3.4, <real address>`. Reading `split(",")[0]` — which this used to do —
 * returned `1.2.3.4`: a value the caller chose. Every IP-keyed limiter was
 * therefore defeated by sending a header, and rotating it:
 *
 *   - password-reset requests (`reset:<ip>` is the only limit) could be fired
 *     without bound at any registered address — an email flood, and sender
 *     reputation with it;
 *   - the chat route (`chat:<ip>`) bills a model call per message;
 *   - the per-IP half of the login limiter — the one that blocks a spray
 *     across many accounts — stopped blocking anything.
 *
 * The audit log took the forged value too, so the record of who did a thing
 * was whatever they typed.
 *
 * `X-Forwarded-For` is kept only as a fallback for a deployment with no edge
 * setting `X-Real-IP` (local development), and even then its *right-most* entry
 * is used — the hop added nearest to us — never the left-most the client
 * controls.
 */
function pickClientIp(xRealIp: string | null, xForwardedFor: string | null): string {
  const real = xRealIp?.trim();
  if (real) return real;

  if (xForwardedFor) {
    const hops = xForwardedFor
      .split(",")
      .map((hop) => hop.trim())
      .filter(Boolean);
    const nearest = hops[hops.length - 1];
    if (nearest) return nearest;
  }

  return "unknown";
}

export async function clientIp(): Promise<string> {
  const headerList = await headers();
  return pickClientIp(headerList.get("x-real-ip"), headerList.get("x-forwarded-for"));
}

export function ipFromRequest(request: Request): string {
  return pickClientIp(request.headers.get("x-real-ip"), request.headers.get("x-forwarded-for"));
}

function allowedOrigins(): string[] {
  const origins = new Set<string>([appUrl()]);
  if (process.env.NODE_ENV !== "production") {
    origins.add("http://localhost:3000");
    origins.add("http://127.0.0.1:3000");
  }
  return [...origins];
}

/**
 * Same-origin check for state-changing requests. A cross-site form post has an
 * Origin the browser sets and cannot be forged by script, so rejecting a
 * mismatch blocks classic CSRF even before the token check.
 */
export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (origin) return allowedOrigins().includes(origin);

  // Some legitimate same-origin requests omit Origin; fall back to Referer.
  const referer = request.headers.get("referer");
  if (referer) {
    try {
      const url = new URL(referer);
      return allowedOrigins().includes(url.origin);
    } catch {
      return false;
    }
  }
  // No Origin and no Referer: reject for mutating requests.
  return false;
}
