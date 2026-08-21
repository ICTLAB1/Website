import { chromium } from "playwright";
import { execFileSync } from "node:child_process";

/**
 * The acceptance test for the whole body of work.
 *
 * One administrator, one session, no deploy: create a page, add and reorder
 * blocks, publish it, point a navigation link at it, and confirm the result
 * reaches every public surface that should know about it — the page itself,
 * the menu on every other page, the sitemap, and the page's own SEO metadata.
 *
 * The individual editor suites prove each screen works. This proves the parts
 * add up to the thing the brief actually asked for: a site that can be managed
 * without changing code.
 */

const BASE = process.env.BASE ?? "http://localhost:3000";
const results = [];
const check = (name, ok, detail = "") => results.push({ name, ok: Boolean(ok), detail });

const stamp = Date.now().toString().slice(-6);
const slug = `acceptance-${stamp}`;
const title = `Acceptance ${stamp}`;
const headline = `Headline ${stamp}`;
const bodyText = `Body paragraph ${stamp}.`;
const navLabel = `Acceptance link ${stamp}`;

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const admin = await browser.newContext({ viewport: { width: 1440, height: 1200 } });
const page = await admin.newPage();

await page.goto(`${BASE}/login`, { waitUntil: "load" });
await page.getByLabel("Business email").fill(process.env.ADMIN_EMAIL ?? "admin@example.test");
await page.getByLabel("Password").fill(process.env.ADMIN_PASSWORD ?? "ChangeMe!Admin123");
await page.getByRole("button", { name: "Sign in" }).click();
await page.waitForURL("**/admin", { timeout: 15000 });

// The build that is serving these requests predates this page by definition —
// which is the point. Nothing below involves a redeploy.
const beforeStatus = (await fetch(`${BASE}/${slug}`, { redirect: "manual" })).status;
check("the path 404s before the page exists", beforeStatus === 404, `status ${beforeStatus}`);

// ------------------------------------------------------------ create a page
await page.goto(`${BASE}/admin/pages/new`, { waitUntil: "load" });
await page.getByLabel("Title").fill(title);
await page.getByLabel("URL path").fill(slug);
await page.getByLabel("Meta description").fill(`Created end to end by the acceptance suite, run ${stamp}.`);
await page.getByRole("button", { name: /Create page/i }).click();
await page.waitForURL((url) => /\/admin\/pages\/[a-z0-9]{20,}$/.test(url.pathname), { timeout: 15000 });
const editorUrl = page.url();

// ------------------------------------------------------------- add blocks
for (const type of ["Rich text", "Hero"]) {
  await page.goto(editorUrl, { waitUntil: "load" });
  await page.getByLabel("Block type").selectOption({ label: type });
  await page.getByRole("button", { name: "Add block" }).click();
  await page.waitForTimeout(1500);
}

await page.goto(editorUrl, { waitUntil: "load" });
await page.locator('textarea[name="markdown"]').first().fill(bodyText);
await page.locator('form:has(textarea[name="markdown"])').getByRole("button", { name: "Save block" }).click();
await page.waitForTimeout(1500);

await page.goto(editorUrl, { waitUntil: "load" });
await page.locator('input[name="headline"]').first().fill(headline);
await page.locator('form:has(input[name="headline"])').getByRole("button", { name: "Save block" }).click();
await page.waitForTimeout(1500);

// ------------------------------------------------ reorder: hero above body
await page.goto(editorUrl, { waitUntil: "load" });
const blockTypes = async () =>
  (await page.locator("main ol > li").allInnerTexts()).map((text) => text.split("\n")[1]?.trim());
const orderBefore = await blockTypes();
await page.locator("main ol > li").nth(1).getByRole("button", { name: "↑" }).click();
await page.waitForTimeout(1500);
await page.goto(editorUrl, { waitUntil: "load" });
const orderAfter = await blockTypes();
check("blocks reorder in the editor",
  orderBefore.join(">") !== orderAfter.join(">") && orderAfter[0] === "Hero",
  `${orderBefore.join(" > ")}  ->  ${orderAfter.join(" > ")}`);

const draftStatus = (await fetch(`${BASE}/${slug}`, { redirect: "manual" })).status;
check("the page stays private while it is a draft", draftStatus === 404, `status ${draftStatus}`);

// ---------------------------------------------------------------- publish
await page.goto(editorUrl, { waitUntil: "load" });
await page.getByLabel("Status").selectOption("PUBLISHED");
await page.getByRole("button", { name: /Save page/i }).click();
await page.waitForTimeout(2000);

// -------------------------------------------------- point the menu at it
await page.goto(`${BASE}/admin/navigation`, { waitUntil: "load" });
const utilityForm = page
  .locator("main")
  .locator("section")
  .filter({ has: page.getByRole("heading", { name: "Utility bar", exact: true }) })
  .locator("form")
  .filter({ has: page.getByRole("button", { name: "Add to this menu" }) })
  .first();
