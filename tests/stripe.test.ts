import { afterEach, describe, expect, it, vi } from "vitest";

import {
  createCheckoutSession,
  retrieveSession,
  verifyWebhookSignature,
} from "@/lib/payments/stripe";
import { createHmac } from "node:crypto";

/**
 * The gateway transport, tested without a gateway.
 *
 * Everything here is about the money being right and the trust boundary
 * holding: an amount the gateway disagrees with never reaches a customer, a
 * webhook nobody signed never marks an order paid, and a stale signature never
 * works twice.
 */

const config = {
  mode: "TEST" as const,
  secretKey: "sk_test_abcdefghijklmnop",
  webhookSecret: "whsec_topsecret",
};

const session = {
  amountMinor: 90_000_00,
  currency: "INR",
  receipt: "ORD-2026-ABC123",
  productName: "Order ORD-2026-ABC123",
  successUrl: "https://example.test/account/orders/ORD-2026-ABC123?session_id={CHECKOUT_SESSION_ID}",
  cancelUrl: "https://example.test/account/orders/ORD-2026-ABC123?payment=cancelled",
};

function respond(body: unknown, status = 200) {
  return vi.fn().mockResolvedValue(
    new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } }),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("opening a checkout session", () => {
  it("asks for the amount in minor units, unconverted", async () => {
    const fetchMock = respond({
      id: "cs_test_1",
      url: "https://checkout.stripe.com/c/pay/cs_test_1",
      amount_total: session.amountMinor,
      currency: "inr",
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await createCheckoutSession(config, session);
    expect(result.ok).toBe(true);

    const body = String(fetchMock.mock.calls[0]?.[1]?.body);
    // Paise, exactly as stored. A conversion here is where a factor of a
    // hundred goes missing.
    expect(body).toContain("line_items%5B0%5D%5Bprice_data%5D%5Bunit_amount%5D=9000000");
    expect(body).toContain("client_reference_id=ORD-2026-ABC123");
  });

  it("sends the secret key as a bearer token and never in the body", async () => {
    const fetchMock = respond({
      id: "cs_test_1",
      url: "https://checkout.stripe.com/c/pay/cs_test_1",
      amount_total: session.amountMinor,
    });
    vi.stubGlobal("fetch", fetchMock);

    await createCheckoutSession(config, session);

    const init = fetchMock.mock.calls[0]?.[1] as RequestInit & { headers: Record<string, string> };
    expect(init.headers.authorization).toBe(`Bearer ${config.secretKey}`);
    expect(String(init.body)).not.toContain(config.secretKey);
  });

  it("refuses to proceed when the gateway echoes a different amount", async () => {
    /*
     * The check that matters most in this file. A gateway that disagrees about
     * the amount must fail here, in front of nobody, rather than as a
     * discrepancy found during a reconciliation weeks later.
     */
    vi.stubGlobal(
      "fetch",
      respond({ id: "cs_test_1", url: "https://checkout.stripe.com/x", amount_total: 100 }),
    );

    const result = await createCheckoutSession(config, session);
    expect(result.ok).toBe(false);
  });

  it("refuses an amount below the gateway's minimum, without calling out", async () => {
    const fetchMock = respond({});
    vi.stubGlobal("fetch", fetchMock);

    for (const amountMinor of [0, 99, -100, 1.5, Number.NaN]) {
      const result = await createCheckoutSession(config, { ...session, amountMinor });
      expect(result.ok).toBe(false);
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("does not leak the gateway's error text to the caller", async () => {
    vi.stubGlobal(
      "fetch",
      respond({ error: { message: "No such customer: cus_123 for key sk_live_SECRET" } }, 402),
    );

    const result = await createCheckoutSession(config, session);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).not.toContain("sk_live");
      expect(result.reason).not.toContain("cus_123");
    }
  });

  it("survives the gateway being unreachable", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("getaddrinfo ENOTFOUND")));

    const result = await createCheckoutSession(config, session);
    expect(result.ok).toBe(false);
  });

  it("refuses a response with no session url to send anyone to", async () => {
    vi.stubGlobal("fetch", respond({ id: "cs_test_1", amount_total: session.amountMinor }));
    const result = await createCheckoutSession(config, session);
    expect(result.ok).toBe(false);
  });
});

