import { describe, expect, it } from "vitest";
import {
  BLOCK_FORMS,
  hasForm,
  pruneEmpty,
  readPath,
  writePath,
} from "@/lib/blocks/form-shapes";
import { BLOCK_SCHEMAS, BLOCK_SEEDS, type BlockType } from "@/lib/blocks/schemas";

describe("path helpers", () => {
  it("reads a nested path", () => {
    expect(readPath({ a: { b: "x" } }, "a.b")).toBe("x");
    expect(readPath({ a: "x" }, "a")).toBe("x");
  });

  it("returns undefined rather than throwing on a missing path", () => {
    expect(readPath({}, "a.b.c")).toBeUndefined();
    expect(readPath(null, "a")).toBeUndefined();
    expect(readPath("scalar", "a.b")).toBeUndefined();
  });

  it("writes a nested path, creating intermediates", () => {
    const target: Record<string, unknown> = {};
    writePath(target, "primaryCta.label", "Go");
    expect(target).toEqual({ primaryCta: { label: "Go" } });
  });

  it("deletes a key when the value is empty", () => {
    // Storing "" would leave a nested object that fails its schema, which
    // requires a label whenever the object is present at all.
    const target: Record<string, unknown> = { primaryCta: { label: "Go", href: "/" } };
    writePath(target, "primaryCta.label", "");
    expect(target.primaryCta).toEqual({ href: "/" });
  });

  it("treats an empty array as empty", () => {
    const target: Record<string, unknown> = { items: ["a"] };
    writePath(target, "items", []);
    expect(target.items).toBeUndefined();
  });

  it("prunes objects left empty", () => {
    expect(pruneEmpty({ a: {}, b: { c: "x" }, d: { e: {} } })).toEqual({ b: { c: "x" } });
  });

  it("leaves arrays alone when pruning", () => {
    expect(pruneEmpty({ items: [] })).toEqual({ items: [] });
  });
});

describe("form shapes", () => {
  const typed = Object.keys(BLOCK_FORMS) as BlockType[];

  it("covers the block types that carry the content", () => {
    expect(typed.sort()).toEqual(
      ["BULLETS", "CARDS", "CHIP_LIST", "CTA_BANNER", "FAQ", "HERO", "LINK_LIST", "NOTICE", "PRODUCT_GRID", "RICH_TEXT"].sort(),
    );
  });

  it("reports which types have a form", () => {
    expect(hasForm("HERO")).toBe(true);
    expect(hasForm("PLANS")).toBe(false);
    expect(hasForm("__proto__")).toBe(false);
  });

  it("every field path names a key the schema actually declares", () => {
    // Guards against a form field naming a path the schema does not have,
    // which would silently never save. Asserted by introspecting the schema's
    // own shape rather than by probing with values, so a required field is not
    // mistaken for a missing one.
    for (const type of typed) {
      const shape = (BLOCK_SCHEMAS[type] as unknown as { shape: Record<string, unknown> }).shape;
      for (const field of BLOCK_FORMS[type]!.fields) {
        const root = field.path.split(".")[0]!;
        expect(Object.hasOwn(shape, root), `${type}.${field.path} -> no "${root}" in schema`).toBe(true);
      }
    }
  });

  it("every schema key is reachable from some form field", () => {
    // The converse of the check above, and the one that matters more.
    // `saveBlockForm` rebuilds the payload from the form's declared fields
    // alone, so a schema key no form field names is silently dropped the next
    // time an administrator saves that block through the form — the edit
    // succeeds and the content disappears. Adding a field to a schema without
    // adding it to the form must fail here rather than in production.
    for (const type of typed) {
      const shape = (BLOCK_SCHEMAS[type] as unknown as { shape: Record<string, unknown> }).shape;
      const covered = new Set(BLOCK_FORMS[type]!.fields.map((field) => field.path.split(".")[0]!));
      for (const key of Object.keys(shape)) {
        expect(covered.has(key), `${type}.${key} has no form field, so a form save would drop it`).toBe(
          true,
        );
      }
    }
  });

  it("select options are all valid for their schema", () => {
    const cases: Array<[BlockType, string, string[]]> = [
      ["HERO", "tone", ["dark", "light"]],
      ["CTA_BANNER", "tone", ["dark", "light", "accent"]],
      ["LINK_LIST", "layout", ["cards", "chips", "inline"]],
      ["PRODUCT_GRID", "source", ["manual", "featured", "popular", "brand", "category"]],
      ["FAQ", "source", ["page", "brand", "topic", "manual"]],
    ];

    for (const [type, path, options] of cases) {
      for (const option of options) {
        const payload = { ...(BLOCK_SEEDS[type] as Record<string, unknown>), [path]: option };
        expect(BLOCK_SCHEMAS[type].safeParse(payload).success, `${type}.${path}=${option}`).toBe(true);
      }
    }
  });
});
