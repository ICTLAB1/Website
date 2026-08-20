/**
 * Reads the CSRF token the request proxy placed in a readable cookie, so it can
 * be echoed back in the `x-csrf-token` header on state-changing requests.
 */
export const CSRF_HEADER = "x-csrf-token";
const CSRF_COOKIE = "csrf_token";

export function readCsrfCookie(): string {
  if (typeof document === "undefined") return "";
  const match = document.cookie
    .split("; ")
    .find((entry) => entry.startsWith(`${CSRF_COOKIE}=`));
  return match ? decodeURIComponent(match.slice(CSRF_COOKIE.length + 1)) : "";
}

/** `fetch` wrapper that attaches the CSRF header and JSON content type. */
export async function postJson<T>(
  url: string,
  body: unknown,
): Promise<
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string; fieldErrors?: Record<string, string[]>; correlationId?: string } }
> {
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        [CSRF_HEADER]: readCsrfCookie(),
      },
      body: JSON.stringify(body),
      credentials: "same-origin",
    });

    const payload = (await response.json()) as
      | { ok: true; data: T }
      | { ok: false; error: { code: string; message: string; fieldErrors?: Record<string, string[]>; correlationId?: string } };
    return payload;
  } catch {
    return {
      ok: false,
      error: {
        code: "network_error",
        message: "We could not reach the server. Check your connection and try again.",
      },
    };
  }
}
