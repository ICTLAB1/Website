/**
 * Kept after the Diwali 2026 campaign was removed, and deliberately so.
 *
 * Forty-one suites call this. The greeting it suppressed is gone — the
 * component, its date gate and its tests went with the campaign on
 * 10 November 2026 — so this now writes a key nothing reads, which costs a
 * few microseconds per context and nothing else.
 *
 * Editing forty-one files to delete a harmless no-op would be a large diff
 * for no behaviour, and the next campaign would want it back. The companion
 * `campaignIsRunning` is gone, because that one threw when the source file it
 * read no longer existed.
 *
 * What it used to do, which is what the next campaign should restore:
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
