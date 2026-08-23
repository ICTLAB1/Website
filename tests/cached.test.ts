import { describe, expect, it } from "vitest";
import { reviveDates } from "@/lib/queries/cached";

/**
 * These pin the behaviour that a cache HIT returns the same shape as a cache
 * MISS. Without it, `unstable_cache` silently downgrades every Date to a
 * string and callers break only once the cache is warm.
 */
describe("reviveDates", () => {
  it("revives an allowlisted date field", () => {
    const out = reviveDates<{ publishedAt: unknown }>({ publishedAt: "2026-03-04T05:06:07.000Z" });
    expect(out.publishedAt).toBeInstanceOf(Date);
    expect((out.publishedAt as Date).toISOString()).toBe("2026-03-04T05:06:07.000Z");
  });

  it("revives nested and arrayed records", () => {
    const out = reviveDates<{
      items: Array<{ createdAt: unknown }>;
      brand: { updatedAt: unknown };
    }>({
      items: [{ createdAt: "2026-01-01T00:00:00.000Z" }],
      brand: { updatedAt: "2026-02-02T00:00:00.000Z" },
    });
    expect(out.items[0]!.createdAt).toBeInstanceOf(Date);
    expect(out.brand.updatedAt).toBeInstanceOf(Date);
  });

  it("leaves a non-allowlisted field alone even when it looks like a date", () => {
    // A genuine string column must never be silently converted.
    const out = reviveDates({ note: "2026-03-04T05:06:07.000Z" });
    expect(typeof out.note).toBe("string");
  });

  it("leaves an allowlisted field alone when it is not an ISO timestamp", () => {
    expect(typeof reviveDates({ createdAt: "not a date" }).createdAt).toBe("string");
    expect(reviveDates({ createdAt: null }).createdAt).toBeNull();
  });

  it("passes through a value that is already a Date (cache miss path)", () => {
    const now = new Date();
    const out = reviveDates<{ createdAt: unknown }>({ createdAt: now });
    expect(out.createdAt).toBe(now);
  });

  it("preserves primitives, nulls and empty structures", () => {
    expect(reviveDates(null)).toBeNull();
    expect(reviveDates(42)).toBe(42);
    expect(reviveDates("plain")).toBe("plain");
    expect(reviveDates([])).toEqual([]);
    expect(reviveDates({})).toEqual({});
  });

  it("keeps every non-date field intact", () => {
    const input = { slug: "a", count: 3, featured: true, tags: ["x", "y"], createdAt: "2026-01-01T00:00:00.000Z" };
    const out = reviveDates<Record<string, unknown>>(input);
    expect(out.slug).toBe("a");
    expect(out.count).toBe(3);
    expect(out.featured).toBe(true);
    expect(out.tags).toEqual(["x", "y"]);
    expect(out.createdAt).toBeInstanceOf(Date);
  });
});

/**
 * The allowlist against the schema it exists to mirror.
 *
 * Read from `prisma/schema.prisma` rather than from the generated client,
 * because the schema is where somebody adds a column and the moment they do is
 * the moment this must fail. The list had already drifted by ten columns once,
 * silently, which is exactly what a hand-maintained mirror does.
 */
describe("the date allowlist", () => {
  it("covers every DateTime column in the schema", async () => {
    const { readFile } = await import("node:fs/promises");
    const { DATE_KEYS } = await import("@/lib/queries/cached");

    const schema = await readFile(
      new URL("../prisma/schema.prisma", import.meta.url),
      "utf8",
    );

    const columns = new Set<string>();
    for (const match of schema.matchAll(/^\s{2}(\w+)\s+DateTime\b/gm)) {
      columns.add(match[1]!);
    }

    expect(columns.size).toBeGreaterThan(20);

    const missing = [...columns].filter((column) => !DATE_KEYS.has(column)).sort();
    expect(missing).toEqual([]);
  });
});
