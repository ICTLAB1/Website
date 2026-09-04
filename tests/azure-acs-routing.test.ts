import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * Which channel a message actually goes out on.
 *
 * The two things worth proving here are not that SMTP or Azure work — those
 * are exercised where they are implemented — but that `sendMail` picks
 * between them correctly: a "transactional" message goes to Azure only when
 * Azure is genuinely configured, every other message never does regardless of
 * configuration, and the dedicated Azure test button never silently falls
 * back to the sales mailbox the way a real message correctly does.
 */

vi.mock("server-only", () => ({}));

const settings = { current: null as Record<string, unknown> | null };
vi.mock("@/lib/db", () => ({
  prisma: {
    mailSettings: {
      findUnique: async () => settings.current,
    },
  },
}));

// Encryption is exercised by its own tests; here it is the identity function
// so the fixture below can just set the field it wants decrypted.
vi.mock("@/lib/secret-box", () => ({
  decryptSecret: (value: string | null | undefined) => value ?? null,
  secretHint: (value: string) => `••••${value.slice(-4)}`,
}));

vi.mock("@/lib/logger", () => ({
  logger: { warn: () => {}, info: () => {}, error: () => {} },
}));

const azureSend = vi.fn(async (..._args: unknown[]) => ({ ok: true as const }));
vi.mock("@/lib/mail/azure-acs", () => ({
  sendViaAzureAcs: azureSend,
  resetAzureAcsClient: () => {},
}));

const graphSend = vi.fn(async (..._args: unknown[]) => ({ ok: true as const }));
vi.mock("@/lib/mail/graph", () => ({
  sendViaGraph: graphSend,
  resetGraphToken: () => {},
}));

// nodemailer's SMTP path is the fallback for every fixture below (no provider
// row is ever set to SMTP with credentials that would let it actually
// connect), and none of these tests need it to succeed — only to prove Azure
// was, or was not, the channel used.
vi.mock("nodemailer", () => ({
  default: { createTransport: () => ({ verify: async () => {}, sendMail: async () => {} }) },
}));

const load = async () => {
  vi.resetModules();
  return import("@/lib/mail");
};

const message = { to: "customer@example.test", subject: "Test", text: "Plain" };

const acsRow = {
  provider: "SMTP",
  acsEnabled: true,
  acsConnectionString: "endpoint=https://contoso.communication.azure.com/;accesskey=secret",
  acsSenderAddress: "DoNotReply@contoso.azurecomm.net",
  host: "smtp.office365.com",
  fromAddress: "sales@example.test",
  graphTenantId: null,
  graphClientId: null,
  graphClientSecret: null,
  graphSender: null,
};

afterEach(() => {
  settings.current = null;
  azureSend.mockClear();
  graphSend.mockClear();
  vi.restoreAllMocks();
});

describe("routing a message to Azure Communication Services", () => {
  it("uses Azure for a transactional message when Azure is configured", async () => {
    settings.current = acsRow;
    const { sendMail } = await load();

    const result = await sendMail({ ...message, purpose: "transactional" });

    expect(result).toEqual({ delivered: true });
    expect(azureSend).toHaveBeenCalledTimes(1);
    expect(graphSend).not.toHaveBeenCalled();
  });

  it("never uses Azure for a sales message, even when Azure is configured", async () => {
    settings.current = acsRow;
    const { sendMail } = await load();

    await sendMail({ ...message, purpose: "sales" });
    await sendMail(message); // purpose omitted — the same default as every call site written before this existed

    expect(azureSend).not.toHaveBeenCalled();
  });

  it("falls back to the configured mailbox when Azure is switched off", async () => {
    settings.current = { ...acsRow, acsEnabled: false };
    const { sendMail } = await load();

    await sendMail({ ...message, purpose: "transactional" });

    expect(azureSend).not.toHaveBeenCalled();
  });

  it("falls back when Azure is switched on but missing the sender address", async () => {
    settings.current = { ...acsRow, acsSenderAddress: null };
    const { sendMail } = await load();

    await sendMail({ ...message, purpose: "transactional" });

    expect(azureSend).not.toHaveBeenCalled();
  });

  it("dedicated Azure test send refuses rather than falling back when Azure is not configured", async () => {
    settings.current = { ...acsRow, acsEnabled: false };
    const { sendTestAzureAcsMail } = await load();

    const result = await sendTestAzureAcsMail(message);

    expect(result).toEqual({ delivered: false, failure: { kind: "acs_incomplete" } });
    expect(azureSend).not.toHaveBeenCalled();
  });

  it("dedicated Azure test send uses Azure when it is configured", async () => {
    settings.current = acsRow;
    const { sendTestAzureAcsMail } = await load();

    const result = await sendTestAzureAcsMail(message);

    expect(result).toEqual({ delivered: true });
    expect(azureSend).toHaveBeenCalledTimes(1);
  });
});
