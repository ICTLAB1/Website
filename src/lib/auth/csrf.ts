import "server-only";
import { cookies } from "next/headers";
import { generateToken, safeEqual } from "@/lib/auth/tokens";
import { isSameOrigin } from "@/lib/auth/request";
import { isProduction } from "@/lib/env";

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

/** Reads the current token, creating one when the visitor has none. */
export async function ensureCsrfToken(): Promise<string> {
  const store = await cookies();
  const existing = store.get(CSRF_COOKIE)?.value;
  if (existing && existing.length >= 32) return existing;

  const token = generateToken(32);
  store.set(CSRF_COOKIE, token, {
    httpOnly: false, // must be readable by our own scripts to be echoed back
    sameSite: "lax",
    secure: isProduction,
    path: "/",
    maxAge: 60 * 60 * 8,
  });
  return token;
}

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
