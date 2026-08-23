import { chromium } from "playwright";
import { execFileSync } from "node:child_process";
import { writeFileSync, rmSync } from "node:fs";

/**
 * Registering, and the code that proves the address is real.
 *
 * The unit tests cover the rules; this covers the wiring, and the wiring is
 * where an OTP is actually got wrong. Four properties, each of which has been a
 * real vulnerability in somebody's product:
 *
 *   the code is never stored in a form the database can hand back;
 *   a wrong code costs an attempt, and the attempts run out;
 *   a *correct* code is refused once they have run out — the check that turns
 *     the cap from a speed bump into a wall;
 *   a code issued to one account cannot verify another.
 *
 * The last one is why `verifyEmailCode` is scoped by user id rather than
 * looking the code up on its own. Six digits looked up globally means any live
 * code verifies whichever account it happens to belong to, and with enough
 * pending registrations that stops being a million-to-one.
 */

const BASE = process.env.BASE ?? "http://localhost:3000";
const results = [];
const check = (name, ok, detail = "") => {
  const result = { name, ok: Boolean(ok), detail };
  results.push(result);
  console.log(
    `  ${result.ok ? "✓" : "✗"} ${result.name}${result.ok || !result.detail ? "" : ` — ${result.detail}`}`,
  );
};

const scratch = `/tmp/verify-otp-${process.pid}.sql`;
const sql = (statement) => {
  writeFileSync(scratch, statement, { mode: 0o644 });
  return execFileSync("su", ["postgres", "-c", `psql -tA -d ictlab -f ${scratch}`], {
    encoding: "utf8",
  }).trim();
};

const stamp = Date.now().toString().slice(-6);
const FIXTURE_HASH = "$2b$12$Y1EnHFQUoF4sKzWulgpRre1IGREZUDi/nFfN6QycEnigobTHRMj5e";
const password = "CorrectHorse9";
const mine = `otp_a${stamp}@example.test`;
const theirs = `otp_b${stamp}@example.test`;

/*
 * A mail server that is configured and cannot deliver.
 *
 * Verification only stands up when the deployment can send — `verificationEnforced`
 * returns `isMailConfigured()`, so on a machine with no SMTP the page under test
 * redirects away and there is nothing to verify. Pointing it at a closed port
 * gives exactly the state this suite needs: enforcement on, delivery failing,
 * and the code written to the server log where the fixture can read it.
 *
 * Safe to write with SQL: `getMailConfig` is memoised with React's per-request
 * `cache`, not the persistent one, so there is no stale entry to invalidate.
 */
const priorHost = sql(
  `select coalesce(host,'') || '|' || coalesce(port::text,'') || '|' || coalesce(secure::text,'') || '|' || coalesce("fromAddress",'')
     from "MailSettings" where id = 'singleton'`,
);
const hadRow = priorHost !== "";
const hadHost = priorHost.split("|")[0] !== "" && priorHost !== "";

if (hadHost) {
  console.log("  ! a mail server is already configured — using it as it stands");
} else {
  // Only the transport fields are touched. A row may already exist carrying
  // other settings — who is copied on quotations, for one — and replacing it
  // would quietly undo them.
  sql(
    `insert into "MailSettings" (id, provider, host, port, secure, "fromAddress", "fromName", "updatedAt")
     values ('singleton', 'SMTP', '127.0.0.1', 2525, false, 'no-reply@example.test', 'OTP Probe', now())
     on conflict (id) do update set provider = 'SMTP', host = '127.0.0.1', port = 2525, secure = false,
       "fromAddress" = 'no-reply@example.test', "fromName" = 'OTP Probe', "updatedAt" = now()`,
  );
}

/*
 * The code, read from the server log rather than the database.
 *
 * `sendVerificationEmail` logs it when delivery fails, which is the state
 * arranged above — and is the only way this suite can learn a code it is by
 * design not able to derive. The newest log file is the running server's; older
 * ones are from servers this session has already stopped.
 */
const LOG_GLOB = process.env.SERVER_LOG ?? "/tmp/claude-*/*/*/tasks/*.output";

function lastIssuedCode() {
  const line = execFileSync(
    "bash",
    [
      "-lc",
      `for f in $(ls -t ${LOG_GLOB} 2>/dev/null); do m=$(grep -o 'verification_not_emailed.*' "$f" 2>/dev/null | tail -1); if [ -n "$m" ]; then printf '%s' "$m"; break; fi; done`,
    ],
    { encoding: "utf8" },
  ).trim();
  return line.match(/"code":\s*"(\d{6})"/)?.[1] ?? null;
}

// Sweep anything an aborted run left behind.
sql(`delete from "User" where email like 'otp\\_%@example.test'`);

for (const [id, email] of [
  [`otpa${stamp}`, mine],
  [`otpb${stamp}`, theirs],
]) {
  sql(
    `insert into "User" (id, email, "passwordHash", name, role, "createdAt", "updatedAt") values ('${id}', '${email}', '${FIXTURE_HASH}', 'OTP Probe', 'CUSTOMER', now(), now())`,
  );
}

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });

