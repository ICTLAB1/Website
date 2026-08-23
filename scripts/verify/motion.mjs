import { chromium } from "playwright";

/**
 * Verifies the motion layer.
 *
 * The two properties that matter are not "does it animate" but:
 *  - content is never left hidden (no-JS and reduced-motion readers see it), and
 *  - motion causes no layout shift, since animating content in is the classic
 *    way to wreck Cumulative Layout Shift.
 */
const BASE = process.env.BASE ?? "http://localhost:3000";
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const results = [];
const check = (name, ok, detail = "") => results.push({ name, ok: Boolean(ok), detail });

// ------------------------------------------------------- motion enabled
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(BASE, { waitUntil: "load" });
  // The hidden state is applied after hydration, deliberately: elements are
  // only hidden once they are known to be below the fold, so the reader never
  // sees content disappear. Wait for that rather than racing it.
  await page.waitForFunction(
    () => document.querySelectorAll('[data-revealed="false"]').length > 0,
    undefined,
    { timeout: 5000 },
  ).catch(() => {});

  const hidden = await page.locator('[data-revealed="false"]').count();
  check("below-the-fold sections start hidden when motion is allowed", hidden > 0, `${hidden} pending`);

  /*
   * Scrolling reveals them, and they stay revealed.
   *
   * Waited for rather than slept through. A fixed 1400ms was long enough
   * almost always, which is the worst kind of long enough: the suite failed
   * about one run in three on a loaded machine, reporting a single section
   * still hidden, and passed on the retry. A flaky gate is a gate people stop
   * reading. The assertion is not weakened — a section that genuinely never
   * reveals still fails, five seconds later.
   */
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page
    .waitForFunction(() => document.querySelectorAll('[data-revealed="false"]').length === 0, undefined, {
      timeout: 5000,
    })
    .catch(() => {});
  const stillHidden = await page.locator('[data-revealed="false"]').count();
  check("every revealed section becomes visible after scrolling", stillHidden === 0, `${stillHidden} still hidden`);

  // The attribute flips first and the opacity transition runs after it, so the
  // next check needs the transition's own duration rather than the observer's.
  await page.waitForTimeout(800);

  // No content is left with zero opacity.
  const invisible = await page.evaluate(() =>
    [...document.querySelectorAll(".reveal")].filter(
      (el) => Number(getComputedStyle(el).opacity) < 0.99,
    ).length,
  );
  check("no revealed content is left transparent", invisible === 0, `${invisible} transparent`);
  await ctx.close();
}

// ------------------------------------------------------ reduced motion
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
  const page = await ctx.newPage();
  await page.goto(BASE, { waitUntil: "load" });
  await page.waitForTimeout(400);

  const hidden = await page.evaluate(() =>
    [...document.querySelectorAll(".reveal")].filter(
      (el) => Number(getComputedStyle(el).opacity) < 0.99,
    ).length,
  );
  check("reduced motion shows all content immediately", hidden === 0, `${hidden} hidden`);

  const translated = await page.evaluate(() =>
    [...document.querySelectorAll(".reveal")].filter((el) => {
      const t = getComputedStyle(el).transform;
      return t !== "none" && t !== "matrix(1, 0, 0, 1, 0, 0)";
    }).length,
  );
  check("reduced motion leaves nothing translated", translated === 0, `${translated} translated`);

  // The stat counter must show the real figure, not a count-up from zero.
  const stat = await page.locator("dd").first().innerText();
  check("stats show their real value under reduced motion", /\d/.test(stat) && stat.trim() !== "0", stat);
  await ctx.close();
}

// ---------------------------------------------------- no layout shift
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(BASE, { waitUntil: "load" });
  await page.evaluate(() => {
    window.__cls = 0;
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!entry.hadRecentInput) window.__cls += entry.value;
      }
    }).observe({ type: "layout-shift", buffered: true });
  });
  for (let i = 0; i < 8; i += 1) {
    await page.evaluate((n) => window.scrollTo(0, n * 700), i);
    await page.waitForTimeout(220);
  }
  await page.waitForTimeout(600);
  const cls = await page.evaluate(() => window.__cls ?? 0);
  // Google's "good" threshold is 0.1; reveals should contribute nothing at all.
  check("scrolling through every reveal causes no layout shift", cls < 0.1, `CLS ${cls.toFixed(4)}`);
  await ctx.close();
}

// ------------------------------------------- JavaScript disabled entirely
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, javaScriptEnabled: false });
  const page = await ctx.newPage();
  await page.goto(BASE, { waitUntil: "load" });
  const text = await page.locator("body").innerText();
  /*
   * Asserted structurally, not on the words.
   *
   * This used to require the literal "Enterprise Software Licensing" and
   * "Registered GeM seller" — the hero headline and one panel's heading. Both
   * are CMS content the owner is entitled to rewrite from the admin panel, and
   * when they did, a suite about JavaScript failed and said nothing about
   * JavaScript. What the check is actually for is that the server renders the
   * page rather than leaving it to the client, so it now measures that: a real
   * headline, and a page's worth of text behind it.
   */
  const headline = (await page.locator("main h1").first().innerText().catch(() => "")).trim();
  const sections = await page.locator("main h2").count();
  check(
    "content is present with JavaScript disabled",
    headline.length > 10 && sections >= 5 && text.length > 2000,
    `h1 "${headline}", ${sections} sections, ${text.length} characters`,
  );
  const hidden = await page.locator('[data-revealed="false"]').count();
  check("nothing is hidden with JavaScript disabled", hidden === 0, `${hidden} hidden`);
  await ctx.close();
}

// -------------------------------------------------- menus animate open
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
  const page = await ctx.newPage();
  await page.goto(BASE, { waitUntil: "load" });
  await page.getByRole("button", { name: /menu/i }).first().click();
  await page.waitForTimeout(120);
  const animating = await page.evaluate(() =>
    [...document.querySelectorAll(".animate-slide-in-right, .animate-fade-in")].length > 0,
  );
  check("mobile drawer applies its entry animation", animating);
  await ctx.close();
}

await browser.close();
for (const r of results) console.log(`${r.ok ? "  ✓" : "  ✗"} ${r.name}${r.detail ? ` — ${r.detail}` : ""}`);
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} motion checks passed`);
process.exit(failed ? 1 : 0);
