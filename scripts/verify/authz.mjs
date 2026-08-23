import { chromium } from "playwright";
import { execFileSync } from "node:child_process";

/**
 * Server-side authorisation over the CMS surfaces.
 *
 * Hiding a link in the admin navigation proves nothing: what matters is that a
 * SALES account cannot *invoke* a page, block or navigation write. Server
 * actions cannot be replayed with curl — the action id is bound into the client
 * bundle and the request format is Next's own — so this does something closer
 * to a real attack:
 *
 *   1. sign in as ADMIN and load the editor, so the page holds live, correctly
 *      bound action handles;
 *   2. swap the session cookie for a SALES one, leaving the page as it is;
 *   3. submit.
 *
 * The browser then posts a genuine, well-formed server action with a SALES
 * session attached — exactly what an attacker with a staff login and the
 * browser devtools would do. Every assertion checks the database afterwards
 * rather than the response, because a refusal that still wrote is not a
 * refusal.
 */

const BASE = process.env.BASE ?? "http://localhost:3000";
const results = [];
const check = (name, ok, detail = "") => results.push({ name, ok: Boolean(ok), detail });

const sql = (statement) =>
  execFileSync("su", ["postgres", "-c", `psql -tA -d ictlab -c ${JSON.stringify(statement)}`], {
    encoding: "utf8",
  }).trim();

const stamp = Date.now().toString().slice(-6);

// ------------------------------------------------------------ a SALES account
const salesEmail = `authz_sales${stamp}@example.test`;
const salesPassword = "CorrectHorse9";

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });

async function register(context, email) {
  const page = await context.newPage();
  await page.goto(`${BASE}/register`, { waitUntil: "load" });
  await page.getByLabel("Full name").fill("Authz Probe");
  await page.getByLabel("Business email").fill(email);
  await page.getByLabel("Company name").fill("Authz Ltd");
  await page.getByLabel("Password").fill(salesPassword);
  await page.getByRole("button", { name: /Create account|Register|Sign up/i }).first().click();
  await page.waitForTimeout(2000);
  await page.close();
}

