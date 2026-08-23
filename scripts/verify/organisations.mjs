import { chromium } from "playwright";
import { execFileSync } from "node:child_process";
import { writeFileSync, rmSync } from "node:fs";

/**
 * Organisations: colleagues share, strangers do not.
 *
 * The two halves of the same rule, and the reason this suite exists rather than
 * a unit test on the scope helper:
 *
 *   1. A colleague invited into an organisation sees the organisation's
 *      records. This is the feature — a portal where a quotation is visible
 *      only to whoever happened to raise it is the thing procurement
 *      departments complain about.
 *   2. Nobody sees another organisation's anything. Enforced in the query, so
 *      a reference typed into the address bar matches nothing rather than
 *      matching and being refused.
 *
 * It runs against a live server with real sign-ins, and reads the database
 * directly to set up and to check, because a screen that renders nothing proves
 * less than a row that was never returned.
 */

const BASE = process.env.BASE ?? "http://localhost:3000";
const results = [];
const check = (name, ok, detail = "") => {
  const result = { name, ok: Boolean(ok), detail };
  results.push(result);
  // Printed as it happens rather than at the end: when a later step throws, the
  // checks that already ran are the diagnosis.
  console.log(`  ${result.ok ? "✓" : "✗"} ${result.name}${result.detail ? ` — ${result.detail}` : ""}`);
};

/*
 * SQL through a file rather than through -c.
 *
 * `su postgres -c "..."` hands the command to a shell, which expands anything
 * that looks like a variable. A bcrypt hash is full of `$` — `$2b$12$…` becomes
 * `b12` and the fixture account silently gets a password nobody can type. A
 * file has no shell in the path at all.
 */
const scratch = `/tmp/verify-organisations-${process.pid}.sql`;
const sql = (statement) => {
  writeFileSync(scratch, statement, { mode: 0o644 });
  return execFileSync("su", ["postgres", "-c", `psql -tA -d ictlab -f ${scratch}`], {
    encoding: "utf8",
  }).trim();
};

const stamp = Date.now().toString().slice(-6);
const password = "CorrectHorse9";

const alphaEmail = `org_alpha${stamp}@example.test`;
const betaEmail = `org_beta${stamp}@example.test`;
const colleagueEmail = `org_colleague${stamp}@example.test`;

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });

async function register(context, email, companyName) {
  const page = await context.newPage();
  await page.goto(`${BASE}/register`, { waitUntil: "load" });
  await page.getByLabel("Full name").fill("Org Probe");
  await page.getByLabel("Business email").fill(email);
  await page.getByLabel("Company name").fill(companyName);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: /Create account|Register|Sign up/i }).first().click();
  await page.waitForTimeout(2500);
  await page.close();
}

async function signIn(context, email, secret = password) {
  const page = await context.newPage();
  await page.goto(`${BASE}/login`, { waitUntil: "load" });

  // Registration signs the new account in, so the sign-in page redirects away
  // for a context that already holds a session. Nothing to do in that case.
  if (!page.url().includes("/login")) {
    await page.close();
    return;
  }

  await page.getByLabel("Business email").fill(email);
  await page.getByLabel("Password").fill(secret);
  await page.getByRole("button", { name: "Sign in" }).click();

  try {
    await page.waitForURL(/\/(admin|account)/, { timeout: 15000 });
  } catch {
    // The most likely cause by far, and the one worth naming: sign-in is rate
    // limited per address, and a run repeated within five minutes spends it.
    const text = await page.locator("body").innerText();
    throw new Error(
      /too many|try again/i.test(text)
        ? `Sign-in refused for ${email}: ${text.replace(/\s+/g, " ").slice(0, 120)}`
        : `Sign-in did not complete for ${email}: ${text.replace(/\s+/g, " ").slice(0, 120)}`,
    );
  }

  await page.close();
}

/*
 * Two separate customers.
 *
 * Alpha registers through the form, because "registering makes you the
 * administrator of your own organisation" is one of the things being checked.
 * Beta is inserted directly: registration is rate-limited per address, quite
 * rightly, and a second one here would spend a limit the gate's other suites
 * also draw on. Its bcrypt hash is of the same fixture password.
 */
const FIXTURE_HASH = "$2b$12$Y1EnHFQUoF4sKzWulgpRre1IGREZUDi/nFfN6QycEnigobTHRMj5e";

const alpha = await browser.newContext();
const beta = await browser.newContext();
await register(alpha, alphaEmail, `Alpha Systems ${stamp}`);

