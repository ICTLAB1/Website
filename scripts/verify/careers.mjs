import { chromium } from "playwright";
import { execFileSync } from "node:child_process";
import { writeFileSync, rmSync } from "node:fs";

/**
 * Posting a job, and what happens to it afterwards.
 *
 * The property this suite exists for is the one nobody notices going wrong: a
 * role that has closed must stop being advertised **everywhere at once**. Not
 * only on the careers list — also on its own page, in the sitemap, and in the
 * `JobPosting` structured data Google reads. A site whose sitemap submits a
 * vacancy as live while the page says it has closed is a site whose job markup
 * stops being trusted, and nothing surfaces that until the listings quietly
 * disappear from results.
 *
 * So each of those four surfaces is asked separately, before and after.
 *
 * It also checks the things that make the markup valid at all. Google drops a
 * posting with no `datePosted` or `hiringOrganization` without saying so, and
 * `CONTRACT` is not one of its employment types — `CONTRACTOR` is.
 */

const BASE = process.env.BASE ?? "http://localhost:3000";
const results = [];
const check = (name, ok, detail = "") => {
  const result = { name, ok: Boolean(ok), detail };
  results.push(result);
  console.log(`  ${result.ok ? "✓" : "✗"} ${result.name}${result.ok || !result.detail ? "" : ` — ${result.detail}`}`);
};

const scratch = `/tmp/verify-careers-${process.pid}.sql`;
const sql = (statement) => {
  writeFileSync(scratch, statement, { mode: 0o644 });
  return execFileSync("su", ["postgres", "-c", `psql -tA -d ictlab -f ${scratch}`], {
    encoding: "utf8",
  }).trim();
};

const stamp = Date.now().toString().slice(-6);
const FIXTURE_HASH = "$2b$12$Y1EnHFQUoF4sKzWulgpRre1IGREZUDi/nFfN6QycEnigobTHRMj5e";
const password = "CorrectHorse9";
const adminEmail = `cr_admin${stamp}@example.test`;
const salesEmail = `cr_sales${stamp}@example.test`;
const slug = `probe-role-${stamp}`;

/*
 * Sweep any role an earlier aborted run left open.
 *
 * The cleanup at the bottom only runs if the script gets there, and a role
 * posted by this suite is live: on the careers page, on its own URL and in the
 * sitemap. `scripts/verify/product-photos.mjs` leaked a fixture product exactly
 * this way and it sat in the sitemap for a day. `scripts/verify/seo.mjs` fails
 * the gate on a fixture-shaped slug now; this keeps the window to one run.
 */
const swept = sql(
  `with gone as (delete from "JobPosting" where slug like 'probe-role-%' returning id) select count(*) from gone`,
);
if (swept !== "0") console.log(`  (swept ${swept} role(s) left by an earlier run)`);

sql(
  `insert into "User" (id, email, "passwordHash", name, role, "emailVerified", "createdAt", "updatedAt") values ('cra${stamp}', '${adminEmail}', '${FIXTURE_HASH}', 'Careers Probe Admin', 'ADMIN', now(), now(), now())`,
);
sql(
  `insert into "User" (id, email, "passwordHash", name, role, "emailVerified", "createdAt", "updatedAt") values ('crs${stamp}', '${salesEmail}', '${FIXTURE_HASH}', 'Careers Probe Sales', 'SALES', now(), now(), now())`,
);

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });

async function signIn(context, email, secret) {
  const page = await context.newPage();
  await page.goto(`${BASE}/login`, { waitUntil: "load" });
  await page.getByLabel("Business email").fill(email);
  await page.getByLabel("Password").fill(secret);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(/\/(admin|account)/, { timeout: 20000 });
  await page.close();
}

const admin = await browser.newContext({ viewport: { width: 1440, height: 1200 } });
await signIn(admin, adminEmail, password);
const page = await admin.newPage();

// ── the careers page exists with nothing open ───────────────────────────────
const anon = await browser.newContext();
const anonPage = await anon.newPage();
const emptyResponse = await anonPage.goto(`${BASE}/careers`, { waitUntil: "load" });
const emptyText = (await anonPage.locator("body").innerText()).replace(/\s+/g, " ");
check("the careers page is served", emptyResponse?.status() === 200, `status ${emptyResponse?.status()}`);
/*
 * A careers page that 404s when nothing is open loses whatever ranking it has
 * built and tells a speculative applicant nothing.
 */
check(
  "with nothing open it still says something useful",
  /no open roles/i.test(emptyText) || /open role/i.test(emptyText),
  emptyText.slice(0, 160),
);

// ── post a role ─────────────────────────────────────────────────────────────
await page.goto(`${BASE}/admin/jobs/new`, { waitUntil: "load" });
check("an administrator can reach the job form", page.url().includes("/admin/jobs/new"), page.url());

const title = `Probe Role ${stamp}`;
await page.getByLabel("Role title").fill(title);
await page.getByLabel("URL").fill(slug);
await page.getByLabel("Summary").fill("A fixture role used to prove the careers pages work.");
await page.getByLabel("The role").fill("## What you would do\n\nProve that this page renders.");
await page.getByLabel("Location").fill("New Delhi");
await page.getByLabel("Applications to").fill("careers-probe@example.test");
await page.getByLabel("Posted").fill("2026-08-01");
await page.getByRole("button", { name: /Create|Save/ }).first().click();
await page.waitForTimeout(3000);

