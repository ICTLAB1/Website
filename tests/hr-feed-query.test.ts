import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// The real `cached()` needs Next's request scope. The caching itself is Next's;
// what is under test here is what is fetched, how, and what a failure becomes.
vi.mock("@/lib/queries/cached", () => ({
  cached: <T extends (...args: never[]) => unknown>(fn: T) => fn,
}));

import { getCareers, getOpenJobCount } from "@/lib/queries/hr-feed";

const job = (id: string, over: Record<string, unknown> = {}) => ({
  id,
  title: `Role ${id}`,
  department: "Sales",
  location: "New Delhi",
  employment_type: "Full-time",
  experience: null,
  salary: null,
  openings: 1,
  summary: null,
  responsibilities: [],
  requirements: [],
  posted_on: "2026-11-19",
  apply_by: null,
  url: `https://hr.techzoidtechnologies.com/careers/${id}`,
  apply_url: `https://hr.techzoidtechnologies.com/careers/${id}#apply`,
  ...over,
});

const respond = (body: unknown, status = 200) =>
  vi.fn().mockResolvedValue(new Response(typeof body === "string" ? body : JSON.stringify(body), { status }));

beforeEach(() => {
  vi.useRealTimers();
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("what the careers page is told", () => {
  it("has jobs when the feed lists them", async () => {
    vi.stubGlobal("fetch", respond({ count: 2, jobs: [job("a"), job("b", { department: "Operations" })] }));
    const careers = await getCareers(new Date("2026-11-20T09:00:00Z"));
    expect(careers.state).toBe("jobs");
    if (careers.state !== "jobs") return;
    expect(careers.jobs.map((j) => j.id)).toEqual(["a", "b"]);
    expect(careers.departments).toEqual(["Sales", "Operations"]);
    expect(careers.jobs[0]?.postedLabel).toBe("Posted 1 day ago");
  });

  it("is empty when the feed has no jobs, which is not a failure", async () => {
    vi.stubGlobal("fetch", respond({ count: 0, jobs: [] }));
    expect((await getCareers()).state).toBe("empty");
  });

  it("is unavailable — not an exception — when the feed cannot be reached", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("fetch failed")));
    expect((await getCareers()).state).toBe("unavailable");
  });

  it.each([
    ["a server error", respond("oops", 500)],
    ["a not-found", respond("nope", 404)],
    ["a body that is not JSON", respond("<html>maintenance</html>")],
    ["JSON that is not a feed", respond({ hello: "world" })],
  ])("is unavailable for %s", async (_name, fetchStub) => {
    vi.stubGlobal("fetch", fetchStub);
    expect((await getCareers()).state).toBe("unavailable");
  });

  it("is unavailable when the request times out", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new DOMException("timed out", "TimeoutError")));
    expect((await getCareers()).state).toBe("unavailable");
  });

  it("asks for the real feed, with a five second timeout, and does not send credentials", async () => {
    const fetchStub = respond({ jobs: [] });
    vi.stubGlobal("fetch", fetchStub);
    await getCareers();
    const [url, init] = fetchStub.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://hr.techzoidtechnologies.com/api/public/jobs");
    expect(init.signal).toBeInstanceOf(AbortSignal);
    expect(init.credentials).toBeUndefined();
    expect(JSON.stringify(init.headers)).not.toMatch(/authorization|cookie|key/i);
  });

  it("keeps the dates the cache layer would otherwise turn into Date objects as plain strings", async () => {
    // `cached()` revives fields named `postedOn` and the like. A job's date is
    // read after that, so it has to survive a JSON round trip as a string.
    vi.stubGlobal("fetch", respond({ jobs: [job("a", { posted_on: "2026-11-19", apply_by: "2026-12-15" })] }));
    const careers = await getCareers();
    const roundTripped = JSON.parse(JSON.stringify(careers));
    expect(typeof roundTripped.jobs[0].postedOnIso).toBe("string");
    expect(typeof roundTripped.jobs[0].applyByIso).toBe("string");
  });
});

describe("the menu badge", () => {
  it("is the number of open jobs", async () => {
    vi.stubGlobal("fetch", respond({ jobs: [job("a"), job("b"), job("c")] }));
    expect(await getOpenJobCount()).toBe(3);
  });

  it("is 0 with no jobs, and 0 — quietly — when the feed fails", async () => {
    vi.stubGlobal("fetch", respond({ jobs: [] }));
    expect(await getOpenJobCount()).toBe(0);
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("down")));
    expect(await getOpenJobCount()).toBe(0);
  });

  it("gives up after a second and a half rather than hold up the page", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("fetch", vi.fn().mockReturnValue(new Promise(() => {})));
    const pending = getOpenJobCount();
    await vi.advanceTimersByTimeAsync(1_600);
    await expect(pending).resolves.toBe(0);
  });
});
