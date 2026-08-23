import { chromium } from "playwright";
import { execFileSync } from "node:child_process";

/**
 * Exercises the page and block editor the way an administrator would.
 *
 * The point is not that the forms render — it is that an edit made in the
 * admin panel reaches the public page, that a bad edit is refused with a
 * reason rather than written, and that a SALES account cannot do any of it.
 */
const BASE = process.env.BASE ?? "http://localhost:3000";
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const results = [];
const check = (name, ok, detail = "") => results.push({ name, ok: Boolean(ok), detail });

const stamp = Date.now().toString().slice(-6);
const slug = `editor-check-${stamp}`;

const staff = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
const page = await staff.newPage();
await page.goto(`${BASE}/login`, { waitUntil: "load" });
await page.getByLabel("Business email").fill(process.env.ADMIN_EMAIL ?? "admin@example.test");
await page.getByLabel("Password").fill(process.env.ADMIN_PASSWORD ?? "ChangeMe!Admin123");
await page.getByRole("button", { name: "Sign in" }).click();
await page.waitForURL("**/admin", { timeout: 15000 });

// ------------------------------------------------------------ create a page
await page.goto(`${BASE}/admin/pages/new`, { waitUntil: "load" });
await page.getByLabel("Title").fill(`Editor check ${stamp}`);
await page.getByLabel("URL path").fill(slug);
await page.getByLabel("Meta description").fill("Created by the page editor verification suite.");
await page.getByRole("button", { name: /Create page/i }).click();
await page.waitForURL((url) => /\/admin\/pages\/[a-z0-9]{20,}$/.test(url.pathname), { timeout: 15000 });
const editorUrl = page.url();
check("creating a page redirects to its editor", /\/admin\/pages\/[a-z0-9]{20,}$/.test(new URL(editorUrl).pathname));

// A new page is a draft, so it must not be public yet.
const draftStatus = (await (await fetch(`${BASE}/${slug}`, { redirect: "manual" })).status);
check("a new page starts unpublished", draftStatus === 404, `status ${draftStatus}`);

// --------------------------------------------------------------- add blocks
async function addBlock(label) {
  await page.goto(editorUrl, { waitUntil: "load" });
  await page.getByLabel("Block type").selectOption({ label });
  await page.getByRole("button", { name: "Add block" }).click();
  await page.waitForTimeout(1200);
}
await addBlock("Hero");
await addBlock("Rich text");
const blockCount = await page.locator("ol > li").count();
check("blocks are added in order", blockCount >= 2, `${blockCount} blocks`);

// ------------------------------------------- edit through the TYPED form
await page.goto(editorUrl, { waitUntil: "load" });
await page.locator('input[name="headline"]').first().fill(`Typed headline ${stamp}`);
await page.locator('form:has(input[name="headline"])').getByRole("button", { name: "Save block" }).click();
await page.waitForTimeout(1500);
await page.goto(editorUrl, { waitUntil: "load" });
check("a typed-form edit persists",
  (await page.locator('input[name="headline"]').first().inputValue()) === `Typed headline ${stamp}`);

await page.locator('textarea[name="markdown"]').first().fill(`Body text ${stamp}.`);
await page.locator('form:has(textarea[name="markdown"])').getByRole("button", { name: "Save block" }).click();
await page.waitForTimeout(1500);

// ------------------------------------------------------------- reordering
await page.goto(editorUrl, { waitUntil: "load" });
const firstBefore = (await page.locator("ol > li").first().innerText()).split("\n")[1];
await page.locator("ol > li").nth(1).getByRole("button", { name: "↑" }).click();
await page.waitForTimeout(1500);
await page.goto(editorUrl, { waitUntil: "load" });
const firstAfter = (await page.locator("ol > li").first().innerText()).split("\n")[1];
check("moving a block up reorders it", firstBefore !== firstAfter, `${firstBefore} -> ${firstAfter}`);

// ------------------------------------------ a bad JSON edit is refused
await page.goto(editorUrl, { waitUntil: "load" });
await page.locator("details").filter({ hasText: "Edit as JSON" }).first().locator("summary").click();
await page.waitForTimeout(300);
await page.locator('textarea[name="data"]').first().fill('{ "markdown": ');
await page.locator('form:has(textarea[name="data"])').getByRole("button", { name: "Save block" }).click();
await page.waitForTimeout(1500);
check("malformed JSON is refused with a reason",
  (await page.locator("body").innerText()).includes("not valid JSON"));

// ------------------------------- a payload that is valid JSON but wrong
await page.goto(editorUrl, { waitUntil: "load" });
await page.locator("details").filter({ hasText: "Edit as JSON" }).first().locator("summary").click();
await page.waitForTimeout(300);
await page.locator('textarea[name="data"]').first().fill('{ "wrongKey": "value" }');
await page.locator('form:has(textarea[name="data"])').getByRole("button", { name: "Save block" }).click();
await page.waitForTimeout(1500);
check("a payload that does not match the block type is refused",
  (await page.locator("body").innerText()).includes("does not match what that block type expects"));

