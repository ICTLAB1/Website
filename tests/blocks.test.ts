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
