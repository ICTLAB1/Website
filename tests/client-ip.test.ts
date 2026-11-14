import { describe, expect, it } from "vitest";

import { ipFromRequest } from "@/lib/auth/request";

/**
 * The client IP is a rate-limit key and an audit-log value, so the one thing
 * that must be true of it is that a client cannot choose it.
 *
 * These are written against the production topology in deploy/Caddyfile: one
 * trusted edge that sets X-Real-IP from the real connection and appends the
 * real address to any inbound X-Forwarded-For. The regression they guard is
 * the real one that shipped — reading the left-most X-Forwarded-For entry, a
 * value the caller sends — which defeated every IP-keyed limiter on the site.
 */

const req = (headers: Record<string, string>) => new Request("https://x.test/", { headers });

describe("the client IP a rate limit keys on", () => {
  it("is X-Real-IP, the value the edge sets and the client cannot", () => {
    expect(ipFromRequest(req({ "x-real-ip": "203.0.113.9" }))).toBe("203.0.113.9");
  });

  it("ignores a forged X-Forwarded-For when the edge has set X-Real-IP", () => {
    // Exactly what the edge produces: the attacker's value, then the real one.
    const forged = ipFromRequest(
      req({
        "x-forwarded-for": "1.2.3.4, 203.0.113.9",
        "x-real-ip": "203.0.113.9",
      }),
    );
    expect(forged).toBe("203.0.113.9");
    expect(forged).not.toBe("1.2.3.4");
  });

  it("does not let a rotated X-Forwarded-For produce a fresh key each request", () => {
    // The attack: change the header every time to dodge the limit. With a real
    // edge setting X-Real-IP, every one of these keys on the same true address.
    const keys = new Set(
      ["9.9.9.9", "8.8.8.8", "7.7.7.7"].map((spoof) =>
        ipFromRequest(req({ "x-forwarded-for": `${spoof}, 203.0.113.9`, "x-real-ip": "203.0.113.9" })),
      ),
    );
    expect([...keys]).toEqual(["203.0.113.9"]);
  });

  it("falls back to the right-most X-Forwarded-For hop when no edge set X-Real-IP", () => {
    // No trusted edge (local dev). The nearest hop is the right-most entry,
    // never the left-most the client controls.
    expect(ipFromRequest(req({ "x-forwarded-for": "1.2.3.4, 10.0.0.2" }))).toBe("10.0.0.2");
  });

  it("is a single untrusted hop when that is all there is", () => {
    // One entry and no X-Real-IP: there is no trusted value to prefer, so this
    // is the best available and is treated as such. It is still not the
    // left-most-of-several the regression returned.
    expect(ipFromRequest(req({ "x-forwarded-for": "1.2.3.4" }))).toBe("1.2.3.4");
  });

  it("is \"unknown\" rather than empty when nothing identifies the caller", () => {
    expect(ipFromRequest(req({}))).toBe("unknown");
    expect(ipFromRequest(req({ "x-forwarded-for": " , " }))).toBe("unknown");
  });
});
