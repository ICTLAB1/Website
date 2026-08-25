import { describe, expect, it } from "vitest";

import {
  ANALYTICS_CSP,
  ANALYTICS_DECLINED,
  analyticsEnabled,
  GA_MEASUREMENT_IDS,
} from "@/lib/analytics";

/**
 * The analytics tag, and the two ways it goes wrong quietly.
 *
 * It can load on a page it has no business measuring, which exports customer
 * identifiers to a third party; and it can load under a policy that forbids the
 * requests it then makes, which produces a working page and no data. Neither
 * failure is visible on the site, so both are asserted here.
 */

const live = { host: "www.techzoidtechnologies.com", isDevelopment: false };

describe("where the tag runs", () => {
  it("runs on public pages of the real site", () => {
    expect(analyticsEnabled({ ...live, pathname: "/" })).toBe(true);
    expect(analyticsEnabled({ ...live, pathname: "/products/microsoft-365" })).toBe(true);
    expect(analyticsEnabled({ ...live, pathname: "/brands/quick-heal" })).toBe(true);
  });

  it("never runs where a URL identifies a customer or their business", () => {
    for (const pathname of [
      "/account",
      "/account/quotes/QTE-2026-4F7K2P",
      "/admin",
      "/admin/organisations/abc",
      "/api/quotes/follow-ups",
      "/login",
      "/register",
    ]) {
      expect(analyticsEnabled({ ...live, pathname })).toBe(false);
    }
  });

  it("is not fooled by a path that merely starts with the same letters", () => {
    // /accountants would be a public page; /account is not.
    expect(analyticsEnabled({ ...live, pathname: "/accountants" })).toBe(true);
    expect(analyticsEnabled({ ...live, pathname: "/administration-services" })).toBe(true);
  });

  it("stays off a developer's machine and in development", () => {
    expect(analyticsEnabled({ ...live, pathname: "/", host: "localhost:3000" })).toBe(false);
    expect(analyticsEnabled({ ...live, pathname: "/", host: "127.0.0.1:3000" })).toBe(false);
    expect(analyticsEnabled({ ...live, pathname: "/", isDevelopment: true })).toBe(false);
    expect(analyticsEnabled({ ...live, pathname: "/", host: null })).toBe(false);
  });
});

describe("the measurement IDs", () => {
  it("are all valid GA4 IDs", () => {
    expect(GA_MEASUREMENT_IDS.length).toBeGreaterThan(0);
    for (const id of GA_MEASUREMENT_IDS) {
      expect(id).toMatch(/^G-[A-Z0-9]{6,20}$/);
    }
  });
});

describe("the policy the tag needs", () => {
  it("allows the collection host itself, not only its subdomains", () => {
    /*
     * The bug this test exists for: a CSP wildcard covers subdomains and not
     * the host itself, so `*.analytics.google.com` alone left the live site
     * blocking `analytics.google.com` — which is where the tag actually posts.
     */
    expect(ANALYTICS_CSP.connect).toContain("https://analytics.google.com");
    expect(ANALYTICS_CSP.connect).toContain("https://www.google-analytics.com");
  });

  it("does not open the advertising hosts the cookie policy says are absent", () => {
    for (const host of ANALYTICS_DECLINED) {
      expect(ANALYTICS_CSP.connect).not.toContain(host);
      expect(ANALYTICS_CSP.img).not.toContain(host);
      expect(ANALYTICS_CSP.script).not.toContain(host);
    }
  });
});
