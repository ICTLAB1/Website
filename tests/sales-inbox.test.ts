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
vi.mock("@/lib/mail/graph", () => ({ sendViaGraph: async () => ({ ok: true }), resetGraphToken: () => {} }));
vi.mock("@/lib/logger", () => ({ logger: { warn: () => {}, info: () => {}, error: () => {} } }));

const acsSend = vi.fn(async (..._args: unknown[]) => ({ ok: true as const }));
vi.mock("@/lib/mail/azure-acs", () => ({
  sendViaAzureAcs: acsSend,
  resetAzureAcsClient: () => {},
}));

const smtpSend = vi.fn(async (..._args: unknown[]) => ({}));
vi.mock("nodemailer", () => ({
  default: { createTransport: () => ({ verify: async () => {}, sendMail: smtpSend }) },
}));

const mail = {
  salesNotification: null as string | null,
  provider: "SMTP" as "SMTP" | "MICROSOFT_GRAPH",
  host: null as string | null,
  port: 587,
  secure: false,
  username: null as string | null,
  password: null as string | null,
  from: null as string | null,
  fromName: null as string | null,
  graph: null as unknown,
  acs: null as unknown,
};
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

/**
 * A lead notification reaches somebody, through whichever channel this
 * deployment actually has.
 *
 * The second half of the same bug. Resolving a recipient is not enough: these
 * messages were all `purpose: "sales"`, which means SMTP or Microsoft Graph and
 * never Azure. A deployment whose only working channel is Azure Communication
 * Services — a supported way to run this, and where the customer-facing mail is
 * already happy — logged and dropped every internal notification while looking,
 * from outside, exactly like working email.
 */
describe("the channel a lead notification goes out on", () => {
  beforeEach(() => {
    acsSend.mockClear();
    smtpSend.mockClear();
    mail.salesNotification = null;
    mail.provider = "SMTP";
    mail.host = null;
    mail.from = null;
    mail.acs = null;
    site.sales = "sales@example.test";
  });

  it("carries the customer's address as the reply-to", async () => {
    mail.host = "smtp.example.test";
    mail.from = "noreply@example.test";

    const { notifyInternal } = await load();
    await notifyInternal({ subject: "New lead", text: "Body", replyTo: "customer@example.test" });

    /*
     * The whole point of the notification is that somebody can answer it. This
     * went out once with no reply-to at all, because the function it routes
     * through was the admin test button's twin and had never needed one —
     * hitting Reply reached the site's own no-reply address.
     */
    expect(smtpSend.mock.calls[0]?.[0]).toMatchObject({ replyTo: "customer@example.test" });
  });

  it("is the sales mailbox when one is configured", async () => {
    mail.host = "smtp.example.test";
    mail.from = "noreply@example.test";
    mail.acs = { connectionString: "endpoint=https://x.communication.azure.com/;accesskey=k", senderAddress: "DoNotReply@x.azurecomm.net" };

    const { notifyInternal } = await load();
    expect(await notifyInternal({ subject: "New lead", text: "Body" })).toEqual({ delivered: true });

    // Azure is configured here and deliberately not used: a colleague hitting
    // Reply on a lead should reach a mailbox, not DoNotReply.
    expect(smtpSend).toHaveBeenCalledOnce();
    expect(acsSend).not.toHaveBeenCalled();
  });

  it("falls back to Azure when there is no sales mailbox at all", async () => {
    mail.acs = { connectionString: "endpoint=https://x.communication.azure.com/;accesskey=k", senderAddress: "DoNotReply@x.azurecomm.net" };

    const { notifyInternal } = await load();
    expect(await notifyInternal({ subject: "New lead", text: "Body" })).toEqual({ delivered: true });

    expect(acsSend).toHaveBeenCalledOnce();
    expect(acsSend.mock.calls[0]?.[1]).toMatchObject({ to: "sales@example.test" });
  });

  it("does not retry over Azure when a configured mailbox refused the message", async () => {
    mail.host = "smtp.example.test";
    mail.from = "noreply@example.test";
    mail.acs = { connectionString: "endpoint=https://x.communication.azure.com/;accesskey=k", senderAddress: "DoNotReply@x.azurecomm.net" };
    smtpSend.mockRejectedValueOnce(new Error("550 relay denied"));

    const { notifyInternal } = await load();
    expect(await notifyInternal({ subject: "New lead", text: "Body" })).toEqual({ delivered: false });

    /*
     * A rejection is a server that exists saying no — a fault somebody has to
     * fix. Retrying it over Azure would hide that, and where the rejection came
     * after the message had already been accepted it would deliver the lead
     * twice.
     */
    expect(acsSend).not.toHaveBeenCalled();
  });

  it("reports undelivered rather than throwing when nothing is configured", async () => {
    const { notifyInternal } = await load();
    // The enquiry is already stored and the customer already acknowledged. No
    // lead is worth failing their request over.
    expect(await notifyInternal({ subject: "New lead", text: "Body" })).toEqual({ delivered: false });
  });
});
