import { chromium } from "playwright";

import { suppressFestiveGreeting } from "./lib/festive.mjs";

/**
 * The careers page, which now only sends job seekers to the HR portal.
 *
 * What it checks is what the page promises and what could quietly stop being
 * true: the portal buttons really leave for the portal, in the same tab; the
 * page holds no form and no applicant data; the menu, the mobile menu and the
 * footer all reach it; it fits a phone with no sideways scroll and with
 * buttons a thumb can hit; and the old in-site role pages still end up
 * somewhere useful instead of a dead end.
 *
 * Run against a server with a seeded database (the menu row comes from the
 * seed or the `2026-11-careers-menu-item` content migration).
 */

const BASE = process.env.BASE ?? "http://localhost:3000";
const PORTAL = "https://hr.techzoidtechnologies.com/careers";
const results = [];
const check = (name, ok, detail = "") => {
  const result = { name, ok: Boolean(ok), detail };
  results.push(result);
  console.log(`  ${result.ok ? "✓" : "✗"} ${result.name}${result.ok || !result.detail ? "" : ` — ${result.detail}`}`);
};

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });

for (const [label, viewport] of [
  ["phone 375px", { width: 375, height: 800 }],
  ["tablet 768px", { width: 768, height: 1024 }],
  ["desktop 1440px", { width: 1440, height: 900 }],
]) {
  console.log(`\n${label}`);
  const context = await browser.newContext({ viewport });
  await suppressFestiveGreeting(context);
  const page = await context.newPage();
  await page.goto(`${BASE}/careers`, { waitUntil: "networkidle" });

  check("one H1", (await page.locator("h1").count()) === 1);
  check("four H2s in the page body", (await page.locator("main h2").count()) === 4);

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  check("no sideways scroll", overflow <= 0, `${overflow}px wider than the screen`);

  const buttons = page.locator(`main a[href="${PORTAL}"]`);
  check("two buttons go to the portal", (await buttons.count()) === 2, String(await buttons.count()));
  const heights = await buttons.evaluateAll((els) => els.map((el) => Math.round(el.getBoundingClientRect().height)));
  check("each portal button is at least 44px tall", heights.every((h) => h >= 44), heights.join(", "));
  const targets = await page.locator("main a[target]").count();
  check("no link opens a new tab", targets === 0, `${targets} with a target`);

  const mail = await page.locator('main a[href="mailto:hr.preeti@techzoidtechnologies.com"]').count();
  check("the mailto link is there", mail === 1);
  check("no form or file input on the page", (await page.locator("main form, main input").count()) === 0);
  check("team chips are not links", (await page.locator("main section:has(h2:text('Teams we hire for')) a").count()) === 0);

  await context.close();
}

console.log("\nnavigation");
{
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await suppressFestiveGreeting(context);
  const page = await context.newPage();
  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });

  const desktop = page.locator('nav[aria-label="Primary"] a[href="/careers"]');
  check("the desktop menu has Careers", (await desktop.count()) >= 1);
  const labels = await page.locator('nav[aria-label="Primary"] > ul > li > a, nav[aria-label="Primary"] > ul > li > div > a').allInnerTexts();
  check("and it is the last top-level item", labels.at(-1)?.trim() === "Careers", labels.join(" | "));
  check("the footer links to it", (await page.locator('footer a[href="/careers"]').count()) >= 1);

  await desktop.first().click();
  await page.waitForURL(/\/careers$/);
  check("clicking it opens /careers", new URL(page.url()).pathname === "/careers");
  await context.close();

  const phone = await browser.newContext({ viewport: { width: 375, height: 800 } });
  await suppressFestiveGreeting(phone);
  const p = await phone.newPage();
  await p.goto(`${BASE}/`, { waitUntil: "networkidle" });
  await p.getByRole("button", { name: /menu/i }).first().click();
  const mobile = p.locator('[role="dialog"] a[href="/careers"], nav a[href="/careers"]:visible');
  await mobile.first().waitFor({ state: "visible", timeout: 5000 }).catch(() => {});
  check("the mobile menu shows Careers", (await mobile.filter({ visible: true }).count()) >= 1);
  await phone.close();
}

console.log("\nold role pages");
for (const slug of ["business-development-managerexecutive", "sales-executive-it-sales", "anything-else"]) {
  const response = await fetch(`${BASE}/careers/${slug}`, { redirect: "manual" });
  check(
    `/careers/${slug} redirects to /careers`,
    response.status === 301 && new URL(response.headers.get("location") ?? "", BASE).pathname === "/careers",
    `${response.status} ${response.headers.get("location")}`,
  );
}

const sitemap = await (await fetch(`${BASE}/sitemap.xml`)).text();
check("the sitemap lists /careers", /<loc>[^<]*\/careers<\/loc>/.test(sitemap));
check("and no longer lists any /careers/<role>", !/<loc>[^<]*\/careers\/[^<]+<\/loc>/.test(sitemap));

await browser.close();
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
