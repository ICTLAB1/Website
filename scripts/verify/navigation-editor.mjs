import { chromium } from "playwright";

/**
 * Exercises the navigation editor the way an administrator would.
 *
 * The point is that a menu change reaches the public header without a deploy,
 * that a dangerous href is refused rather than stored, and that removing a
 * heading takes its children with it.
 *
 * Authorisation is proved server-side in `attack.sh`, which already has a
 * SALES fixture and posts to the actions directly — a screen a role cannot
 * reach is worth much less than an action it cannot invoke.
 */
const BASE = process.env.BASE ?? "http://localhost:3000";
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const results = [];
const check = (name, ok, detail = "") => results.push({ name, ok: Boolean(ok), detail });

const stamp = Date.now().toString().slice(-6);
const label = `Verify ${stamp}`;
const childLabel = `Verify child ${stamp}`;

const admin = await browser.newContext({ viewport: { width: 1440, height: 1200 } });
const page = await admin.newPage();
await page.goto(`${BASE}/login`, { waitUntil: "load" });
await page.getByLabel("Business email").fill(process.env.ADMIN_EMAIL ?? "admin@example.test");
await page.getByLabel("Password").fill(process.env.ADMIN_PASSWORD ?? "ChangeMe!Admin123");
await page.getByRole("button", { name: "Sign in" }).click();
await page.waitForURL("**/admin", { timeout: 15000 });

const editor = `${BASE}/admin/navigation`;
const open = () => page.goto(editor, { waitUntil: "load" });

/**
 * Everything is scoped to `main`.
 *
 * The admin layout renders the live site header, so a link created by this
 * suite appears twice on the page: once in the editor and once in the header
 * it is editing. Unscoped locators find the header copy — which has no edit
 * controls — and time out.
 */
const editorRoot = () => page.locator("main");

/** The "add a top-level item" form belonging to the named menu panel. */
const topLevelForm = (menuTitle) =>
  editorRoot()
    .locator("section")
    .filter({ has: page.getByRole("heading", { name: menuTitle, exact: true }) })
    .locator("form")
    .filter({ has: page.getByRole("button", { name: "Add to this menu" }) })
    .first();

/**
 * The panel for a link, found from its label rather than by position.
 *
 * `filter({ hasText })` matches an ancestor's whole text, so a nested list
 * makes it ambiguous; walking up from the label element itself lands on
 * exactly one row.
 */
const rowFor = (text) =>
  editorRoot().getByText(text, { exact: true }).first().locator("xpath=ancestor::li[1]");

const removeRow = async (row) => {
  await row.locator('form:has(button:text-is("Remove"))').first()
    .getByRole("button", { name: "Remove" }).click();
  await page.waitForTimeout(1200);
};

// Clear anything an interrupted earlier run left behind, so the suite starts
// from a known menu rather than accumulating test links.
await open();
for (let guard = 0; guard < 20; guard += 1) {
  const stale = editorRoot().getByText(/^Verify (child )?\d{6}$/).first();
  if ((await stale.count()) === 0) break;
  await removeRow(stale.locator("xpath=ancestor::li[1]"));
  await open();
}

check("the editor renders all three menus",
  (await editorRoot().getByRole("button", { name: "Add to this menu" }).count()) === 3);

// ------------------------------------------------- a dangerous href is refused
{
  const form = topLevelForm("Utility bar");
  await form.locator('input[name="label"]').fill(`Bad ${stamp}`);
  await form.locator('input[name="href"]').fill("javascript:alert(1)");
  await form.getByRole("button", { name: "Add to this menu" }).click();
  await page.waitForTimeout(1500);
  const body = await page.locator("body").innerText();
  check("a javascript: href is refused with a reason",
    /Use a path starting with|correct the highlighted/i.test(body), body.replace(/\s+/g, " ").slice(0, 160));

  const leaked = await (await fetch(`${BASE}/`)).text();
  check("the refused link never reached the public header", !leaked.includes(`Bad ${stamp}`));
}

