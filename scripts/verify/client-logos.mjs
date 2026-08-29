import { chromium } from "playwright";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

/**
 * Customer logos, and the rule that keeps them off the site.
 *
 * This suite is almost entirely about the refusals, because the happy path is
 * the easy half and the failure mode is not a broken page — it is somebody
 * else's trademark published without their permission, which is not the kind of
 * bug you fix by rolling back.
 *
 * The rule under test is `mayShowClientLogo`: artwork on file, and Published.
 * The unit tests prove the function; this proves the whole path — that neither
 * one alone reaches a visitor through the query, the cache, the block and the
 * page, and that unpublishing takes a live mark back down.
 *
 * The permission date used to be a third condition and is now a record instead,
 * by the owner's decision. It is still exercised here, for the opposite reason:
 * to prove it does *not* gate anything, so nobody re-adds the requirement by
 * accident while tidying, and nobody is tempted to fill one in to get a mark
 * published.
 */

const BASE = process.env.BASE ?? "http://localhost:3000";
const results = [];
const check = (name, ok, detail = "") => {
  const result = { name, ok: Boolean(ok), detail };
  results.push(result);
  console.log(`  ${result.ok ? "✓" : "✗"} ${result.name}${result.ok || !result.detail ? "" : ` — ${result.detail}`}`);
};

const scratch = `/tmp/verify-client-logos-${process.pid}.sql`;
const sql = (statement) => {
  writeFileSync(scratch, statement, { mode: 0o644 });
  return execFileSync("su", ["postgres", "-c", `psql -tA -d ictlab -f ${scratch}`], {
    encoding: "utf8",
  }).trim();
};

const stamp = Date.now().toString().slice(-6);
const FIXTURE_HASH = "$2b$12$Y1EnHFQUoF4sKzWulgpRre1IGREZUDi/nFfN6QycEnigobTHRMj5e";
const password = "CorrectHorse9";
const staffEmail = `cl_staff${stamp}@example.test`;
const salesEmail = `cl_sales${stamp}@example.test`;
const clientName = `Probe Authority ${stamp}`;

// Anything an earlier run left behind, before adding one more. A leaked
// fixture here is a fake customer on the homepage.
const swept = sql(
  `with gone as (delete from "ClientLogo" where name like 'Probe Authority %' returning id) select count(*) from gone`,
);
if (swept !== "0") console.log(`  (swept ${swept} customer row(s) left by an earlier run)`);

const dir = mkdtempSync(join(tmpdir(), "client-logo-"));
const logoFile = join(dir, "mark.svg");
writeFileSync(
  logoFile,
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><rect width="48" height="48" fill="#c2410c"/></svg>',
);

sql(
  `insert into "User" (id, email, "passwordHash", name, role, "emailVerified", "createdAt", "updatedAt") values ('cls${stamp}', '${staffEmail}', '${FIXTURE_HASH}', 'Client Probe Admin', 'ADMIN', now(), now(), now())`,
);
sql(
  `insert into "User" (id, email, "passwordHash", name, role, "emailVerified", "createdAt", "updatedAt") values ('clx${stamp}', '${salesEmail}', '${FIXTURE_HASH}', 'Client Probe Sales', 'SALES', now(), now(), now())`,
);

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });

async function signIn(email) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1200 } });
  const page = await context.newPage();
  await page.goto(`${BASE}/login`, { waitUntil: "load" });
  await page.getByLabel("Business email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(/\/(admin|account)/, { timeout: 20000 });
  return { context, page };
}

/** Does the customer's name appear anywhere a visitor can see? */
async function onPublicHomepage() {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  await page.goto(BASE, { waitUntil: "load" });
  const html = await page.content();
  await context.close();
  return html.includes(clientName);
}

// ── SALES cannot reach it at all ────────────────────────────────────────────
{
  const { context, page } = await signIn(salesEmail);
  const response = await page.goto(`${BASE}/admin/clients`, { waitUntil: "load" });
  check(
    "SALES cannot reach the customer logos screen",
    !page.url().includes("/admin/clients") || (response?.status() ?? 0) >= 300,
    `landed on ${page.url()}`,
  );
  await context.close();
}

const { context, page } = await signIn(staffEmail);

// ── an admin creates one ────────────────────────────────────────────────────
await page.goto(`${BASE}/admin/clients/new`, { waitUntil: "load" });
check("an admin gets the customer logo form", page.url().includes("/admin/clients/new"));

await page.getByLabel("Customer name").fill(clientName);
await page.getByRole("button", { name: /Create|Save/ }).first().click();
await page.waitForTimeout(1500);

