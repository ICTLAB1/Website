import { chromium } from "playwright";

import { suppressFestiveGreeting } from "./lib/festive.mjs";

/**
 * The careers page, its menu badge and the home-page hiring strip, against a
 * server whose CAREERS_FEED_URL points at the mock feed
 * (scripts/verify/lib/mock-hr-feed.mjs).
 *
 *   SCENARIO=jobs   (default) /jobs  — three jobs, two departments
 *   SCENARIO=empty              /empty — a valid feed with no jobs
 *   SCENARIO=down               a feed that cannot be reached or is not a feed
 *
 * The scenario says what the server was started with; this checks that the site
 * did the right thing about it. Run it three times, once per server.
 */

const BASE = process.env.BASE ?? "http://localhost:3000";
const SCENARIO = process.env.SCENARIO ?? "jobs";
const PORTAL = "https://hr.techzoidtechnologies.com/careers";
const results = [];
const check = (name, ok, detail = "") => {
  results.push({ name, ok: Boolean(ok) });
  console.log(`  ${ok ? "✓" : "✗"} ${name}${ok || !detail ? "" : ` — ${detail}`}`);
};

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const open = async (viewport) => {
  const context = await browser.newContext({ viewport });
  await suppressFestiveGreeting(context);
  return { context, page: await context.newPage() };
};

console.log(`scenario: ${SCENARIO}`);