sql(`insert into "Company" (id, name, country, "createdAt", "updatedAt") values ('orgc${stamp}', 'Beta Traders ${stamp}', 'India', now(), now())`);
sql(`insert into "User" (id, email, "passwordHash", name, role, "companyRole", "companyId", "emailVerified", "createdAt", "updatedAt") values ('orgu${stamp}', '${betaEmail}', '${FIXTURE_HASH}', 'Beta Probe', 'CUSTOMER', 'ADMIN', 'orgc${stamp}', now(), now(), now())`);

// The address is confirmed directly: this suite is about organisation scope,
// and the verification flow has a suite of its own.
sql(`update "User" set "emailVerified" = now() where email in ('${alphaEmail}','${betaEmail}')`);

const registered = sql(`select count(*) from "User" where email = '${alphaEmail}'`);
if (registered !== "1") {
  console.error(
    "Registration did not create the fixture account — the register rate limit is probably spent. Restart the server and re-run.",
  );
  process.exit(1);
}

const alphaCompanyId = sql(
  `select "companyId" from "User" where email = '${alphaEmail}'`,
);
const betaCompanyId = sql(`select "companyId" from "User" where email = '${betaEmail}'`);

check(
  "registering creates an organisation and makes the registrant its administrator",
  sql(`select "companyRole" from "User" where email = '${alphaEmail}'`) === "ADMIN",
  sql(`select "companyRole" from "User" where email = '${alphaEmail}'`),
);
check("two customers get two organisations", alphaCompanyId !== betaCompanyId);

// ---------------------------------------------- a quotation for Alpha only
const alphaUserId = sql(`select id from "User" where email = '${alphaEmail}'`);
const quoteRef = `QTE-2026-OR${stamp.slice(-4)}`;
// One line: the statement is passed to psql -c, which does not take a newline.
sql(
  `insert into "Quote" (id, reference, status, "userId", "companyId", currency, "subtotalMinor", "discountMinor", "taxMinor", "totalMinor", "createdAt", "updatedAt") values ('orgq${stamp}', '${quoteRef}', 'SENT', '${alphaUserId}', '${alphaCompanyId}', 'INR', 100000, 0, 18000, 118000, now(), now())`,
);

// ------------------------------------------------- Alpha invites a colleague
await signIn(alpha, alphaEmail);
const alphaPage = await alpha.newPage();
await alphaPage.goto(`${BASE}/account/company/people`, { waitUntil: "load" });

await alphaPage.getByLabel("Full name").fill("Invited Colleague");
await alphaPage.getByLabel("Work email").fill(colleagueEmail);
await alphaPage.getByLabel("Access level").last().selectOption("PROCUREMENT");
await alphaPage.getByRole("button", { name: "Send invitation" }).click();
await alphaPage.waitForTimeout(2500);

const colleagueRow = sql(
  `select "companyId" || '|' || "companyRole" from "User" where email = '${colleagueEmail}'`,
);
check(
  "an invited colleague joins the same organisation with the chosen access",
  colleagueRow === `${alphaCompanyId}|PROCUREMENT`,
  colleagueRow,
);

/*
 * The invitation link.
 *
 * On a deployment with no mail configured the action reports the failure and
 * prints the link so the invitation is not lost. That is exactly the path this
 * check needs: it reads the link off the page when mail did not go out, and
 * falls back to issuing a reset itself when it did.
 */
const pageText = await alphaPage.locator("body").innerText();
const linkMatch = pageText.match(/https?:\/\/\S+reset-password\?token=[A-Za-z0-9_-]+/);
await alphaPage.close();

let colleagueSignedIn = false;
if (linkMatch) {
  const setup = await browser.newContext();
  const setupPage = await setup.newPage();
  await setupPage.goto(linkMatch[0].replace(/^https?:\/\/[^/]+/, BASE), { waitUntil: "load" });
  const field = setupPage.getByLabel("New password");
  if ((await field.count()) === 0) {
    console.log("reset page did not offer the form:", (await setupPage.locator("body").innerText()).replace(/\s+/g, " ").slice(0, 200));
  } else {
    await field.fill(password);
    await setupPage.getByRole("button", { name: "Change password" }).click();
    await setupPage.waitForTimeout(2500);
  }
  await setupPage.close();
  await setup.close();
  colleagueSignedIn = sql(`select "passwordHash" is not null from "User" where email = '${colleagueEmail}'`) === "t";
}

check("the invitation lets the colleague set their own password", colleagueSignedIn, linkMatch ? "link followed" : "no link on the page");

