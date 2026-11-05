import "server-only";

/**
 * Reads a request body, refusing one that is too big *before* it is all in
 * memory.
 *
 * ## Why `await request.text()` then a length check is not a limit
 *
 * It is the shape both webhooks used, and it reads the whole body first. By
 * the time the check runs, the thing it is protecting against has already
 * happened: a sender who wants this process to hold a gigabyte only has to
 * send one. The check turns an unbounded allocation into an unbounded
 * allocation followed by a 413.
 *
 * Two smaller problems came with it. `raw.length` counts UTF-16 code units,
 * not bytes, so a 64,000-"character" limit admits about 192 KB of multibyte
 * UTF-8 and the stated budget is wrong by 3x. And a body with no
 * `content-length` at all — a chunked upload — was never measured until it
 * had finished arriving.
 *
 * ## What this does instead
 *
 * Three gates, cheapest first:
 *
 *  1. `content-length`, when the sender declares one over the limit: refused
 *     without reading a byte. This is the common case for an honest client and
 *     it costs nothing.
 *  2. The stream, counted as it arrives. The moment the running total passes
 *     the limit the read stops and the stream is cancelled, so a declared
 *     length that lies — or is absent — is caught by what actually turned up
 *     rather than by what was claimed.
 *  3. Bytes, not characters. The budget means what it says.
 *
 * ## Exact bytes, because a signature covers them
 *
 * Both callers verify an HMAC over the raw body. Re-encoding would change key
 * order, whitespace and number formatting, the signature would stop matching,
 * and the tempting fix at that point is to stop checking it — which turns a
 * webhook into an open endpoint for marking orders paid. So the chunks are
 * concatenated and decoded once, as UTF-8, which is exactly what
 * `Request.text()` would have produced for the same bytes.
 */

export type LimitedBody =
  | { ok: true; raw: string; bytes: number }
  | { ok: false; reason: "too_large" }
  | { ok: false; reason: "unreadable" };

export async function readLimitedBody(
  request: Request,
  maxBytes: number,
): Promise<LimitedBody> {
  /*
   * The declared length, where there is one and it is honest enough to refuse
   * on. A sender under the limit is not trusted on the strength of this — it
   * is only ever used to say no early, never to say yes.
   */
  const declared = Number(request.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > maxBytes) {
    return { ok: false, reason: "too_large" };
  }

  const body = request.body;
  if (!body) {
    // No body at all is a valid thing to receive; it simply will not verify.
    return { ok: true, raw: "", bytes: 0 };
  }

  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;

      total += value.byteLength;
      if (total > maxBytes) {
        /*
         * Stop pulling and let the sender know the connection is finished
         * with. Without the cancel the remainder keeps arriving into a stream
         * nobody is draining, which is the cost this function exists to avoid.
         */
        await reader.cancel().catch(() => {});
        return { ok: false, reason: "too_large" };
      }
      chunks.push(value);
    }
  } catch {
    // A truncated or reset upload. Not a signature failure and not a size
    // failure; the caller decides what to answer.
    await reader.cancel().catch(() => {});
    return { ok: false, reason: "unreadable" };
  }

  const joined = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    joined.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return { ok: true, raw: new TextDecoder("utf-8").decode(joined), bytes: total };
}

/**
 * What each webhook will accept.
 *
 * CRM inbound keeps the 64 KB it always advertised — now measured in bytes, so
 * for the first time it is actually 64 KB. An event envelope from a CRM is a
 * few hundred bytes; the budget is already generous by two orders of
 * magnitude.
 *
 * Stripe gets a megabyte. Stripe publishes no hard ceiling on event size, and
 * an invoice event carrying a few hundred line items is legitimately large —
 * so the limit is set where it cannot plausibly refuse a real event, which is
 * the requirement that matters for a webhook that must stay compatible. Even
 * at a megabyte it is a thousandfold reduction from no limit at all.
 */
export const CRM_INBOUND_MAX_BYTES = 64 * 1024;
export const STRIPE_WEBHOOK_MAX_BYTES = 1024 * 1024;