const jobId = sql(`select id from "JobPosting" where slug = '${slug}'`);
check("the role is stored", jobId.length > 0, jobId);

// ── it is live on all four surfaces ─────────────────────────────────────────
const listText = await anonPage.goto(`${BASE}/careers`, { waitUntil: "load" })
  .then(() => anonPage.locator("body").innerText());
check("it appears on the careers list", listText.includes(title));

const detail = await anonPage.goto(`${BASE}/careers/${slug}`, { waitUntil: "load" });
check("its own page is served", detail?.status() === 200, `status ${detail?.status()}`);

const html = await anonPage.content();
const posting = (() => {
  for (const m of html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)) {
    const parsed = JSON.parse(m[1].replaceAll("\\u003c", "<"));
    if (parsed["@type"] === "JobPosting") return parsed;
  }
  return null;
})();

check("it carries JobPosting structured data", posting !== null);
if (posting) {
  // Google drops a posting missing any of these, without a message.
  for (const field of ["title", "description", "datePosted", "employmentType", "hiringOrganization"]) {
    check(`the posting declares ${field}`, Boolean(posting[field]));
  }
  check(
    "the hiring organisation is named and linked",
    Boolean(posting.hiringOrganization?.name && posting.hiringOrganization?.logo),
  );
  check(
    "the employment type uses schema.org's vocabulary",
    ["FULL_TIME", "PART_TIME", "CONTRACTOR", "INTERN", "TEMPORARY", "OTHER"].includes(
      posting.employmentType,
    ),
    posting.employmentType,
  );
  /*
   * No pay was entered, so none may be claimed. An empty or zeroed
   * `baseSalary` is an advertised figure that nobody agreed.
   */
  check("no pay is claimed when none was entered", posting.baseSalary === undefined);
}

const sitemapLive = await (await fetch(`${BASE}/sitemap.xml`)).text();
check("it is in the sitemap", sitemapLive.includes(`/careers/${slug}`));

// ── closing it takes it off every surface ───────────────────────────────────
sql(`update "JobPosting" set "closedAt" = now() where slug = '${slug}'`);

const closedList = await anonPage.goto(`${BASE}/careers`, { waitUntil: "load" })
  .then(() => anonPage.locator("body").innerText());
check("a closed role leaves the careers list", !closedList.includes(title));

const closedPage = await anonPage.goto(`${BASE}/careers/${slug}`, { waitUntil: "load" });
const closedHtml = await anonPage.content();
/*
 * Not a 404. The URL has been advertised — on a job board, in an email, on
 * somebody's saved tab — and a dead end tells that candidate nothing.
 */
check("its page still answers rather than 404ing", closedPage?.status() === 200, `status ${closedPage?.status()}`);
check("and says the role has closed", /no longer open/i.test(await anonPage.locator("body").innerText()));
check("the JobPosting markup is gone", !closedHtml.includes('"JobPosting"'));
check(
  "and it is marked noindex, so search engines drop it",
  /<meta name="robots"[^>]*noindex/i.test(closedHtml),
);

const sitemapClosed = await (await fetch(`${BASE}/sitemap.xml`)).text();
check("it leaves the sitemap", !sitemapClosed.includes(`/careers/${slug}`));

// ── a date closes it without anybody acting ─────────────────────────────────
sql(`update "JobPosting" set "closedAt" = null, "closesOn" = now() - interval '1 day' where slug = '${slug}'`);
const expiredList = await anonPage.goto(`${BASE}/careers`, { waitUntil: "load" })
  .then(() => anonPage.locator("body").innerText());
check("a role past its closing date closes itself", !expiredList.includes(title));

// ── a future posting date holds it back ─────────────────────────────────────
sql(`update "JobPosting" set "closesOn" = null, "postedOn" = now() + interval '7 days' where slug = '${slug}'`);
const futureList = await anonPage.goto(`${BASE}/careers`, { waitUntil: "load" })
  .then(() => anonPage.locator("body").innerText());
check("a role dated in the future is not advertised yet", !futureList.includes(title));

// ── only an administrator may post one ──────────────────────────────────────
const sales = await browser.newContext();
await signIn(sales, salesEmail, password);
const salesPage = await sales.newPage();
const salesAt = await salesPage.goto(`${BASE}/admin/jobs`, { waitUntil: "load" });
check(
  "a sales account cannot manage jobs",
  !salesPage.url().endsWith("/admin/jobs") || salesAt?.status() === 404,
  `landed on ${salesPage.url()} with ${salesAt?.status()}`,
);

const stranger = await browser.newContext();
const strangerPage = await stranger.newPage();
await strangerPage.goto(`${BASE}/admin/jobs`, { waitUntil: "load" });
check("a signed-out caller is sent to sign in", strangerPage.url().includes("/login"));

await browser.close();

// ── clean up ────────────────────────────────────────────────────────────────
sql(`delete from "JobPosting" where slug = '${slug}'`);
sql(`delete from "AuditLog" where "entityId" = '${jobId}'`);
sql(`delete from "Session" where "userId" in ('cra${stamp}', 'crs${stamp}')`);
sql(`delete from "User" where id in ('cra${stamp}', 'crs${stamp}')`);
rmSync(scratch, { force: true });

const failed = results.filter((result) => !result.ok).length;
console.log(`\n${results.length - failed}/${results.length} careers checks passed`);
process.exit(failed ? 1 : 0);
