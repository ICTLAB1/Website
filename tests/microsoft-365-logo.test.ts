import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("the Microsoft 365 logo file", () => {
  it("is in the product artwork folder, transparent, and wide enough to stay sharp", async () => {
    const file = join(process.cwd(), "public/products/microsoft-365.png");
    expect(existsSync(file)).toBe(true);
    const sharp = (await import("sharp")).default;
    const meta = await sharp(file).metadata();
    expect(meta.hasAlpha).toBe(true);
    expect(meta.width ?? 0).toBeGreaterThanOrEqual(600);
    // The mark above the wordmark: a landscape lockup, not a square icon.
    expect((meta.width ?? 0) / (meta.height ?? 1)).toBeGreaterThan(1.4);
  });
});
