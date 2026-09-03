import { chromium } from "playwright";

/**
 * Exercises the generic admin CRUD framework end to end and, critically,
 * checks that each change reaches the public site without a redeploy.
 */
const BASE = process.env.BASE ?? "http://localhost:3000";
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const results = [];
const check = (name, ok, detail = "") => results.push({ name, ok: Boolean(ok), detail });

const staff = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await staff.newPage();
await page.goto(`${BASE}/login`, { waitUntil: "load" });
await page.getByLabel("Business email").fill(process.env.ADMIN_EMAIL ?? "admin@example.test");
await page.getByLabel("Password").fill(process.env.ADMIN_PASSWORD ?? "ChangeMe!Admin123");
await page.getByRole("button", { name: "Sign in" }).click();
await page.waitForURL("**/admin", { timeout: 15000 });

const anon = async () => (await browser.newContext()).newPage();
const stamp = Date.now().toString().slice(-6);

// ---------------------------------------------------------------- create
await page.goto(`${BASE}/admin/banners/new`, { waitUntil: "load" });
await page.getByLabel("Internal name").fill(`Verify banner ${stamp}`);
await page.getByLabel("Message").fill(`Automated verification banner ${stamp}`);
await page.getByRole("button", { name: /Create banner/i }).click();
// Must not match /admin/banners/new: a failed create stays on that URL and
// would otherwise look like a successful redirect.
try {
  await page.waitForURL((url) => /\/admin\/banners\/[a-z0-9]{20,}$/.test(url.pathname), { timeout: 15000 });
} catch {
  const message = (await page.locator("body").innerText()).replace(/\s+/g, " ").slice(0, 200);
  check("create redirects to the new record", false, `still at ${page.url()} — ${message}`);
}
check("create redirects to the new record", /\/admin\/banners\/[a-z0-9]{20,}$/.test(new URL(page.url()).pathname), page.url());

const bannerUrl = page.url();
await page.goto(`${BASE}/admin/banners`, { waitUntil: "load" });
check("new record appears in the list", (await page.locator("body").innerText()).includes(stamp));

// ------------------------------------------------------- edit round-trips
await page.goto(bannerUrl, { waitUntil: "load" });
check("edit form is populated from the database",
  (await page.getByLabel("Internal name").inputValue()) === `Verify banner ${stamp}`);
/*
 * .clear() before .fill(), not .fill() alone.
 *
 * The very first scripted interaction with a freshly-hydrated, uncontrolled
 * <textarea> in this browser build leaves .fill()'s own select-all step
 * selecting nothing, so the new text lands at position 0 instead of
 * replacing the field — "Edited 123Original text" rather than "Edited 123".
 * Confirmed browser-automation-only: a real Ctrl+A in the same field selects
 * correctly, and .fill() on the same element a second time also replaces
 * correctly, so this is specific to first touch. .clear() performs that
 * first interaction safely, and the .fill() that follows is then the second
 * touch and behaves normally.
 */
await page.getByLabel("Message").clear();
await page.getByLabel("Message").fill(`Edited ${stamp}`);
await page.getByRole("button", { name: /Save banner/i }).click();
await page.waitForTimeout(1500);
await page.reload({ waitUntil: "load" });
check("edit persists", (await page.getByLabel("Message").inputValue()) === `Edited ${stamp}`);

// ------------------------------------------------ validation is enforced
// Whitespace passes the browser's own `required` check, so this reaches the
// server - which is the validation that actually matters, since HTML5
// validation is trivially bypassed.
await page.goto(`${BASE}/admin/banners/new`, { waitUntil: "load" });
await page.getByLabel("Internal name").fill("   ");
await page.getByLabel("Message").fill("   ");
await page.getByRole("button", { name: /Create banner/i }).click();
await page.waitForTimeout(1500);
check("server rejects whitespace-only required fields",
  (await page.locator("body").innerText()).includes("correct the highlighted fields"),
  (await page.locator("body").innerText()).replace(/\s+/g, " ").slice(0, 160));

// --------------------------------- slug clash is caught, not 500'd
await page.goto(`${BASE}/admin/brands/new`, { waitUntil: "load" });
await page.getByLabel("Name").fill("Microsoft");
await page.getByLabel("URL slug").fill("microsoft");
await page.getByLabel("Summary").fill("Duplicate slug attempt.");
await page.getByLabel("Description").fill("Duplicate slug attempt.");
await page.getByLabel("Logo text").fill("MS");
await page.getByRole("button", { name: /Create brand/i }).click();
await page.waitForTimeout(1500);
check("duplicate slug is refused with a field error",
  (await page.locator("body").innerText()).includes("already in use"));

// ------------------------- editing a brand reaches the public site
await page.goto(`${BASE}/admin/brands`, { waitUntil: "load" });
await page.getByRole("link", { name: "Adobe", exact: true }).first().click();
await page.waitForTimeout(800);
const taglineField = page.getByLabel("Tagline");
const originalTagline = await taglineField.inputValue();
await taglineField.fill(`Verified ${stamp}`);
await page.getByRole("button", { name: /Save brand/i }).click();
await page.waitForTimeout(2000);

const visitor = await anon();
await visitor.goto(`${BASE}/brands/adobe`, { waitUntil: "load" });
check("brand edit is live on the public page without a redeploy",
  (await visitor.locator("body").innerText()).includes(`Verified ${stamp}`));

// Restore.
await page.goto(`${BASE}/admin/brands`, { waitUntil: "load" });
await page.getByRole("link", { name: "Adobe", exact: true }).first().click();
await page.waitForTimeout(800);
await page.getByLabel("Tagline").fill(originalTagline);
await page.getByRole("button", { name: /Save brand/i }).click();
await page.waitForTimeout(1500);

// ------------------- archiving a brand with active products is refused
await page.goto(`${BASE}/admin/brands`, { waitUntil: "load" });
await page.getByRole("link", { name: "Microsoft", exact: true }).first().click();
await page.waitForTimeout(800);
await page.getByRole("button", { name: /Archive brand/i }).click();
await page.waitForTimeout(1500);
check("archiving a brand with active products is refused",
  (await page.locator("body").innerText()).includes("still has"));

// ----------------------------------------------- delete the test banner
await page.goto(bannerUrl, { waitUntil: "load" });
await page.getByRole("button", { name: /Delete banner/i }).click();
await page.waitForTimeout(1500);
await page.goto(`${BASE}/admin/banners`, { waitUntil: "load" });
check("delete removes the record", !(await page.locator("body").innerText()).includes(stamp));

await browser.close();
for (const r of results) console.log(`${r.ok ? "  ✓" : "  ✗"} ${r.name}${!r.ok && r.detail ? ` — ${r.detail}` : ""}`);
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} admin CRUD checks passed`);
process.exit(failed ? 1 : 0);
