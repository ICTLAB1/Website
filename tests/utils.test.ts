import { describe, expect, it } from "vitest";
import { cn, humanise, safeRedirectPath, slugify, truncate } from "@/lib/utils";

describe("safeRedirectPath", () => {
  it("allows same-site relative paths", () => {
    expect(safeRedirectPath("/account/orders")).toBe("/account/orders");
  });

  it("blocks absolute URLs, protocol-relative URLs and backslash tricks", () => {
    expect(safeRedirectPath("https://evil.example/steal")).toBe("/account");
    expect(safeRedirectPath("//evil.example")).toBe("/account");
    expect(safeRedirectPath("/\\evil.example")).toBe("/account");
    expect(safeRedirectPath("javascript:alert(1)")).toBe("/account");
  });

  it("falls back when the value is missing", () => {
    expect(safeRedirectPath(null)).toBe("/account");
    expect(safeRedirectPath(undefined, "/admin")).toBe("/admin");
    expect(safeRedirectPath("")).toBe("/account");
  });
});

describe("slugify", () => {
  it("produces clean URL segments", () => {
    expect(slugify("Microsoft 365 Business Standard")).toBe("microsoft-365-business-standard");
    expect(slugify("  Adobe   Acrobat  Pro  ")).toBe("adobe-acrobat-pro");
    expect(slugify("CorelDRAW® Graphics Suite")).toBe("coreldraw-graphics-suite");
  });

  it("strips characters that would break a path", () => {
    expect(slugify("../../etc/passwd")).toBe("etcpasswd");
    expect(slugify("<script>alert(1)</script>")).toBe("scriptalert1script");
  });

  it("caps the length", () => {
    expect(slugify("a".repeat(200)).length).toBeLessThanOrEqual(80);
  });
});

describe("humanise", () => {
  it("turns enum values into readable labels", () => {
    expect(humanise("SUBSCRIPTION_ANNUAL")).toBe("Subscription Annual");
    expect(humanise("NEW")).toBe("New");
    expect(humanise("WAITING_ON_CUSTOMER")).toBe("Waiting On Customer");
  });
});

describe("truncate", () => {
  it("only shortens strings that exceed the limit", () => {
    expect(truncate("short", 20)).toBe("short");
    expect(truncate("a".repeat(30), 10)).toHaveLength(10);
    expect(truncate("a".repeat(30), 10).endsWith("…")).toBe(true);
  });
});

describe("cn", () => {
  it("drops falsy class names", () => {
    expect(cn("a", false, null, undefined, "b")).toBe("a b");
  });
});
