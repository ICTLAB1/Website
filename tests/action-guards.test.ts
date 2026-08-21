import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Every server action checks a role before it does anything.
 *
 * A static check, and deliberately so. The runtime suites prove that a SALES
 * session cannot reach an ADMIN screen, and that the guards themselves work —
 * what they cannot cheaply prove is that a *particular* action calls the
 * *right* guard. The realistic mistake is not a missing check, it is
 * `requireStaff` where `requireAdmin` belongs: the action still refuses
 * customers, the screen still looks correct to whoever wrote it, and the hole
 * only shows up when a sales account edits something it should not.
 *
 * Reading the source catches exactly that, at no cost.
 */

const ACTION_DIRS = [
  path.join(process.cwd(), "src", "app", "admin"),
  path.join(process.cwd(), "src", "app", "account"),
];

async function actionModules(): Promise<string[]> {
  const found: string[] = [];

  async function walk(dir: string) {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) await walk(full);
      else if (/actions?\.ts$/.test(entry.name)) found.push(full);
    }
  }

  for (const dir of ACTION_DIRS) await walk(dir);
  return found;
}

/** Bodies of the exported async functions in a module, by name. */
function exportedActions(source: string): Array<{ name: string; body: string }> {
  const actions: Array<{ name: string; body: string }> = [];
  const signature = /export async function (\w+)\s*\(/g;

  for (const match of source.matchAll(signature)) {
    const from = match.index! + match[0].length;
    // The next export, or the end of the file — enough to see the opening
    // statements, which is where a guard has to be.
    const nextExport = source.indexOf("\nexport ", from);
    actions.push({
      name: match[1]!,
      body: source.slice(from, nextExport === -1 ? source.length : nextExport),
    });
  }

  return actions;
}

const GUARDS = /require(Admin|Staff|User)\s*\(/;

/**
 * Module-local helpers that reach a guard, resolved transitively.
 *
 * The indirection is real and more than one level deep: `resource-actions.ts`
 * opens each action with `await authorise(formData)`, which calls
 * `guard(config.guard)`, which calls `requireStaff` or `requireAdmin`.
 * `quote-actions.ts` has the shallower `await guard()`. Rather than hard-code a
 * depth, this grows the set until it stops growing — a helper counts once it
 * calls a `require*` directly or calls something already in the set.
 *
 * It still cannot be fooled by a function merely *named* `guard`: membership
 * always terminates at a real `require*` call.
 */
function guardingHelpers(source: string): string[] {
  /** Every top-level function in the module, with its body. */
  const declarations = new Map<string, string>();
  const declaration = /(?:^|\n)(?:export )?(?:async function|const) (\w+)/g;

  const positions: Array<[string, number]> = [];
  for (const match of source.matchAll(declaration)) {
    positions.push([match[1]!, match.index! + match[0].length]);
  }

  for (const [index, [name, from]] of positions.entries()) {
    const to = positions[index + 1]?.[1] ?? source.length;
    declarations.set(name, source.slice(from, to));
  }

  /**
   * Seeded with whatever the module imports from a guard module.
   *
   * `resource-actions.ts` gets its `guard` from `@/lib/admin/guard` rather than
   * defining one, so a scan of local declarations alone never finds it. The
   * import is the same evidence: a symbol pulled from a module whose entire
   * purpose is authorisation is an authorisation check.
   */
  const guards = new Set<string>();
  const guardImport = /import\s*\{([^}]+)\}\s*from\s*"@\/lib\/(?:admin\/guard|auth\/guards)"/g;
  for (const match of source.matchAll(guardImport)) {
    for (const name of match[1]!.split(",")) {
      const clean = name.replace(/\btype\b/, "").trim();
      if (clean) guards.add(clean);
    }
  }

  for (let pass = 0; pass < 8; pass += 1) {
    const before = guards.size;

    for (const [name, body] of declarations) {
      if (guards.has(name)) continue;
      const reachesGuard =
        GUARDS.test(body) || [...guards].some((known) => new RegExp(`\\b${known}\\s*\\(`).test(body));
      if (reachesGuard) guards.add(name);
    }

    if (guards.size === before) break;
  }

  return [...guards];
}

describe("server action guards", () => {
  it("finds the action modules", async () => {
    const modules = await actionModules();
    expect(modules.length).toBeGreaterThan(2);
  });

  it("checks a role in every exported action", async () => {
    const ungated: string[] = [];

    for (const file of await actionModules()) {
      const source = await readFile(file, "utf8");
      const helpers = guardingHelpers(source);
      const viaHelper = helpers.length
        ? new RegExp(`await (?:${helpers.join("|")})\\s*\\(`)
        : null;

      for (const action of exportedActions(source)) {
        // A helper that takes an already-authorised actor is fine; it is the
        // entry points that must check, and those take a FormData.
        if (!action.body.includes("FormData")) continue;
        if (!GUARDS.test(action.body) && !viaHelper?.test(action.body)) {
          ungated.push(`${path.relative(process.cwd(), file)} :: ${action.name}`);
        }
      }
    }

    expect(ungated).toEqual([]);
  });

  it("gates the business identity on ADMIN, not merely on staff", async () => {
    /*
     * Named explicitly because this one is different from the content actions
     * around it. It writes the registered address, the GSTIN and the grievance
     * officer — all of which are published on the legal pages, and the last of
     * which is a statutory appointment. Sales staff edit quotations, not the
     * company's legal identity.
     */
    const source = await readFile(
      path.join(process.cwd(), "src", "app", "admin", "settings", "actions.ts"),
      "utf8",
    );

    const save = exportedActions(source).find((action) => action.name === "saveSiteSettings");
    expect(save).toBeDefined();
    expect(save!.body).toMatch(/await requireAdmin\(\)/);
    expect(save!.body).not.toMatch(/requireStaff/);
  });
});
