import { describe, expect, it } from "vitest";

import { mayShowClientLogo, safeClientLogo } from "@/lib/client-logo";

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
  const allowed = { logoUrl: "/clients/acme.svg", published: true };

  it("shows a customer with artwork and a publish", () => {
    expect(mayShowClientLogo(allowed)).toBe(true);
  });

  it("needs both, not one", () => {
    expect(mayShowClientLogo({ ...allowed, logoUrl: null })).toBe(false);
    expect(mayShowClientLogo({ ...allowed, published: false })).toBe(false);
  });

  it("does not require a recorded permission date", () => {
    /*
     * The date used to be a third condition and is now a record instead — the
     * owner's decision, taken deliberately. This test exists so that the change
     * is a stated property rather than an absence somebody re-adds by accident
     * while tidying, and so the reverse is caught too: nothing anywhere fakes a
     * date to get a mark published.
     */
    expect(mayShowClientLogo({ logoUrl: "/clients/acme.svg", published: true })).toBe(true);
  });

  it("keeps `published` off as the thing that has to be chosen", () => {
    // A row created with artwork but never published stays off the site, which
    // is what stops a half-finished record appearing.
    expect(mayShowClientLogo({ logoUrl: "/clients/acme.svg", published: false })).toBe(false);
  });

  it("refuses artwork that is not a client file even when published", () => {
    // A path pointing anywhere else is the same as no artwork: unusable.
    expect(mayShowClientLogo({ ...allowed, logoUrl: "https://example.test/acme.png" })).toBe(false);
    expect(mayShowClientLogo({ ...allowed, logoUrl: "/brands/acme.svg" })).toBe(false);
  });
});