for (const [label, viewport] of [
  ["phone 375px", { width: 375, height: 800 }],
  ["tablet 768px", { width: 768, height: 1024 }],
  ["desktop 1440px", { width: 1440, height: 900 }],
]) {
  console.log(`\n${label}`);
  const { context, page } = await open(viewport);
  await page.goto(`${BASE}/careers`, { waitUntil: "networkidle" });

  check("one H1", (await page.locator("h1").count()) === 1);
  check("four H2s", (await page.locator("main h2").count()) === 4);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  check("no sideways scroll", overflow <= 0, `${overflow}px`);
  check("no link opens a new tab", (await page.locator("main a[target]").count()) === 0);
  check("the closing strip has the mailto and the portal button", (await page.locator('main a[href="mailto:hr.preeti@techzoidtechnologies.com"]').count()) >= 1 && (await page.locator(`main a[href="${PORTAL}"]`).count()) >= 1);
  check("no form or input", (await page.locator("main form, main input").count()) === 0);
  check("no JobPosting markup", (await page.locator('script[type="application/ld+json"]').allInnerTexts()).every((t) => !t.includes("JobPosting")));

  // The banner button scrolls to the list, and the list is what it lands on.
  await page.getByRole("link", { name: "See open positions" }).click();
  await page.waitForTimeout(300);
  check("the banner button goes to the jobs list", page.url().endsWith("#jobs"));

  const tooShort = await page.locator("main a, main button").evaluateAll((els) =>
    els.filter((el) => el.getBoundingClientRect().height > 0 && !el.closest("nav, h1, h2, h3, ol") && el.getBoundingClientRect().height < 43.5 && !el.matches('a[href^="mailto:"]'))
      .map((el) => `${el.textContent.trim().slice(0, 24)} ${Math.round(el.getBoundingClientRect().height)}px`),
  );
  check("every button and chip is at least 44px tall (text links in headings and the mailto are inline links)", tooShort.length === 0, tooShort.join("; "));

  if (SCENARIO === "jobs") {
    const cards = page.locator("#jobs h3");
    check("three job cards", (await cards.count()) === 3, String(await cards.count()));
    check("card titles link to the portal", (await page.locator(`#jobs h3 a[href^="${PORTAL}/"]`).count()) === 3);
    check("each card has an Apply now to its #apply link", (await page.locator(`#jobs a[href$="#apply"]:has-text("Apply now")`).count()) === 3);
    check("Apply now stays in the same tab", (await page.locator("#jobs a[target]").count()) === 0);
    check("salary and experience show where the feed has them", (await page.getByText("₹3–4.5 LPA + incentives").count()) === 1 && (await page.getByText("0–2 years").count()) === 1);
    const preSales = page.locator("#jobs li", { has: page.getByRole("heading", { name: "Pre-sales Engineer" }) }).first();
    check("and hides them where the feed has null", !(await preSales.innerText()).match(/LPA|years|Apply by/));
    check("posted-ago and apply-by labels are there", (await page.getByText(/Posted \d+ days? ago|Posted today/).count()) >= 2 && (await page.getByText("Apply by 15 Dec 2030").count()) === 1);
    check("feed text that looks like markup is shown as text", (await page.locator("#jobs b").count()) === 0 && (await page.locator("#jobs img").count()) === 0 && (await page.getByText("<b>bold</b>", { exact: false }).count()) >= 1);

    // Filters
    const chips = page.locator('[role="group"][aria-label="Filter by department"] button');
    check("filter chips: All, Sales, Pre-sales", (await chips.allInnerTexts()).join("|") === "All|Sales|Pre-sales", (await chips.allInnerTexts()).join("|"));
    await chips.filter({ hasText: "Pre-sales" }).click();
    check("choosing Pre-sales shows one card", (await cards.count()) === 1);
    check("and marks that chip pressed", (await chips.filter({ hasText: "Pre-sales" }).getAttribute("aria-pressed")) === "true");
    await chips.filter({ hasText: "Sales" }).first().click();
    check("choosing Sales shows two", (await cards.count()) === 2);
    await chips.filter({ hasText: "All" }).click();
    check("All shows all three", (await cards.count()) === 3);

    // View details
    const toggle = page.getByRole("button", { name: "View details" }).first();
    const panelId = await toggle.getAttribute("aria-controls");
    check("details start closed", (await page.locator(`#${panelId}`).isHidden()) && (await toggle.getAttribute("aria-expanded")) === "false");
    const url = page.url();
    await toggle.click();
    check("View details opens responsibilities and requirements, without changing page", (await page.locator(`#${panelId}`).isVisible()) && page.url() === url && (await page.locator(`#${panelId}`).innerText()).includes("Responsibilities"));
    check("the button now says Hide details", (await page.getByRole("button", { name: "Hide details" }).count()) === 1);
    await page.getByRole("button", { name: "Hide details" }).click();
    check("and closes again", await page.locator(`#${panelId}`).isHidden());
    check("a job with no details has no details button", (await page.getByRole("button", { name: "View details" }).count()) === 2);
  } else if (SCENARIO === "empty") {
    check("the empty message and mailto show", (await page.getByText("No openings right now.").count()) === 1 && (await page.locator('#jobs a[href="mailto:hr.preeti@techzoidtechnologies.com"]').count()) === 1);
    check("no job cards or filters", (await page.locator("#jobs h3").count()) === 0 && (await page.locator('[aria-label="Filter by department"]').count()) === 0);
  } else {
    check("the fallback says to see the portal, with a button to it", (await page.getByText("See current openings on our careers portal").count()) === 1 && (await page.locator(`#jobs a[href="${PORTAL}"]`).count()) === 1);
    const text = await page.locator("#jobs").innerText();
    check("and shows no technical message", !/error|failed|timeout|fetch|ECONN|undefined|null|500/i.test(text), text.slice(0, 120));
  }
  await context.close();
}

