import "server-only";
import { cookies } from "next/headers";
import { safeEqual } from "@/lib/auth/tokens";
import { isSameOrigin } from "@/lib/auth/request";

/**
 * Double-submit CSRF protection.
 *
 * A random token is stored in a readable (non-HttpOnly) cookie and must be
 * echoed back in the `x-csrf-token` header. Because the same-origin policy
 * stops a third-party page from reading our cookie, only our own pages can
 * produce a matching header. This runs in addition to the Origin check and the
 * SameSite=Lax session cookie.
 *
 * Server Actions are additionally protected by Next.js's built-in
 * Origin/Host verification.
 */

export const CSRF_COOKIE = "csrf_token";
export const CSRF_HEADER = "x-csrf-token";

/**
 * The token cookie is issued by the request proxy (src/proxy.ts), because a
 * Server Component is not permitted to set cookies. This module only reads and
 * verifies it.
 */
export async function readCsrfToken(): Promise<string | null> {
  const store = await cookies();
  return store.get(CSRF_COOKIE)?.value ?? null;
}

export type CsrfFailure = "origin_mismatch" | "token_missing" | "token_mismatch";

/** Returns null when the request passes, or the reason it failed. */
export async function verifyCsrf(request: Request): Promise<CsrfFailure | null> {
  if (!isSameOrigin(request)) return "origin_mismatch";

  const headerToken = request.headers.get(CSRF_HEADER);
  const cookieToken = await readCsrfToken();
  if (!headerToken || !cookieToken) return "token_missing";
  if (!safeEqual(headerToken, cookieToken)) return "token_mismatch";
  return null;
}
