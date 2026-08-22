import { describe, expect, it } from "vitest";
import {
  DIRECTLY_PURCHASABLE_AUDIENCES,
  PUBLIC_AUDIENCES,
  audienceLabel,
  audienceNote,
  isDirectlyPurchasable,
  publicVariantWhere,
} from "@/lib/catalogue/audience";

/**
 * Who a price is for.
 *
 * These assertions look trivial and are the opposite. The imported Microsoft
 * catalogue carries the same SKU at a commercial, an academic and a non-profit
 * rate, and the academic one can be an eighth of the commercial. Publishing the
 * wrong set, or selling one nobody checked entitlement for, is a pricing error
 * that no page renders as an error — it renders as a bargain.
 */

describe("what the public may see", () => {
  it("publishes commercial and academic rates, and not non-profit ones", () => {
    expect(PUBLIC_AUDIENCES).toEqual(["COMMERCIAL", "EDUCATION"]);
    expect(PUBLIC_AUDIENCES).not.toContain("NON_PROFIT");
  });

  it("filters restricted rates out of every public variant read", () => {
    // The single fragment applied by the catalogue, the product page and
    // search. Archived rows are excluded by the same clause.
    expect(publicVariantWhere).toEqual({
      deletedAt: null,
      audience: { in: PUBLIC_AUDIENCES },
    });
  });
});

describe("what may be bought without a person in the loop", () => {
  it("is the commercial rate and nothing else", () => {
    expect(DIRECTLY_PURCHASABLE_AUDIENCES).toEqual(["COMMERCIAL"]);
    expect(isDirectlyPurchasable("COMMERCIAL")).toBe(true);
    expect(isDirectlyPurchasable("EDUCATION")).toBe(false);
    expect(isDirectlyPurchasable("NON_PROFIT")).toBe(false);
  });

  it("keeps a published rate narrower than a purchasable one", () => {
    /*
     * The invariant behind both lists. Anything buyable must also be visible,
     * or the site would sell a price it never showed. The reverse is allowed
     * and is the point: an academic rate is shown and not sold.
     */
    for (const audience of DIRECTLY_PURCHASABLE_AUDIENCES) {
      expect(PUBLIC_AUDIENCES).toContain(audience);
    }
  });
});

describe("what is said beside a restricted price", () => {
  it("states eligibility for the rates that have a condition", () => {
    expect(audienceNote("EDUCATION")).toMatch(/qualifying educational institutions/);
    expect(audienceNote("NON_PROFIT")).toMatch(/qualifying charities/);
  });

  it("says nothing beside a commercial price, because there is no condition", () => {
    // An unconditional price with a caveat next to it reads as a catch.
    expect(audienceNote("COMMERCIAL")).toBeNull();
  });

  it("labels every audience, so none can render as a raw enum", () => {
    expect(audienceLabel("COMMERCIAL")).toBe("Commercial");
    expect(audienceLabel("EDUCATION")).toBe("Education");
    expect(audienceLabel("NON_PROFIT")).toBe("Non-profit");
  });
});
