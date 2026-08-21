import { createHmac } from "node:crypto";
import { beforeAll, describe, expect, it, vi } from "vitest";

/**
 * The signature checks, and the amount check around them.
 *
 * These are the load-bearing parts of taking money. Every one of them fails
 * silently if it is wrong: a signature check that accepts anything looks
 * identical in the interface to one that works, right up until somebody marks
 * their own order paid; an amount that is adopted from the request rather than
 * checked against the order produces a fulfilled order and a fraction of the
 * money, discovered at the next reconciliation if at all.
 */

beforeAll(() => {
  process.env.AUTH_SECRET ??= "test-secret-of-sufficient-length-for-hkdf-derivation";
});

// Nothing here should reach a database or a network.
vi.mock("@/lib/db", () => ({ prisma: {} }));

const load = async () => import("@/lib/payments/razorpay");

const config = {
  mode: "TEST" as const,
  keyId: "rzp_test_abcdefghijkl",
  keySecret: "a-key-secret-value",
  webhookSecret: "a-webhook-secret-value",
};

const sign = (secret: string, payload: string) =>
  createHmac("sha256", secret).update(payload).digest("hex");

describe("checkout signature", () => {
  it("accepts the signature Razorpay would send", async () => {
    const { verifyCheckoutSignature } = await load();
    const razorpayOrderId = "order_ABC123";
    const razorpayPaymentId = "pay_XYZ789";

    expect(
      verifyCheckoutSignature(config, {
        razorpayOrderId,
        razorpayPaymentId,
        signature: sign(config.keySecret, `${razorpayOrderId}|${razorpayPaymentId}`),
      }),
    ).toBe(true);
  });

  it("rejects a signature made with a different key secret", async () => {
    const { verifyCheckoutSignature } = await load();
    // Somebody who has the two public ids — they appear in the browser — but
    // not the secret. This is the whole threat model.
    expect(
      verifyCheckoutSignature(config, {
        razorpayOrderId: "order_ABC123",
        razorpayPaymentId: "pay_XYZ789",
        signature: sign("not-the-key-secret", "order_ABC123|pay_XYZ789"),
      }),
    ).toBe(false);
  });

  it("rejects a signature for a different payment", async () => {
    const { verifyCheckoutSignature } = await load();
    // A genuine signature, replayed against another order. Without binding both
    // ids into the signed payload this would pass.
    expect(
      verifyCheckoutSignature(config, {
        razorpayOrderId: "order_SOMEONE_ELSE",
        razorpayPaymentId: "pay_XYZ789",
        signature: sign(config.keySecret, "order_ABC123|pay_XYZ789"),
      }),
    ).toBe(false);
  });

  it("cannot be fooled by moving the boundary between the two ids", async () => {
    const { verifyCheckoutSignature } = await load();
    /*
     * The reason the payload has a separator. `a|bc` and `ab|c` are different
     * strings and so hash differently; without the separator both would be
     * "abc" and one signature would authorise either split.
     */
    const genuine = sign(config.keySecret, "order_AB|pay_CD");
    expect(
      verifyCheckoutSignature(config, {
        razorpayOrderId: "order_A",
        razorpayPaymentId: "Bpay_CD",
        signature: genuine,
      }),
    ).toBe(false);
  });

  it("rejects malformed signatures without throwing", async () => {
    const { verifyCheckoutSignature } = await load();
    const attempt = (signature: string) =>
      verifyCheckoutSignature(config, {
        razorpayOrderId: "order_ABC123",
        razorpayPaymentId: "pay_XYZ789",
        signature,
      });

    // `timingSafeEqual` throws on a length mismatch, so a short or non-hex
    // value must be turned away before it gets there — otherwise a one-character
    // signature is a 500 rather than a rejection.
    expect(attempt("")).toBe(false);
    expect(attempt("nope")).toBe(false);
    expect(attempt("z".repeat(64))).toBe(false);
    expect(attempt("a".repeat(63))).toBe(false);
    expect(attempt("a".repeat(65))).toBe(false);
  });
});

