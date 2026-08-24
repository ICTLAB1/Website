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
/*
 * Reported as *what* differs, not merely that something did.
 *
 * "922817 vs 922817 bytes" is what this said the one time it failed, which
 * narrows the cause to nothing at all — two files of identical length that
 * disagree somewhere. The offset and the bytes on either side of it name the
 * field, and a run that cannot be reproduced afterwards still leaves enough in
 * the log to act on.
 */
const firstDifference = () => {
  const limit = Math.min(inlineBytes.length, downloadBytes.length);
  let at = 0;
  while (at < limit && inlineBytes[at] === downloadBytes[at]) at += 1;
  const window = (buffer) =>
    buffer.subarray(Math.max(0, at - 60), at + 60).toString("latin1").replace(/[^\x20-\x7e]/g, ".");
  return `${inlineBytes.length} vs ${downloadBytes.length} bytes, first differing at ${at}\n      preview:  ${window(inlineBytes)}\n      download: ${window(downloadBytes)}`;
};

check(
  "the preview is byte-for-byte the document that gets sent",
  inlineBytes.equals(downloadBytes),
  inlineBytes.equals(downloadBytes) ? "" : firstDifference(),
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

/*
 * ── adding a line ──────────────────────────────────────────────────────────
 *
 * A quotation is drafted from what the customer asked for and then grows. The
 * screen could edit and remove lines and not add one, so the only way to put
 * something else on a quotation was to ask the customer to enquire again.
 *
 * Two paths, and they fail differently. From the catalogue the risk is that the
 * looked-up values are not the ones the catalogue would have charged — a second
 * copy of the pricing rule that drifts from the first. By hand the risk is the
 * opposite: a line with no name, no price and no tax rate written anyway,
 * printing a blank row on a tax document.
 */
const addForm = page.locator('form:has(input[name="sku"])').first();
await page.goto(`${BASE}/admin/quotes/${quoteRef}`, { waitUntil: "load" });
check("the draft offers a way to add a line", (await addForm.count()) > 0);

const linesNow = () =>
  Number(sql(`select count(*) from "QuoteItem" where "quoteId" = 'qeq${stamp}'`));

async function submitAdd(fields) {
  await page.goto(`${BASE}/admin/quotes/${quoteRef}`, { waitUntil: "load" });
  for (const [name, value] of Object.entries(fields)) {
    await addForm.locator(`[name="${name}"]`).fill(value);
  }
  await addForm.getByRole("button", { name: "Add line" }).click();
  await page.waitForTimeout(2500);
  return addForm.innerText();
}

// A real catalogue variant, so the looked-up values are the catalogue's own
// rather than a fixture written to agree with the code under test.
const [catalogueSku, listPrice, salePrice, gstRate, catalogueName] = sql(
  `select v.sku, v."listPriceMinor", coalesce(v."salePriceMinor"::text,''), v."gstRatePercent", p.name
     from "ProductVariant" v join "Product" p on p.id = v."productId"
    where p.status = 'ACTIVE' order by v.sku limit 1`,
).split("|");
const expectedPrice =
  salePrice !== "" && Number(salePrice) > 0 && Number(salePrice) < Number(listPrice)
    ? Number(salePrice)
    : Number(listPrice);

const before = linesNow();
await submitAdd({ sku: catalogueSku, quantity: "3" });
check("a catalogue SKU adds a line", linesNow() === before + 1);

const added = sql(
  `select "productName", "unitPriceMinor", "gstRatePercent", quantity, "lineTotalMinor"
     from "QuoteItem" where "quoteId" = 'qeq${stamp}' and sku = '${catalogueSku}'`,
).split("|");
check(
  "and takes its name from the catalogue",
  added[0] === catalogueName,
  `${added[0]} vs ${catalogueName}`,
);
check(
  "and the price the catalogue would charge today",
  Number(added[1]) === expectedPrice,
  `${added[1]} vs ${expectedPrice}`,
);
check("and the catalogue's tax rate", Number(added[2]) === Number(gstRate), added[2]);
check("and the quantity that was asked for", Number(added[3]) === 3, added[3]);

/*
 * The header must agree with the lines. A quotation whose total does not
 * reconcile against what is printed under it is not a document anybody can act
 * on, and recalculating on every write is the only reason it ever does.
 */
const reconciles = sql(
  `select (q."subtotalMinor" - q."discountMinor" + q."taxMinor") = q."totalMinor"
     and q."subtotalMinor" = (select coalesce(sum(i."unitPriceMinor" * i.quantity), 0)
                                from "QuoteItem" i where i."quoteId" = q.id)
     from "Quote" q where q.id = 'qeq${stamp}'`,
);
check("the document totals are recalculated to match the lines", reconciles === "t", reconciles);

check(
  "the addition is in the audit trail",
  sql(
    `select count(*) from "AuditLog" where action = 'admin.quote_line_added' and metadata::text like '%${quoteRef}%'`,
  ) !== "0",
);

// A line of its own: no catalogue row behind it, which is what a service,
// a delivery charge or a re-badged part actually is.
const freeName = `Migration service ${stamp}`;
const withFree = linesNow();
await submitAdd({ productName: freeName, quantity: "1", unitPrice: "25000.50", gstRatePercent: "18" });
check("a line with no SKU can be added by hand", linesNow() === withFree + 1);
check(
  "and keeps the price that was typed, to the paisa",
  sql(
    `select "unitPriceMinor" from "QuoteItem" where "quoteId" = 'qeq${stamp}' and "productName" = '${freeName}'`,
  ) === "2500050",
);
check(
  "and carries no product or variant, because there is none",
  sql(
    `select coalesce("productId",'') || coalesce("variantId",'') from "QuoteItem" where "quoteId" = 'qeq${stamp}' and "productName" = '${freeName}'`,
  ) === "",
);

// ── what must be refused ───────────────────────────────────────────────────
const beforeRefusals = linesNow();

const unknown = await submitAdd({ sku: `NO-SUCH-SKU-${stamp}`, quantity: "1" });
check("a SKU that is not in the catalogue is refused", /No catalogue product/i.test(unknown), unknown.slice(0, 120));

const nameless = await submitAdd({ quantity: "1" });
check("a line with neither a SKU nor a name is refused", /needs a name|name, or a SKU/i.test(nameless), nameless.slice(0, 120));

check("and neither refusal wrote a line", linesNow() === beforeRefusals);

/*
 * The server's own guard, not the screen's.
 *
 * The form is filled while the quotation is still a draft and submitted after
 * it has been issued, so the request arrives looking exactly like a legitimate
 * one. Hiding the form on a sent quotation is presentation; refusing the write
 * is the rule, and only this distinguishes them.
 */
await page.goto(`${BASE}/admin/quotes/${quoteRef}`, { waitUntil: "load" });
await addForm.locator('[name="productName"]').fill(`Too late ${stamp}`);
await addForm.locator('[name="unitPrice"]').fill("100");
sql(`update "Quote" set status = 'SENT' where id = 'qeq${stamp}'`);
const beforeSent = linesNow();
await addForm.getByRole("button", { name: "Add line" }).click();
await page.waitForTimeout(2500);
check(
  "a line cannot be added to a quotation that has been sent",
  linesNow() === beforeSent &&
    /Only a draft quotation/i.test(await addForm.innerText()),
  (await addForm.innerText()).slice(0, 120),
);
sql(`update "Quote" set status = 'DRAFT' where id = 'qeq${stamp}'`);

await browser.close();

// ── clean up ────────────────────────────────────────────────────────────────
sql(`delete from "AuditLog" where "entityId" = 'qei${stamp}'`);
sql(
  `delete from "AuditLog" where action = 'admin.quote_line_added' and metadata::text like '%${quoteRef}%'`,
);
sql(`delete from "QuoteItem" where "quoteId" = 'qeq${stamp}'`);
sql(`delete from "Quote" where id = 'qeq${stamp}'`);
sql(`delete from "Session" where "userId" in ('qes${stamp}', 'qeu${stamp}')`);
sql(`delete from "User" where id in ('qes${stamp}', 'qeu${stamp}')`);
sql(`delete from "Company" where id = 'qec${stamp}'`);
rmSync(scratch, { force: true });

const failed = results.filter((result) => !result.ok).length;
console.log(`\n${results.length - failed}/${results.length} quote editing checks passed`);
process.exit(failed ? 1 : 0);
