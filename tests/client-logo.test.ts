import { describe, expect, it } from "vitest";

import { mayShowClientLogo, safeClientLogo } from "@/lib/client-logo";

const CONFIRMED = new Date("2026-08-01T00:00:00Z");

describe("safeClientLogo", () => {
  it("accepts a file in the clients directory and an upload", () => {
    expect(safeClientLogo("/clients/acme.svg")).toBe("/clients/acme.svg");
    expect(safeClientLogo(`/uploads/${"a".repeat(32)}.png`)).toBe(`/uploads/${"a".repeat(32)}.png`);
  });

  it("refuses anything that is not a local file in its own directory", () => {
    for (const value of [
      "https://example.test/logo.png",
      "//example.test/logo.png",
      "/clients/../../etc/passwd",
      "/brands/microsoft.png",
      "/clients/logo.png?x=1",
      "javascript:alert(1)",
      "",
      null,
    ]) {
      expect(safeClientLogo(value), String(value)).toBeNull();
    }
  });
});

describe("mayShowClientLogo", () => {
  const allowed = { logoUrl: "/clients/acme.svg", permissionConfirmedAt: CONFIRMED, published: true };

  it("shows a customer with artwork, a confirmed permission and a publish", () => {
    expect(mayShowClientLogo(allowed)).toBe(true);
  });

  it("needs all three, not two", () => {
    expect(mayShowClientLogo({ ...allowed, logoUrl: null })).toBe(false);
    expect(mayShowClientLogo({ ...allowed, permissionConfirmedAt: null })).toBe(false);
    expect(mayShowClientLogo({ ...allowed, published: false })).toBe(false);
  });

  it("does not treat a published row with no permission date as permitted", () => {
    /*
     * The failure this exists for: somebody adds a customer, ticks Published
     * because the logo is sitting right there, and never fills in the date.
     * Publishing is a decision about the website; the date is the evidence, and
     * a decision without evidence is what this whole model is built to refuse.
     */
    expect(
      mayShowClientLogo({ logoUrl: "/clients/acme.svg", permissionConfirmedAt: null, published: true }),
    ).toBe(false);
  });

  it("refuses artwork that is not a client file even when everything else is set", () => {
    // A path pointing anywhere else is the same as no artwork: unusable.
    expect(mayShowClientLogo({ ...allowed, logoUrl: "https://example.test/acme.png" })).toBe(false);
    expect(mayShowClientLogo({ ...allowed, logoUrl: "/brands/acme.svg" })).toBe(false);
  });
});
