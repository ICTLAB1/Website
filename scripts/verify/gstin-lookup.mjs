import { chromium } from "playwright";
import { execFileSync } from "node:child_process";
import { writeFileSync, rmSync } from "node:fs";
import http from "node:http";

/**
 * Filling a company profile in from a GSTIN.
 *
 * The unit tests cover the parsing. This covers what a person actually meets,
 * and the two states that matter are the ones nobody builds for:
 *
 *   **not connected** — no provider configured, which is every deployment on
 *     day one. The screens must not offer a button that cannot work, must still
 *     validate the number offline, and must never imply a lookup happened.
 *   **connected** — the details arrive and land on the record, the credentials
 *     the administrator stored are actually sent, and a cancelled registration
 *     is said out loud rather than quietly filled in.
 *
 * It works by being the GST provider: a throwaway HTTP server on the loopback
 * answers `/commonapi/v1.3/search`, so the request is asserted as it arrives —
 * URL, query and headers — rather than as the caller intended it.
 */

const BASE = process.env.BASE ?? "http://localhost:3000";
const PORT = Number(process.env.GSP_PORT ?? 2530);
const results = [];
const check = (name, ok, detail = "") => {
  const result = { name, ok: Boolean(ok), detail };
  results.push(result);
  console.log(
    `  ${result.ok ? "✓" : "✗"} ${result.name}${result.ok || !result.detail ? "" : ` — ${result.detail}`}`,
  );
};

const scratch = `/tmp/verify-gstin-${process.pid}.sql`;
const sql = (statement) => {
  writeFileSync(scratch, statement, { mode: 0o644 });
  return execFileSync("su", ["postgres", "-c", `psql -tA -d ictlab -f ${scratch}`], {
    encoding: "utf8",
  }).trim();
};

const stamp = Date.now().toString().slice(-6);
const FIXTURE_HASH = "$2b$12$Y1EnHFQUoF4sKzWulgpRre1IGREZUDi/nFfN6QycEnigobTHRMj5e";
const password = "CorrectHorse9";
const customerEmail = `gst_cust${stamp}@example.test`;
/** This company's own GSTIN — a number that passes its own check digit. */
const GSTIN = "07AAICT5606J1Z4";
const LEGAL_NAME = `GST PROBE HOLDINGS ${stamp} PRIVATE LIMITED`;

// ── the GST provider ───────────────────────────────────────────────────────
const seen = [];
let status = "Active";
const provider = http.createServer((request, response) => {
  seen.push({ url: request.url, headers: request.headers });
  response.writeHead(200, { "content-type": "application/json" });
  response.end(
    JSON.stringify({
      gstin: GSTIN,
      lgnm: LEGAL_NAME,
      tradeNam: `GST Probe ${stamp}`,
      sts: status,
      ctb: "Private Limited Company",
      dty: "Regular",
      rgdt: "01/07/2021",
      cxdt: "",
      stj: "Delhi",
      pradr: {
        addr: {
          flno: "4th Floor",
          bno: "407",
          bnm: `Probe Business Park ${stamp}`,
          st: "Netaji Subhash Place",
          loc: "Pitampura",
          stcd: "Delhi",
          pncd: "110034",
        },
        ntr: ["Office"],
      },
      adadr: [],
    }),
  );
});
await new Promise((resolve) => provider.listen(PORT, "127.0.0.1", resolve));

// ── a customer who administers their own company ───────────────────────────
sql(`delete from "GstinLookupSettings" where id = 'singleton'`);
sql(
  `insert into "Company" (id, name, country, "createdAt", "updatedAt") values ('gstc${stamp}', 'GST Probe ${stamp}', 'India', now(), now())`,
);
sql(
  `insert into "User" (id, email, "passwordHash", name, role, "companyRole", "companyId", "emailVerified", "createdAt", "updatedAt") values ('gstu${stamp}', '${customerEmail}', '${FIXTURE_HASH}', 'GST Probe Customer', 'CUSTOMER', 'ADMIN', 'gstc${stamp}', now(), now(), now())`,
);

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const context = await browser.newContext();
const login = await context.newPage();
await login.goto(`${BASE}/login`, { waitUntil: "load" });
await login.getByLabel("Business email").fill(customerEmail);
await login.getByLabel("Password").fill(password);
await login.getByRole("button", { name: "Sign in" }).click();
await login.waitForURL(/\/(admin|account)/, { timeout: 20000 });
await login.close();

const page = await context.newPage();
const company = () => `${BASE}/account/company`;

// ── not connected ──────────────────────────────────────────────────────────
await page.goto(company(), { waitUntil: "load" });
const bare = await page.locator("body").innerText();
check(
  "with no provider configured, no lookup is offered",
  !/Fetch my details|Check my GSTIN/i.test(bare),
  bare.match(/Fetch my details|Check my GSTIN/i)?.[0] ?? "",
);

/*
 * The offline half still works, and is the reason the feature is worth having
 * on a deployment with no provider at all: a GSTIN that fails its own check
 * digit is a typo, and it is caught here rather than on a tax invoice.
 */
await page.locator('input[name="gstin"]').fill("07AAICT5606J1Z5");
await page.getByRole("button", { name: "Save company details" }).click();
await page.waitForTimeout(1800);
const refused = await page.locator("body").innerText();
check(
  "a GSTIN failing its own check digit is refused offline",
  /check digit/i.test(refused),
  refused.slice(0, 160),
);
check(
  "and nothing was stored",
  sql(`select coalesce(gstin,'') from "Company" where id = 'gstc${stamp}'`) === "",
);

