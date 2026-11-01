import { readFileSync } from "node:fs";

/**
 * Keeping the festive greeting out of suites that are testing something else.
 *
 * The Diwali greeting is a modal: it covers the page on the first view of a
 * visit, and its backdrop swallows clicks aimed at anything behind it. That is
 * what it is for, and it is also why a suite driving the navigation spends
 * thirty seconds clicking a button nobody can reach.
 *
 * A real visitor dismisses it and carries on, so a suite that dismisses it
 * before starting is testing the site as it is used, not testing around a
 * feature. The flag below is the same one the component writes when somebody
 * closes it; setting it before the first navigation means the greeting never
 * opens in that browser context.
 *
 * `addInitScript` rather than a click: it runs before the page's own scripts
 * on every document in the context, so it covers navigations within a suite
 * too, and it cannot race the greeting's own first render.
 *
 * Storage can be unavailable (a context with site data blocked), so the write
 * is wrapped — exactly as the component's own is. A throw here would fail the
 * page before the suite had asserted anything.
 *
 * This file goes when the campaign does; `src/lib/marketing/festival-campaign`
 * is the other half to delete.
 */
export const FESTIVE_SEEN_KEY = "techzoid.diwali.2026.seen";

export async function suppressFestiveGreeting(context) {
  await context.addInitScript((key) => {
    try {
      window.sessionStorage.setItem(key, "1");
    } catch {
      /* Blocked storage: the greeting may appear, and the suite will say so. */
    }
  }, FESTIVE_SEEN_KEY);
}

/**
 * Whether the campaign is still on, read from the one place that defines it.
 *
 * The suite runs under plain `node`, which cannot import the TypeScript
 * module that holds the date — so it reads the constant out of the source
 * instead. That is deliberately not a second copy of the date: a suite with
 * its own idea of when the campaign ends would keep checking a greeting that
 * had stopped rendering, or stop checking one that had not, and either way
 * the failure would be blamed on the feature. `tests/retention.test.ts` ties
 * itself to published copy the same way and for the same reason.
 *
 * A source that no longer matches this shape throws rather than guessing,
 * because the guess would be "the campaign is over", which is the answer that
 * silently stops testing.
 */
export function campaignIsRunning(now = Date.now()) {
  const source = readFileSync(
    new URL("../../../src/lib/marketing/festival-campaign.ts", import.meta.url),
    "utf8",
  );
  const found = /CAMPAIGN_ENDS_AT = Date\.parse\("([^"]+)"\)/.exec(source);
  if (!found) {
    throw new Error(
      "Could not read CAMPAIGN_ENDS_AT from src/lib/marketing/festival-campaign.ts. " +
        "If the campaign has been removed, remove the festive block from interactions.mjs too.",
    );
  }
  return now < Date.parse(found[1]);
}