await utilityForm.locator('input[name="label"]').fill(navLabel);
await utilityForm.locator('input[name="href"]').fill(`/${slug}`);
await utilityForm.getByRole("button", { name: "Add to this menu" }).click();
await page.waitForTimeout(2500);

// ------------------------------------------------- what a visitor now sees
const visitor = await (await browser.newContext()).newPage();

await visitor.goto(`${BASE}/${slug}`, { waitUntil: "load" });
const rendered = await visitor.locator("main").innerText();
check("the new page is live, with no redeploy", rendered.includes(headline), rendered.replace(/\s+/g, " ").slice(0, 120));
check("both blocks render", rendered.includes(bodyText));
check("they render in the order the editor showed",
  rendered.indexOf(headline) < rendered.indexOf(bodyText));

const head = await visitor.evaluate(() => ({
  title: document.title,
  description: document.querySelector('meta[name="description"]')?.content ?? "",
  canonical: document.querySelector('link[rel="canonical"]')?.href ?? "",
  robots: document.querySelector('meta[name="robots"]')?.content ?? "",
}));
check("its SEO metadata comes from the record", head.title.includes(title), head.title);
check("the meta description is the one that was typed", head.description.includes(stamp), head.description);
check("it declares a canonical URL", head.canonical.endsWith(`/${slug}`), head.canonical);
check("it is indexable", !/noindex/.test(head.robots), head.robots || "(none)");

// The menu is rendered by the layout, so this checks a *different* page.
await visitor.goto(`${BASE}/products`, { waitUntil: "load" });
const link = visitor.locator("header").getByRole("link", { name: navLabel }).first();
check("the new link appears in the menu on every page", (await link.count()) > 0);
if ((await link.count()) > 0) {
  check("and it points at the new page", (await link.getAttribute("href")) === `/${slug}`);
  await link.click();
  await visitor.waitForURL(`**/${slug}`, { timeout: 10000 });
  check("following it arrives at the page", (await visitor.locator("main").innerText()).includes(headline));
}

const sitemap = await (await fetch(`${BASE}/sitemap.xml`)).text();
check("the page is listed in the sitemap", sitemap.includes(`/${slug}<`), "");
check("it is listed exactly once",
  (sitemap.match(new RegExp(`/${slug}<`, "g")) ?? []).length === 1);

// --------------------------------------------- unpublishing reverses it all
await page.goto(editorUrl, { waitUntil: "load" });
await page.getByRole("button", { name: /Archive page/i }).click();
await page.waitForTimeout(2000);

const archivedStatus = (await fetch(`${BASE}/${slug}`, { redirect: "manual" })).status;
check("archiving takes the page off the public site", archivedStatus === 404, `status ${archivedStatus}`);
check("and out of the sitemap", !(await (await fetch(`${BASE}/sitemap.xml`)).text()).includes(`/${slug}<`));

// ---------------------------------------------------------------- clean up
await page.goto(`${BASE}/admin/navigation`, { waitUntil: "load" });
await page
  .locator("main")
  .getByText(navLabel, { exact: true })
  .first()
  .locator("xpath=ancestor::li[1]")
  .locator('form:has(button:text-is("Remove"))')
  .first()
  .getByRole("button", { name: "Remove" })
  .click();
await page.waitForTimeout(1500);
check("the test link is removed again",
  !(await (await fetch(`${BASE}/`)).text()).includes(navLabel));

// Archiving is a soft delete, which is right for real content and wrong for a
// fixture: a run that crashes before this point otherwise leaves a live draft
// behind, and the next content export would carry it into the seed file.
try {
  execFileSync("su", [
    "postgres",
    "-c",
    `psql -q -d ictlab -c "delete from \\"Page\\" where slug like 'acceptance-%'"`,
  ]);
  check("the fixture page is removed from the database", true);
} catch (error) {
  check("the fixture page is removed from the database", false, String(error).slice(0, 120));
}

/*
 * And wait for the sitemap to stop advertising it.
 *
 * Deleting the row straight out of Postgres is right for a fixture but it
 * bypasses `revalidateTag`, so the sitemap keeps listing the slug until the
 * cache entry ages out. A crawl started in that window finds the sitemap
 * pointing at a page that 404s — which is exactly what happened, and cost some
 * time chasing a link nothing had ever written.
 *
 * Polling here bounds the fixture's lifetime to this script rather than leaving
 * it to leak into whatever runs next.
 */
let advertised = true;
for (let attempt = 0; attempt < 40 && advertised; attempt += 1) {
  advertised = (await (await fetch(`${BASE}/sitemap.xml`)).text()).includes(slug);
  if (advertised) await new Promise((resolve) => setTimeout(resolve, 2000));
}
check("the sitemap stops advertising the removed fixture", !advertised);

await browser.close();
for (const r of results) console.log(`${r.ok ? "  ✓" : "  ✗"} ${r.name}${!r.ok && r.detail ? ` — ${r.detail}` : ""}`);
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} acceptance checks passed`);
process.exit(failed ? 1 : 0);
