import { describe, expect, it } from "vitest";
import { RESOURCES, RESOURCE_KEYS, resolveResource } from "@/lib/admin/resources";
import { schemaFor, toPrismaData, toLines, fromLines } from "@/lib/admin/fields";

/**
 * `__resource` arrives in the request body, so these pin the behaviour that
 * makes the generic action safe: unknown keys resolve to nothing, and the
 * privilege required comes from the resolved config rather than the request.
 */
describe("resolveResource", () => {
  it("resolves every declared key", () => {
    for (const key of RESOURCE_KEYS) {
      expect(resolveResource(key)?.key).toBe(key);
    }
  });

  it("rejects an unknown key", () => {
    expect(resolveResource("products")).toBeNull();
    expect(resolveResource("users")).toBeNull();
    expect(resolveResource("")).toBeNull();
  });

  it("rejects a non-string key", () => {
    for (const value of [null, undefined, 42, {}, [], true]) {
      expect(resolveResource(value)).toBeNull();
    }
  });

  it("cannot be tricked by prototype keys", () => {
    // A plain `RESOURCES[key]` lookup would return Object.prototype members.
    for (const value of ["constructor", "__proto__", "toString", "hasOwnProperty"]) {
      expect(resolveResource(value)).toBeNull();
    }
  });

  it("requires ADMIN for every content resource", () => {
    // The decision was that content changes, which alter what every visitor
    // sees, are not available to SALES.
    for (const config of Object.values(RESOURCES)) {
      expect(config.guard).toBe("admin");
    }
  });

  it("declares a Prisma model and at least one field for every resource", () => {
    for (const config of Object.values(RESOURCES)) {
      expect(config.model).toBeTruthy();
      expect(config.fields.length).toBeGreaterThan(0);
      expect(config.listColumns.some((column) => column.primary)).toBe(true);
    }
  });
});

describe("schemaFor", () => {
  const fields = RESOURCES.banners.fields;

  it("accepts a valid submission", () => {
    const parsed = schemaFor(fields).safeParse({
      name: "Spring promotion",
      message: "Renewals close on the 30th.",
      tone: "PROMO",
      displayOrder: "10",
      active: "on",
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects a whitespace-only required field", () => {
    const parsed = schemaFor(fields).safeParse({ name: "   ", message: "   ", tone: "INFO" });
    expect(parsed.success).toBe(false);
  });

  it("rejects a value outside the declared select options", () => {
    const parsed = schemaFor(fields).safeParse({ name: "A", message: "B", tone: "SHOUTY" });
    expect(parsed.success).toBe(false);
  });

  it("treats an absent checkbox as false rather than undefined", () => {
    const parsed = schemaFor(fields).parse({ name: "A", message: "B", tone: "INFO" });
    expect(parsed.active).toBe(false);
  });

  it("does not turn an empty number into NaN", () => {
    const parsed = schemaFor(fields).parse({ name: "A", message: "B", tone: "INFO", displayOrder: "" });
    expect(Number.isNaN(parsed.displayOrder)).toBe(false);
  });

  it("rejects a malformed date", () => {
    const parsed = schemaFor(fields).safeParse({ name: "A", message: "B", tone: "INFO", startsAt: "30-02-2026" });
    expect(parsed.success).toBe(false);
  });
});

describe("toPrismaData", () => {
  it("copies only declared fields, dropping anything else in the submission", () => {
    const data = toPrismaData(RESOURCES.banners.fields, {
      name: "A",
      message: "B",
      tone: "INFO",
      // None of these are declared, so none may reach the database.
      id: "forged",
      createdAt: "1999-01-01",
      role: "ADMIN",
      deletedAt: null,
    });

    for (const key of ["id", "createdAt", "role", "deletedAt"]) {
      expect(data).not.toHaveProperty(key);
    }
    expect(data.name).toBe("A");
  });

  it("stores a blank optional field as null rather than an empty string", () => {
    const data = toPrismaData(RESOURCES.banners.fields, { name: "A", message: "B", tone: "INFO", href: "" });
    expect(data.href).toBeNull();
  });

  it("converts a date field to a Date and a blank one to null", () => {
    const data = toPrismaData(RESOURCES.banners.fields, {
      name: "A", message: "B", tone: "INFO", startsAt: "2026-05-06", endsAt: "",
    });
    expect(data.startsAt).toBeInstanceOf(Date);
    expect(data.endsAt).toBeNull();
  });

  it("splits a lines field into a trimmed array", () => {
    const data = toPrismaData(RESOURCES.services.fields, { benefits: " one \n\n two \n" });
    expect(data.benefits).toEqual(["one", "two"]);
  });
});

describe("lines round-trip", () => {
  it("survives a round trip", () => {
    expect(toLines(fromLines(["a", "b"]))).toEqual(["a", "b"]);
  });

  it("drops blanks and caps the item count", () => {
    expect(toLines("a\n\n  \nb")).toEqual(["a", "b"]);
    expect(toLines(Array.from({ length: 100 }, (_, i) => `x${i}`).join("\n"), 5)).toHaveLength(5);
  });

  it("handles empty input", () => {
    expect(toLines("")).toEqual([]);
    expect(toLines(undefined)).toEqual([]);
    expect(fromLines(null)).toBe("");
  });
});
