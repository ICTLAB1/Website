import { chromium } from "playwright";
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";

import { suppressFestiveGreeting } from "./lib/festive.mjs";

/**
 * The five landing pages that open with the enquiry form.
 *
 * For each: the page loads, the form is directly under the opening and is the
 * first thing below the fold's edge rather than a page-length scroll away, it
 * asks the seven things in the order given, it refuses an incomplete submission
 * with a message against the right field, and a complete one is stored with the
 * designation and quantity — read back out of the database, not taken on trust
 * from the success message. And it fits a phone.
 *
 * Needs a server on BASE with a seeded database that has had the content
 * migrations applied (the four pages are created by one).
 */

const BASE = process.env.BASE ?? "http://localhost:3000";
const results = [];
const check = (name, ok, detail = "") => {
  results.push({ name, ok: Boolean(ok) });
  console.log(`  ${ok ? "✓" : "✗"} ${name}${ok || !detail ? "" : ` — ${detail}`}`);
};

const scratch = `/tmp/verify-lead-forms-${process.pid}.sql`;
const sql = (statement) => {
  writeFileSync(scratch, statement, { mode: 0o644 });
  return execFileSync("su", ["postgres", "-c", `psql -tA -d ${process.env.PGDB ?? "tzcamp"} -f ${scratch}`], { encoding: "utf8" }).trim();
};

const PAGES = [
  ["/microsoft-365", "Microsoft 365 Business Premium"],
  ["/adobe-licensing", "Acrobat Pro"],
  ["/autodesk-licensing", "AutoCAD"],
  ["/enterprise-it-hardware", "Rack servers"],
  ["/corporate-it-solutions", "Cybersecurity"],
];

const LABELS = [
  "Company name",
  "Contact person's name",
  "Designation",
  "Corporate email",
  "Phone number",
  "Product interested in",
  "Estimated quantity or number of licences",
];

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const stamp = Date.now();

