import { readFileSync, readdirSync } from "node:fs";

import { describe, expect, it } from "vitest";

/**
 * Every scheduled route's token has to be forwarded into the container.
 *
 * This test exists because one of them was not. `QUOTE_FOLLOWUP_TOKEN` was
 * documented in `.env.example`, documented in the deployment guide with a cron
 * line to install, read by the route — and absent from the compose file. Docker
 * Compose forwards only the variables named in the service's `environment`
 * block, so the value sat in the server's `.env` and never reached the process:
 * the route answered 404 to its own cron line, quotation follow-ups never went
 * out, and `expireStaleQuotes()` — which that run also performs — never ran
 * either.
 *
 * Nothing about that failure is visible. The route is meant to answer 404 when
 * the token is unset, the cron line succeeds because `curl` got a response, and
 * the only symptom is an absence of email. So it is checked here rather than
 * left to be noticed.
 */

const ROUTES = "src/app/api";
const COMPOSE = "deploy/docker-compose.prod.yml";

/** Every `process.env.X` a route handler reads, where X looks like a secret. */
function tokensReadByRoutes(): Map<string, string> {
  const found = new Map<string, string>();

  const walk = (dir: string) => {
    for (const entry of readdirSync(new URL(`../${dir}`, import.meta.url), { withFileTypes: true })) {
      const path = `${dir}/${entry.name}`;
      if (entry.isDirectory()) {
        walk(path);
      } else if (entry.name === "route.ts") {
        const source = readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
        for (const match of source.matchAll(/process\.env\.([A-Z0-9_]*TOKEN)\b/g)) {
          found.set(match[1]!, path);
        }
      }
    }
  };

  walk(ROUTES);
  return found;
}

describe("scheduled route tokens", () => {
  const tokens = tokensReadByRoutes();

  it("finds the routes that are guarded by a token", () => {
    // If this drops to nothing the walk above has stopped working and the real
    // assertion below would pass vacuously.
    expect(tokens.size).toBeGreaterThanOrEqual(3);
  });

  it("forwards every one of them into the production container", () => {
    const compose = readFileSync(new URL(`../${COMPOSE}`, import.meta.url), "utf8");

    const missing = [...tokens].filter(([name]) => !compose.includes(`${name}: \${${name}`));
    expect(missing.map(([name, path]) => `${name} (read by ${path})`)).toEqual([]);
  });

  it("documents every one of them in .env.example", () => {
    const example = readFileSync(new URL("../.env.example", import.meta.url), "utf8");

    const missing = [...tokens].filter(([name]) => !example.includes(`${name}=`));
    expect(missing.map(([name]) => name)).toEqual([]);
  });
});
