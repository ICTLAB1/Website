import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * Sending through Microsoft 365 over HTTPS.
 *
 * Tested against a stubbed `fetch` rather than a real tenant, because what
 * needs proving is what this code sends and how it reads the answer — the two
 * things a real tenant would not tell us anything extra about, and the two
 * things that fail silently when wrong.
 */

vi.mock("server-only", () => ({}));

const load = async () => import("@/lib/mail/graph");

const config = {
  tenantId: "72f988bf-86f1-41af-91ab-2d7cd011db47",
  clientId: "00000000-1111-2222-3333-444444444444",
  clientSecret: "a-client-secret-value",
  sender: "sales@example.test",
};

const message = { to: "customer@example.test", subject: "Test", text: "Plain", html: "<p>Rich</p>" };

const tokenResponse = (overrides: Record<string, unknown> = {}) =>
  new Response(JSON.stringify({ access_token: "token-abc", expires_in: 3600, ...overrides }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });

/** A successful sendMail is 202 with an empty body. */
const accepted = () => new Response(null, { status: 202 });

afterEach(async () => {
  const { resetGraphToken } = await load();
  resetGraphToken();
  vi.restoreAllMocks();
});

describe("sending through Microsoft Graph", () => {
  it("asks for a token, then posts the message as the configured mailbox", async () => {
    const { sendViaGraph } = await load();
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(tokenResponse())
      .mockResolvedValueOnce(accepted());

    expect(await sendViaGraph(config, message)).toEqual({ ok: true });

    const [tokenUrl, tokenInit] = fetchSpy.mock.calls[0]!;
    expect(String(tokenUrl)).toContain(config.tenantId);
    const form = new URLSearchParams(String(tokenInit?.body));
    expect(form.get("grant_type")).toBe("client_credentials");
    // `.default` asks for exactly the application permissions already consented
    // to, which is the only meaningful scope for an app-only flow.
    expect(form.get("scope")).toBe("https://graph.microsoft.com/.default");

    const [sendUrl, sendInit] = fetchSpy.mock.calls[1]!;
    // The mailbox is in the path. Getting this wrong sends as the wrong person.
    expect(String(sendUrl)).toBe(
      "https://graph.microsoft.com/v1.0/users/sales%40example.test/sendMail",
    );
    expect((sendInit?.headers as Record<string, string>).authorization).toBe("Bearer token-abc");

    const body = JSON.parse(String(sendInit?.body));
    expect(body.message.toRecipients[0].emailAddress.address).toBe("customer@example.test");
    expect(body.message.body.contentType).toBe("HTML");
    // Kept in Sent Items, so the business has its own record of what it sent a
    // customer rather than depending on this application's logs.
    expect(body.saveToSentItems).toBe(true);
  });

  it("falls back to plain text when there is no HTML", async () => {
    const { sendViaGraph } = await load();
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(tokenResponse())
      .mockResolvedValueOnce(accepted());

    await sendViaGraph(config, { to: "c@example.test", subject: "S", text: "Just text" });

    const body = JSON.parse(String(fetchSpy.mock.calls[1]![1]?.body));
    expect(body.message.body).toEqual({ contentType: "Text", content: "Just text" });
  });

  it("reuses the token across sends rather than fetching one each time", async () => {
    const { sendViaGraph } = await load();
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(tokenResponse())
      .mockResolvedValue(accepted());

    await sendViaGraph(config, message);
    await sendViaGraph(config, message);
    await sendViaGraph(config, message);

    // One token, three sends. Fetching per message would triple the latency of
    // every send and get the token endpoint throttled.
    const tokenCalls = fetchSpy.mock.calls.filter(([url]) =>
      String(url).includes("login.microsoftonline.com"),
    );
    expect(tokenCalls).toHaveLength(1);
    expect(fetchSpy).toHaveBeenCalledTimes(4);
  });

  it("fetches a fresh token when the credentials change", async () => {
    const { sendViaGraph } = await load();
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(async (url) =>
      String(url).includes("login.microsoftonline.com") ? tokenResponse() : accepted(),
    );

    await sendViaGraph(config, message);
    await sendViaGraph({ ...config, clientSecret: "a-rotated-secret" }, message);

    // Otherwise correcting a secret in the admin panel would appear to do
    // nothing for up to an hour — which is exactly long enough to be diagnosed
    // as "the panel does not work".
    const tokenCalls = fetchSpy.mock.calls.filter(([url]) =>
      String(url).includes("login.microsoftonline.com"),
    );
    expect(tokenCalls).toHaveLength(2);
  });

  it("reports Microsoft's own words when the secret is wrong", async () => {
    const { sendViaGraph } = await load();
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          error: "invalid_client",
          error_description:
            "AADSTS7000215: Invalid client secret provided.\r\nTrace ID: abc\r\nCorrelation ID: def",
        }),
        { status: 401, headers: { "content-type": "application/json" } },
      ),
    );

    const result = await sendViaGraph(config, message);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      // The code is the part that identifies the problem; the trace ids are
      // noise and would push the useful sentence off the screen.
      expect(result.detail).toContain("AADSTS7000215");
      expect(result.detail).not.toContain("Trace ID");
    }
  });

  it("reports a refused send without throwing", async () => {
    const { sendViaGraph } = await load();
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(tokenResponse())
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            error: { code: "ErrorAccessDenied", message: "Access is denied. Check credentials and try again." },
          }),
          { status: 403, headers: { "content-type": "application/json" } },
        ),
      );

    const result = await sendViaGraph(config, message);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.detail).toContain("Access is denied");
  });

  it("survives Microsoft being unreachable", async () => {
    const { sendViaGraph } = await load();
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("The operation was aborted"));

    // A returned failure, not a thrown one: the order or enquiry that triggered
    // this has already been stored and must not be undone by a mail problem.
    const result = await sendViaGraph(config, message);
    expect(result.ok).toBe(false);
  });

  it("does not cache a token it failed to get", async () => {
    const { sendViaGraph } = await load();
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: "nope" }), { status: 401 }))
      .mockResolvedValueOnce(tokenResponse())
      .mockResolvedValueOnce(accepted());

    expect((await sendViaGraph(config, message)).ok).toBe(false);
    // A failure must not poison the cache: the next attempt, after the operator
    // fixes the secret, has to try again rather than replay the failure.
    expect((await sendViaGraph(config, message)).ok).toBe(true);
    expect(fetchSpy).toHaveBeenCalledTimes(3);
  });
});
