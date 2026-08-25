import { describe, expect, it } from "vitest";

import {
  ANALYTICS_CSP,
  analyticsEnabled,
  CONSENT_DEFAULTS,
  DENIED,
  GA_MEASUREMENT_IDS,
  GRANTED,
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

  it("allows the advertising hosts, which only consent unlocks", () => {
    /*
     * These were blocked while there was no way to ask. They are open now
     * because the answer is asked for and denied until given — the CSP is not
     * what limits advertising here, consent is.
     */
    expect(ANALYTICS_CSP.connect).toContain("https://stats.g.doubleclick.net");
    expect(ANALYTICS_CSP.connect).toContain("https://www.google.com");
  });
});

describe("consent", () => {
  it("denies everything by default", () => {
    /*
     * The property this whole feature rests on. A default that is granted, or
     * a consent type left out of the defaults entirely, measures a visitor who
     * has not been asked — and the cookie policy promises the opposite.
     */
    for (const type of ["ad_storage", "ad_user_data", "ad_personalization", "analytics_storage"] as const) {
      expect(CONSENT_DEFAULTS[type]).toBe("denied");
    }
  });

  it("waits for an answer before measuring", () => {
    expect(CONSENT_DEFAULTS.wait_for_update).toBeGreaterThan(0);
  });

  it("answers every consent type in both directions", () => {
    /*
     * Consent Mode remembers nothing between page loads, so a refusal has to
     * be sent as explicitly as an acceptance. A type present in one and absent
     * from the other is a type that silently keeps its previous value.
     */
    expect(Object.keys(GRANTED).sort()).toEqual(Object.keys(DENIED).sort());
    expect(Object.values(GRANTED).every((value) => value === "granted")).toBe(true);
    expect(Object.values(DENIED).every((value) => value === "denied")).toBe(true);

    const defaults = Object.keys(CONSENT_DEFAULTS).filter((key) => key !== "wait_for_update");
    expect(Object.keys(GRANTED).sort()).toEqual(defaults.sort());
  });
});
