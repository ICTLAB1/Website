import { chromium } from "playwright";
import { execFileSync } from "node:child_process";
import { writeFileSync, rmSync } from "node:fs";

/**
 * Partner designations on the public site.
 *
 * A partner claim is one of the few things on this website that another company
 * can be asked to confirm, and the one where being wrong is a
 * misrepresentation rather than a typo. So the rule is not tested by reading
 * the code that implements it — it is tested by changing the database and
 * looking at what the site then says.
 *
 * Four things are checked, and the last two matter most:
 *
 *   1. A confirmed, published designation appears.
 *   2. A brand with none says nothing — no composed "Brand Partner" anywhere.
 *   3. Un-publishing takes it down.
 *   4. A stale confirmation takes it down on its own.
 */

const BASE = process.env.BASE ?? "http://localhost:3000";
const results = [];
const check = (name, ok, detail = "") => {
  const result = { name, ok: Boolean(ok), detail };
  results.push(result);
  console.log(`  ${result.ok ? "✓" : "✗"} ${result.name}${result.detail ? ` — ${result.detail}` : ""}`);
};

const scratch = `/tmp/verify-partners-${process.pid}.sql`;
const sql = (statement) => {
  writeFileSync(scratch, statement, { mode: 0o644 });
  return execFileSync("su", ["postgres", "-c", `psql -tA -d ictlab -f ${scratch}`], {
    encoding: "utf8",
  }).trim();
};

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const page = await (await browser.newContext()).newPage();

const text = async (path) => {
  const response = await page.goto(`${BASE}${path}`, { waitUntil: "load" });
  return { status: response?.status() ?? 0, body: await page.locator("body").innerText() };
};

// A brand that holds a published designation, and one that does not.
const published = sql(
  `select slug from "Brand" where "partnerPublic" = true and "partnerLabel" is not null and "deletedAt" is null order by slug limit 1`,
);
const unpublished = sql(
  `select slug from "Brand" where ("partnerPublic" = false or "partnerLabel" is null) and "deletedAt" is null order by slug limit 1`,
);

if (!published) {
  console.error("No brand holds a published designation — nothing to verify.");
  process.exit(1);
}

const label = sql(`select "partnerLabel" from "Brand" where slug = '${published}'`);

// ------------------------------------------------------------ it is stated
{
  const { status, body } = await text(`/brands/${published}`);
  check("a confirmed, published designation appears on the brand page", status === 200 && body.includes(label), `${published}: ${label}`);
}

// ----------------------------------------------- and nothing else claims one
{
  const { body } = await text(`/brands/${unpublished}`);
  const brandName = sql(`select name from "Brand" where slug = '${unpublished}'`);
  check(
    "a brand with no designation states none",
    !new RegExp(`${brandName}\\s+Partner`, "i").test(body) && !body.includes(`${label}`),
    `${unpublished}`,
  );
}

// -------------------------------------- the internal reference stays internal
sql(
  `update "Brand" set "partnerReference" = 'TZ-PARTNER-REF-PROBE' where slug = '${published}'`,
);
{
  const html = await (await fetch(`${BASE}/brands/${published}`)).text();
  check(
    "the partner or programme identifier never reaches the page",
    !html.includes("TZ-PARTNER-REF-PROBE"),
  );
}
sql(`update "Brand" set "partnerReference" = null where slug = '${published}'`);

/*
 * The rest goes through the admin panel rather than through SQL.
 *
 * Brand reads are cached and invalidated by a write from the panel, so a change
 * made behind the application's back is legitimately not visible yet. Driving
 * the real screen tests the rule *and* the path an administrator actually
 * takes, which is the only combination worth asserting on.
 */
const staff = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
const admin = await staff.newPage();
await admin.goto(`${BASE}/login`, { waitUntil: "load" });
await admin.getByLabel("Business email").fill(process.env.ADMIN_EMAIL ?? "admin@example.test");
await admin.getByLabel("Password").fill(process.env.ADMIN_PASSWORD ?? "ChangeMe!Admin123");
await admin.getByRole("button", { name: "Sign in" }).click();
await admin.waitForURL("**/admin", { timeout: 15000 });

const brandId = sql(`select id from "Brand" where slug = '${published}'`);
const editor = `${BASE}/admin/brands/${brandId}`;

async function saveBrand(mutate) {
  await admin.goto(editor, { waitUntil: "load" });
  await mutate();
  await admin.getByRole("button", { name: /Save/i }).first().click();
  await admin.waitForTimeout(2000);
}

// ------------------------------------------------- un-publishing takes it down
await saveBrand(async () => {
  const box = admin.getByLabel("State this designation publicly");
  if (await box.isChecked()) await box.uncheck();
});
{
  const { body } = await text(`/brands/${published}`);
  check("un-publishing a designation removes it from the site", !body.includes(label));
}

// ------------------------------------------- a stale confirmation lapses
await saveBrand(async () => {
  const box = admin.getByLabel("State this designation publicly");
  if (!(await box.isChecked())) await box.check();
  await admin.getByLabel("Confirmed on").fill("2022-01-01");
});
{
  const { body } = await text(`/brands/${published}`);
  check("a designation confirmed years ago stops being stated", !body.includes(label));
}

// ------------------------------------------------------- and comes back
const today = sql("select to_char(now(), 'YYYY-MM-DD')");
await saveBrand(async () => {
  await admin.getByLabel("Confirmed on").fill(today);
});
{
  const { body } = await text(`/brands/${published}`);
  check("re-confirming it puts it back", body.includes(label), `confirmed ${today}`);
}

await browser.close();
rmSync(scratch, { force: true });

const passed = results.filter((result) => result.ok).length;
console.log(`\n${passed}/${results.length} partner designation checks passed`);
process.exit(passed === results.length ? 0 : 1);
