import { chromium } from "playwright";
import { execFileSync } from "node:child_process";
import { writeFileSync, rmSync } from "node:fs";

/**
 * The sales pipeline, end to end.
 *
 * Four properties, in descending order of how much damage getting them wrong
 * would do.
 *
 * **None of it reaches a customer.** A deal carries what the business thinks
 * this is worth, why it lost the last one, and how confident it is. A customer
 * seeing any of that would be a commercial injury, not a bug, so the suite
 * signs in as a customer and goes looking.
 *
 * **A stage change is dated and recorded.** `stageChangedAt` is what "stuck for
 * five weeks" is measured from and the number the pipeline is read for. It must
 * move when the stage moves and — the half that is easy to get wrong — must not
 * move when anything else does.
 *
 * **A loss carries its reason.** Enforced in the service rather than the form,
 * so posting the form without one has to fail.
 *
 * **The history has no holes.** Every stage change writes itself into the
 * timeline, so a deal that went from Quoted to Lost overnight can always be
 * asked why and by whom.
 */

const BASE = process.env.BASE ?? "http://localhost:3000";
const results = [];
const check = (name, ok, detail = "") => {
  const result = { name, ok: Boolean(ok), detail };
  results.push(result);
  console.log(`  ${result.ok ? "✓" : "✗"} ${result.name}${result.ok || !result.detail ? "" : ` — ${result.detail}`}`);
};

const scratch = `/tmp/verify-crm-${process.pid}.sql`;
const sql = (statement) => {
  writeFileSync(scratch, statement, { mode: 0o644 });
  return execFileSync("su", ["postgres", "-c", `psql -tA -d ictlab -f ${scratch}`], {
    encoding: "utf8",
  }).trim();
};

const stamp = Date.now().toString().slice(-6);
const FIXTURE_HASH = "$2b$12$Y1EnHFQUoF4sKzWulgpRre1IGREZUDi/nFfN6QycEnigobTHRMj5e";
const password = "CorrectHorse9";
const staffEmail = `crm_staff${stamp}@example.test`;
const customerEmail = `crm_cust${stamp}@example.test`;

