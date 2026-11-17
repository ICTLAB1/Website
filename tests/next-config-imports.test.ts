import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * `next.config.ts` may import nothing from this repository.
 *
 * The production image copies `next.config.ts` and not `src/`, and `next start`
 * loads the config at runtime. A relative import of anything under `src/` (or a
 * `@/` alias, which does not resolve there at all) therefore type-checks, lints,
 * unit-tests and builds, and then fails with "Cannot find module" the moment
 * the container starts — a site that never answers. That is exactly what
 * happened to the redirect table on its first attempt; only the container check
 * in CI noticed. This makes the same mistake fail in seconds, locally.
 */
describe("next.config.ts", () => {
  it("imports no application code", () => {
    const source = readFileSync("next.config.ts", "utf8");
    const local = [...source.matchAll(/^\s*import[^;]*?from\s+["']([^"']+)["']/gm)]
      .map((match) => match[1] as string)
      .filter((specifier) => specifier.startsWith(".") || specifier.startsWith("@/"));
    expect(local, "the runtime image has no src/ — inline it in next.config.ts").toEqual([]);
  });
});