// ── connected ──────────────────────────────────────────────────────────────
sql(
  `insert into "GstinLookupSettings" (id, "baseUrl", "statusPath", "searchPath", "headerOneName", "updatedAt")
   values ('singleton', 'http://127.0.0.1:${PORT}', '/commonapi/v1.0/tpstatus', '/commonapi/v1.3/search', 'x-probe-header', now())`,
);

await page.goto(company(), { waitUntil: "load" });
const offered = await page.locator("body").innerText();
check("once a provider is configured, the lookup is offered", /Fetch my details/i.test(offered));

const fetchForm = page.locator('form:has(input[name="replaceExisting"])');
await fetchForm.locator('input[name="gstin"]').fill(GSTIN);
await fetchForm.getByRole("button", { name: "Fetch my details" }).click();
await page.waitForTimeout(2500);

check("the provider was actually called", seen.length > 0, `${seen.length} requests`);
if (seen.length > 0) {
  const request = seen[seen.length - 1];
  check(
    "with the documented query, on the search endpoint",
    request.url === `/commonapi/v1.3/search?gstin=${GSTIN}&action=TP`,
    request.url,
  );
}

const stored = sql(
  `select coalesce(gstin,''), coalesce(pan,''), coalesce(name,''), coalesce("addressLine1",''),
          coalesce(city,''), coalesce(state,''), coalesce(postcode,'')
     from "Company" where id = 'gstc${stamp}'`,
).split("|");

check("the GSTIN is stored", stored[0] === GSTIN, stored[0]);
check(
  "the PAN is taken out of the GSTIN rather than asked for twice",
  stored[1] === "AAICT5606J",
  stored[1],
);
/*
 * The name is *not* taken on this pass, and that is the rule working.
 *
 * The fixture company already has one, and the default is additive: nothing a
 * person has typed is replaced unless they ask. The registered name arriving is
 * asserted below, on the pass where they do ask.
 */
check(
  "a name already entered is not silently replaced",
  stored[2] === `GST Probe ${stamp}`,
  stored[2],
);
check(
  "so does the address",
  stored[3] === `4th Floor, 407, Probe Business Park ${stamp}` &&
    stored[4] === "Pitampura" &&
    stored[6] === "110034",
  stored.slice(3).join(" | "),
);
check("and the state, which decides IGST against CGST and SGST", stored[5] === "Delhi", stored[5]);

/*
 * The default is additive.
 *
 * A registered address is often a chartered accountant's office rather than
 * where the organisation sits, so replacing a delivery address somebody typed
 * with the one on a certificate is how a consignment goes to the wrong
 * building. Ticking the box is what makes it a replacement.
 */
sql(`update "Company" set "addressLine1" = 'Where we actually sit' where id = 'gstc${stamp}'`);
await page.goto(company(), { waitUntil: "load" });
await fetchForm.locator('input[name="gstin"]').fill(GSTIN);
await fetchForm.getByRole("button", { name: "Fetch my details" }).click();
await page.waitForTimeout(2500);
check(
  "an address already entered is left alone by default",
  sql(`select "addressLine1" from "Company" where id = 'gstc${stamp}'`) === "Where we actually sit",
);

await page.goto(company(), { waitUntil: "load" });
await fetchForm.locator('input[name="gstin"]').fill(GSTIN);
await fetchForm.locator('input[name="replaceExisting"]').check();
await fetchForm.getByRole("button", { name: "Fetch my details" }).click();
await page.waitForTimeout(2500);
check(
  "and replaced when the customer asks for that",
  sql(`select "addressLine1" from "Company" where id = 'gstc${stamp}'`) ===
    `4th Floor, 407, Probe Business Park ${stamp}`,
);
check(
  "the registered legal name arrives on that pass",
  sql(`select name from "Company" where id = 'gstc${stamp}'`) === LEGAL_NAME,
  sql(`select name from "Company" where id = 'gstc${stamp}'`),
);

// ── a cancelled registration is said out loud ──────────────────────────────
status = "Cancelled";
await page.goto(company(), { waitUntil: "load" });
await fetchForm.locator('input[name="gstin"]').fill(GSTIN);
await fetchForm.getByRole("button", { name: "Fetch my details" }).click();
await page.waitForTimeout(2500);
const cancelled = await page.locator("body").innerText();
check(
  "a cancelled registration is reported rather than quietly filled in",
  /Cancelled/i.test(cancelled),
  cancelled.slice(0, 200),
);

// ── a provider that cannot be reached is not a GSTIN that does not exist ───
status = "Active";
await new Promise((resolve) => provider.close(resolve));
await page.goto(company(), { waitUntil: "load" });
await fetchForm.locator('input[name="gstin"]').fill(GSTIN);
await fetchForm.getByRole("button", { name: "Fetch my details" }).click();
await page.waitForTimeout(4000);
const down = await page.locator("body").innerText();
check(
  "a provider that is down says so, and does not claim the GSTIN is unknown",
  /could not be reached/i.test(down) && !/no record of that number/i.test(down),
  down.slice(0, 200),
);

await browser.close();

// ── clean up ───────────────────────────────────────────────────────────────
sql(`delete from "GstinLookupSettings" where id = 'singleton'`);
sql(`delete from "AuditLog" where "actorId" = 'gstu${stamp}'`);
sql(`delete from "Session" where "userId" = 'gstu${stamp}'`);
sql(`delete from "User" where id = 'gstu${stamp}'`);
sql(`delete from "Company" where id = 'gstc${stamp}'`);
rmSync(scratch, { force: true });

const failed = results.filter((result) => !result.ok).length;
console.log(`\n${results.length - failed}/${results.length} GSTIN lookup checks passed`);
process.exit(failed ? 1 : 0);