const createdId = sql(`select id from "ClientLogo" where name = '${clientName}'`);
check("the customer record is created", createdId.length > 0);
check(
  "and it is not published by default",
  sql(`select published::text from "ClientLogo" where name = '${clientName}'`) === "false",
);
check("a new customer does not appear on the site", !(await onPublicHomepage()));

// ── artwork alone is not enough ─────────────────────────────────────────────
await page.goto(`${BASE}/admin/clients/${createdId}`, { waitUntil: "load" });
await page.locator('input[type="file"]').first().setInputFiles(logoFile);
await page.getByRole("button", { name: /Upload logo/ }).click();
await page.waitForTimeout(2500);

check(
  "the logo is stored against the customer",
  sql(`select coalesce("logoUrl",'') from "ClientLogo" where id = '${createdId}'`).startsWith("/uploads/"),
);
check("artwork alone, unpublished, is not shown", !(await onPublicHomepage()));

// ── every state change goes through the admin form ──────────────────────────
/*
 * Through the form, not through SQL.
 *
 * A direct UPDATE writes the row and invalidates nothing, so the page keeps
 * serving whatever the data cache last held. The "not shown" assertions would
 * then pass for the wrong reason — a stale cache looks exactly like a rule
 * being enforced — and the "shown" one would fail for the wrong reason too.
 * Saving through the form exercises the invalidation this feature depends on,
 * which is the half a SQL fixture cannot reach.
 */
async function save({ confirmedOn, published }) {
  await page.goto(`${BASE}/admin/clients/${createdId}`, { waitUntil: "load" });
  await page.getByLabel("Permission confirmed on").fill(confirmedOn);
  const box = page.locator('input[name="published"]');
  if ((await box.isChecked()) !== published) await box.setChecked(published);
  await page.getByRole("button", { name: /Save/ }).first().click();
  await page.waitForTimeout(2000);
}

await save({ confirmedOn: "", published: true });
check(
  "artwork and a publish are enough — no permission date needed",
  await onPublicHomepage(),
);

await save({ confirmedOn: "2026-08-01", published: false });
check("a recorded permission does not publish it on its own", !(await onPublicHomepage()));

await save({ confirmedOn: "2026-08-01", published: true });
check("published with the permission recorded as well, still shown", await onPublicHomepage());

// The mark carries the customer's name as its alt text, which is the only
// accessible name it has — the belt shows no text beside a logo.
{
  const named = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const shown = await named.newPage();
  await shown.goto(BASE, { waitUntil: "load" });
  /*
   * Either presentation. The section is a wall today and was a belt last
   * week; which one it is, is a setting on the block, and this suite is about
   * the permission rule rather than the layout. Pinning the selector to `.belt`
   * made it fail the day the homepage switched to a wall, reporting a missing
   * alt attribute for a mark that was rendering perfectly.
   */
  const marks = await shown
    .locator(`.belt img[alt="${clientName}"], .logo-wall__mark[alt="${clientName}"]`)
    .count();
  check("the customer's mark is named for assistive technology", marks > 0, `${marks} found`);

  // Not a link. A customer's mark is evidence of the relationship, not an
  // advertisement for the customer.
  const linked = await shown.evaluate(
    (name) =>
      [...document.querySelectorAll(".belt a img, .logo-wall__cell a img")].filter(
        (img) => img.alt === name,
      ).length,
    clientName,
  );
  check("the customer's mark is not a link", linked === 0, `${linked} linked`);
  await named.close();
}

// ── clearing the date changes nothing; unpublishing takes it down ──────────
await save({ confirmedOn: "", published: true });
check("clearing the permission date does not take the mark down", await onPublicHomepage());

await save({ confirmedOn: "", published: false });
check("unpublishing takes the mark down again", !(await onPublicHomepage()));

await context.close();
await browser.close();

// ── clean up ────────────────────────────────────────────────────────────────
sql(`delete from "AuditLog" where "entityId" = '${createdId}'`);
sql(`delete from "ClientLogo" where id = '${createdId}'`);
sql(`delete from "Session" where "userId" in ('cls${stamp}', 'clx${stamp}')`);
sql(`delete from "User" where id in ('cls${stamp}', 'clx${stamp}')`);
rmSync(scratch, { force: true });
rmSync(dir, { recursive: true, force: true });

const failed = results.filter((result) => !result.ok).length;
console.log(`\n${results.length - failed}/${results.length} customer logo checks passed`);
process.exit(failed ? 1 : 0);
