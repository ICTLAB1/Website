import { describe, expect, it } from "vitest";

import { PRICES } from "../prisma/content-migrations/2026-11-microsoft-channel-pricelist";

describe("the November 2026 Microsoft channel price list", () => {
  it("names each SKU once, with whole-rupee prices that are really changes", () => {
    const skus = PRICES.map((row) => row.sku);
    expect(new Set(skus).size).toBe(skus.length);
    for (const row of PRICES) {
      expect(Number.isInteger(row.was), row.sku).toBe(true);
      expect(Number.isInteger(row.now), row.sku).toBe(true);
      expect(row.now, row.sku).toBeGreaterThan(0);
      expect(row.now, `${row.sku} is already at the list price`).not.toBe(
        row.was,
      );
    }
  });

  it("only touches SKUs of Microsoft products", () => {
    for (const row of PRICES) expect(row.sku, row.sku).toMatch(/^MS-/);
  });
});
