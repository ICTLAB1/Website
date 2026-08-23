import { chromium } from "playwright";
import { execFileSync } from "node:child_process";
import { writeFileSync, rmSync } from "node:fs";

/**
 * Quotation versions, and the conversation about them.
 *
 * The property being proved is that history is never rewritten: a revised
 * quotation is a new row, the old one keeps its figures, and both stay
 * readable. A system that edits the sent document in place cannot answer the
 * only question that matters when something goes wrong — what did we quote,
 * and when — so the test changes the price on the revision and then checks that
 * the original still says what it said.
 */

const BASE = process.env.BASE ?? "http://localhost:3000";
const results = [];
const check = (name, ok, detail = "") => {
  const result = { name, ok: Boolean(ok), detail };
  results.push(result);
  console.log(`  ${result.ok ? "✓" : "✗"} ${result.name}${result.detail ? ` — ${result.detail}` : ""}`);
};

const scratch = `/tmp/verify-quote-revisions-${process.pid}.sql`;
const sql = (statement) => {
  writeFileSync(scratch, statement, { mode: 0o644 });
  return execFileSync("su", ["postgres", "-c", `psql -tA -d ictlab -f ${scratch}`], {
    encoding: "utf8",
  }).trim();
};

const stamp = Date.now().toString().slice(-6);
const FIXTURE_HASH = "$2b$12$Y1EnHFQUoF4sKzWulgpRre1IGREZUDi/nFfN6QycEnigobTHRMj5e";
const password = "CorrectHorse9";
const customerEmail = `rev_probe${stamp}@example.test`;

// ------------------------------------------------- a customer with a quotation
sql(
  `insert into "Company" (id, name, country, "createdAt", "updatedAt") values ('revc${stamp}', 'Revision Probe ${stamp}', 'India', now(), now())`,
);
sql(
  `insert into "User" (id, email, "passwordHash", name, role, "companyRole", "companyId", "emailVerified", "createdAt", "updatedAt") values ('revu${stamp}', '${customerEmail}', '${FIXTURE_HASH}', 'Revision Probe', 'CUSTOMER', 'ADMIN', 'revc${stamp}', now(), now(), now())`,
);

const quoteRef = `QTE-2026-RV${stamp.slice(-4)}`;
sql(
  `insert into "Quote" (id, reference, status, version, "rootId", "userId", "companyId", currency, "subtotalMinor", "discountMinor", "taxMinor", "totalMinor", "validUntil", "sentAt", "createdAt", "updatedAt") values ('revq${stamp}', '${quoteRef}', 'SENT', 1, 'revq${stamp}', 'revu${stamp}', 'revc${stamp}', 'INR', 100000, 0, 18000, 118000, now() + interval '30 days', now(), now(), now())`,
);
sql(
  `insert into "QuoteItem" (id, "quoteId", "productName", sku, quantity, "unitPriceMinor", "discountMinor", "gstRatePercent", "lineTotalMinor") values ('revi${stamp}', 'revq${stamp}', 'Business laptop', 'REV-SKU-1', 1, 100000, 0, 18, 100000)`,
);

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });

async function signIn(context, email, secret) {
  const page = await context.newPage();
  await page.goto(`${BASE}/login`, { waitUntil: "load" });
  await page.getByLabel("Business email").fill(email);
  await page.getByLabel("Password").fill(secret);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(/\/(admin|account)/, { timeout: 15000 });
  await page.close();
}

// ------------------------------------- the customer asks for it to be changed
const customer = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
await signIn(customer, customerEmail, password);
const customerPage = await customer.newPage();
await customerPage.goto(`${BASE}/account/quotes/${quoteRef}`, { waitUntil: "load" });
check("the customer can open their quotation", (await customerPage.locator("body").innerText()).includes(quoteRef));

const revisionForm = customerPage.locator("form").filter({ hasText: "Request a revision" }).first();
await revisionForm.locator("textarea").fill("Please quote 5 units rather than 1.");
await revisionForm.getByRole("button", { name: "Request a revision" }).click();
await customerPage.waitForTimeout(2500);

const requested = sql(
  `select kind || '|' || "fromStaff"::text from "QuoteMessage" where "quoteId" = 'revq${stamp}' order by "createdAt" desc limit 1`,
);
check("a revision request is recorded against the quotation, from the customer", requested === "REVISION_REQUEST|false", requested);

const statusAfterRequest = sql(`select status from "Quote" where reference = '${quoteRef}'`);
check(
  "and asking does not change the quotation itself",
  statusAfterRequest === "SENT",
  statusAfterRequest,
);

// --------------------------------------------------------- staff revise it
const staff = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
await signIn(staff, process.env.ADMIN_EMAIL ?? "admin@example.test", process.env.ADMIN_PASSWORD ?? "ChangeMe!Admin123");
const staffPage = await staff.newPage();
await staffPage.goto(`${BASE}/admin/quotes/${quoteRef}`, { waitUntil: "load" });

check(
  "staff see the customer's request in the thread",
  (await staffPage.locator("body").innerText()).includes("Please quote 5 units rather than 1."),
);

