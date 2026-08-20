import { describe, expect, it } from "vitest";
import {
  activeFilterChips,
  buildCatalogueHref,
  isFacetActive,
  parseCatalogueParams,
  toggleFacetHref,
} from "@/lib/catalogue-params";

describe("catalogue params", () => {
  it("defaults cleanly when nothing is supplied", () => {
    const parsed = parseCatalogueParams({});
    expect(parsed.page).toBe(1);
    expect(parsed.sort).toBe("relevance");
    expect(parsed.brand).toEqual([]);
    expect(parsed.q).toBeUndefined();
  });

  it("discards facet values that are not plain slugs", () => {
    const parsed = parseCatalogueParams({
      brand: ["microsoft", "../../etc/passwd", "<script>", "adobe"],
    });
    expect(parsed.brand).toEqual(["microsoft", "adobe"]);
  });

  it("rejects an unknown sort rather than passing it through", () => {
    expect(parseCatalogueParams({ sort: "; DROP TABLE" }).sort).toBe("relevance");
    expect(parseCatalogueParams({ sort: "price-asc" }).sort).toBe("price-asc");
  });

  it("clamps the page number to a sane range", () => {
    expect(parseCatalogueParams({ page: "-4" }).page).toBe(1);
    expect(parseCatalogueParams({ page: "abc" }).page).toBe(1);
    expect(parseCatalogueParams({ page: "99999" }).page).toBe(500);
    expect(parseCatalogueParams({ page: "3" }).page).toBe(3);
  });

  it("converts rupee price bounds to paise and ignores nonsense", () => {
    expect(parseCatalogueParams({ min: "5000" }).minPriceMinor).toBe(500_000);
    expect(parseCatalogueParams({ min: "-1" }).minPriceMinor).toBeUndefined();
    expect(parseCatalogueParams({ max: "not-a-number" }).maxPriceMinor).toBeUndefined();
  });

  it("truncates an over-long search term", () => {
    const parsed = parseCatalogueParams({ q: "x".repeat(500) });
    expect(parsed.q).toHaveLength(100);
  });

  it("resets to page one whenever a filter changes", () => {
    const href = buildCatalogueHref({ page: "5", brand: "adobe" }, { sort: "newest" });
    expect(href).not.toContain("page=");
    expect(href).toContain("sort=newest");
    expect(href).toContain("brand=adobe");
  });

  it("keeps an explicit page when paginating", () => {
    expect(buildCatalogueHref({ brand: "adobe" }, { page: 3 })).toContain("page=3");
    // Page one is the canonical URL and carries no parameter.
    expect(buildCatalogueHref({ brand: "adobe" }, { page: 1 })).not.toContain("page=");
  });

  it("toggles a facet on and back off", () => {
    const on = toggleFacetHref({}, "brand", "adobe");
    expect(on).toBe("/products?brand=adobe");
    const off = toggleFacetHref({ brand: "adobe" }, "brand", "adobe");
    expect(off).toBe("/products");
  });

  it("adds a second value to a facet rather than replacing the first", () => {
    const href = toggleFacetHref({ brand: "adobe" }, "brand", "microsoft");
    expect(href).toContain("brand=adobe");
    expect(href).toContain("brand=microsoft");
  });

  it("reports which facets are active", () => {
    expect(isFacetActive({ brand: "adobe,microsoft" }, "brand", "microsoft")).toBe(true);
    expect(isFacetActive({ brand: "adobe" }, "brand", "microsoft")).toBe(false);
  });

  it("produces a removal link for every active filter", () => {
    const chips = activeFilterChips(
      { brand: "adobe", category: "design-creative", min: "5000", max: "25000" },
      {
        brands: new Map([["adobe", "Adobe"]]),
        categories: new Map([["design-creative", "Design & Creative"]]),
      },
    );
    expect(chips.map((chip) => chip.label)).toEqual([
      "Adobe",
      "Design & Creative",
      "Price ₹5000 – ₹25000",
    ]);
    for (const chip of chips) expect(chip.removeHref.startsWith("/products")).toBe(true);
  });
});
