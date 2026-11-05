import { describe, expect, it } from "vitest";

import {
  CRM_INBOUND_MAX_BYTES,
  readLimitedBody,
  STRIPE_WEBHOOK_MAX_BYTES,
} from "@/lib/http/read-limited-body";

/**
 * The property under test is not "oversized bodies are refused" — the check
 * this replaces did that too. It is *when* they are refused: before the whole
 * payload is in memory. A test that only asserts the 413 would pass against
 * the bug.
 *
 * So the streaming cases below count how much the request was actually asked
 * for. A limiter that reads to the end and then complains pulls every chunk; a
 * limiter that stops pulling stops the count.
 */

/** A body delivered in chunks, which reports how many were actually pulled. */
function chunkedRequest(chunkCount: number, chunkBytes: number, headers: HeadersInit = {}) {
  const counter = { pulled: 0 };
  const chunk = new Uint8Array(chunkBytes).fill(0x61); // "a"
  const stream = new ReadableStream<Uint8Array>({
    pull(controller) {
      if (counter.pulled >= chunkCount) {
        controller.close();
        return;
      }
      counter.pulled += 1;
      controller.enqueue(chunk);
    },
  });
  const request = new Request("https://example.test/hook", {
    method: "POST",
    body: stream,
    headers,
    // Required by undici for a streaming body.
    duplex: "half",
  } as RequestInit & { duplex: "half" });
  return { request, counter };
}

describe("readLimitedBody", () => {
  it("returns a body that fits, byte for byte", async () => {
    const payload = JSON.stringify({ event: "deal.updated", reference: "DEAL-1" });
    const request = new Request("https://example.test/hook", { method: "POST", body: payload });

    const result = await readLimitedBody(request, CRM_INBOUND_MAX_BYTES);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.raw).toBe(payload);
    expect(result.bytes).toBe(Buffer.byteLength(payload, "utf8"));
  });

  it("preserves the exact bytes a signature is computed over", async () => {
    // Key order, spacing and number formatting all differ from what a
    // re-serialisation would produce. If any of it changed, an HMAC over the
    // raw body would stop matching.
    const payload = '{ "b":1.50,  "a" : "x",\n "c":[1,2] }';
    const request = new Request("https://example.test/hook", { method: "POST", body: payload });

    const result = await readLimitedBody(request, CRM_INBOUND_MAX_BYTES);

    expect(result.ok && result.raw).toBe(payload);
  });

  it("measures bytes, not characters", async () => {
    // Twenty characters, sixty bytes: the check this replaces counted the
    // former and so admitted three times its stated budget.
    const payload = "अ".repeat(20);
    expect(payload.length).toBe(20);
    expect(Buffer.byteLength(payload, "utf8")).toBe(60);

    expect((await readLimitedBody(new Request("https://e.test", { method: "POST", body: payload }), 59)).ok).toBe(false);
    expect((await readLimitedBody(new Request("https://e.test", { method: "POST", body: payload }), 60)).ok).toBe(true);
  });

  it("refuses an over-large declared length without reading the body", async () => {
    const { request, counter } = chunkedRequest(100, 1024, {
      "content-length": String(10 * 1024 * 1024),
    });

    const result = await readLimitedBody(request, CRM_INBOUND_MAX_BYTES);

    expect(result).toEqual({ ok: false, reason: "too_large" });
    /*
     * At most one, not zero. Constructing a `Request` around a stream makes
     * undici prime it with a single chunk on the next tick, with nothing
     * reading — measured, rather than assumed, when this assertion first
     * failed at exactly one pull. The property that matters is that the
     * hundred chunks behind it were never asked for.
     */
    expect(counter.pulled).toBeLessThanOrEqual(1);
  });

  it("stops reading partway when the declared length lies", async () => {
    // Declares 10 bytes, sends 2 MB in 1 KB chunks. The declared length is
    // useless here, so only counting what arrives can catch it.
    const { request, counter } = chunkedRequest(2048, 1024, { "content-length": "10" });

    const result = await readLimitedBody(request, CRM_INBOUND_MAX_BYTES);

    expect(result).toEqual({ ok: false, reason: "too_large" });
    // 64 KB of 1 KB chunks, plus the one that crossed the line.
    expect(counter.pulled).toBeLessThanOrEqual(CRM_INBOUND_MAX_BYTES / 1024 + 1);
    expect(counter.pulled).toBeLessThan(2048);
  });

  it("stops reading partway when no length is declared at all", async () => {
    const { request, counter } = chunkedRequest(2048, 1024);

    const result = await readLimitedBody(request, CRM_INBOUND_MAX_BYTES);

    expect(result).toEqual({ ok: false, reason: "too_large" });
    expect(counter.pulled).toBeLessThan(2048);
  });

  it("reports an interrupted upload as unreadable rather than too large", async () => {
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new Uint8Array(16).fill(0x61));
        controller.error(new Error("connection reset"));
      },
    });
    const request = new Request("https://example.test/hook", {
      method: "POST",
      body: stream,
      duplex: "half",
    } as RequestInit & { duplex: "half" });

    expect(await readLimitedBody(request, CRM_INBOUND_MAX_BYTES)).toEqual({
      ok: false,
      reason: "unreadable",
    });
  });

  it("treats a body-less request as empty rather than failing", async () => {
    const request = new Request("https://example.test/hook", { method: "POST" });

    expect(await readLimitedBody(request, CRM_INBOUND_MAX_BYTES)).toEqual({
      ok: true,
      raw: "",
      bytes: 0,
    });
  });

  it("gives Stripe room for a genuinely large event", async () => {
    // A few hundred invoice line items is a real event and must not be
    // refused; the ceiling exists for the bodies that are not events at all.
    const event = JSON.stringify({
      type: "invoice.paid",
      data: { object: { lines: Array.from({ length: 500 }, (_, i) => ({ id: `il_${i}`, amount: 1000 })) } },
    });
    expect(Buffer.byteLength(event, "utf8")).toBeLessThan(STRIPE_WEBHOOK_MAX_BYTES);

    const request = new Request("https://example.test/hook", { method: "POST", body: event });
    expect((await readLimitedBody(request, STRIPE_WEBHOOK_MAX_BYTES)).ok).toBe(true);
  });
});
