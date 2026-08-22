import { existsSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { safeMarkImage } from "@/lib/mark-image";
import { splitPanelSchema } from "@/lib/blocks/schemas";
import { pageSeeds } from "../prisma/seed-data/pages";

/**
 * A programme mark is a claim, and its path reaches an `src` attribute from a
 * block payload an administrator can edit. So there are two things to hold: the
 * path can only name a file this site serves, and the file the site's own
 * content asks for has to actually exist.
 */

describe("what is accepted", () => {
  it("takes a file in the marks directory", () => {
    expect(safeMarkImage("/marks/gem.webp")).toBe("/marks/gem.webp");
    expect(safeMarkImage("  /marks/gem.webp  ")).toBe("/marks/gem.webp");
  });

  it("treats nothing at all as nothing, not as an error", () => {
    expect(safeMarkImage(null)).toBeNull();
    expect(safeMarkImage(undefined)).toBeNull();
    expect(safeMarkImage("")).toBeNull();
  });
});

describe("what is refused", () => {
  it("refuses another directory, including the brands one", () => {
    // The separation is the point: a brand logo is about a manufacturer, a
    // mark is about this company. Neither may borrow the other's meaning.
    expect(safeMarkImage("/brands/microsoft.svg")).toBeNull();
    expect(safeMarkImage("/products/laptop.webp")).toBeNull();
    expect(safeMarkImage("/logo.svg")).toBeNull();
  });

  it("refuses a scheme, a protocol-relative host and a traversal", () => {
    expect(safeMarkImage("https://evil.test/gem.webp")).toBeNull();
    expect(safeMarkImage("javascript:alert(1)")).toBeNull();
    expect(safeMarkImage("//evil.test/gem.webp")).toBeNull();
    expect(safeMarkImage("/marks/../../etc/passwd")).toBeNull();
    expect(safeMarkImage("/marks/gem.webp?x=1")).toBeNull();
  });

  it("refuses an extension the site does not serve as an image", () => {
    expect(safeMarkImage("/marks/gem.html")).toBeNull();
    expect(safeMarkImage("/marks/gem")).toBeNull();
  });
});

describe("the split panel's logo field", () => {
  it("accepts a mark and requires alternative text with it", () => {
    const parsed = splitPanelSchema.parse({
      heading: "Registered GeM seller",
      logo: { src: "/marks/gem.webp", alt: "Government e Marketplace (GeM)" },
    });
    expect(parsed.logo?.src).toBe("/marks/gem.webp");

    expect(() =>
      splitPanelSchema.parse({ heading: "Panel", logo: { src: "/marks/gem.webp" } }),
    ).toThrow();
  });

  it("refuses a logo pointing anywhere else", () => {
    expect(() =>
      splitPanelSchema.parse({
        heading: "Panel",
        logo: { src: "https://evil.test/gem.webp", alt: "GeM" },
      }),
    ).toThrow();
  });

  it("stays optional, so every existing panel still parses", () => {
    expect(splitPanelSchema.parse({ heading: "Panel" }).logo).toBeUndefined();
  });
});

describe("the artwork the seeded content asks for", () => {
  it("exists in public/", () => {
    const wanted = new Set<string>();

    for (const page of pageSeeds) {
      for (const section of page.sections) {
        const logo = (section.data as { logo?: { src?: string } } | null)?.logo;
        if (logo?.src) wanted.add(logo.src);
      }
    }

    // The homepage GeM panel is the reason this test exists; if it stops
    // referencing a mark, the assertion below should be reconsidered rather
    // than silently passing over an empty set.
    expect(wanted.size).toBeGreaterThan(0);

    for (const src of wanted) {
      expect(safeMarkImage(src), `${src} is not a servable mark`).toBe(src);
      expect(existsSync(join(process.cwd(), "public", src)), `${src} is missing`).toBe(true);
    }
  });
});
