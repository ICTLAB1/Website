import { beforeEach, describe, expect, it } from "vitest";
import { __clearAll, hit, LIMITS, reset } from "@/lib/auth/rate-limit";

describe("rate limiter", () => {
  beforeEach(() => __clearAll());

  it("allows requests up to the limit and blocks the next one", () => {
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      expect(hit("key", 3, 60).allowed).toBe(true);
    }
    const blocked = hit("key", 3, 60);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("counts each key independently", () => {
    hit("a", 1, 60);
    expect(hit("a", 1, 60).allowed).toBe(false);
    expect(hit("b", 1, 60).allowed).toBe(true);
  });

  it("reports the remaining allowance", () => {
    expect(hit("counter", 3, 60).remaining).toBe(2);
    expect(hit("counter", 3, 60).remaining).toBe(1);
    expect(hit("counter", 3, 60).remaining).toBe(0);
  });

  it("clears a bucket on reset, as a successful sign-in does", () => {
    hit("login", 1, 60);
    expect(hit("login", 1, 60).allowed).toBe(false);
    reset("login");
    expect(hit("login", 1, 60).allowed).toBe(true);
  });

  it("configures a stricter limit for authentication than for search", () => {
    expect(LIMITS.login.limit).toBeLessThan(LIMITS.search.limit);
    expect(LIMITS.passwordReset.limit).toBeLessThanOrEqual(LIMITS.login.limit);
  });
});
