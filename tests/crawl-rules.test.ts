import { describe, expect, it } from "vitest";

import { FACET_DISALLOW, isFacetBlocked, robotsPatternMatches } from "@/lib/crawl-rules";

/**
 * The filter-URL rules, pinned from both sides: the explosion must be blocked,
 * and the handful of faceted URLs that are real, indexable pages must not be.
 * The second half matters as much as the first — a rule that caught
 * `/hardware?family=servers` would take a landing page out of search.
 */
describe("the matcher follows Google's robots.txt rules", () => {
  it("is a prefix match with * for any run and $ for the end", () => {
    expect(robotsPatternMatches("/products?*&", "/products?brand=a&series=b")).toBe(true);
    expect(robotsPatternMatches("/products?*&", "/products?brand=a")).toBe(false);
    expect(robotsPatternMatches("/a$", "/a")).toBe(true);
    expect(robotsPatternMatches("/a$", "/ab")).toBe(false);
    expect(robotsPatternMatches("/x?y", "/x?yz")).toBe(true);
  });
});

describe("what is blocked", () => {
  it.each([
    "/products?brand=autodesk&series=z4",
    "/products?brand=autodesk&category=cad",
    "/products?category=servers&page=2",
    "/products?sort=price-asc",
    "/products?brand=dell&sort=popular",
    "/products?series=z4",
    "/products?form=RACK_SERVER",
    "/products?licence=PERPETUAL",
    "/products?availability=IN_STOCK",
    "/products?min=1000&max=5000",
    "/products?q=autocad",
    "/hardware?family=servers&sort=price-asc",
    "/hardware?brand=dell",
    "/hardware?form=RACK_SERVER",
  ])("%s", (url) => {
    expect(isFacetBlocked(url)).toBe(true);
  });
});

describe("what must stay crawlable", () => {
  it.each([
    "/products",
    "/products?page=2",
    "/products?category=software",
    "/products?brand=microsoft",
    "/hardware",
    "/hardware?family=laptops",
    "/hardware?family=desktops",
    "/hardware?family=servers",
    "/brands/microsoft",
    "/products/autocad",
    "/blog/autocad-subscription-price-in-india",
  ])("%s", (url) => {
    expect(isFacetBlocked(url)).toBe(false);
  });

  it("never names a path outside the two catalogue listings", () => {
    for (const rule of FACET_DISALLOW) expect(rule).toMatch(/^\/(products|hardware)\?/);
  });
});
