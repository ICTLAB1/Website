import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * One order, one set of licences — however many people press Fulfil.
 *
 * This is here because it happened. The status check sat outside the
 * transaction, so two requests arriving together both passed it and both went
 * on to issue a full set: one order, two licences per line, two renewal rows,
 * and two emails telling the customer their software was ready. Reproduced
 * against a real database on the first attempt with `Promise.all` of two
 * calls — an administrator double-clicking the button is enough.
 *
 * The fix is the compare-and-set `recordCapture` already used for a payment
 * reported twice, so what this pins is the shape rather than the symptom: the
 * claim is a conditional write, it comes before anything is created, and
 * losing it creates nothing.
 */

vi.mock("server-only", () => ({}));
vi.mock("@/lib/site-config", () => ({ getSiteConfig: async () => ({ email: {}, tradingName: "T" }) }));
vi.mock("@/lib/banking-config", () => ({ getBankingDetails: () => null }));
vi.mock("@/lib/mail", () => ({
  escapeHtml: (v: string) => v,
  notifyInternal: async () => ({ delivered: true }),
  sendMail: async () => ({ delivered: true }),
}));
vi.mock("@/lib/whatsapp/notify", () => ({ notifyOrderWhatsApp: async () => {} }));
vi.mock("@/lib/logger", () => ({ logger: { info: () => {}, warn: () => {}, error: () => {} } }));

const notifyFulfilled = vi.fn(async () => {});
vi.mock("@/lib/emails/transactional", () => ({ notifyOrderFulfilled: notifyFulfilled }));

const ORDER = {
  id: "order-1",
  status: "CONFIRMED",
  userId: "user-1",
  companyId: null,
  billingName: "A Customer",
  billingEmail: "customer@example.test",
  items: [
    {
      productId: "p1",
      variantId: "v1",
      productName: "A Product — Annual",
      sku: "SKU-1",
      quantity: 2,
      variant: { termMonths: 12, seats: 1 },
    },
  ],
};

/** What the claim returned, which is the whole point of the test. */
const claim = { count: 1 };
const licenceCreate = vi.fn(async () => ({ id: "licence-1" }));
const renewalCreate = vi.fn(async () => ({ id: "renewal-1" }));
const orderUpdateMany = vi.fn(async () => claim);
const orderUpdate = vi.fn(async () => ORDER);

const tx = {
  order: { updateMany: orderUpdateMany, update: orderUpdate },
  licence: { create: licenceCreate },
  renewal: { create: renewalCreate },
};

vi.mock("@/lib/db", () => ({
  prisma: {
    order: {
      findUnique: async () => ORDER,
      updateMany: orderUpdateMany,
      update: orderUpdate,
    },
    // Runs the callback directly, and lets a throw out the way a real
    // interactive transaction does — which is how the claim backs out.
    $transaction: async (fn: (t: typeof tx) => Promise<unknown>) => fn(tx),
  },
}));

const load = async () => {
  vi.resetModules();
  return import("@/lib/order-service");
};

describe("fulfilling an order claims it before issuing anything", () => {
  beforeEach(() => {
    claim.count = 1;
    licenceCreate.mockClear();
    renewalCreate.mockClear();
    orderUpdateMany.mockClear();
    notifyFulfilled.mockClear();
  });

  it("issues licences when the claim succeeds", async () => {
    const { fulfilOrder } = await load();
    const result = await fulfilOrder("ORD-1", "staff-1");

    expect(result).toMatchObject({ ok: true, reference: "ORD-1" });
    expect(licenceCreate).toHaveBeenCalledOnce();
    expect(renewalCreate).toHaveBeenCalledOnce();
  });

  it("claims the order with a conditional write, not a plain update", async () => {
    const { fulfilOrder } = await load();
    await fulfilOrder("ORD-1", "staff-1");

    // The status must be in the filter. Without it this is a write that always
    // wins, which is exactly the version that issued two sets of licences.
    const [args] = orderUpdateMany.mock.calls[0] as unknown as [
      { where: { status?: unknown }; data: { status: string } },
    ];
    expect(args.where.status).toBeDefined();
    expect(args.data.status).toBe("FULFILLED");
  });

  it("creates nothing at all when another request claimed it first", async () => {
    claim.count = 0;

    const { fulfilOrder } = await load();
    const result = await fulfilOrder("ORD-1", "staff-1");

    expect(result).toMatchObject({ ok: false });
    // The three things the losing request must not do.
    expect(licenceCreate).not.toHaveBeenCalled();
    expect(renewalCreate).not.toHaveBeenCalled();
    expect(notifyFulfilled).not.toHaveBeenCalled();
  });

  it("still reports success when the customer's email cannot be sent", async () => {
    /*
     * The licences are committed by this point. Rejecting here told the
     * administrator that fulfilment had failed on an order that was in fact
     * fulfilled, and the obvious response to that is to press Fulfil again —
     * which is how somebody found the race in the first place.
     */
    notifyFulfilled.mockRejectedValueOnce(new Error("mail server unreachable"));

    const { fulfilOrder } = await load();
    await expect(fulfilOrder("ORD-1", "staff-1")).resolves.toMatchObject({ ok: true });
  });
});
