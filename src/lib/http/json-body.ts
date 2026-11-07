import "server-only";

import { JSON_BODY_MAX_BYTES, readLimitedJson } from "@/lib/http/read-limited-body";

/**
 * `request.json()` with a byte limit, for the ordinary public JSON routes.
 *
 * Every one of them read the body with `await request.json()`, which buffers
 * whatever arrives and only then discovers it is twenty megabytes of nothing.
 * The webhooks were bounded first because they are the ones an attacker finds
 * by reading the source; these are bounded because an unauthenticated caller
 * does not need to find anything — `/api/contact` is linked from the footer.
 *
 * ## Why this throws instead of returning a result
 *
 * The call sites already have the right shape:
 *
 *     let body: unknown;
 *     try {
 *       body = await request.json();
 *     } catch {
 *       return jsonError("bad_request", …);
 *     }
 *
 * Swapping one call for another keeps that shape and changes nothing else, so
 * the conversion is reviewable at a glance and cannot accidentally drop a
 * route's own validation. The alternative — returning a discriminated union —
 * meant rewriting eleven control flows to gain a status code on a path no
 * legitimate client reaches.
 *
 * The honest consequence, written down rather than discovered: an oversized
 * body here answers **400, not 413**. The webhooks answer 413 because a
 * machine sender needs to tell "too big" from "malformed" to decide whether
 * retrying helps. A browser posting the contact form does not, and will never
 * see either. If a client ever needs the distinction on these routes, the
 * reason is already carried by `readLimitedJson` and only the call sites need
 * to widen.
 */
export async function requireJsonBody(
  request: Request,
  maxBytes: number = JSON_BODY_MAX_BYTES,
): Promise<unknown> {
  const result = await readLimitedJson(request, maxBytes);
  if (result.ok) return result.value;
  throw new Error(`request body rejected: ${result.reason}`);
}