async function signIn(context, email, password) {
  const page = await context.newPage();
  await page.goto(`${BASE}/login`, { waitUntil: "load" });
  await page.getByLabel("Business email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(/\/(admin|account)/, { timeout: 15000 });
  await page.close();
}

const salesContext = await browser.newContext();
await register(salesContext, salesEmail);
sql(`update "User" set role='SALES' where email='${salesEmail}'`);
await salesContext.clearCookies();
await signIn(salesContext, salesEmail, salesPassword);

const salesCookies = (await salesContext.cookies()).filter((c) => /session/i.test(c.name));
check("the SALES fixture holds a session", salesCookies.length > 0);

// ------------------------------------------------- the screens are not reachable
{
  const page = await salesContext.newPage();
  for (const path of ["/admin/pages", "/admin/pages/new", "/admin/navigation"]) {
    await page.goto(`${BASE}${path}`, { waitUntil: "load" });
    check(`SALES cannot open ${path}`, !new URL(page.url()).pathname.startsWith(path), page.url());
  }
  await page.goto(`${BASE}/admin`, { waitUntil: "load" });
  const nav = await page.locator("nav[aria-label='Admin']").innerText();
  check("neither screen is offered to SALES in the admin menu",
    !nav.includes("Pages") && !nav.includes("Navigation"), nav.replace(/\s+/g, " "));
  await page.close();
}

// ------------------------- an ADMIN page, submitted with a SALES session
const admin = await browser.newContext({ viewport: { width: 1440, height: 1200 } });
await signIn(admin, process.env.ADMIN_EMAIL ?? "admin@example.test",
  process.env.ADMIN_PASSWORD ?? "ChangeMe!Admin123");
const adminCookies = await admin.cookies();

/** Replaces the session cookie with the SALES one, leaving the page loaded. */
async function becomeSales(context) {
  await context.clearCookies();
  await context.addCookies([
    ...adminCookies.filter((c) => !/session/i.test(c.name)),
    ...salesCookies,
  ]);
}
async function becomeAdmin(context) {
  await context.clearCookies();
  await context.addCookies(adminCookies);
}

/**
 * A positive control, and the reason the rest of this file means anything.
 *
 * If the cookie swap simply logged the browser out, every "nothing was
 * written" assertion below would pass for the wrong reason. So: the same
 * submission, with the ADMIN session, must write — and the swapped session
 * must still be a signed-in staff session, just the wrong one.
 */
{
  const page = await admin.newPage();
  await page.goto(`${BASE}/admin/navigation`, { waitUntil: "load" });

  const before = sql('select count(*) from "NavigationItem"');
  const form = page
    .locator("main")
    .locator("form")
    .filter({ has: page.getByRole("button", { name: "Add to this menu" }) })
    .first();
  await form.locator('input[name="label"]').fill(`Control ${stamp}`);
  await form.locator('input[name="href"]').fill("/control");
  await form.getByRole("button", { name: "Add to this menu" }).click();
  await page.waitForTimeout(2500);
  const after = sql('select count(*) from "NavigationItem"');
  check("control: the same submission as ADMIN does write",
    Number(after) === Number(before) + 1, `${before} -> ${after}`);

  /*
   * Removed through the editor rather than with a DELETE.
   *
   * A raw delete takes the row and leaves `tags.navigation` holding it, so the
   * header goes on rendering a link to a page that does not exist — which is
   * what `verify:crawl` then reports as a broken link, from a fixture that the
   * database says was cleaned up. A cache is only invalidated by the code that
   * knows it should be.
   */
  const itemId = sql(`select id from "NavigationItem" where label='Control ${stamp}'`);
  // By id, not by text: each row's Remove form holds only a hidden `itemId` and
  // its button, so the label sits outside the form and `hasText` never matches.
  const remove = page
    .locator("main")
    .locator("form")
    .filter({ has: page.getByRole("button", { name: "Remove" }) })
    .filter({ has: page.locator(`input[name="itemId"][value="${itemId}"]`) })
    .first();
  await remove.getByRole("button", { name: "Remove" }).click();
  await page.waitForTimeout(2500);
  check(
    "control: and the editor removes it, invalidating the cached menu",
    sql(`select count(*) from "NavigationItem" where label='Control ${stamp}'`) === "0",
  );

  await becomeSales(admin);
  await page.goto(`${BASE}/admin`, { waitUntil: "load" });
  const url = new URL(page.url()).pathname;
  const nav = await page.locator("nav[aria-label='Admin']").innerText();
  check("control: after the swap the browser is signed in, as SALES",
    url === "/admin" && nav.includes("Enquiries") && !nav.includes("Navigation"),
    `${url} — ${nav.replace(/\s+/g, " ").slice(0, 90)}`);

  await becomeAdmin(admin);
  await page.close();
}

// --- navigation write
{
  const page = await admin.newPage();
  await page.goto(`${BASE}/admin/navigation`, { waitUntil: "load" });

  const before = sql('select count(*) from "NavigationItem"');
  await becomeSales(admin);

  const form = page
    .locator("main")
    .locator("form")
    .filter({ has: page.getByRole("button", { name: "Add to this menu" }) })
    .first();
  await form.locator('input[name="label"]').fill(`Authz ${stamp}`);
  await form.locator('input[name="href"]').fill("/authz");
  await form.getByRole("button", { name: "Add to this menu" }).click();
  await page.waitForTimeout(2500);

  const after = sql('select count(*) from "NavigationItem"');
  check("a navigation write with a SALES session does not create the row",
    before === after, `${before} -> ${after}`);
  check("the link never reaches the public menu",
    !(await (await fetch(`${BASE}/`)).text()).includes(`Authz ${stamp}`));

  await becomeAdmin(admin);
  await page.close();
}

// --- navigation delete
{
  const page = await admin.newPage();
  await page.goto(`${BASE}/admin/navigation`, { waitUntil: "load" });

  const before = sql('select count(*) from "NavigationItem"');
  await becomeSales(admin);
  await page.locator("main").getByRole("button", { name: "Remove" }).first().click();
  await page.waitForTimeout(2500);
  const after = sql('select count(*) from "NavigationItem"');
  check("a navigation delete with a SALES session removes nothing",
    before === after, `${before} -> ${after}`);

  await becomeAdmin(admin);
  await page.close();
}

// --- page metadata write
{
  const page = await admin.newPage();
  await page.goto(`${BASE}/admin/pages/new`, { waitUntil: "load" });

  const before = sql('select count(*) from "Page"');
  await becomeSales(admin);
  await page.getByLabel("Title").fill(`Authz page ${stamp}`);
  await page.getByLabel("URL path").fill(`authz-${stamp}`);
  await page.getByRole("button", { name: /Create page/i }).click();
  await page.waitForTimeout(2500);

  const after = sql('select count(*) from "Page"');
  check("a page create with a SALES session does not create the page",
    before === after, `${before} -> ${after}`);
  const status = (await fetch(`${BASE}/authz-${stamp}`, { redirect: "manual" })).status;
  check("the page it tried to create is not public", status === 404, `status ${status}`);

  await becomeAdmin(admin);
  await page.close();
}

// --- block write on an existing page
{
  const pageId = sql(`select id from "Page" where slug='about' and "deletedAt" is null limit 1`);
  const page = await admin.newPage();
  await page.goto(`${BASE}/admin/pages/${pageId}`, { waitUntil: "load" });

  const before = sql(`select count(*) from "PageSection" where "pageId"='${pageId}'`);
  await becomeSales(admin);
  await page.getByLabel("Block type").selectOption({ label: "Rich text" });
  await page.getByRole("button", { name: "Add block" }).click();
  await page.waitForTimeout(2500);
  const after = sql(`select count(*) from "PageSection" where "pageId"='${pageId}'`);
  check("a block add with a SALES session adds nothing", before === after, `${before} -> ${after}`);

  await becomeAdmin(admin);
  await page.close();
}

// ---------------------------------- unpublished and archived pages stay private
{
  const draftSlug = `authz-draft-${stamp}`;
  const archivedSlug = `authz-archived-${stamp}`;
  sql(
    `insert into "Page" (id,slug,title,description,keywords,breadcrumb,status,"createdAt","updatedAt") ` +
      `values ('authzd${stamp}','${draftSlug}','Authz draft','d','{}','[]','DRAFT',now(),now()), ` +
      `('authza${stamp}','${archivedSlug}','Authz archived','a','{}','[]','PUBLISHED',now(),now())`,
  );
  sql(`update "Page" set "deletedAt"=now() where slug='${archivedSlug}'`);

  for (const [what, slug] of [["a DRAFT", draftSlug], ["an archived", archivedSlug]]) {
    const status = (await fetch(`${BASE}/${slug}`, { redirect: "manual" })).status;
    check(`${what} page 404s when its slug is guessed`, status === 404, `status ${status}`);
  }

  const map = await (await fetch(`${BASE}/sitemap.xml`)).text();
  check("neither appears in the sitemap", !map.includes(draftSlug) && !map.includes(archivedSlug));

  sql(`delete from "Page" where slug in ('${draftSlug}','${archivedSlug}')`);
}

// ------------------------------------------------------------------- clean up
sql(`delete from "User" where email='${salesEmail}'`);
await browser.close();

for (const r of results) console.log(`${r.ok ? "  ✓" : "  ✗"} ${r.name}${!r.ok && r.detail ? ` — ${r.detail}` : ""}`);
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} authorisation checks passed`);
process.exit(failed ? 1 : 0);