async function signIn(context, email) {
  const page = await context.newPage();
  await page.goto(`${BASE}/login`, { waitUntil: "load" });
  await page.getByLabel("Business email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(/\/(admin|account|verify-email)/, { timeout: 20000 });
  await page.close();
}

const mineContext = await browser.newContext();
await signIn(mineContext, mine);
const page = await mineContext.newPage();

// ── the page is a code screen ───────────────────────────────────────────────
await page.goto(`${BASE}/verify-email/required`, { waitUntil: "load" });
const onPage = await page.locator("body").innerText();
check(
  "an unverified account is offered a code field",
  /six-digit code/i.test(onPage),
  `at ${page.url()}`,
);
check("and the address it went to is named", onPage.includes(mine));

// ── the code is not readable from the database ─────────────────────────────
await page.getByRole("button", { name: /Send a new code/ }).click();
await page.waitForTimeout(3000);

const stored = sql(
  `select coalesce("codeHash",'(null)') from "EmailVerificationToken" where "userId" = 'otpa${stamp}' order by "createdAt" desc limit 1`,
);
check("a code is issued", stored !== "" && stored !== "(null)");
check(
  "and stored as a hash, not as six digits",
  stored.length > 20 && !/^\d{6}$/.test(stored),
  stored.slice(0, 24),
);

const realCode = lastIssuedCode();
check("the code is recoverable for this test", realCode !== null, `log glob ${LOG_GLOB}`);

// ── wrong codes cost attempts ──────────────────────────────────────────────
async function enter(code) {
  await page.goto(`${BASE}/verify-email/required`, { waitUntil: "load" });
  await page.locator('input[name="code"]').fill(code);
  await page.getByRole("button", { name: "Confirm" }).click();
  await page.waitForTimeout(1800);
  return page.locator("body").innerText();
}

const wrong = realCode === "000000" ? "111111" : "000000";
const firstMiss = await enter(wrong);
check("a wrong code is refused", /not right/i.test(firstMiss), firstMiss.slice(0, 120));
check("and it says how many attempts are left", /attempts? left/i.test(firstMiss));
check(
  "the attempt is counted on the record",
  sql(
    `select attempts from "EmailVerificationToken" where "userId" = 'otpa${stamp}' order by "createdAt" desc limit 1`,
  ) === "1",
);

// Spend the rest.
for (let n = 0; n < 4; n += 1) await enter(wrong);
const spent = sql(
  `select attempts from "EmailVerificationToken" where "userId" = 'otpa${stamp}' order by "createdAt" desc limit 1`,
);
check("the attempts run out at five", spent === "5", spent);

/*
 * The check this suite exists for.
 *
 * The *correct* code, entered after the attempts are gone. A cap that lets the
 * right answer through on the sixth try protects nothing at all.
 */
if (realCode) {
  const afterLock = await enter(realCode);
  check(
    "the correct code is refused once the attempts are spent",
    !/ready to use/i.test(afterLock),
    afterLock.slice(0, 140),
  );
  check(
    "and the account is still unverified",
    sql(`select coalesce("emailVerified"::text,'') from "User" where id = 'otpa${stamp}'`) === "",
  );
}

// ── a fresh code works ─────────────────────────────────────────────────────
await page.goto(`${BASE}/verify-email/required`, { waitUntil: "load" });
await page.getByRole("button", { name: /Send a new code/ }).click();
await page.waitForTimeout(3000);

const freshCode = lastIssuedCode();
check("a new code replaces the old one", freshCode !== null && freshCode !== realCode);

if (freshCode) {
  // Somebody else's session must not be able to spend it.
  const theirContext = await browser.newContext();
  await signIn(theirContext, theirs);
  const theirPage = await theirContext.newPage();
  await theirPage.goto(`${BASE}/verify-email/required`, { waitUntil: "load" });
  await theirPage.locator('input[name="code"]').fill(freshCode);
  await theirPage.getByRole("button", { name: "Confirm" }).click();
  await theirPage.waitForTimeout(1800);
  check(
    "a code issued to one account cannot verify another",
    sql(`select coalesce("emailVerified"::text,'') from "User" where id = 'otpb${stamp}'`) === "",
  );
  check(
    "and it is still unspent for the account it belongs to",
    sql(
      `select coalesce("usedAt"::text,'') from "EmailVerificationToken" where "userId" = 'otpa${stamp}' order by "createdAt" desc limit 1`,
    ) === "",
  );
  await theirContext.close();

  const done = await enter(freshCode);
  check(
    "the right code on the right account verifies it",
    /ready to use|already confirmed/i.test(done),
    done.slice(0, 140),
  );
  check(
    "and the account is marked verified",
    sql(`select coalesce("emailVerified"::text,'') from "User" where id = 'otpa${stamp}'`) !== "",
  );
  check(
    "the code is spent, so it cannot be replayed",
    sql(
      `select coalesce("usedAt"::text,'') from "EmailVerificationToken" where "userId" = 'otpa${stamp}' order by "createdAt" desc limit 1`,
    ) !== "",
  );
}

await browser.close();

// ── clean up ───────────────────────────────────────────────────────────────
sql(`delete from "AuditLog" where "actorId" in ('otpa${stamp}','otpb${stamp}')`);
sql(`delete from "Session" where "userId" in ('otpa${stamp}','otpb${stamp}')`);
sql(`delete from "User" where id in ('otpa${stamp}','otpb${stamp}')`);
if (!hadHost) {
  // Put the transport back exactly as it was, and remove the row entirely only
  // if this suite is what created it.
  if (hadRow) {
    sql(
      `update "MailSettings" set host = null, port = null, secure = null, "fromAddress" = null, "fromName" = null where id = 'singleton'`,
    );
  } else {
    sql(`delete from "MailSettings" where id = 'singleton'`);
  }
}
rmSync(scratch, { force: true });

const failed = results.filter((result) => !result.ok).length;
console.log(`\n${results.length - failed}/${results.length} email OTP checks passed`);
process.exit(failed ? 1 : 0);
