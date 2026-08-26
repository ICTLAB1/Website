import { describe, expect, it } from "vitest";
import {
  BLOCK_SCHEMAS,
  BLOCK_SEEDS,
  BLOCK_TYPES,
  BLOCK_LABELS,
  isBlockType,
  parseBlock,
  safeHref,
} from "@/lib/blocks/schemas";

describe("safeHref", () => {
  it("accepts internal paths, fragments and safe URL schemes", () => {
    for (const value of ["/products", "/products?brand=microsoft", "#faq", "https://example.test", "mailto:a@b.test", "tel:+919999999999"]) {
      expect(safeHref.safeParse(value).success).toBe(true);
    }
  });

  it("rejects script-bearing and data URLs", () => {
    // A navigation href is authored in an admin panel; it must never be able to
    // become an execution vector for anyone who can edit content.
    for (const value of [
      "javascript:alert(1)",
      "JavaScript:alert(1)",
      "  javascript:alert(1)",
      "data:text/html;base64,PHNjcmlwdD4=",
      "vbscript:msgbox(1)",
      "http://insecure.test",
    ]) {
      expect(safeHref.safeParse(value).success).toBe(false);
    }
  });

  it("rejects protocol-relative hrefs, which look internal but are not", () => {
    // `//evil.test` starts with a slash and passes any "must start with /"
    // check, but the browser reads it as "same scheme, different host". A
    // backslash is normalised to a slash in the same position. Either would
    // let someone who can author a menu link point "Products" off-site.
    for (const value of ["//evil.test", "//evil.test/login", "/\\evil.test", "/\\/evil.test"]) {
      expect(safeHref.safeParse(value).success, value).toBe(false);
    }
    expect(safeHref.safeParse("/products").success).toBe(true);
    expect(safeHref.safeParse("/blog/a/b").success).toBe(true);
  });

  it("rejects an empty or overlong href", () => {
    expect(safeHref.safeParse("").success).toBe(false);
    expect(safeHref.safeParse(`/${"a".repeat(600)}`).success).toBe(false);
  });
});

describe("block registry", () => {
  it("declares a schema and a label for every type", () => {
    for (const type of BLOCK_TYPES) {
      expect(BLOCK_SCHEMAS[type]).toBeTruthy();
      expect(BLOCK_LABELS[type]).toBeTruthy();
    }
  });

  it("recognises only declared types", () => {
    expect(isBlockType("HERO")).toBe(true);
    expect(isBlockType("NOT_A_BLOCK")).toBe(false);
    expect(isBlockType("constructor")).toBe(false);
    expect(isBlockType("__proto__")).toBe(false);
    expect(isBlockType(null)).toBe(false);
  });
});

describe("parseBlock", () => {
  it("parses a valid block", () => {
    const block = parseBlock({
      id: "a",
      type: "RICH_TEXT",
      data: { markdown: "Some copy." },
    });
    expect(block?.type).toBe("RICH_TEXT");
  });

  it("applies schema defaults", () => {
    const block = parseBlock({ id: "a", type: "CARDS", data: { items: [{ title: "T", body: "B" }] } });
    expect(block?.type === "CARDS" && block.data.numbered).toBe(false);
    expect(block?.type === "CARDS" && block.data.columns).toBe(2);
  });

  it("returns null for an unknown type rather than throwing", () => {
    expect(parseBlock({ id: "a", type: "LEGACY_BLOCK", data: {} })).toBeNull();
  });

  it("returns null for a payload that does not match its type", () => {
    // This is the case that matters: a row written by an older version must
    // cost one section, not the whole page.
    expect(parseBlock({ id: "a", type: "RICH_TEXT", data: { body: ["old", "shape"] } })).toBeNull();
    expect(parseBlock({ id: "a", type: "BULLETS", data: { items: [] } })).toBeNull();
    expect(parseBlock({ id: "a", type: "HERO", data: null })).toBeNull();
    expect(parseBlock({ id: "a", type: "CARDS", data: { items: "not an array" } })).toBeNull();
  });

  it("rejects a link list carrying a javascript: href", () => {
    expect(
      parseBlock({
        id: "a",
        type: "LINK_LIST",
        data: { items: [{ label: "Click", href: "javascript:alert(1)" }] },
      }),
    ).toBeNull();
  });

  it("enforces item limits so one block cannot render an unbounded list", () => {
    const tooMany = Array.from({ length: 500 }, (_, i) => `item ${i}`);
    expect(parseBlock({ id: "a", type: "CHIP_LIST", data: { items: tooMany } })).toBeNull();
  });

  it("trims whitespace rather than storing it", () => {
    const block = parseBlock({ id: "a", type: "RICH_TEXT", data: { heading: "  Spaced  ", markdown: "x" } });
    expect(block?.type === "RICH_TEXT" && block.data.heading).toBe("Spaced");
  });
});

