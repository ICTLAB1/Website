import { describe, expect, it } from "vitest";

import {
  CRM_EVENT_KINDS,
  CRM_EVENT_VERSION,
  MAX_DELIVERY_ATTEMPTS,
  buildEnvelope,
  endpointProblem,
  retryDelaySeconds,
  shouldAbandon,
  signPayload,
  verifySignature,
} from "@/lib/crm/events";

const SECRET = "a-shared-secret-that-is-long-enough";
const NOW = new Date("2026-08-23T12:00:00Z");

describe("the envelope", () => {
  const envelope = buildEnvelope({
    id: "evt_1",
    kind: "deal.stage_changed",
    occurredAt: NOW,
    entityType: "Deal",
    entityId: "DEAL-2026-ABC123",
    data: { from: "QUOTED", to: "WON" },
  });

  it("is versioned from the first release", () => {
    // A receiver that has to guess which shape it is being sent has already
    // lost, and adding the field later breaks every existing integration.
    expect(envelope.version).toBe(CRM_EVENT_VERSION);
  });

  it("carries when the thing happened, not when it was sent", () => {
    expect(envelope.occurredAt).toBe("2026-08-23T12:00:00.000Z");
  });

  it("names the entity outside the body, so a receiver need not parse it", () => {
    expect(envelope.entity).toEqual({ type: "Deal", id: "DEAL-2026-ABC123" });
  });

  it("uses a kind from the closed vocabulary", () => {
    expect(CRM_EVENT_KINDS).toContain(envelope.kind);
  });
});

describe("signing", () => {
  it("produces a header the verifier accepts", () => {
    const body = JSON.stringify({ hello: "world" });
    const header = signPayload(body, SECRET, NOW);
    expect(verifySignature(body, header, SECRET, { now: NOW })).toBe(true);
  });

  it("rejects a changed body", () => {
    const header = signPayload('{"amount":100}', SECRET, NOW);
    expect(verifySignature('{"amount":900000}', header, SECRET, { now: NOW })).toBe(false);
  });

  it("rejects a different secret", () => {
    const body = "{}";
    const header = signPayload(body, SECRET, NOW);
    expect(verifySignature(body, header, "not-the-secret", { now: NOW })).toBe(false);
  });

  it("signs the timestamp along with the body", () => {
    /*
     * The property that stops a replay. If the timestamp were merely carried
     * beside the signature, an attacker could take yesterday's "deal won"
     * delivery and edit `t` to make it current.
     */
    const body = "{}";
    const header = signPayload(body, SECRET, NOW);
    const digest = header.split(",")[1]!;
    const forged = `t=${Math.floor(NOW.getTime() / 1000)},${digest}`;
    expect(verifySignature(body, forged, SECRET, { now: NOW })).toBe(true);

    const shifted = `t=${Math.floor(NOW.getTime() / 1000) + 1},${digest}`;
    expect(verifySignature(body, shifted, SECRET, { now: NOW })).toBe(false);
  });

  it("rejects a delivery older than the tolerance", () => {
    const body = "{}";
    const header = signPayload(body, SECRET, new Date("2026-08-23T11:00:00Z"));
    expect(verifySignature(body, header, SECRET, { now: NOW })).toBe(false);
  });

  it("accepts one inside the tolerance", () => {
    const body = "{}";
    const header = signPayload(body, SECRET, new Date("2026-08-23T11:58:00Z"));
    expect(verifySignature(body, header, SECRET, { now: NOW })).toBe(true);
  });

  it("rejects a malformed header rather than throwing", () => {
    for (const header of ["", "nonsense", "t=abc,v1=def", "v1=deadbeef", "t=123"]) {
      expect(verifySignature("{}", header, SECRET, { now: NOW }), header).toBe(false);
    }
  });
});

describe("retries", () => {
  it("backs off, and stops backing off at an hour", () => {
    expect(retryDelaySeconds(1)).toBe(60);
    expect(retryDelaySeconds(2)).toBe(300);
    expect(retryDelaySeconds(3)).toBe(1500);
    expect(retryDelaySeconds(4)).toBe(3600);
    expect(retryDelaySeconds(20)).toBe(3600);
  });

  it("never returns a delay that would retry immediately", () => {
    for (let attempts = 0; attempts < 20; attempts += 1) {
      expect(retryDelaySeconds(attempts)).toBeGreaterThanOrEqual(60);
    }
  });

  it("gives up eventually rather than retrying forever", () => {
    expect(shouldAbandon(MAX_DELIVERY_ATTEMPTS - 1)).toBe(false);
    expect(shouldAbandon(MAX_DELIVERY_ATTEMPTS)).toBe(true);
  });
});

describe("what endpoint may be configured", () => {
  it("accepts an https endpoint", () => {
    expect(endpointProblem("https://crm.example.com/hooks/techzoid")).toBeNull();
  });

  it("refuses plaintext http", () => {
    // Deal values, customer names and the reason a competitor won would
    // otherwise cross the network in the clear.
    expect(endpointProblem("http://crm.example.com/hooks")).toMatch(/https/);
  });

  it("refuses credentials embedded in the URL", () => {
    expect(endpointProblem("https://user:pass@crm.example.com/hooks")).toMatch(/credentials/i);
  });

  it("refuses something that is not a URL", () => {
    expect(endpointProblem("crm.example.com")).toBeTruthy();
    expect(endpointProblem("")).toBeTruthy();
  });

  it("allows an endpoint inside a private network", () => {
    /*
     * Deliberate. A CRM that is not on the public internet is the main use this
     * feature has, and refusing a private address would break it. The control
     * that matters here is that only an administrator can set this value.
     */
    expect(endpointProblem("https://crm.internal.techzoid.local/hooks")).toBeNull();
    expect(endpointProblem("https://10.0.4.12/hooks")).toBeNull();
  });
});