// ------------------------------- the colleague sees the organisation's quote
const colleague = await browser.newContext();
await signIn(colleague, colleagueEmail);
const colleaguePage = await colleague.newPage();
await colleaguePage.goto(`${BASE}/account/quotes`, { waitUntil: "load" });
const colleagueQuotes = await colleaguePage.locator("body").innerText();
check(
  "a colleague sees a quotation raised by somebody else at the same organisation",
  colleagueQuotes.includes(quoteRef),
  colleagueQuotes.replace(/\s+/g, " ").slice(0, 160),
);

const colleagueDetail = await colleaguePage.goto(`${BASE}/account/quotes/${quoteRef}`, {
  waitUntil: "load",
});
check(
  "and can open it",
  colleagueDetail?.status() === 200 &&
    (await colleaguePage.locator("body").innerText()).includes(quoteRef),
  `status ${colleagueDetail?.status()}`,
);

// ------------------------------------------- and nobody else sees it at all
const betaPage = await beta.newPage();
await signIn(beta, betaEmail);
await betaPage.goto(`${BASE}/account/quotes`, { waitUntil: "load" });
check(
  "another organisation does not see it in its list",
  !(await betaPage.locator("body").innerText()).includes(quoteRef),
);

const betaDetail = await betaPage.goto(`${BASE}/account/quotes/${quoteRef}`, { waitUntil: "load" });
check(
  "and gets a 404 asking for it directly",
  betaDetail?.status() === 404,
  `status ${betaDetail?.status()}`,
);

// -------------------------------------- a viewer may look and may not act
// No fresh sign-in: the session is resolved against the user row on every
// request, so the demotion is in force on the next one.
sql(`update "User" set "companyRole" = 'VIEWER' where email = '${colleagueEmail}'`);
await colleaguePage.goto(`${BASE}/account/quotes/${quoteRef}`, { waitUntil: "load" });
const viewerText = await colleaguePage.locator("body").innerText();
check("a viewer can still read the organisation's quotation", viewerText.includes(quoteRef));

const acceptButton = colleaguePage.getByRole("button", { name: /Accept/i }).first();
if (await acceptButton.count()) {
  await acceptButton.click();
  await colleaguePage.waitForTimeout(2000);
}
const statusAfterViewer = sql(`select status from "Quote" where reference = '${quoteRef}'`);
check(
  "a viewer cannot accept it, whatever the page offered",
  statusAfterViewer === "SENT",
  `status ${statusAfterViewer}`,
);

// ------------------------ removing a colleague ends their access immediately
const alphaAgain = await alpha.newPage();
await alphaAgain.goto(`${BASE}/account/company/people`, { waitUntil: "load" });
const removeButton = alphaAgain
  .locator("form")
  .filter({ hasText: "Remove access" })
  .first()
  .getByRole("button", { name: "Remove access" });
await removeButton.click();
await alphaAgain.waitForTimeout(2500);

const detached = sql(`select coalesce("companyId", 'none') from "User" where email = '${colleagueEmail}'`);
check("a removed colleague is detached from the organisation", detached === "none", detached);

await colleaguePage.goto(`${BASE}/account/quotes`, { waitUntil: "load" });
const afterRemoval = await colleaguePage.locator("body").innerText();
check(
  "and stops seeing its records straight away",
  !afterRemoval.includes(quoteRef) || afterRemoval.includes("Sign in"),
);

// ---------------------------------------------------------------- clean up
sql(`delete from "Quote" where reference = '${quoteRef}'`);
sql(
  `delete from "Session" where "userId" in (select id from "User" where email in ('${alphaEmail}','${betaEmail}','${colleagueEmail}'))`,
);
sql(
  `delete from "PasswordResetToken" where "userId" in (select id from "User" where email in ('${alphaEmail}','${betaEmail}','${colleagueEmail}'))`,
);
sql(
  `delete from "EmailVerificationToken" where "userId" in (select id from "User" where email in ('${alphaEmail}','${betaEmail}','${colleagueEmail}'))`,
);
sql(
  `delete from "AuditLog" where "actorId" in (select id from "User" where email in ('${alphaEmail}','${betaEmail}','${colleagueEmail}'))`,
);
sql(`delete from "User" where email in ('${alphaEmail}','${betaEmail}','${colleagueEmail}')`);
sql(`delete from "Company" where id in ('${alphaCompanyId}','${betaCompanyId}')`);
check(
  "the fixtures are removed",
  sql(`select count(*) from "User" where email like 'org_%${stamp}@example.test'`) === "0",
);

await browser.close();
rmSync(scratch, { force: true });

const passed = results.filter((result) => result.ok).length;
console.log(`\n${passed}/${results.length} organisation checks passed`);
process.exit(passed === results.length ? 0 : 1);
