import { chromium } from "playwright";
import { execFileSync } from "node:child_process";
import { writeFileSync, rmSync } from "node:fs";

/**
 * Editing a draft quotation, and seeing it before the customer does.
 *
 * Two properties.
 *
 * **The name on a line is the line's own.** A quotation line already holds a
 * copy of the product name rather than reading it back through the catalogue,
 * so that renaming a product cannot change what a document said months earlier.
 * This proves the copy is editable and that editing it moves the line and not
 * the catalogue — the second half matters more, because a rename that leaked
 * into `Product` would silently rewrite every other quotation carrying it.
 *
 * **The preview is the document.** The preview opens the same route, built by
 * the same builder, as the file the customer receives. A preview produced by a
 * second code path would eventually stop matching what gets sent, and a preview
 * that can disagree with the thing it previews is worse than no preview at all.
 * So this asserts byte-for-byte identity between the preview response and the
 * download, rather than merely that a PDF appeared.
 *
 * It also checks the two things that make an inline PDF actually display: the
 * disposition, and that the response is not sandboxed. A `sandbox` CSP stops
 * the browser's PDF viewer from running and the preview comes up blank, which
 * is a failure nobody notices in code review.
 */

const BASE = process.env.BASE ?? "http://localhost:3000";
const results = [];
const check = (name, ok, detail = "") => {
  const result = { name, ok: Boolean(ok), detail };
  results.push(result);
  // Detail only on failure. A pass that prints its evidence beside it reads
  // like a failure at a glance, which is how a red run gets skimmed past.
  console.log(`  ${result.ok ? "✓" : "✗"} ${result.name}${result.ok || !result.detail ? "" : ` — ${result.detail}`}`);
};

const scratch = `/tmp/verify-quote-editing-${process.pid}.sql`;
const sql = (statement) => {
  writeFileSync(scratch, statement, { mode: 0o644 });
  return execFileSync("su", ["postgres", "-c", `psql -tA -d ictlab -f ${scratch}`], {
    encoding: "utf8",
  }).trim();
};

const stamp = Date.now().toString().slice(-6);
const FIXTURE_HASH = "$2b$12$Y1EnHFQUoF4sKzWulgpRre1IGREZUDi/nFfN6QycEnigobTHRMj5e";
const password = "CorrectHorse9";
const staffEmail = `qe_staff${stamp}@example.test`;
const quoteRef = `QTE-2026-QE${stamp.slice(-4)}`;