sql(
  `insert into "Company" (id, name, country, "createdAt", "updatedAt") values ('crmc${stamp}', 'CRM Probe ${stamp}', 'India', now(), now())`,
);
sql(
  `insert into "User" (id, email, "passwordHash", name, role, "emailVerified", "createdAt", "updatedAt") values ('crms${stamp}', '${staffEmail}', '${FIXTURE_HASH}', 'CRM Probe Staff', 'SALES', now(), now(), now())`,
);
sql(
  `insert into "User" (id, email, "passwordHash", name, role, "companyRole", "companyId", "emailVerified", "createdAt", "updatedAt") values ('crmu${stamp}', '${customerEmail}', '${FIXTURE_HASH}', 'CRM Probe Customer', 'CUSTOMER', 'ADMIN', 'crmc${stamp}', now(), now(), now())`,
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

const staff = await browser.newContext({ viewport: { width: 1600, height: 1200 } });
await signIn(staff, staffEmail, password);
const page = await staff.newPage();

// ── a sales account reaches the pipeline ────────────────────────────────────
await page.goto(`${BASE}/admin/pipeline`, { waitUntil: "load" });
check(
  "a sales account can open the pipeline",
  page.url().includes("/admin/pipeline"),
  page.url(),
);

const board = (await page.locator("body").innerText()).replace(/\s+/g, " ");
check(
  "the board draws a column for every open stage, including empty ones",
  ["New", "Qualifying", "Quoted", "Negotiation"].every((label) => board.includes(label)),
);
check("closed stages are not columns on the board", !/\bWon\b.*\bLost\b/.test(board.slice(0, 400)));

// ── creating a deal ─────────────────────────────────────────────────────────
await page.goto(`${BASE}/admin/pipeline/new`, { waitUntil: "load" });
const title = `Probe deal ${stamp}`;
await page.getByLabel("Title").fill(title);
await page.getByLabel("Organisation name").fill(`CRM Probe ${stamp}`);
await page.getByLabel("Expected value (₹)").fill("250000");
await page.getByRole("button", { name: "Create deal" }).click();
await page.waitForURL(/\/admin\/pipeline\/DEAL-/, { timeout: 20000 });

const reference = page.url().split("/").pop();
check("creating a deal lands on it", Boolean(reference?.startsWith("DEAL-")), page.url());
check(
  "the amount is stored in minor units",
  sql(`select "expectedValueMinor" from "Deal" where reference = '${reference}'`) === "25000000",
  sql(`select "expectedValueMinor" from "Deal" where reference = '${reference}'`),
);
check(
  "a new deal starts open, not closed",
  sql(`select stage from "Deal" where reference = '${reference}'`) === "NEW",
);
check(
  "it is owned by whoever created it rather than by nobody",
  sql(`select "ownerId" from "Deal" where reference = '${reference}'`) === `crms${stamp}`,
);
check(
  "creating it is written into the history",
  sql(
    `select count(*) from "Activity" a join "Deal" d on d.id = a."dealId" where d.reference = '${reference}' and a.kind = 'SYSTEM'`,
  ) === "1",
);

// ── the stage clock ─────────────────────────────────────────────────────────
// Backdate it, so a change that resets the clock is visible as a change.
sql(`update "Deal" set "stageChangedAt" = now() - interval '20 days' where reference = '${reference}'`);
const before = sql(`select "stageChangedAt" from "Deal" where reference = '${reference}'`);

// An edit that is not a stage change must leave the clock alone.
await page.reload({ waitUntil: "load" });
await page.getByLabel("Title").fill(`${title} revised`);
await page.getByRole("button", { name: "Save" }).first().click();
await page.waitForTimeout(2500);

check(
  "editing the title does not reset the stage clock",
  sql(`select "stageChangedAt" from "Deal" where reference = '${reference}'`) === before,
  "a typo fix must not make a stalled deal look freshly worked",
);
check(
  "but the edit was saved",
  sql(`select title from "Deal" where reference = '${reference}'`) === `${title} revised`,
);

// Moving the stage must reset it.
await page.reload({ waitUntil: "load" });
await page.getByLabel("Move to").selectOption("QUOTED");
await page.getByRole("button", { name: "Move" }).click();
await page.waitForTimeout(2500);

check(
  "moving the stage resets the stage clock",
  sql(`select "stageChangedAt" from "Deal" where reference = '${reference}'`) !== before,
);
check(
  "and the move is written into the history",
  sql(
    `select count(*) from "Activity" a join "Deal" d on d.id = a."dealId" where d.reference = '${reference}' and a.subject like 'Stage changed%'`,
  ) === "1",
);

// ── a loss needs a reason ───────────────────────────────────────────────────
await page.reload({ waitUntil: "load" });
await page.getByLabel("Move to").selectOption("LOST");
await page.getByLabel("If lost, why").fill("");
await page.getByRole("button", { name: "Move" }).click();
await page.waitForTimeout(2500);

check(
  "a deal cannot be marked lost with no reason",
  sql(`select stage from "Deal" where reference = '${reference}'`) === "QUOTED",
  sql(`select stage from "Deal" where reference = '${reference}'`),
);

await page.getByLabel("Move to").selectOption("LOST");
await page.getByLabel("If lost, why").fill("Undercut on price by an incumbent.");
await page.getByRole("button", { name: "Move" }).click();
await page.waitForTimeout(2500);

check(
  "with a reason, it is marked lost",
  sql(`select stage from "Deal" where reference = '${reference}'`) === "LOST",
);
check(
  "and the reason is kept",
  sql(`select "lostReason" from "Deal" where reference = '${reference}'`).includes("Undercut"),
);
check(
  "and it is dated as closed",
  sql(`select ("closedAt" is not null)::text from "Deal" where reference = '${reference}'`) === "true",
);

// Reopening must clear the reason, or the deal contradicts its own stage.
await page.reload({ waitUntil: "load" });
await page.getByLabel("Move to").selectOption("NEGOTIATION");
await page.getByRole("button", { name: "Move" }).click();
await page.waitForTimeout(2500);
check(
  "reopening a lost deal clears the lost reason",
  sql(`select coalesce("lostReason", '') from "Deal" where reference = '${reference}'`) === "",
);
check(
  "and clears the closed date",
  sql(`select ("closedAt" is null)::text from "Deal" where reference = '${reference}'`) === "true",
);

// ── follow-ups ──────────────────────────────────────────────────────────────
await page.reload({ waitUntil: "load" });
await page.getByLabel("What").selectOption("TASK");
await page.getByLabel("Summary").fill(`Call them back ${stamp}`);
await page.getByRole("button", { name: "Log it" }).click();
await page.waitForTimeout(2500);
check(
  "a follow-up with no date is refused",
  sql(
    `select count(*) from "Activity" where subject = 'Call them back ${stamp}'`,
  ) === "0",
  "without a date nobody would ever see it again",
);

await page.getByLabel("What").selectOption("TASK");
await page.getByLabel("Summary").fill(`Call them back ${stamp}`);
await page.getByLabel("Follow up on").fill("2026-09-30");
await page.getByRole("button", { name: "Log it" }).click();
await page.waitForTimeout(2500);
check(
  "a follow-up with a date is logged",
  sql(`select count(*) from "Activity" where subject = 'Call them back ${stamp}'`) === "1",
);

await page.goto(`${BASE}/admin/follow-ups`, { waitUntil: "load" });
const followUps = (await page.locator("body").innerText()).replace(/\s+/g, " ");
check("it appears on the follow-ups screen", followUps.includes(`Call them back ${stamp}`));

await page
  .locator("li")
  .filter({ hasText: `Call them back ${stamp}` })
  .getByRole("button", { name: "Mark done" })
  .first()
  .click();
await page.waitForTimeout(2500);
check(
  "marking it done completes it",
  sql(
    `select ("completedAt" is not null)::text from "Activity" where subject = 'Call them back ${stamp}'`,
  ) === "true",
);
check(
  "and it leaves the outstanding list",
  !(await page.locator("body").innerText()).includes(`Call them back ${stamp}`),
);

// ── nothing reaches a customer ──────────────────────────────────────────────
const customer = await browser.newContext();
await signIn(customer, customerEmail, password);
const theirs = await customer.newPage();

for (const path of ["/admin/pipeline", `/admin/pipeline/${reference}`, "/admin/follow-ups"]) {
  const response = await theirs.goto(`${BASE}${path}`, { waitUntil: "load" });
  const landed = theirs.url();
  const body = (await theirs.locator("body").innerText()).replace(/\s+/g, " ");
  check(
    `a customer cannot reach ${path}`,
    !landed.includes("/admin/") || response?.status() === 404,
    `landed on ${landed} with ${response?.status()}`,
  );
  check(`and sees nothing from the deal at ${path}`, !body.includes(title));
}

/*
 * The commercial figures specifically. A page that redirects is one control;
 * this is the other — that the numbers are not on any customer-facing surface
 * by some other route.
 */
const theirAccount = await theirs.goto(`${BASE}/account`, { waitUntil: "load" });
const accountText = (await theirs.locator("body").innerText()).replace(/\s+/g, " ");
check(
  "the customer's own account page carries no deal, forecast or lost reason",
  theirAccount?.status() === 200 &&
    !accountText.includes("Pipeline") &&
    !accountText.includes("2,50,000") &&
    !accountText.includes("Undercut"),
);

// ── a signed-out caller ─────────────────────────────────────────────────────
const stranger = await browser.newContext();
const strangerPage = await stranger.newPage();
await strangerPage.goto(`${BASE}/admin/pipeline`, { waitUntil: "load" });
check(
  "a signed-out caller is sent to sign in",
  strangerPage.url().includes("/login"),
  strangerPage.url(),
);

await browser.close();

// ── clean up ────────────────────────────────────────────────────────────────
sql(`delete from "Activity" where "dealId" in (select id from "Deal" where reference = '${reference}')`);
sql(`delete from "AuditLog" where "entityId" = '${reference}'`);
sql(`delete from "Deal" where reference = '${reference}'`);
sql(`delete from "Session" where "userId" in ('crms${stamp}', 'crmu${stamp}')`);
sql(`delete from "User" where id in ('crms${stamp}', 'crmu${stamp}')`);
sql(`delete from "Company" where id = 'crmc${stamp}'`);
rmSync(scratch, { force: true });

const failed = results.filter((result) => !result.ok).length;
console.log(`\n${results.length - failed}/${results.length} CRM checks passed`);
process.exit(failed ? 1 : 0);
