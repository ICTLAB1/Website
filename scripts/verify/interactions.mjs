import { chromium } from "playwright";

import { campaignIsRunning, suppressFestiveGreeting } from "./lib/festive.mjs";

const BASE = "http://localhost:3000";
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const results = [];
const check = (name, condition, detail = "") =>
  results.push({ name, ok: Boolean(condition), detail });

// ---------------------------------------------------------------- mobile nav
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 800 } });
  await suppressFestiveGreeting(ctx);
  const page = await ctx.newPage();
  await page.goto(BASE, { waitUntil: "load" });

  await page.getByRole("button", { name: "Open menu" }).click();
  const drawer = page.getByRole("dialog", { name: "Site navigation" });
  check("mobile drawer opens", await drawer.isVisible());

  // Drill into Products, then into the Microsoft column.
  await drawer.getByRole("button", { name: "Products" }).click();
  check("drill-down shows brand columns", await drawer.getByRole("button", { name: "Microsoft" }).isVisible());
  await drawer.getByRole("button", { name: "Microsoft" }).click();
  check("second level lists products", await drawer.getByRole("link", { name: "Microsoft 365", exact: true }).isVisible());

  await drawer.getByRole("button", { name: /^Microsoft$|Products/ }).first().click();
  check("back control returns a level", await drawer.getByRole("button", { name: "Microsoft" }).isVisible());

  await page.keyboard.press("Escape");
  await page.waitForTimeout(200);
  check("Escape closes the drawer", !(await drawer.isVisible().catch(() => false)));

  // Navigating closes it.
  await page.getByRole("button", { name: "Open menu" }).click();
  await drawer.getByRole("link", { name: "Enterprise", exact: true }).click();
  await page.waitForURL("**/enterprise");
  check("navigation closes the drawer", !(await page.getByRole("dialog", { name: "Site navigation" }).isVisible().catch(() => false)));
  await ctx.close();
}

// ------------------------------------------------------- search autocomplete
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await suppressFestiveGreeting(ctx);
  const page = await ctx.newPage();
  await page.goto(BASE, { waitUntil: "load" });

  const hero = page.getByRole("combobox", { name: "Search products and solutions" });
  await hero.fill("acro");
  await page.waitForTimeout(700);
  const listbox = page.getByRole("listbox", { name: "Search suggestions" });
  check("autocomplete returns suggestions", await listbox.isVisible());
  const first = listbox.getByRole("option").first();
  check("suggestion mentions Acrobat", (await first.innerText()).includes("Acrobat"), await first.innerText());

  // Keyboard: arrow down then Enter opens the highlighted result.
  await hero.press("ArrowDown");
  await hero.press("Enter");
  await page.waitForURL("**/products/**");
  check("keyboard selection navigates", page.url().includes("/products/"), page.url());
  await ctx.close();
}

// --------------------------------------------------- basket and quote request
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await suppressFestiveGreeting(ctx);
  const page = await ctx.newPage();

  await page.goto(`${BASE}/products/microsoft-365-business-standard`, { waitUntil: "load" });
  await page.getByLabel("Quantity").fill("50");
  await page.getByRole("complementary").getByRole("button", { name: "Add to Enquiry" }).click();
  await page.waitForTimeout(300);

  await page.goto(`${BASE}/products/adobe-acrobat-pro-teams`, { waitUntil: "load" });
  await page.getByLabel("Quantity").fill("25");
  await page.getByRole("complementary").getByRole("button", { name: "Add to Enquiry" }).click();
  await page.waitForTimeout(300);

  await page.goto(`${BASE}/products/autocad`, { waitUntil: "load" });
  await page.getByLabel("Quantity").fill("10");
  await page.getByRole("complementary").getByRole("button", { name: "Add to Enquiry" }).click();
  await page.waitForTimeout(400);

  const badge = await page.locator('a[href="/enquiry"]').first().innerText();
  const normalised = badge.replace(/\s+/g, " ").trim();
  check("basket badge shows the line count", normalised.includes("Enquiry 3"), `badge="${normalised}"`);
  check("basket count is announced to assistive technology",
    normalised.includes("Enquiry basket, 3 items"), `badge="${normalised}"`);

  await page.goto(`${BASE}/enquiry`, { waitUntil: "load" });
  await page.waitForTimeout(400);
  const bodyText = await page.locator("body").innerText();
  check("basket lists Microsoft 365", bodyText.includes("Microsoft 365 Business Standard"));
  check("basket lists Acrobat Pro", bodyText.includes("Acrobat Pro"));
  check("basket lists AutoCAD", bodyText.includes("AutoCAD"));
  // Quantities live in input values, which innerText does not expose.
  const quantities = await page.locator('input[id^="qty-"]').evaluateAll(
    (inputs) => inputs.map((i) => i.value),
  );
  check("quantities persisted per line", quantities.join(",") === "50,25,10", quantities.join(","));

  /*
   * Named, not "the complementary landmark". This originally assumed the page
   * had exactly one `aside`, which broke the moment a second landmark was
   * added anywhere in the layout — a locator that depends on nothing else on
   * the page existing is a locator that fails for reasons unrelated to what it
   * is testing.
   */
  const summary = await page
    .locator("aside")
    .filter({ hasText: "Enquiry summary" })
    .first()
    .innerText();
  check("summary totals the quantities", summary.includes("85"), summary.replace(/\n/g, " | "));

  // Client-side validation must reject an obviously bad email.
  await page.getByLabel("Full name", { exact: false }).first().fill("Playwright Buyer");
  await page.getByLabel("Company name").fill("Playwright Test Pvt Ltd");
  await page.getByLabel("Business email").fill("not-an-email");
  await page.getByLabel("Phone", { exact: false }).first().fill("+91 99999 99999");
  await page.getByRole("button", { name: "Request Enterprise Quote" }).click();
  await page.waitForTimeout(800);
  check("invalid email is reported inline",
    (await page.locator("body").innerText()).includes("valid email"),
  );

  await page.getByLabel("Business email").fill("playwright@example.test");
  await page.getByRole("button", { name: "Request Enterprise Quote" }).click();
  await page.waitForURL("**/enquiry/submitted**", { timeout: 15000 });
  const confirmation = await page.locator("body").innerText();
  const ref = confirmation.match(/ENQ-\d{4}-[A-Z0-9]{6}/)?.[0];
  check("submission returns a reference", Boolean(ref), ref ?? confirmation.slice(0, 80));

  await page.goto(`${BASE}/enquiry`, { waitUntil: "load" });
  await page.waitForTimeout(400);
  check("basket is cleared after submission",
    (await page.locator("body").innerText()).includes("Your enquiry basket is empty"));
  await ctx.close();
}

