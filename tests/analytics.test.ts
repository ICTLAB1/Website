import { describe, expect, it } from "vitest";

import {
  ADS_CONVERSION_SEND_TO,
  ANALYTICS_CSP,
  ANALYTICS_DEBUG_HOSTS,
  analyticsDebugging,
  analyticsEnabled,
  CONSENT_DEFAULTS,
  CONSENT_DEFAULTS_BY_REGION,
  CONSENT_DENIED_REGIONS,
  DENIED,
  GA_MEASUREMENT_IDS,
  GOOGLE_ADS_CONVERSION_LABEL,
  GOOGLE_ADS_ENABLED,
  GOOGLE_ADS_ID,
  GRANTED,
  GTM_CONTAINER_ID,
  GTM_ENABLED,
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

describe("the Google Ads account", () => {
  it("is an Ads id and not a measurement or container id", () => {
    expect(GOOGLE_ADS_ENABLED).toBe(true);
    expect(GOOGLE_ADS_ID).toMatch(/^AW-[0-9]{8,20}$/);
  });

  it("reports no conversion from the site, because the container counts", () => {
    /*
     * The shipped state, and a deliberate one. Exactly one thing may count a
     * lead: the published container holds a tag on the same
     * `quote_form_submit` event, so a label set here as well would count every
     * lead twice and a Maximize Conversions campaign would bid against the
     * doubled figure.
     *
     * Null rather than a half-built `AW-123/`, which gtag accepts and which
     * counts nothing while looking configured.
     */
    expect(GOOGLE_ADS_CONVERSION_LABEL).toBe("");
    expect(ADS_CONVERSION_SEND_TO).toBeNull();
  });

  it("is rejected when it is not one, because it reaches a script body", () => {
    for (const value of ["", "AW-", "AW-123", "G-P0H1WJDZ7Y", "GTM-THHL334G", "AW-1840819014x", "aw-18408190141"]) {
      expect(/^AW-[0-9]{8,20}$/.test(value)).toBe(false);
    }
  });
});

describe("the Tag Manager container", () => {
  it("is a container id and not a measurement id", () => {
    expect(GTM_ENABLED).toBe(true);
    expect(GTM_CONTAINER_ID).toMatch(/^GTM-[A-Z0-9]{4,12}$/);
  });

  it("loads from the host the policy already allows", () => {
    /*
     * gtm.js and gtag.js are served from the same host, so the container needs
     * no widening of `script-src`. What it does need is `strict-dynamic`, which
     * is what lets a tag published into the container next month load without
     * a deploy to the policy.
     */
    expect(ANALYTICS_CSP.script).toContain("https://www.googletagmanager.com");
  });

  it("allows exactly one host to be framed, for the noscript snippet", () => {
    /*
     * The one directive here widened for every visitor rather than for a
     * debugging session. Kept to a single host on purpose: `frame-src` is what
     * lets this page put something in a frame, and the list is short enough to
     * read.
     */
    expect(ANALYTICS_CSP.frame).toEqual(["https://www.googletagmanager.com"]);
  });
});

describe("what framing the container does not change", () => {
  it("is who may frame this site, which is nobody", () => {
    /*
     * The confusion worth pinning: `frame-src` governs what this page may put
     * in a frame, `frame-ancestors` governs who may put this page in one. Only
     * the first moved for the noscript snippet. If a future edit ever adds a
     * host to the wrong one, this site becomes embeddable and the clickjacking
     * protection is gone silently.
     */
    expect(ANALYTICS_CSP).not.toHaveProperty("frameAncestors");
    for (const host of ANALYTICS_CSP.frame) {
      expect(host).toMatch(/^https:\/\//);
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

describe("a tag debugging session", () => {
  it("is recognised only by the parameter Google's tooling sets", () => {
    expect(analyticsDebugging(new URLSearchParams("gtm_debug=1787677100802"))).toBe(true);
    expect(analyticsDebugging(new URLSearchParams(""))).toBe(false);
    expect(analyticsDebugging(new URLSearchParams("utm_source=gtm"))).toBe(false);
  });

  it("needs the host the ordinary policy refuses to frame", () => {
    /*
     * The failure this exists for: Tag Assistant injects an iframe from
     * tagassistant.google.com to talk back through, `frame-src 'none'` refuses
     * it, and the session times out reporting "could not connect" — which
     * reads to everybody as "there is no tag on this site".
     */
    expect(ANALYTICS_DEBUG_HOSTS).toContain("https://tagassistant.google.com");
  });
});

describe("consent", () => {
  it("denies everything where consent must be asked for first", () => {
    /*
     * The property the EEA half of this rests on. A type granted here, or left
     * out of this command entirely, measures a visitor in a country whose law
     * says to ask first — and the cookie policy says we do.
     */
    for (const type of ["ad_storage", "ad_user_data", "ad_personalization", "analytics_storage"] as const) {
      expect(CONSENT_DEFAULTS_BY_REGION[type]).toBe("denied");
    }
  });

  it("names every country that must be asked first, and no duplicates", () => {
    /*
     * Twenty-seven member states, three more in the EEA, and two equivalent
     * regimes outside it. Counted rather than eyeballed: a country missing
     * from this list is a visitor measured without being asked, and it is the
     * kind of omission that reads as correct.
     */
    expect(new Set(CONSENT_DENIED_REGIONS).size).toBe(CONSENT_DENIED_REGIONS.length);
    expect(CONSENT_DENIED_REGIONS).toHaveLength(32);

    for (const code of ["DE", "FR", "IE", "NO", "IS", "LI", "GB", "CH"]) {
      expect(CONSENT_DENIED_REGIONS).toContain(code);
    }
    // Where the business actually sells, and the reason this change was made.
    expect(CONSENT_DENIED_REGIONS).not.toContain("IN");

    for (const code of CONSENT_DENIED_REGIONS) {
      expect(code).toMatch(/^[A-Z]{2}$/);
    }
  });

  it("grants elsewhere, which is the half that needed the policy rewritten", () => {
    for (const type of ["ad_storage", "ad_user_data", "ad_personalization", "analytics_storage"] as const) {
      expect(CONSENT_DEFAULTS[type]).toBe("granted");
    }
    // The global command must carry no region, or it stops being the fallback.
    expect(CONSENT_DEFAULTS).not.toHaveProperty("region");
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

    // And the regional command answers the same set, or a type it omits keeps
    // the granted global value in a country that must be asked first.
    const regional = Object.keys(CONSENT_DEFAULTS_BY_REGION).filter(
      (key) => key !== "wait_for_update" && key !== "region",
    );
    expect(regional.sort()).toEqual(defaults.sort());
  });
});