console.log("\nthe menu badge");
{
  const { context, page } = await open({ width: 1440, height: 900 });
  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
  const link = page.locator('nav[aria-label="Primary"] a[href="/careers"]').first();
  // What a sighted visitor sees: the label and the badge, without the
  // screen-reader-only "3 open positions" that follows them.
  const visible = (el) => el.evaluate((node) => [...node.childNodes].filter((n) => !(n.classList && n.classList.contains("sr-only"))).map((n) => n.textContent.trim()).filter(Boolean).join(" "));
  const text = await visible(link);
  const spoken = await link.evaluate((node) => node.querySelector(".sr-only")?.textContent ?? "");
  if (SCENARIO === "jobs") {
    check("and a screen reader hears how many positions", /3 open positions/.test(spoken), spoken);
    check("desktop menu reads Careers 3", text === "Careers 3", text);
  } else {
    check("desktop menu reads just Careers, with no error", text === "Careers", text);
  }
  const labels = await page.locator('nav[aria-label="Primary"] > ul > li > div > a').allInnerTexts();
  check("Careers is still last in the menu", labels.at(-1)?.startsWith("Careers"), labels.join(" | "));
  check("the footer links to /careers", (await page.locator('footer a[href="/careers"]').count()) >= 1);
  await context.close();

  const phone = await open({ width: 375, height: 800 });
  await phone.page.goto(`${BASE}/`, { waitUntil: "networkidle" });
  await phone.page.getByRole("button", { name: /menu/i }).first().click();
  const mobile = phone.page.locator('[aria-label="Mobile navigation"] a[href="/careers"]');
  await mobile.first().waitFor({ state: "visible", timeout: 5000 }).catch(() => {});
  const mt = await visible(mobile.first());
  check(SCENARIO === "jobs" ? "mobile menu reads Careers 3" : "mobile menu reads just Careers", SCENARIO === "jobs" ? mt === "Careers 3" : mt === "Careers", mt);
  await phone.context.close();
}

console.log("\nthe home page strip");
for (const [label, viewport] of [["phone", { width: 375, height: 800 }], ["desktop", { width: 1440, height: 900 }]]) {
  const { context, page } = await open(viewport);
  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
  const strip = page.locator('section[aria-label="We\'re hiring"]');
  if (SCENARIO === "jobs") {
    check(`${label}: the strip shows`, (await strip.count()) === 1);
    const t = await strip.innerText();
    check(`${label}: it names the first job and counts the rest`, /We.re hiring: Business Development Executive and 2 more roles/.test(t), t.replace(/\s+/g, " "));
    check(`${label}: up to three titles link to their portal pages`, (await strip.locator(`a[href^="${PORTAL}/"]`).count()) === 3);
    check(`${label}: See openings goes to /careers`, (await strip.locator('a[href="/careers"]:has-text("See openings")').count()) === 1);
    // The last thing on the page before the footer. (The footer's own top margin,
    // the same on every page, is the white space between them.)
    check(`${label}: the strip is the last thing in the page, right before the footer`, await page.evaluate(() => { const s = document.querySelector('section[aria-label="We\'re hiring"]'); const m = document.querySelector("main"); const f = document.querySelector("footer"); if (!s || !m || !f || m.nextElementSibling !== f) return false; for (let n = s; n && n !== m; n = n.parentElement) { if (n.nextElementSibling) return false; } return true; }));
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    check(`${label}: no sideways scroll`, overflow <= 0);
  } else {
    check(`${label}: no strip, and nothing in its place`, (await strip.count()) === 0 && !/we.re hiring/i.test(await page.locator("main").innerText()));
  }
  await context.close();
}

console.log("\nthe old role pages");
for (const slug of ["business-development-managerexecutive", "sales-executive-it-sales", "anything-else"]) {
  const response = await fetch(`${BASE}/careers/${slug}`, { redirect: "manual" });
  check(`/careers/${slug} redirects to /careers`, response.status === 301 && new URL(response.headers.get("location") ?? "", BASE).pathname === "/careers");
}
const sitemap = await (await fetch(`${BASE}/sitemap.xml`)).text();
check("the sitemap lists /careers and no /careers/<role>", /<loc>[^<]*\/careers<\/loc>/.test(sitemap) && !/<loc>[^<]*\/careers\/[^<]+<\/loc>/.test(sitemap));

await browser.close();
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed (${SCENARIO})`);
process.exit(failed.length ? 1 : 0);