const reviseForm = staffPage.locator("form").filter({ hasText: "Raise a revision" }).first();
await reviseForm.locator('input[name="note"]').fill("Quantity raised to 5 at the customer's request.");
await reviseForm.getByRole("button", { name: "Raise a revision" }).click();
await staffPage.waitForTimeout(3000);

const revisedRef = `${quoteRef}-2`;
const revised = sql(
  `select status || '|' || version::text || '|' || ("rootId" = 'revq${stamp}')::text from "Quote" where reference = '${revisedRef}'`,
);
check("a revision is raised as a new draft in the same family", revised === "DRAFT|2|true", revised);

const original = sql(`select status || '|' || "totalMinor"::text from "Quote" where reference = '${quoteRef}'`);
check(
  "and the original is marked superseded with its figures untouched",
  original === "SUPERSEDED|118000",
  original,
);

// ----------------------------------- changing the revision leaves history alone
sql(
  `update "QuoteItem" set quantity = 5, "lineTotalMinor" = 500000 where "quoteId" = (select id from "Quote" where reference = '${revisedRef}')`,
);
sql(
  `update "Quote" set "subtotalMinor" = 500000, "taxMinor" = 90000, "totalMinor" = 590000 where reference = '${revisedRef}'`,
);
const untouched = sql(`select "totalMinor" from "Quote" where reference = '${quoteRef}'`);
check("version 1 still says what it said when it was sent", untouched === "118000", untouched);

// --------------------------------------------- the customer sees both versions
sql(`update "Quote" set status = 'SENT', "sentAt" = now() where reference = '${revisedRef}'`);
await customerPage.goto(`${BASE}/account/quotes/${revisedRef}`, { waitUntil: "load" });
const versionsText = await customerPage.locator("body").innerText();
check(
  "the customer sees both versions from the current one",
  versionsText.includes("Version 2") && versionsText.includes("Version 1"),
);
check(
  "with the note saying what changed",
  versionsText.includes("Quantity raised to 5 at the customer's request."),
);

const oldVersion = await customerPage.goto(`${BASE}/account/quotes/${quoteRef}`, { waitUntil: "load" });
check(
  "and can still open the superseded one",
  oldVersion?.status() === 200,
  `status ${oldVersion?.status()}`,
);

// ---------------------------------------------- another organisation sees none
{
  const outsiderEmail = `rev_outsider${stamp}@example.test`;
  sql(
    `insert into "Company" (id, name, country, "createdAt", "updatedAt") values ('revo${stamp}', 'Outsider ${stamp}', 'India', now(), now())`,
  );
  sql(
    `insert into "User" (id, email, "passwordHash", name, role, "companyRole", "companyId", "emailVerified", "createdAt", "updatedAt") values ('revou${stamp}', '${outsiderEmail}', '${FIXTURE_HASH}', 'Outsider', 'CUSTOMER', 'ADMIN', 'revo${stamp}', now(), now(), now())`,
  );

  const outsider = await browser.newContext();
  await signIn(outsider, outsiderEmail, password);
  const outsiderPage = await outsider.newPage();
  const response = await outsiderPage.goto(`${BASE}/account/quotes/${revisedRef}`, {
    waitUntil: "load",
  });
  check(
    "another organisation cannot open the revision either",
    response?.status() === 404,
    `status ${response?.status()}`,
  );
  await outsiderPage.close();

  sql(`delete from "User" where email = '${outsiderEmail}'`);
  sql(`delete from "Company" where id = 'revo${stamp}'`);
}

// ------------------------------------- an accepted quotation is not revisable
sql(`update "Quote" set status = 'ACCEPTED' where reference = '${revisedRef}'`);
await staffPage.goto(`${BASE}/admin/quotes/${revisedRef}`, { waitUntil: "load" });
check(
  "an accepted quotation offers no revision",
  !(await staffPage.locator("body").innerText()).includes("Raise a revision"),
);

// ---------------------------------------------------------------- clean up
sql(`delete from "QuoteMessage" where "quoteId" in (select id from "Quote" where reference like '${quoteRef}%')`);
sql(`delete from "QuoteItem" where "quoteId" in (select id from "Quote" where reference like '${quoteRef}%')`);
sql(`update "Quote" set "rootId" = null where reference like '${quoteRef}%'`);
sql(`delete from "Quote" where reference like '${quoteRef}%'`);
sql(`delete from "AuditLog" where "actorId" = 'revu${stamp}' or "entityId" like '${quoteRef}%'`);
sql(`delete from "Session" where "userId" = 'revu${stamp}'`);
sql(`delete from "User" where email = '${customerEmail}'`);
sql(`delete from "Company" where id = 'revc${stamp}'`);
check("the fixtures are removed", sql(`select count(*) from "Quote" where reference like '${quoteRef}%'`) === "0");

await browser.close();
rmSync(scratch, { force: true });

const passed = results.filter((result) => result.ok).length;
console.log(`\n${passed}/${results.length} quotation revision checks passed`);
process.exit(passed === results.length ? 0 : 1);
