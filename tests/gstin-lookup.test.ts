import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Asking the GST system about a GSTIN, and what happens when it will not say.
 *
 * The failure modes are the substance here. A provider that is not configured,
 * one that times out, and one that answers `200` with an error envelope are
 * three different things, and exactly one of them means "this GSTIN is not
 * registered". Collapsing them would put "not registered" in front of a
 * customer whose only problem is that somebody has not pasted an API key yet.
 */

vi.mock("server-only", () => ({}));

const settings = { current: null as Record<string, unknown> | null };
vi.mock("@/lib/db", () => ({
  prisma: {
    gstinLookupSettings: {
      findUnique: async () => settings.current,
    },
  },
}));

// The stored header values are encrypted at rest; the box is exercised by its
// own tests, so here it is the identity function and the point stays the
// lookup's behaviour rather than the cipher's.
vi.mock("@/lib/secret-box", () => ({
  decryptSecret: (value: string | null | undefined) => value ?? null,
  secretHint: () => "••",
}));

vi.mock("@/lib/logger", () => ({
  logger: { warn: () => {}, info: () => {}, error: () => {} },
}));

const load = async () => {
  vi.resetModules();
  return import("@/lib/gstin-lookup");
};

const CONFIGURED = {
  baseUrl: "https://gsp.example.test",
  statusPath: "/commonapi/v1.0/tpstatus",
  searchPath: "/commonapi/v1.3/search",
  headerOneName: "client-id",
  headerOneValue: "abc",
  headerTwoName: null,
  headerTwoValue: null,
  headerThreeName: null,
  headerThreeValue: null,
};

/** This company's own GSTIN, which passes the check digit. */
const GSTIN = "07AAICT5606J1Z4";

const SEARCH_RESPONSE = {
  gstin: GSTIN,
  lgnm: "TECHZOID TECHNOLOGIES PRIVATE LIMITED",
  tradeNam: "TechZoid Technologies",
  sts: "Active",
  ctb: "Private Limited Company",
  dty: "Regular",
  rgdt: "01/07/2021",
  cxdt: "",
  stj: "Delhi",
  pradr: {
    addr: {
      flno: "4th Floor",
      bno: "407",
      bnm: "Pearl Business Park",
      st: "Netaji Subhash Place",
      loc: "Pitampura",
      stcd: "Delhi",
      pncd: "110034",
    },
    ntr: ["Office"],
  },
  adadr: [],
};

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  settings.current = { id: "singleton", ...CONFIGURED };
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const respond = (body: unknown, ok = true, status = 200) =>
  fetchMock.mockResolvedValue({ ok, status, json: async () => body } as unknown as Response);

describe("lookupGstin", () => {
  it("returns the name and the address from the search response", async () => {
    const { lookupGstin } = await load();
    respond(SEARCH_RESPONSE);

    const result = await lookupGstin(GSTIN);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.details.legalName).toBe("TECHZOID TECHNOLOGIES PRIVATE LIMITED");
    expect(result.details.tradeName).toBe("TechZoid Technologies");
    expect(result.details.status).toBe("Active");
    expect(result.details.source).toBe("search");
    expect(result.details.address).toEqual({
      line1: "4th Floor, 407, Pearl Business Park",
      line2: "Netaji Subhash Place, Pitampura",
      city: "Pitampura",
      state: "Delhi",
      postcode: "110034",
    });
  });

  it("assembles an address out of whatever parts are actually present", async () => {
    const { lookupGstin } = await load();

    // Registrations predate the current form and half these fields are
    // routinely blank. What must not happen is a line of stray commas.
    respond({
      ...SEARCH_RESPONSE,
      pradr: { addr: { bnm: "Pearl Business Park", pncd: "110034" }, ntr: [] },
    });

    const result = await lookupGstin(GSTIN);
    expect(result.ok && result.details.address).toEqual({
      line1: "Pearl Business Park",
      line2: null,
      city: null,
      state: null,
      postcode: "110034",
    });
  });

  it("sends the GSTIN and action as the documented query, with the configured headers", async () => {
    const { lookupGstin } = await load();
    respond(SEARCH_RESPONSE);
    await lookupGstin(GSTIN);

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe(
      `https://gsp.example.test/commonapi/v1.3/search?gstin=${GSTIN}&action=TP`,
    );
    expect((init as RequestInit).headers).toMatchObject({ "client-id": "abc" });
  });

  it("falls back to tpstatus when only that is configured, and says so", async () => {
    const { lookupGstin } = await load();
    settings.current = { id: "singleton", ...CONFIGURED, searchPath: null };
    respond({
      gstin: GSTIN,
      stateCode: "07",
      stateName: "Delhi",
      status: "Active",
      validGstin: true,
    });

    const result = await lookupGstin(GSTIN);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.details.source).toBe("status");
    expect(result.details.stateName).toBe("Delhi");
    // The half this endpoint cannot answer is null, not an empty string — a
    // caller has to be able to tell "no name available" from "no name".
    expect(result.details.legalName).toBeNull();
    expect(result.details.address).toBeNull();
  });

  it("reads a 200 with an empty envelope as not found, not as a nameless company", async () => {
    const { lookupGstin } = await load();
    settings.current = { id: "singleton", ...CONFIGURED, statusPath: null };

    // What a GSP actually returns for an unregistered number.
    respond({ error: { message: "Invalid GSTIN / UID" } });

    const result = await lookupGstin(GSTIN);
    expect(result).toEqual({ ok: false, reason: "not_found" });
  });

  it("distinguishes a provider that is unreachable from a GSTIN that is not registered", async () => {
    const { lookupGstin } = await load();
    settings.current = { id: "singleton", ...CONFIGURED, statusPath: null };
    fetchMock.mockRejectedValue(new Error("network"));

    expect(await lookupGstin(GSTIN)).toEqual({ ok: false, reason: "unreachable" });
  });

  it("distinguishes a provider that refused the call", async () => {
    const { lookupGstin } = await load();
    settings.current = { id: "singleton", ...CONFIGURED, statusPath: null };
    respond({}, false, 401);

    expect(await lookupGstin(GSTIN)).toEqual({ ok: false, reason: "refused" });
  });

  it("says nothing is configured rather than pretending the GSTIN is unknown", async () => {
    const { lookupGstin } = await load();
    settings.current = null;

    expect(await lookupGstin(GSTIN)).toEqual({ ok: false, reason: "not_configured" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("refuses a malformed GSTIN without spending a request on it", async () => {
    const { lookupGstin } = await load();

    // Right shape, wrong check digit — the one a shape check lets through.
    expect(await lookupGstin("07AAICT5606J1Z5")).toEqual({ ok: false, reason: "malformed" });
    expect(await lookupGstin("nonsense")).toEqual({ ok: false, reason: "malformed" });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("registrationIsActive", () => {
  it("recognises the one word that means yes", async () => {
    const { registrationIsActive } = await load();
    expect(registrationIsActive("Active")).toBe(true);
    expect(registrationIsActive("active")).toBe(true);
  });

  it("treats anything else as not active, including something new", async () => {
    const { registrationIsActive } = await load();
    for (const status of ["Cancelled", "Suspended", "Inactive", "Provisional", null, ""]) {
      expect(registrationIsActive(status)).toBe(false);
    }
  });
});