describe("asking the gateway what happened", () => {
  it("reports a paid session with its payment intent", async () => {
    vi.stubGlobal(
      "fetch",
      respond({
        payment_status: "paid",
        amount_total: session.amountMinor,
        currency: "inr",
        payment_intent: "pi_test_1",
        client_reference_id: session.receipt,
      }),
    );

    const result = await retrieveSession(config, "cs_test_1");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.status.paymentStatus).toBe("paid");
      expect(result.status.paymentIntentId).toBe("pi_test_1");
      expect(result.status.receipt).toBe(session.receipt);
    }
  });

  it("reads the payment intent whether it arrives expanded or as an id", async () => {
    vi.stubGlobal(
      "fetch",
      respond({ payment_status: "paid", payment_intent: { id: "pi_test_2" } }),
    );
    const result = await retrieveSession(config, "cs_test_1");
    expect(result.ok && result.status.paymentIntentId).toBe("pi_test_2");
  });

  it("reports an unpaid session as unpaid rather than failing", async () => {
    // An abandoned checkout is an ordinary outcome, not an error: the order
    // stays payable and nothing is recorded.
    vi.stubGlobal("fetch", respond({ payment_status: "unpaid" }));
    const result = await retrieveSession(config, "cs_test_1");
    expect(result.ok && result.status.paymentStatus).toBe("unpaid");
  });

  it("fails closed on an unknown session", async () => {
    vi.stubGlobal("fetch", respond({ error: { message: "No such session" } }, 404));
    const result = await retrieveSession(config, "cs_test_nope");
    expect(result.ok).toBe(false);
  });

  it("escapes the session id into the path", async () => {
    const fetchMock = respond({ payment_status: "paid" });
    vi.stubGlobal("fetch", fetchMock);

    await retrieveSession(config, "cs_test_../../charges");

    const url = String(fetchMock.mock.calls[0]?.[0]);
    expect(url).not.toContain("../");
    expect(url).toContain("cs_test_..%2F..%2Fcharges");
  });
});

describe("the webhook signature", () => {
  const body = JSON.stringify({ type: "checkout.session.completed", data: { object: { id: "cs_1" } } });

  function sign(secret: string, raw: string, seconds: number) {
    const digest = createHmac("sha256", secret).update(`${seconds}.${raw}`).digest("hex");
    return `t=${seconds},v1=${digest}`;
  }

  const now = 1_780_000_000_000;
  const nowSeconds = Math.floor(now / 1000);

  it("accepts a correctly signed, fresh call", () => {
    expect(
      verifyWebhookSignature(config.webhookSecret, body, sign(config.webhookSecret, body, nowSeconds), now),
    ).toBe(true);
  });

  it("rejects a call signed with the wrong secret", () => {
    expect(
      verifyWebhookSignature(config.webhookSecret, body, sign("whsec_wrong", body, nowSeconds), now),
    ).toBe(false);
  });

  it("rejects a call whose body was altered after signing", () => {
    /*
     * The property the endpoint depends on. If a changed body still verified,
     * anybody who captured one webhook could rewrite which order it referred
     * to and mark that one paid.
     */
    const header = sign(config.webhookSecret, body, nowSeconds);
    const tampered = body.replace("cs_1", "cs_2");
    expect(verifyWebhookSignature(config.webhookSecret, tampered, header, now)).toBe(false);
  });

  it("rejects a replay from outside the tolerance window", () => {
    // Genuinely signed, and hours old. Stripe signs the timestamp precisely so
    // a captured call cannot be replayed later, and that only helps if the
    // timestamp is checked.
    const old = nowSeconds - 3600;
    expect(
      verifyWebhookSignature(config.webhookSecret, body, sign(config.webhookSecret, body, old), now),
    ).toBe(false);
  });

  it("rejects a timestamp far in the future as readily as one in the past", () => {
    const ahead = nowSeconds + 3600;
    expect(
      verifyWebhookSignature(config.webhookSecret, body, sign(config.webhookSecret, body, ahead), now),
    ).toBe(false);
  });

  it("accepts one valid digest among several, as during a secret rotation", () => {
    const good = sign(config.webhookSecret, body, nowSeconds).split("v1=")[1];
    const header = `t=${nowSeconds},v1=${"0".repeat(64)},v1=${good}`;
    expect(verifyWebhookSignature(config.webhookSecret, body, header, now)).toBe(true);
  });

  it("rejects a missing, empty or malformed header", () => {
    for (const header of [null, "", "garbage", `t=${nowSeconds}`, "v1=abc", `t=notanumber,v1=abc`]) {
      expect(verifyWebhookSignature(config.webhookSecret, body, header, now)).toBe(false);
    }
  });

  it("rejects a digest that is not a hex sha-256, without throwing", () => {
    // `timingSafeEqual` throws on a length mismatch, so anything unshaped is
    // rejected before it gets there.
    for (const digest of ["short", "z".repeat(64), "0".repeat(63), "0".repeat(128)]) {
      expect(() =>
        verifyWebhookSignature(config.webhookSecret, body, `t=${nowSeconds},v1=${digest}`, now),
      ).not.toThrow();
      expect(verifyWebhookSignature(config.webhookSecret, body, `t=${nowSeconds},v1=${digest}`, now)).toBe(
        false,
      );
    }
  });
});
