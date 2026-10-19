import { chromium } from "playwright";
import { execFileSync } from "node:child_process";
import { writeFileSync, rmSync } from "node:fs";

/**
 * Quoting in a currency other than the rupee.
 *
 * A quotation's figures are stored in the minor unit of its own currency, so
 * this is not a display setting and the failures are not cosmetic. Four
 * properties, and the last two are the ones that would cost real money.
 *
 * **Only a draft can change currency.** An issued quotation is a price the
 * customer has in writing.
 *
 * **Restating converts every line at the administrator's rate**, and records
 * the rate it used, so a figure nobody can account for later can be traced.
 *
 * **Leaving the rupee takes Indian GST off every line.** A supply billed
 * abroad is an export; adding 18% to a dollar price overstates it by 18% and
 * misstates the tax position at the same time. Coming back puts it on again.
 *
 * **A catalogue price added to a foreign-currency quotation is converted.**
 * This is the one that would ship silently: a rupee number sitting under a
 * dollar sign on a document already in a customer's hands.
 */

const BASE = process.env.BASE ?? "http://localhost:3000";
const results = [];
const check = (name, ok, detail = "") => {
  const result = { name, ok: Boolean(ok), detail };
  results.push(result);
  console.log(`  ${result.ok ? "✓" : "✗"} ${result.name}${result.ok || !result.detail ? "" : ` — ${result.detail}`}`);
};

const scratch = `/tmp/verify-quote-currency-${process.pid}.sql`;
const sql = (statement) => {
  writeFileSync(scratch, statement, { mode: 0o644 });
  return execFileSync("su", ["postgres", "-c", `psql -tA -d ictlab -f ${scratch}`], {
    encoding: "utf8",
  }).trim();
};

const stamp = Date.now().toString().slice(-6);
const FIXTURE_HASH = "$2b$12$Y1EnHFQUoF4sKzWulgpRre1IGREZUDi/nFfN6QycEnigobTHRMj5e";
const password = "CorrectHorse9";
const staffEmail = `qc_staff${stamp}@example.test`;
const quoteRef = `QTE-2026-QC${stamp.slice(-4)}`;

/*
 * The rates the restatement will use.
 *
 * Saved onto the live settings row and put back at the end, because the
 * currency is not offered at all without them — that absence is deliberate and
 * is itself covered below, before these are set.
 */
const settingsRow = sql(`select id from "SiteSettings" limit 1`);
const priorUsd = sql(`select coalesce("usdRatePaise"::text, 'NULL') from "SiteSettings" where id = '${settingsRow}'`);
const priorAed = sql(`select coalesce("aedRatePaise"::text, 'NULL') from "SiteSettings" where id = '${settingsRow}'`);
sql(`update "SiteSettings" set "usdRatePaise" = null, "aedRatePaise" = null where id = '${settingsRow}'`);

/*
 * Settings are cached for a minute, and a row written by psql cannot
 * invalidate that cache — which is deliberate, and documented where the cache
 * is declared. The cache is also stale-while-revalidate, so the first request
 * after the window still serves the old value and only *starts* the refresh:
 * waiting sixty-five seconds and loading the page once is not enough, and the
 * one run that did exactly that reported "no currency is offered" against a
 * page that offers three. So the page is reloaded until the rate shows up, or
 * the run gives up and says so rather than asserting against a stale screen.
 */
async function reloadUntil(target, url, predicate) {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    await target.goto(url, { waitUntil: "load" });
    if (await predicate()) return true;
    await new Promise((resolve) => setTimeout(resolve, 5_000));
  }
  return false;
}

