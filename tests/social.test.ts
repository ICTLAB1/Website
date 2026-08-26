import { describe, expect, it } from "vitest";

import { socialLinks } from "@/lib/social";

/**
 * The stored profile list is broader than social media and is authored by
 * hand, so the two things worth pinning are what gets shown and what does not.
 */

describe("social links", () => {
  it("recognises the networks whatever prefix the URL was copied with", () => {
    const links = socialLinks([
      "https://in.linkedin.com/company/techzoid-technologies-private-limited",
      "https://www.facebook.com/ttpldelhi/",
      "https://www.instagram.com/techzoidtechnologies/",
    ]);
    expect(links.map((link) => link.name)).toEqual(["LinkedIn", "Facebook", "Instagram"]);
  });

  it("keeps the order the settings put them in", () => {
    const links = socialLinks([
      "https://www.instagram.com/a/",
      "https://in.linkedin.com/company/b",
    ]);
    expect(links.map((link) => link.name)).toEqual(["Instagram", "LinkedIn"]);
  });

  it("leaves a profile that is not a social network out of the row", () => {
    /*
     * A GeM seller profile and a Google Business Profile belong in `sameAs`
     * and do not belong under a heading reading "Follow". They are not
     * removed from the settings — they are simply not this row's business.
     */
    const links = socialLinks([
      "https://gem.gov.in/seller/12345",
      "https://www.google.com/maps/place/example",
      "https://in.linkedin.com/company/techzoid",
    ]);
    expect(links.map((link) => link.name)).toEqual(["LinkedIn"]);
  });

  it("is not fooled by a hostname that merely ends in a network's name", () => {
    expect(socialLinks(["https://notlinkedin.com/company/x"])).toEqual([]);
    expect(socialLinks(["https://facebook.com.example.test/x"])).toEqual([]);
  });

  it("matches a bare registrable host as well as a subdomain", () => {
    expect(socialLinks(["https://linkedin.com/company/x"]).map((l) => l.name)).toEqual(["LinkedIn"]);
  });

  it("shows one link per network", () => {
    // Two LinkedIn URLs in settings is a settings problem; a footer reading
    // "LinkedIn LinkedIn" advertises it.
    const links = socialLinks([
      "https://in.linkedin.com/company/a",
      "https://www.linkedin.com/company/b",
    ]);
    expect(links).toHaveLength(1);
    expect(links[0]?.href).toContain("/company/a");
  });

  it("treats x.com and twitter.com as one network", () => {
    const links = socialLinks(["https://twitter.com/a", "https://x.com/a"]);
    expect(links.map((link) => link.name)).toEqual(["X"]);
  });

  it("refuses anything that is not https, and anything unparseable", () => {
    for (const url of [
      "http://www.facebook.com/x",
      "javascript:alert(1)//facebook.com",
      "not a url",
      "",
    ]) {
      expect(socialLinks([url])).toEqual([]);
    }
  });

  it("renders nothing at all when no profile is configured", () => {
    expect(socialLinks([])).toEqual([]);
  });
});