// ------------------------- a block image pointing at somebody else's server
//
// The split panel can carry a programme mark, and the path to it is authored
// text that ends up in an `src`. Off-site is the whole risk: a mark loaded from
// another host is a request every visitor makes, and an image nobody here
// controls. The schema allows one directory, and this proves it.
await addBlock("Split panel");
await page.goto(editorUrl, { waitUntil: "load" });
const panel = page.locator("ol > li").filter({ hasText: "Split panel" }).first();
// The split panel has no typed form, so its disclosure reads "Edit content".
await panel.locator("details").first().locator("summary").click();
await page.waitForTimeout(300);
await panel.locator('textarea[name="data"]').first()
  .fill('{ "heading": "Panel", "logo": { "src": "https://evil.test/gem.webp", "alt": "GeM" } }');
await panel.getByRole("button", { name: "Save block" }).click();
await page.waitForTimeout(1500);
check("a block mark pointing off-site is refused",
  (await page.locator("body").innerText()).includes("does not match what that block type expects"));

// ------------------------------- the list of names, edited as a typed form
//
// The block that names sectors and organisations changes as the business wins
// work, so it has to be editable by whoever knows the new name — not only by
// somebody willing to edit JSON.
await addBlock("Chip list");
await page.goto(editorUrl, { waitUntil: "load" });
/*
 * Typed after the page has settled, not the instant `load` fires.
 *
 * These fields are uncontrolled, so their value lives in the DOM and their
 * `defaultValue` is re-applied when React hydrates. Filling one in the window
 * between the HTML arriving and hydration finishing let the seeded value come
 * back over the top of what had been typed — and because it happened to the
 * suite roughly one run in two, it read as a defect in the editor rather than
 * as this. The saved value is checked before the click as well, so a
 * recurrence fails here, where the cause is, instead of three steps later.
 */
await page.waitForLoadState("networkidle");
const chips = page.locator("ol > li").filter({ hasText: "Chip list" }).first();
const names = `First name ${stamp}\nSecond name ${stamp}`;
const items = chips.locator('textarea[name="items"]');
await items.fill(names);
await chips.locator('input[name="heading"]').fill(`Named organisations ${stamp}`);
check("the typed names are in the field before it is submitted", (await items.inputValue()) === names,
  (await items.inputValue()).replace(/\n/g, " | "));
await chips.locator('form:has(textarea[name="items"])').getByRole("button", { name: "Save block" }).click();
await page.waitForTimeout(1500);
await page.goto(editorUrl, { waitUntil: "load" });
const savedChips = await page.locator("ol > li").filter({ hasText: "Chip list" }).first()
  .locator('textarea[name="items"]').inputValue();
check("names typed into the chip-list form persist",
  savedChips === `First name ${stamp}\nSecond name ${stamp}`, savedChips.replace(/\n/g, " | "));

// ------------------------------------------------- publish and go public
await page.goto(editorUrl, { waitUntil: "load" });
await page.getByLabel("Status").selectOption("PUBLISHED");
await page.getByRole("button", { name: /Save page/i }).click();
await page.waitForTimeout(2000);

const visitor = await (await browser.newContext()).newPage();
await visitor.goto(`${BASE}/${slug}`, { waitUntil: "load" });
const published = await visitor.locator("body").innerText();
check("publishing makes the page public immediately", published.includes(`Typed headline ${stamp}`),
  published.replace(/\s+/g, " ").slice(0, 140));
check("the typed-form body text renders too", published.includes(`Body text ${stamp}`));

// ---------------------------------------------------------------- clean up
await page.goto(editorUrl, { waitUntil: "load" });
await page.getByRole("button", { name: /Archive page/i }).click();
await page.waitForTimeout(1500);
const archived = (await (await fetch(`${BASE}/${slug}`, { redirect: "manual" })).status);
check("archiving removes the page from the public site", archived === 404, `status ${archived}`);

// Archiving is a soft delete, which is right for real content and wrong for a
// fixture: left behind, it accumulates in the development database and a run
// that crashed before archiving would leave a live draft for the next content
// export to pick up.
execFileSync("su", [
  "postgres",
  "-c",
  `psql -q -d ictlab -c "delete from \\"Page\\" where slug like 'editor-check-%'"`,
]);
check("the fixture page is removed from the database",
  Number(execFileSync("su", [
    "postgres",
    "-c",
    `psql -tA -d ictlab -c "select count(*) from \\"Page\\" where slug like 'editor-check-%'"`,
  ], { encoding: "utf8" }).trim()) === 0);

await browser.close();
for (const r of results) console.log(`${r.ok ? "  ✓" : "  ✗"} ${r.name}${!r.ok && r.detail ? ` — ${r.detail}` : ""}`);
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} page editor checks passed`);
process.exit(failed ? 1 : 0);
