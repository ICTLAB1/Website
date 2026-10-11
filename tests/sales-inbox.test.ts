import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Who gets told, when nobody has said who should get told.
 *
 * This is the one that broke in production, and it broke silently: both the
 * contact route and the enquiry service guard their staff notification on
 * `if (internal)`, so the moment `salesInbox()` returned null every lead was
 * acknowledged to the customer and mentioned to no one. Nothing failed,
 * nothing was logged loudly, and the only symptom was enquiries that never got
 * called back.
 *
 * So the behaviour worth pinning is not "it reads the field" — it is the
 * precedence between the field and the published sales address, including the
 * case where neither exists.
 */

vi.mock("server-only", () => ({}));
vi.mock("nodemailer", () => ({ default: { createTransport: () => ({}) } }));
vi.mock("@/lib/mail/azure-acs", () => ({ sendViaAzureAcs: async () => ({ ok: true }), resetAzureAcsClient: () => {} }));
vi.mock("@/lib/mail/graph", () => ({ sendViaGraph: async () => ({ ok: true }), resetGraphToken: () => {} }));
vi.mock("@/lib/logger", () => ({ logger: { warn: () => {}, info: () => {}, error: () => {} } }));

const mail = { salesNotification: null as string | null };
vi.mock("@/lib/mail-config", () => ({
  getMailConfig: async () => mail,
  mailIsConfigured: async () => true,
  azureAcsConfigured: async () => false,
}));

const site = { sales: null as string | null };
vi.mock("@/lib/site-config", () => ({
  getSiteConfig: async () => ({ email: { sales: site.sales } }),
}));

const load = async () => {
  vi.resetModules();
  return import("@/lib/mail");
};

describe("the mailbox a new lead is announced to", () => {
  beforeEach(() => {
    mail.salesNotification = null;
    site.sales = null;
  });

  it("is the explicitly configured notification address when one is set", async () => {
    mail.salesNotification = "leads@example.test";
    site.sales = "sales@example.test";

    const { salesInbox } = await load();
    // The field exists for exactly this, so an address typed into it wins over
    // the published one — otherwise setting it would do nothing.
    expect(await salesInbox()).toBe("leads@example.test");
  });

  it("falls back to the sales address the site already publishes", async () => {
    site.sales = "sales@example.test";

    const { salesInbox } = await load();
    expect(await salesInbox()).toBe("sales@example.test");
  });

  it("is null only when the business publishes no sales address at all", async () => {
    const { salesInbox } = await load();
    // Null is still reachable, and the callers still handle it — but now it
    // means "this site has told nobody how to reach sales", not "an optional
    // admin field is blank".
    expect(await salesInbox()).toBeNull();
  });
});