sql(
  `insert into "Company" (id, name, country, "createdAt", "updatedAt") values ('qcc${stamp}', 'Currency Probe ${stamp}', 'United Arab Emirates', now(), now())`,
);
sql(
  `insert into "User" (id, email, "passwordHash", name, role, "emailVerified", "createdAt", "updatedAt") values ('qcs${stamp}', '${staffEmail}', '${FIXTURE_HASH}', 'Currency Probe Staff', 'ADMIN', now(), now(), now())`,
);
sql(
  `insert into "User" (id, email, "passwordHash", name, role, "companyRole", "companyId", "emailVerified", "createdAt", "updatedAt") values ('qcu${stamp}', 'qc_cust${stamp}@example.test', '${FIXTURE_HASH}', 'Currency Probe Customer', 'CUSTOMER', 'ADMIN', 'qcc${stamp}', now(), now(), now())`,
);
// ₹1,000.00 a unit, ten of them, 18% GST: ₹10,000 + ₹1,800.
sql(
  `insert into "Quote" (id, reference, status, version, "rootId", "userId", "companyId", currency, "subtotalMinor", "discountMinor", "taxMinor", "totalMinor", "validUntil", "createdAt", "updatedAt") values ('qcq${stamp}', '${quoteRef}', 'DRAFT', 1, 'qcq${stamp}', 'qcu${stamp}', 'qcc${stamp}', 'INR', 1000000, 0, 180000, 1180000, now() + interval '30 days', now(), now())`,
);
sql(
  `insert into "QuoteItem" (id, "quoteId", "productName", sku, quantity, "unitPriceMinor", "discountMinor", "gstRatePercent", "lineTotalMinor") values ('qci${stamp}', 'qcq${stamp}', 'Licence, annual', 'QC-SKU-1', 10, 100000, 0, 18, 1000000)`,
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

const staff = await browser.newContext({ viewport: { width: 1440, height: 1200 } });
await signIn(staff, staffEmail, password);
const page = await staff.newPage();

const quoteState = () =>
  sql(
    `select currency || '|' || coalesce("exchangeRatePaise"::text, '-') || '|' || "subtotalMinor" || '|' || "taxMinor" || '|' || "totalMinor" from "Quote" where id = 'qcq${stamp}'`,
  );
const lineState = () =>
  sql(`select "unitPriceMinor" || '|' || "gstRatePercent" from "QuoteItem" where id = 'qci${stamp}'`);

// ── no rate, no currency ────────────────────────────────────────────────────
await page.goto(`${BASE}/admin/quotes/${quoteRef}`, { waitUntil: "load" });
check("staff can open the draft quotation", (await page.locator("body").innerText()).includes(quoteRef));

/*
 * The quotation's own control, by its label.
 *
 * The admin layout carries the public header, and the header carries the
 * display-currency switcher — a different feature with the same field name.
 * `select[name="currency"]` matches both, and a run that resolved to the
 * header's would be testing the wrong thing while passing.
 */
const selector = page.getByLabel(/^Quote in/);
check(
  "with no rate set, no other currency is offered at all",
  await reloadUntil(page, `${BASE}/admin/quotes/${quoteRef}`, async () => (await selector.count()) === 0),
  `${await selector.count()} selector(s) on the page`,
);
check(
  "and the screen says where to set one rather than going silent",
  /set a rate/i.test(await page.locator("body").innerText()),
);

// ₹88.40 to the dollar, ₹24.07 to the dirham.
sql(`update "SiteSettings" set "usdRatePaise" = 8840, "aedRatePaise" = 2407 where id = '${settingsRow}'`);
console.log("  … waiting for the settings cache to turn over");

// ── restating in dollars ────────────────────────────────────────────────────
check(
  "once a rate is set, the currency can be chosen",
  await reloadUntil(page, `${BASE}/admin/quotes/${quoteRef}`, async () => (await selector.count()) === 1),
);
check(
  "and the rupee is still on the list, so the change is reversible",
  (await selector.locator("option").allInnerTexts()).join(" ").includes("Indian rupee"),
);

await selector.selectOption("USD");
await page.getByRole("button", { name: /Restate in this currency/i }).click();
await page.waitForTimeout(2500);

check(
  "the quotation is now in dollars",
  quoteState().startsWith("USD|"),
  quoteState(),
);
check(
  "every line is converted at the stored rate",
  // ₹1,000.00 = 100000 paise; at ₹88.40 that is $11.31 = 1131 cents.
  lineState() === "1131|0",
  lineState(),
);
check(
  "Indian GST comes off the quotation entirely",
  quoteState().split("|")[3] === "0",
  quoteState(),
);
check(
  "and the rate it was converted at is recorded on the quotation",
  quoteState().split("|")[1] === "8840",
  quoteState(),
);
check(
  "the change is in the audit trail with both currencies on it",
  sql(
    `select count(*) from "AuditLog" where action = 'admin.quote_currency_changed' and "entityId" = '${quoteRef}' and metadata::text like '%USD%'`,
  ) !== "0",
);

// ── what the screen and the document then say ───────────────────────────────
await page.goto(`${BASE}/admin/quotes/${quoteRef}`, { waitUntil: "load" });
const body = await page.locator("body").innerText();
/*
 * Scoped to the totals card.
 *
 * "GST" appears all over an Indian admin screen — a GSTIN on the customer, a
 * field hint, and the sentence under the currency selector that explains this
 * very behaviour — so asserting against the page, or even against the whole
 * card, fails on a correct screen. What must not be there is a GST *row*
 * beside a figure that carries none, so the rows are what is read.
 */
const totals = await page
  .locator("section")
  .filter({ hasText: /^Totals/ })
  .first()
  .locator("dl")
  .innerText();
check("the totals are shown in dollars", totals.includes("$113.10"), totals.replace(/\n/g, " · "));
check("no GST row is shown beside a figure that carries none", !/\bGST\b/.test(totals), totals.replace(/\n/g, " · "));
check("the rate used is on the screen for whoever has to explain the price", /Converted at \$1 = ₹88\.40/.test(body));

const editor = page.locator("details").filter({ hasText: "QC-SKU-1" }).first();
await editor.locator("summary").click();
check(
  "the price field asks for dollars, not rupees",
  (await editor.innerText()).includes("Unit price ($)"),
  (await editor.innerText()).split("\n").find((row) => row.includes("Unit price")) ?? "no such field",
);

const pdf = await staff.request.get(`${BASE}/account/quotes/${quoteRef}/pdf?inline=1`);
const pdfText = (await pdf.body()).toString("latin1");
check("the quotation PDF is still produced", pdf.status() === 200, `status ${pdf.status()}`);
check(
  "and it names the currency it is written in",
  pdfText.includes("USD"),
);

// ── a catalogue line added to a dollar quotation ────────────────────────────
const catalogue = sql(
  `select v.sku || '|' || coalesce(v."salePriceMinor", v."listPriceMinor") from "ProductVariant" v join "Product" p on p.id = v."productId" where p.status = 'ACTIVE' and coalesce(v."salePriceMinor", v."listPriceMinor") > 0 order by v.sku limit 1`,
);
const [catalogueSku, cataloguePaise] = catalogue.split("|");
const addForm = page.locator('form:has(input[name="sku"])').first();
await addForm.locator('input[name="sku"]').fill(catalogueSku);
await addForm.getByRole("button", { name: /Add line/i }).click();
await page.waitForTimeout(2500);

const added = sql(
  `select "unitPriceMinor" || '|' || "gstRatePercent" from "QuoteItem" where "quoteId" = 'qcq${stamp}' and sku = '${catalogueSku}'`,
);
const expectedCents = Math.round((Number(cataloguePaise) * 100) / 8840);
check(
  "a catalogue price added to a dollar quotation is converted, not copied",
  added === `${expectedCents}|0`,
  `${added} — expected ${expectedCents}|0 from ${cataloguePaise} paise`,
);
sql(`delete from "QuoteItem" where "quoteId" = 'qcq${stamp}' and sku = '${catalogueSku}'`);

// ── back to rupees ──────────────────────────────────────────────────────────
await page.goto(`${BASE}/admin/quotes/${quoteRef}`, { waitUntil: "load" });
await selector.selectOption("INR");
await page.getByRole("button", { name: /Restate in this currency/i }).click();
await page.waitForTimeout(2500);

/*
 * ₹1,000.00 out and ₹999.80 back.
 *
 * Rounding to the cent on the way out loses a fraction of a paisa, and the
 * round trip does not land exactly where it started. That is inherent and is
 * why the conversion is documented as a starting point rather than a
 * calculation anybody reverses: 1131 cents is what $11.31 is, and ₹999.80 is
 * what 1131 cents is. The assertion is exact so that a change in the rounding
 * rule shows up here rather than in a customer's quotation.
 */
check(
  "coming back to rupees restores GST on every line",
  lineState() === "99980|18",
  lineState(),
);
check(
  "and clears the rate, which no longer explains anything",
  quoteState().split("|")[1] === "-",
  quoteState(),
);

// ── an issued quotation does not change currency ────────────────────────────
sql(`update "Quote" set status = 'SENT', "sentAt" = now() where id = 'qcq${stamp}'`);
await page.goto(`${BASE}/admin/quotes/${quoteRef}`, { waitUntil: "load" });
check(
  "an issued quotation is not offered a currency change at all",
  (await selector.count()) === 0,
);
check(
  "and the screen says why",
  /only a draft can change currency/i.test(await page.locator("body").innerText()),
);

const before = quoteState();
const forged = await staff.request.post(`${BASE}/admin/quotes/${quoteRef}`, {
  form: { reference: quoteRef, currency: "USD" },
});
check(
  "a request sent past the screen does not change it either",
  quoteState() === before,
  `${before} → ${quoteState()} (status ${forged.status()})`,
);

await browser.close();

// ── clean up ────────────────────────────────────────────────────────────────
sql(
  `update "SiteSettings" set "usdRatePaise" = ${priorUsd}, "aedRatePaise" = ${priorAed} where id = '${settingsRow}'`,
);
sql(`delete from "AuditLog" where "entityId" in ('${quoteRef}', 'qci${stamp}')`);
sql(`delete from "AuditLog" where metadata::text like '%${quoteRef}%'`);
sql(`delete from "QuoteItem" where "quoteId" = 'qcq${stamp}'`);
sql(`delete from "Quote" where id = 'qcq${stamp}'`);
sql(`delete from "Session" where "userId" in ('qcs${stamp}', 'qcu${stamp}')`);
sql(`delete from "User" where id in ('qcs${stamp}', 'qcu${stamp}')`);
sql(`delete from "Company" where id = 'qcc${stamp}'`);
rmSync(scratch, { force: true });

const failed = results.filter((result) => !result.ok).length;
console.log(`\n${results.length - failed}/${results.length} quotation currency checks passed`);
process.exit(failed ? 1 : 0);