describe("webhook signature", () => {
  const body = JSON.stringify({ event: "payment.captured", payload: { payment: { entity: {} } } });

  it("accepts a body signed with the webhook secret", async () => {
    const { verifyWebhookSignature } = await load();
    expect(verifyWebhookSignature(config.webhookSecret, body, sign(config.webhookSecret, body))).toBe(
      true,
    );
  });

  it("rejects a body signed with the key secret instead", async () => {
    const { verifyWebhookSignature } = await load();
    // They are different values in the Razorpay dashboard and are easy to
    // confuse. Accepting either would mean anyone holding the key id's partner
    // secret could post webhooks.
    expect(verifyWebhookSignature(config.webhookSecret, body, sign(config.keySecret, body))).toBe(
      false,
    );
  });

  it("rejects a body that was altered after signing", async () => {
    const { verifyWebhookSignature } = await load();
    const signature = sign(config.webhookSecret, body);
    const tampered = body.replace("payment.captured", "payment.failed");
    expect(verifyWebhookSignature(config.webhookSecret, tampered, signature)).toBe(false);
  });

  it("rejects a call with no signature at all", async () => {
    const { verifyWebhookSignature } = await load();
    expect(verifyWebhookSignature(config.webhookSecret, body, null)).toBe(false);
    expect(verifyWebhookSignature(config.webhookSecret, body, "")).toBe(false);
  });

  it("is sensitive to whitespace, which is why the raw body must be used", async () => {
    const { verifyWebhookSignature } = await load();
    const signature = sign(config.webhookSecret, body);
    // What re-serialising the parsed JSON produces. It represents the same data
    // and does not verify — the trap this endpoint is written to avoid.
    const reserialised = JSON.stringify(JSON.parse(body), null, 2);
    expect(reserialised).not.toBe(body);
    expect(verifyWebhookSignature(config.webhookSecret, reserialised, signature)).toBe(false);
  });
});

describe("creating a gateway order", () => {
  it("refuses an amount below the gateway's minimum, without calling out", async () => {
    const { createRazorpayOrder } = await load();
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    for (const amountMinor of [0, -5000, 99]) {
      const result = await createRazorpayOrder(config, {
        amountMinor,
        currency: "INR",
        receipt: "ORD-2026-ABCDEF",
      });
      expect(result.ok).toBe(false);
    }

    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("refuses a non-integer amount", async () => {
    const { createRazorpayOrder } = await load();
    // Paise are integers. A float here means somebody has divided by 100
    // somewhere, and sending it would charge a rounded amount.
    const result = await createRazorpayOrder(config, {
      amountMinor: 1500.5,
      currency: "INR",
      receipt: "ORD-2026-ABCDEF",
    });
    expect(result.ok).toBe(false);
  });

  it("refuses to proceed when the gateway echoes a different amount", async () => {
    const { createRazorpayOrder } = await load();
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ id: "order_ABC", amount: 100, currency: "INR" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );

    const result = await createRazorpayOrder(config, {
      amountMinor: 9_000_000,
      currency: "INR",
      receipt: "ORD-2026-ABCDEF",
    });

    // Better to lose the card payment and invoice instead than to show somebody
    // a payment form for ₹1 against a ₹90,000 order.
    expect(result.ok).toBe(false);
    fetchSpy.mockRestore();
  });

  it("sends the amount in minor units and asks for automatic capture", async () => {
    const { createRazorpayOrder } = await load();
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ id: "order_ABC", amount: 9_000_000, currency: "INR" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );

    const result = await createRazorpayOrder(config, {
      amountMinor: 9_000_000,
      currency: "INR",
      receipt: "ORD-2026-ABCDEF",
    });

    expect(result).toMatchObject({ ok: true, order: { id: "order_ABC", amountMinor: 9_000_000 } });

    const body = JSON.parse(String(fetchSpy.mock.calls[0]?.[1]?.body));
    // No division by 100 anywhere between the order total and the gateway.
    expect(body.amount).toBe(9_000_000);
    expect(body.receipt).toBe("ORD-2026-ABCDEF");
    // Without this an authorisation is never captured and is released days
    // later — money the business believes it has and does not.
    expect(body.payment_capture).toBe(1);

    fetchSpy.mockRestore();
  });

  it("does not leak the gateway's error text to the caller", async () => {
    const { createRazorpayOrder } = await load();
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          error: { description: "Authentication failed for key rzp_live_SECRETKEYID" },
        }),
        { status: 401, headers: { "content-type": "application/json" } },
      ),
    );

    const result = await createRazorpayOrder(config, {
      amountMinor: 9_000_000,
      currency: "INR",
      receipt: "ORD-2026-ABCDEF",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).not.toContain("rzp_live");
      expect(result.reason).not.toContain("Authentication failed");
    }
    fetchSpy.mockRestore();
  });

  it("survives the gateway being unreachable", async () => {
    const { createRazorpayOrder } = await load();
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockRejectedValue(new Error("getaddrinfo ENOTFOUND api.razorpay.com"));

    const result = await createRazorpayOrder(config, {
      amountMinor: 9_000_000,
      currency: "INR",
      receipt: "ORD-2026-ABCDEF",
    });

    // A returned failure, not a thrown one: the order still stands and the
    // customer is invoiced.
    expect(result.ok).toBe(false);
    fetchSpy.mockRestore();
  });
});
