import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { brands } from "../prisma/seed-data/brands";
import { safeBrandLogo } from "@/lib/brand-logo";

/**
 * An administrator types this value and it lands in an `src` attribute.
 *
 * That makes it the same class of input as a link target, and the failure mode
 * is the same: a scheme nobody expected, or a request to somebody else's server
 * made by every visitor who loads the page. The rule is an allowlist over the
 * whole shape — one directory, one filename, one known extension — so the tests
 * below are mostly about what it refuses.
 */

describe("what is accepted", () => {
  it("takes a plain file in the brands directory", () => {
    expect(safeBrandLogo("/brands/microsoft.svg")).toBe("/brands/microsoft.svg");
    expect(safeBrandLogo("/brands/adobe.png")).toBe("/brands/adobe.png");
    expect(safeBrandLogo("/brands/dell-technologies.webp")).toBe("/brands/dell-technologies.webp");
  });

  it("trims surrounding whitespace, which a paste usually carries", () => {
    expect(safeBrandLogo("  /brands/zoho.svg  ")).toBe("/brands/zoho.svg");
  });

  it("treats nothing at all as nothing, not as an error", () => {
    // A brand with no artwork on file is the normal case, not a failure.
    expect(safeBrandLogo(null)).toBeNull();
    expect(safeBrandLogo(undefined)).toBeNull();
    expect(safeBrandLogo("")).toBeNull();
    expect(safeBrandLogo("   ")).toBeNull();
  });
});

describe("what is refused", () => {
  it("refuses any scheme", () => {
    expect(safeBrandLogo("javascript:alert(1)")).toBeNull();
    expect(safeBrandLogo("data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=")).toBeNull();
    expect(safeBrandLogo("https://example.test/logo.svg")).toBeNull();
    expect(safeBrandLogo("http://example.test/brands/logo.svg")).toBeNull();
  });

  it("refuses a protocol-relative address", () => {
    // The one that looks like a path and is not: //evil.test/x.svg loads from
    // evil.test over whatever scheme the page is using.
    expect(safeBrandLogo("//example.test/logo.svg")).toBeNull();
    expect(safeBrandLogo("/brands//example.test/logo.svg")).toBeNull();
  });

  it("refuses anything outside the brands directory", () => {
    expect(safeBrandLogo("/logo.svg")).toBeNull();
    expect(safeBrandLogo("/uploads/logo.svg")).toBeNull();
    expect(safeBrandLogo("brands/logo.svg")).toBeNull();
    expect(safeBrandLogo("/brands/nested/logo.svg")).toBeNull();
  });

  it("refuses traversal, in either slash", () => {
    expect(safeBrandLogo("/brands/../../etc/passwd")).toBeNull();
    expect(safeBrandLogo("/brands/..%2Flogo.svg")).toBeNull();
    expect(safeBrandLogo("/brands/..\\logo.svg")).toBeNull();
  });

  it("refuses a query or a fragment", () => {
    // Both are ways to make a "local" path reach elsewhere or carry a payload.
    expect(safeBrandLogo("/brands/logo.svg?x=1")).toBeNull();
    expect(safeBrandLogo("/brands/logo.svg#x")).toBeNull();
  });

  it("refuses a file type that is not an image", () => {
    expect(safeBrandLogo("/brands/logo.html")).toBeNull();
    expect(safeBrandLogo("/brands/logo")).toBeNull();
    expect(safeBrandLogo("/brands/logo.js")).toBeNull();
  });

  it("refuses an absurdly long value rather than rendering it", () => {
    expect(safeBrandLogo(`/brands/${"a".repeat(400)}.svg`)).toBeNull();
  });
});

/**
 * The seed and the files on disk, checked against each other.
 *
 * A brand pointing at a file that is not there renders a broken image on the
 * public site — the one failure mode that looks worse than the wordmark this
 * feature was built to replace. Nothing at runtime catches it: `safeBrandLogo`
 * asks whether a path is *permissible*, not whether it *resolves*.
 */
describe("the brand logos this repository ships", () => {
  const seeded = brands.filter(
    (brand): brand is typeof brand & { logoUrl: string } => Boolean(brand.logoUrl),
  );

  it("is a set of brands large enough to be worth having", () => {
    expect(seeded.length).toBeGreaterThan(20);
  });

  it("points every brand at a file that exists", () => {
    const missing = seeded
      .filter((brand) => !existsSync(join(process.cwd(), "public", brand.logoUrl)))
      .map((brand) => `${brand.slug} → ${brand.logoUrl}`);

    expect(missing).toEqual([]);
  });

  it("points every brand at a path the renderer will accept", () => {
    // Belt and braces: the seed is written by hand, and a value the renderer
    // refuses would fall back to the wordmark silently.
    const refused = seeded
      .filter((brand) => safeBrandLogo(brand.logoUrl) === null)
      .map((brand) => brand.slug);

    expect(refused).toEqual([]);
  });

  it("ships no file that no brand points at", () => {
    const claimed = new Set(seeded.map((brand) => brand.logoUrl.replace("/brands/", "")));
    const orphans = readdirSync(join(process.cwd(), "public", "brands"))
      .filter((name) => name.endsWith(".svg"))
      .filter((name) => !claimed.has(name));

    expect(orphans).toEqual([]);
  });
});