describe("statBar", () => {
  it("defaults an unspecified source to a literal value", () => {
    const block = parseBlock({ id: "a", type: "STAT_BAR", data: { items: [{ label: "Vendors", value: "8" }] } });
    expect(block?.type === "STAT_BAR" && block.data.items[0]!.source).toBe("literal");
  });

  it("accepts the database-backed sources", () => {
    for (const source of ["productCount", "skuCount", "brandCount", "categoryCount"]) {
      const block = parseBlock({ id: "a", type: "STAT_BAR", data: { items: [{ label: "L", source }] } });
      expect(block).not.toBeNull();
    }
  });

  it("rejects an unknown source", () => {
    expect(parseBlock({ id: "a", type: "STAT_BAR", data: { items: [{ label: "L", source: "revenue" }] } })).toBeNull();
  });
});

describe("price comparison", () => {
  const valid = {
    heading: "Workplace against the mainstream alternative",
    ourSlug: "zoho-workplace",
    againstSlugs: ["microsoft-365-business-standard"],
    note: "Per seat, annual commitment, exclusive of GST.",
  };

  it("accepts a subject and the thing it is compared against", () => {
    expect(BLOCK_SCHEMAS.PRICE_COMPARISON.safeParse(valid).success).toBe(true);
  });

  it("will not render a comparison with nothing to compare against", () => {
    /*
     * One column is not a comparison, and a block that accepted an empty list
     * would put a lone priced card on a page under a heading promising two.
     */
    expect(BLOCK_SCHEMAS.PRICE_COMPARISON.safeParse({ ...valid, againstSlugs: [] }).success).toBe(
      false,
    );
  });

  it("requires a subject", () => {
    for (const ourSlug of ["", "   ", undefined]) {
      expect(BLOCK_SCHEMAS.PRICE_COMPARISON.safeParse({ ...valid, ourSlug }).success).toBe(false);
    }
  });

  it("caps the alternatives at three, which is what fits a row", () => {
    const four = ["a", "b", "c", "d"];
    expect(BLOCK_SCHEMAS.PRICE_COMPARISON.safeParse({ ...valid, againstSlugs: four }).success).toBe(
      false,
    );
    expect(
      BLOCK_SCHEMAS.PRICE_COMPARISON.safeParse({ ...valid, againstSlugs: four.slice(0, 3) }).success,
    ).toBe(true);
  });

  it("takes no price of its own", () => {
    /*
     * The figures are read from the catalogue at render time. A price field
     * here would be a number typed into content, wrong the day a price list is
     * imported — and this site imports several thousand rows at a time.
     */
    const parsed = BLOCK_SCHEMAS.PRICE_COMPARISON.parse({
      ...valid,
      price: "₹2,400",
      ourPrice: 240000,
    });
    expect(parsed).not.toHaveProperty("price");
    expect(parsed).not.toHaveProperty("ourPrice");
  });

  it("is seeded with slugs that name no real product", () => {
    /*
     * Adding this block anywhere must not publish a comparison nobody wrote.
     * The seed has to satisfy the schema — every slug is a non-empty string —
     * so it uses placeholders that match nothing and render as "Nothing to
     * compare" until an author fills them in.
     */
    const seed = BLOCK_SEEDS.PRICE_COMPARISON;
    for (const slug of [seed.ourSlug, ...seed.againstSlugs]) {
      expect(slug.length).toBeGreaterThan(0);
      expect(slug).toMatch(/-slug$/);
    }
  });
});

describe("block seeds", () => {
  it("every block type has a seed that satisfies its own schema", () => {
    // A seed that fails validation makes that block type impossible to add,
    // and the failure is invisible until an administrator tries.
    for (const type of BLOCK_TYPES) {
      const parsed = BLOCK_SCHEMAS[type].safeParse(BLOCK_SEEDS[type]);
      expect(parsed.success, `${type}: ${parsed.success ? "" : JSON.stringify(parsed.error.issues)}`).toBe(true);
    }
  });

  it("declares a seed for every type, with no extras", () => {
    expect(Object.keys(BLOCK_SEEDS).sort()).toEqual([...BLOCK_TYPES].sort());
  });
});
