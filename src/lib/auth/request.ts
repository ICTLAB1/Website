import "server-only";
import { headers } from "next/headers";
import { appUrl } from "@/lib/env";

/**
 * Best-effort client IP for rate limiting. Only ever stored as a keyed hash.
 * Behind a proxy the left-most X-Forwarded-For entry is used; deployments must
 * ensure that header is set by a trusted edge and not passed through from the
 * client.
 */
export async function clientIp(): Promise<string> {
  const headerList = await headers();
  const forwarded = headerList.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return headerList.get("x-real-ip")?.trim() ?? "unknown";
}

export function ipFromRequest(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return request.headers.get("x-real-ip")?.trim() ?? "unknown";
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