// ---------------------------------------------------------- add a real link
{
  await open();
  const form = topLevelForm("Header");
  await form.locator('input[name="label"]').fill(label);
  await form.locator('input[name="href"]').fill("/products");
  await form.getByRole("button", { name: "Add to this menu" }).click();
  await page.waitForTimeout(2000);

  const publicBody = await (await fetch(`${BASE}/`)).text();
  check("a new header link appears on the public site immediately", publicBody.includes(label));
}

/** The panel for the link this run created. */
const row = () => rowFor(label);

/**
 * The edit form for a row, as opposed to the add forms and the move/remove
 * buttons that share the same panel. Only the edit form carries a description
 * field, which makes it the one unambiguous selector here.
 */
const editForm = (scope) => scope.locator('form:has(input[name="description"])').first();

// ------------------------------------------------------------- edit the link
{
  await open();
  const form = editForm(row());
  await form.locator('input[name="href"]').fill("/brands");
  await form.getByRole("button", { name: "Save" }).click();
  await page.waitForTimeout(2000);

  await open();
  const href = await row().locator('input[name="href"]').first().inputValue();
  check("an edit to a link persists", href === "/brands", href);
}

// -------------------------------------------------------------- add a child
{
  await open();
  await row().locator("details").first().locator("summary").click();
  await page.waitForTimeout(300);
  const form = row().locator('form:has(button:text-is("Add beneath this item"))').first();
  await form.locator('input[name="label"]').fill(childLabel);
  await form.locator('input[name="href"]').fill("/services");
  await form.getByRole("button", { name: "Add beneath this item" }).click();
  await page.waitForTimeout(2000);

  const publicBody = await (await fetch(`${BASE}/`)).text();
  check("a child link appears in the public menu", publicBody.includes(childLabel));
}

// -------------------------------------------------------------- hide a link
{
  await open();
  const form = editForm(row());
  await form.getByLabel("Visible on the site").uncheck();
  await form.getByRole("button", { name: "Save" }).click();
  await page.waitForTimeout(2000);

  const publicBody = await (await fetch(`${BASE}/`)).text();
  check("hiding a link removes it from the public menu", !publicBody.includes(label));

  await open();
  check("a hidden link is still editable", (await row().count()) > 0);
}

// -------------------------------------------------- reorder within the menu
{
  /** Top-level labels of the header menu, in the order the editor lists them. */
  const order = async () => {
    await open();
    return editorRoot()
      .locator("section")
      .filter({ has: page.getByRole("heading", { name: "Header", exact: true }) })
      .locator("> ol > li > div > div > span.font-semibold")
      .allInnerTexts();
  };

  const before = await order();
  // The link this run created is last, so comparing the first entry would
  // prove nothing — its own index is what has to change.
  await row().locator('form:has(input[name="direction"][value="up"])').first()
    .getByRole("button", { name: "↑" }).click();
  await page.waitForTimeout(2000);
  const after = await order();

  check("moving a link up reorders the menu",
    before.indexOf(label) > 0 && after.indexOf(label) === before.indexOf(label) - 1,
    `index ${before.indexOf(label)} -> ${after.indexOf(label)}`);
  check("reordering moves only the two links involved",
    before.length === after.length && before.filter((x) => x !== label).join("|") === after.filter((x) => x !== label).join("|"));
}

// ----------------------------------- removing a heading takes its children
{
  await open();
  await open();
  // The screen says so before the click, which is the only point at which the
  // warning is any use: the delete refreshes the tree, so the row that would
  // carry a message afterwards no longer exists.
  check("the editor warns that removing an item cascades",
    (await editorRoot().innerText()).includes("Removing an item also removes everything beneath it"));

  await removeRow(row());
  await page.waitForTimeout(800);

  await open();
  check("the link is gone from the editor", (await editorRoot().getByText(label, { exact: true }).count()) === 0);
  check("its child is gone too", (await editorRoot().getByText(childLabel, { exact: true }).count()) === 0);

  const publicBody = await (await fetch(`${BASE}/`)).text();
  check("neither reaches the public site", !publicBody.includes(label) && !publicBody.includes(childLabel));
}

await browser.close();
for (const r of results) console.log(`${r.ok ? "  ✓" : "  ✗"} ${r.name}${!r.ok && r.detail ? ` — ${r.detail}` : ""}`);
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} navigation editor checks passed`);
process.exit(failed ? 1 : 0);
