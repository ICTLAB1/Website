import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * What a visitor must never be shown.
 *
 * Three public surfaces once carried warning panels built from
 * `getUnconfiguredIdentityKeys`: the footer, the contact page and the
 * `COMPANY_INFO` block. Between them they told anyone who scrolled that the
 * site was half-configured, and then printed the environment variable names to
 * set — `COMPANY_EMAIL_SUPPORT`, `COMPANY_GRIEVANCE_OFFICER_NAME` and the rest.
 *
 * Removing the three panels fixes today. These tests are what stops the fourth
 * one being written, because the failure mode is not obvious: the panel only
 * appears on a deployment where the value is unset, which is never the
 * developer's machine.
 */

const SRC = path.join(process.cwd(), "src");

/**
 * `src/lib/env.ts` is the one module whose job is to name settings, so it is
 * exempt from the scan below — and it is also where the scan gets its list.
 */
const ENV_MODULE = path.join(SRC, "lib", "env.ts");

/**
 * The environment variables this application actually reads, harvested from
 * every call site rather than hard-coded here. A variable added next year is
 * covered the moment it is read, with nobody having to remember this file.
 *
 * Harvesting from `env.ts` alone is not enough: it defines the SMTP and auth
 * settings, but the `COMPANY_*` identity — the ones that leaked — are read
 * through `optionalEnv` in `site-config.ts`.
 */
async function environmentVariableNames(): Promise<string[]> {
  const names = new Set<string>();
  const call = /\b(?:optional|required|optionalEnv|requiredEnv)\(\s*"([A-Z][A-Z0-9_]*)"/g;

  for (const file of [ENV_MODULE, ...(await publicSourceFiles()), ...(await adminSourceFiles())]) {
    const source = await readFile(file, "utf8");
    for (const match of source.matchAll(call)) names.add(match[1]!);
  }

  return [...names];
}

/**
 * Source with comments removed.
 *
 * Comments are allowed — encouraged, even — to discuss the banned phrases; this
 * whole file is a comment about them. Only text that can reach a browser
 * counts. Stripping first also handles the JSX `{/* … *␘/}` form, whose
 * continuation lines start with ordinary prose and so survive any
 * line-prefix test.
 */
function withoutComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, (block) => block.replace(/[^\n]/g, " "))
    .replace(/(^|[^:])\/\/[^\n]*/g, (_match, before: string) => before);
}

async function sourceFiles(): Promise<string[]> {
  const found: string[] = [];

  async function walk(dir: string) {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(full);
        continue;
      }
      if (full === ENV_MODULE) continue;
      if (/\.tsx?$/.test(entry.name)) found.push(full);
    }
  }

  await walk(SRC);
  return found;
}

/**
 * `src/app/admin` and `src/lib/admin` are authenticated surfaces. They are
 * *supposed* to report configuration state and name the settings to fill in —
 * that is the point of moving the helper there — so they are excluded from the
 * scans and included in the harvest.
 */
const isAdmin = (file: string) => file.split(path.sep).includes("admin");

async function publicSourceFiles(): Promise<string[]> {
  return (await sourceFiles()).filter((file) => !isAdmin(file));
}

async function adminSourceFiles(): Promise<string[]> {
  return (await sourceFiles()).filter(isAdmin);
}

/** The seed data a fresh install builds its content from. */
async function seedFiles(): Promise<string[]> {
  const dir = path.join(process.cwd(), "prisma");
  const found: string[] = [];

  async function walk(current: string) {
    for (const entry of await readdir(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) await walk(full);
      else if (entry.name.endsWith(".ts")) found.push(full);
    }
  }

  await walk(dir);
  return found;
}

describe("public surfaces", () => {
  it("finds source files to check", async () => {
    // Guards the walker itself: a typo in the path would otherwise make every
    // test below pass over an empty list.
    const files = await publicSourceFiles();
    expect(files.length).toBeGreaterThan(50);
  });

  it("never imports the unconfigured-keys helper outside the admin area", async () => {
    const offenders: string[] = [];
    for (const file of await publicSourceFiles()) {
      const source = await readFile(file, "utf8");
      if (source.includes("getUnconfiguredIdentityKeys")) {
        offenders.push(path.relative(process.cwd(), file));
      }
    }
    expect(offenders).toEqual([]);
  });

  it("harvests the environment variable names from env.ts", async () => {
    // Guards the harvester the way the walker is guarded above: an empty list
    // would make the next test pass without checking anything.
    const names = await environmentVariableNames();
    expect(names.length).toBeGreaterThan(20);
    expect(names).toContain("COMPANY_GRIEVANCE_OFFICER_EMAIL");
  });

  it("never names an environment variable in public source", async () => {
    const names = await environmentVariableNames();
    // Word-bounded, so the `COMPANY_INFO` block type is not mistaken for a
    // setting: it shares a prefix with several, but is not one of them.
    const envName = new RegExp(`\\b(?:${names.join("|")})\\b`);
    const offenders: string[] = [];

    for (const file of await publicSourceFiles()) {
      const source = withoutComments(await readFile(file, "utf8"));
      for (const [index, line] of source.split("\n").entries()) {
        // Reading a setting is fine — `optionalEnv("COMPANY_GSTIN")` is how the
        // value reaches the page at all. Only a name in rendered text leaks.
        if (/optionalEnv|requiredEnv|process\.env/.test(line)) continue;
        const match = envName.exec(line);
        if (match) {
          offenders.push(`${path.relative(process.cwd(), file)}:${index + 1} ${match[0]}`);
        }
      }
    }

    expect(offenders).toEqual([]);
  });

  it("never describes the technology brands as this company's vendors", async () => {
    /*
     * The chain is: software publishers and hardware manufacturers → this
     * company → its customers. The site once said "Vendors we supply" over a
     * grid of Microsoft, Adobe and Autodesk logos, which reads as the opposite.
     *
     * The word "vendor" itself is what makes the sentence ambiguous — a vendor
     * is whoever is selling, so it means this company in one clause and
     * Microsoft in the next. Every occurrence was replaced with the word that
     * is actually true there: publisher, manufacturer, supplier or brand. This
     * keeps it that way, which is stricter than the ambiguity strictly
     * requires, and deliberately so: nobody re-deriving the distinction under
     * time pressure gets it right twice running.
     */
    const offenders: string[] = [];

    // The seed data is checked alongside the source. Fixing the database alone
    // was not enough: a fresh deployment builds its content from these files,
    // so the old wording would have come straight back on the next install.
    for (const file of [...(await sourceFiles()), ...(await seedFiles())]) {
      const source = await readFile(file, "utf8");
      for (const [index, line] of source.split("\n").entries()) {
        if (/vendor/i.test(line)) {
          offenders.push(`${path.relative(process.cwd(), file)}:${index + 1} ${line.trim().slice(0, 120)}`);
        }
      }
    }

    expect(offenders).toEqual([]);
  });

  it("carries no launch-readiness or configuration language in public source", async () => {
    const banned = [
      "Configuration required",
      "not configured",
      "before this site goes live",
      "requiring configuration",
      "Awaiting legal review",
      "for this deployment",
    ];
    const offenders: string[] = [];

    for (const file of await publicSourceFiles()) {
      const source = withoutComments(await readFile(file, "utf8")).toLowerCase();
      for (const [index, line] of source.split("\n").entries()) {
        for (const phrase of banned) {
          if (line.includes(phrase.toLowerCase())) {
            offenders.push(`${path.relative(process.cwd(), file)}:${index + 1} ${phrase}`);
          }
        }
      }
    }

    expect(offenders).toEqual([]);
  });
});