// -------------------------------------------------------- catalogue filtering
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await suppressFestiveGreeting(ctx);
  const page = await ctx.newPage();
  await page.goto(`${BASE}/products`, { waitUntil: "load" });

  const initial = (await page.locator("body").innerText()).match(/of (\d+) products/)?.[1];
  await page.getByRole("link", { name: /Adobe.*activate to apply filter/ }).first().click();
  await page.waitForURL("**/products?brand=adobe**");
  const filtered = (await page.locator("body").innerText()).match(/of (\d+) products/)?.[1];
  check("brand filter reduces the result count",
    Number(filtered) > 0 && Number(filtered) < Number(initial), `${initial} → ${filtered}`);
  check("filter is reflected in the URL", page.url().includes("brand=adobe"));
  check("active filter chip is shown",
    (await page.locator("body").innerText()).includes("Adobe"));

  await page.getByRole("link", { name: "Price: low to high" }).click();
  await page.waitForURL("**sort=price-asc**");
  check("sort persists alongside the filter",
    page.url().includes("brand=adobe") && page.url().includes("sort=price-asc"), page.url());

  await page.goBack();
  await page.waitForTimeout(300);
  check("browser back restores the previous filter state", !page.url().includes("sort="), page.url());
  await ctx.close();
}

// ------------------------------------------------------------------ keyboard
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await suppressFestiveGreeting(ctx);
  const page = await ctx.newPage();
  await page.goto(BASE, { waitUntil: "load" });
  await page.keyboard.press("Tab");
  const firstFocus = await page.evaluate(() => document.activeElement?.textContent?.trim() ?? "");
  check("first tab stop is the skip link", firstFocus.includes("Skip to main content"), firstFocus);
  await page.keyboard.press("Enter");
  await page.waitForTimeout(200);
  check("skip link targets main content", page.url().includes("#main-content"), page.url());
  await ctx.close();
}

// --------------------------------------------------------- festive greeting
/*
 * The Diwali greeting, while there is one.
 *
 * Deliberately not suppressed in this block — it is the thing under test. It
 * is also the only modal on the public site, so what matters is less that it
 * appears than that it gets out of the way: by Escape, once per visit rather
 * than once per page, and never over a form somebody is trying to fill in.
 * That last one is not hypothetical. The first version of the component
 * copied the chat widget's `/admin` and `/account` rule, and `/login` is
 * neither — the backdrop sat on the Sign in button and this suite was what
 * found it.
 *
 * The whole block, the component and `lib/festive.mjs` come out together when
 * the campaign is over; until then it reports the skip rather than passing
 * silently, because a check that quietly stops checking is worse than no
 * check.
 */
if (campaignIsRunning()) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 800 } });
  const page = await ctx.newPage();
  const greeting = page.getByRole("dialog", { name: /diwali/i });

  await page.goto(BASE, { waitUntil: "load" });
  await page.waitForTimeout(600);
  check("the festive greeting appears on arrival", (await greeting.count()) === 1);

  check(
    "focus moves into it",
    await page.evaluate(() => {
      const dialog = document.querySelector('[role="dialog"][aria-modal="true"]');
      return Boolean(dialog && document.activeElement && dialog.contains(document.activeElement));
    }),
  );

  check(
    "its call to action is the enquiry form",
    (await page.getByRole("link", { name: /festive quotation/i }).getAttribute("href")) === "/enquiry",
  );

  await page.keyboard.press("Escape");
  await page.waitForTimeout(300);
  check("Escape dismisses it", (await greeting.count()) === 0);
  check(
    "and the page scrolls again",
    (await page.evaluate(() => document.body.style.overflow)) !== "hidden",
  );

  await page.goto(`${BASE}/products`, { waitUntil: "load" });
  await page.waitForTimeout(600);
  check("it greets once per visit, not once per page", (await greeting.count()) === 0);

  await ctx.close();

  // The page it must never cover, and the reason this block exists.
  const signIn = await browser.newContext();
  const login = await signIn.newPage();
  await login.goto(`${BASE}/login`, { waitUntil: "load" });
  await login.waitForTimeout(600);
  check("it stays off the sign-in page", (await login.getByRole("dialog", { name: /diwali/i }).count()) === 0);
  await signIn.close();
} else {
  console.log("  — festive greeting: the campaign is over; nothing to check (remove this block)");
}

await browser.close();

const failed = results.filter((r) => !r.ok);
for (const r of results) {
  console.log(`${r.ok ? "  ✓" : "  ✗"} ${r.name}${r.detail && !r.ok ? ` — ${r.detail}` : ""}`);
}
console.log(`\n${results.length - failed.length}/${results.length} interaction checks passed`);
process.exit(failed.length ? 1 : 0);