// A draft quotation belonging to a customer, with one line on it.
sql(
  `insert into "Company" (id, name, country, "createdAt", "updatedAt") values ('qec${stamp}', 'Quote Editing Probe ${stamp}', 'India', now(), now())`,
);
sql(
  `insert into "User" (id, email, "passwordHash", name, role, "emailVerified", "createdAt", "updatedAt") values ('qes${stamp}', '${staffEmail}', '${FIXTURE_HASH}', 'Editing Probe Staff', 'ADMIN', now(), now(), now())`,
);
sql(
  `insert into "User" (id, email, "passwordHash", name, role, "companyRole", "companyId", "emailVerified", "createdAt", "updatedAt") values ('qeu${stamp}', 'qe_cust${stamp}@example.test', '${FIXTURE_HASH}', 'Editing Probe Customer', 'CUSTOMER', 'ADMIN', 'qec${stamp}', now(), now(), now())`,
);
sql(
  `insert into "Quote" (id, reference, status, version, "rootId", "userId", "companyId", currency, "subtotalMinor", "discountMinor", "taxMinor", "totalMinor", "validUntil", "createdAt", "updatedAt") values ('qeq${stamp}', '${quoteRef}', 'DRAFT', 1, 'qeq${stamp}', 'qeu${stamp}', 'qec${stamp}', 'INR', 100000, 0, 18000, 118000, now() + interval '30 days', now(), now())`,
);
sql(
  `insert into "QuoteItem" (id, "quoteId", "productName", sku, quantity, "unitPriceMinor", "discountMinor", "gstRatePercent", "lineTotalMinor") values ('qei${stamp}', 'qeq${stamp}', 'Catalogue name as imported', 'QE-SKU-1', 1, 100000, 0, 18, 100000)`,
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

const staff = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
await signIn(staff, staffEmail, password);
const page = await staff.newPage();
await page.goto(`${BASE}/admin/quotes/${quoteRef}`, { waitUntil: "load" });

check(
  "staff can open the draft quotation",
  (await page.locator("body").innerText()).includes(quoteRef),
);

// ── the name on the line is editable ────────────────────────────────────────
const editor = page.locator("details").filter({ hasText: "QE-SKU-1" }).first();
await editor.locator("summary").click();

const nameField = editor.locator('input[name="productName"]').first();
check("the line editor offers the product name", await nameField.isVisible());
check(
  "and it is pre-filled with the name the line already carries",
  (await nameField.inputValue()) === "Catalogue name as imported",
  await nameField.inputValue(),
);

const token = `ZQ${stamp}`;
const renamed = `Tender line ${token}`;
await nameField.fill(renamed);
await editor.getByRole("button", { name: "Update line" }).click();
await page.waitForTimeout(2500);

check(
  "saving changes the name on the line",
  sql(`select "productName" from "QuoteItem" where id = 'qei${stamp}'`) === renamed,
  sql(`select "productName" from "QuoteItem" where id = 'qei${stamp}'`),
);

/*
 * The half that matters. A line name that wrote through to the catalogue would
 * rewrite the name on every other quotation that ever carried that product,
 * including ones already in a customer's hands.
 */
check(
  "and does not rename anything in the catalogue",
  sql(`select count(*) from "Product" where name = '${renamed}'`) === "0",
);

check(
  "an empty name is refused rather than saved",
  await (async () => {
    await nameField.fill("");
    await editor.getByRole("button", { name: "Update line" }).click();
    await page.waitForTimeout(2000);
    return sql(`select "productName" from "QuoteItem" where id = 'qei${stamp}'`) === renamed;
  })(),
);

check(
  "the rename is in the audit trail",
  sql(
    `select count(*) from "AuditLog" where action = 'admin.quote_line_updated' and "entityId" = 'qei${stamp}'`,
  ) !== "0",
);

// ── the preview is the document ─────────────────────────────────────────────
const previewLink = page.getByRole("link", { name: /Preview/i }).first();
check("the quotation screen offers a preview", await previewLink.count() > 0);
check(
  "the preview opens in a new tab rather than replacing the screen being checked",
  (await previewLink.getAttribute("target")) === "_blank",
);

const inline = await staff.request.get(`${BASE}/account/quotes/${quoteRef}/pdf?inline=1`);
const download = await staff.request.get(`${BASE}/account/quotes/${quoteRef}/pdf`);

check("the preview is served", inline.status() === 200, `status ${inline.status()}`);
check(
  "the preview is a PDF",
  inline.headers()["content-type"] === "application/pdf",
  inline.headers()["content-type"],
);
check(
  "the preview is served for display, not download",
  (inline.headers()["content-disposition"] ?? "").startsWith("inline"),
  inline.headers()["content-disposition"],
);
check(
  "the download is still served as an attachment",
  (download.headers()["content-disposition"] ?? "").startsWith("attachment"),
  download.headers()["content-disposition"],
);

/*
 * A `sandbox` CSP on an inline PDF stops the browser's own viewer from
 * running and the preview renders blank. Asserted because it is invisible in
 * review and only shows up as "the preview does not work".
 */
check(
  "the preview is not sandboxed, which would render it blank",
  !(inline.headers()["content-security-policy"] ?? "").includes("sandbox"),
  inline.headers()["content-security-policy"],
);

const inlineBytes = await inline.body();
const downloadBytes = await download.body();
check(
  "the preview is byte-for-byte the document that gets sent",
  inlineBytes.equals(downloadBytes),
  `${inlineBytes.length} vs ${downloadBytes.length} bytes`,
);
check("the preview is a real PDF", inlineBytes.subarray(0, 5).toString() === "%PDF-", "");

/*
 * Read out of the page's text operators rather than by searching the raw
 * bytes. The name is laid out into a table column and wraps, so it reaches the
 * file as several separate strings; a substring search for the whole name
 * would fail on a document that prints it perfectly well. The token is short
 * enough that it cannot itself be broken across two.
 */
const printed = [...inlineBytes.toString("latin1").matchAll(/\(((?:\\.|[^()\\])*)\)\s*Tj/g)]
  .map((match) => match[1])
  .join(" ");
check(
  "the edited name is the name printed on the document",
  printed.includes(token),
  "the renamed line did not appear in the PDF text",
);

// Neither document may be cached by anything shared: it carries a customer's
// prices.
for (const [label, response] of [
  ["preview", inline],
  ["download", download],
]) {
  check(
    `the ${label} is never cached`,
    (response.headers()["cache-control"] ?? "").includes("no-store"),
    response.headers()["cache-control"],
  );
}

await browser.close();

// ── clean up ────────────────────────────────────────────────────────────────
sql(`delete from "AuditLog" where "entityId" = 'qei${stamp}'`);
sql(`delete from "QuoteItem" where "quoteId" = 'qeq${stamp}'`);
sql(`delete from "Quote" where id = 'qeq${stamp}'`);
sql(`delete from "Session" where "userId" in ('qes${stamp}', 'qeu${stamp}')`);
sql(`delete from "User" where id in ('qes${stamp}', 'qeu${stamp}')`);
sql(`delete from "Company" where id = 'qec${stamp}'`);
rmSync(scratch, { force: true });

const failed = results.filter((result) => !result.ok).length;
console.log(`\n${results.length - failed}/${results.length} quote editing checks passed`);
process.exit(failed ? 1 : 0);