for (const [path, product] of PAGES) {
  console.log(`\n${path}`);
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await suppressFestiveGreeting(context);
  const page = await context.newPage();
  const response = await page.goto(`${BASE}${path}`, { waitUntil: "networkidle" });
  check("loads", response?.status() === 200, String(response?.status()));
  check("exactly one h1", (await page.locator("h1").count()) === 1);
  check("exactly one enquiry form, with id=quote", (await page.locator("main form").count()) === 1 && (await page.locator("#quote form").count()) === 1);

  // Prominent: it starts within the first screen and a half, directly under the opening.
  const top = await page.locator("#quote").evaluate((el) => el.getBoundingClientRect().top + window.scrollY);
  check("the form starts near the top of the page", top < 900 * 1.6, `${Math.round(top)}px from the top`);
  const afterHero = await page.evaluate(() => {
    const q = document.querySelector("#quote");
    const h1 = document.querySelector("h1");
    return q && h1 ? q.getBoundingClientRect().top > h1.getBoundingClientRect().top : false;
  });
  check("and sits below the page's heading", afterHero);

  const labels = (await page.locator("#quote form label").allInnerTexts()).map((t) => t.replace(/\s*\*\s*$/, "").trim());
  check("seven fields, in the order given", JSON.stringify(labels) === JSON.stringify(LABELS), labels.join(" | "));
  check("every field is required", (await page.locator("#quote form [required]").count()) === 7);
  check("the product list ends with a way out", (await page.locator('#quote select option').last().innerText()) === "Other / not sure yet");
  // /microsoft-365 is an existing page whose own buttons are left as they were.
  if (path !== "/microsoft-365") check("the page's own button reaches the form", (await page.locator('main a[href="#quote"]').count()) >= 1);

  // The server's own refusal, tested once: the rule is the same code behind every
  // page, and the action allows ten submissions an hour per visitor and counts
  // refusals, so repeating it five times would test the limiter instead.
  if (path === PAGES[0][0]) {
    await page.evaluate(() => document.querySelectorAll("#quote form [required]").forEach((el) => el.removeAttribute("required")));
    await page.locator('#quote input[name="companyName"]').fill("Acme Test Industries");
    await page.locator('#quote input[name="contactName"]').fill("Asha Test");
    await page.locator('#quote input[name="contactEmail"]').fill("asha.test@acme-test.example");
    await page.locator('#quote input[name="contactPhone"]').fill("9876543210");
    await page.locator('#quote select[name="lines.0.description"]').selectOption(product);
    await page.getByRole("button", { name: "Request a quotation" }).click();
    await page.locator('#quote [role="alert"], #quote [data-invalid="true"]').first().waitFor({ timeout: 8000 }).catch(() => {});
    const text = await page.locator("#quote form").innerText();
    check("an incomplete submission is refused, saying so", /correct the highlighted fields/i.test(text), text.slice(0, 80));
    check("naming the designation and the quantity", /Enter your designation/.test(text) && /Enter how many/.test(text), text.replace(/\s+/g, " ").slice(0, 160));
    check("and what was typed is still there", (await page.locator('#quote input[name="companyName"]').inputValue()) === "Acme Test Industries");
    check("and nothing was stored", sql(`select count(*) from "Enquiry" where "contactEmail"='asha.test@acme-test.example'`) === "0");
  } else {
    await page.locator('#quote input[name="companyName"]').fill("Acme Test Industries");
    await page.locator('#quote input[name="contactName"]').fill("Asha Test");
    await page.locator('#quote input[name="contactPhone"]').fill("9876543210");
    await page.locator('#quote select[name="lines.0.description"]').selectOption(product);
  }

  // A complete one.
  const email = `lead-${stamp}-${path.replace(/\W/g, "")}@acme-test.example`;
  await page.locator('#quote input[name="contactEmail"]').fill(email);
  await page.locator('#quote input[name="contactDesignation"]').fill("Head of IT");
  await page.locator('#quote input[name="lines.0.quantity"]').fill("42");
  await page.getByRole("button", { name: "Request a quotation" }).click();
  await page.getByText("we have your enquiry", { exact: false }).waitFor({ timeout: 10000 }).catch(() => {});
  const done = await page.locator("#quote").innerText();
  const ref = done.match(/ENQ-[A-Z0-9-]+/)?.[0];
  check("a complete one is accepted, with a reference", Boolean(ref), done.replace(/\s+/g, " ").slice(0, 140));

  const wanted = `42 × ${product}`.replace(/'/g, "''");
  const row = sql(`select "companyName", "contactName", "contactPhone", "kind", (position('Contact''s designation: Head of IT' in "requirements") > 0)::text, (position('${wanted}' in "requirements") > 0)::text from "Enquiry" where "contactEmail"='${email}';`);
  check("stored as one enquiry, with the designation and the quantity in its text", row === "Acme Test Industries|Asha Test|9876543210|REQUIREMENT|true|true", row);
  await context.close();
}

console.log("\nphone, 375px");
for (const [path] of PAGES) {
  const context = await browser.newContext({ viewport: { width: 375, height: 800 } });
  await suppressFestiveGreeting(context);
  const page = await context.newPage();
  await page.goto(`${BASE}${path}`, { waitUntil: "networkidle" });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  check(`${path}: no sideways scroll`, overflow <= 0, `${overflow}px`);
  const small = await page.locator("#quote input:not([type=hidden]), #quote select, #quote button[type=submit]").evaluateAll((els) => els.filter((el) => el.getBoundingClientRect().height < 43.5).map((el) => el.name || el.textContent));
  check(`${path}: every control is at least 44px tall`, small.length === 0, small.join(", "));
  const columns = await page.locator("#quote form .grid > div").evaluateAll((els) => new Set(els.map((el) => Math.round(el.getBoundingClientRect().left))).size);
  check(`${path}: fields stack in one column`, columns === 1, `${columns} columns`);
  await context.close();
}

console.log("\nthe pages themselves");
{
  const context = await browser.newContext();
  const page = await context.newPage();
  for (const [path] of PAGES.slice(1)) {
    await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded" });
    const robots = await page.locator('meta[name="robots"]').first().getAttribute("content");
    const canonical = await page.locator('link[rel="canonical"]').getAttribute("href");
    check(`${path}: indexable, canonical to itself`, /index/.test(robots ?? "") && !/noindex/.test(robots ?? "") && canonical?.endsWith(path), `${robots} ${canonical}`);
  }
  const sitemap = await (await fetch(`${BASE}/sitemap.xml`)).text();
  check("the sitemap lists all five", PAGES.every(([path]) => sitemap.includes(`${path}</loc>`)));
  const home = await (await fetch(`${BASE}/`)).text();
  check("the footer links the four new pages", ["/adobe-licensing", "/autodesk-licensing", "/enterprise-it-hardware", "/corporate-it-solutions"].every((p) => home.includes(`href="${p}"`)));
  await context.close();
}

await browser.close();
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
