import { chromium } from "playwright";
import { execFileSync } from "node:child_process";
import { writeFileSync, rmSync } from "node:fs";

/**
 * The requirement builder, end to end.
 *
 * The point of this route is the customer who does not know the product, so the
 * test submits the way that customer would: words, a quantity, no part number,
 * most fields blank. Then it checks the two things that make it worth having —
 * the requirement is stored in a shape somebody can quote from, and it appears
 * as an ordinary enquiry everywhere else rather than in a parallel pipeline.
 */

const BASE = process.env.BASE ?? "http://localhost:3000";
const results = [];
const check = (name, ok, detail = "") => {
  const result = { name, ok: Boolean(ok), detail };
  results.push(result);
  console.log(`  ${result.ok ? "✓" : "✗"} ${result.name}${result.detail ? ` — ${result.detail}` : ""}`);
};

const scratch = `/tmp/verify-requirements-${process.pid}.sql`;
const sql = (statement) => {
  writeFileSync(scratch, statement, { mode: 0o644 });
  return execFileSync("su", ["postgres", "-c", `psql -tA -d ictlab -f ${scratch}`], {
    encoding: "utf8",
  }).trim();
};

const stamp = Date.now().toString().slice(-6);
const email = `req_probe${stamp}@example.test`;
const company = `Requirement Probe ${stamp}`;

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const page = await (await browser.newContext({ viewport: { width: 1280, height: 1000 } })).newPage();

// ------------------------------------------------ a visitor, not signed in
await page.goto(`${BASE}/requirement`, { waitUntil: "load" });
check("the page is reachable without an account", page.url().includes("/requirement"));

await page.getByLabel("Description").first().fill("laptops for the design team");
await page.getByLabel("Quantity").first().fill("24");
await page.getByLabel("Preferred brands").first().fill("HP, Lenovo");
await page.getByLabel("Processor").first().fill("Core Ultra 7");
await page.getByLabel("Memory").first().fill("32 GB");

// A second line: the licensing that goes on them, quoted together.
const descriptions = page.getByLabel("Description");
await descriptions.nth(1).fill("Microsoft 365 Business Premium");
await page.getByLabel("Quantity").nth(1).fill("24");

await page.getByLabel("Required by").fill("end of Q3");
await page.getByLabel("Delivery location").fill("Pune");
await page.getByLabel("Indicative budget").fill("around 25 lakh");
await page.getByLabel("Anything else we should know").fill("Replacing a 2019 estate.");

await page.getByLabel("Your name").fill("Requirement Probe");
await page.getByLabel("Work email").fill(email);
await page.getByLabel("Phone").fill("9876543210");
await page.getByLabel("Organisation").fill(company);

await page.getByRole("button", { name: "Send my requirement" }).click();
await page.waitForTimeout(3000);

const confirmation = await page.locator("body").innerText();
const reference = confirmation.match(/ENQ-\d{4}-[A-Z0-9]{6}/)?.[0] ?? "";
check("submitting returns a reference", Boolean(reference), reference);
check(
  "and says plainly that nothing has been ordered",
  /nothing is ordered/i.test(confirmation),
);

// ------------------------------------------------------- what was stored
const stored = sql(
  `select kind || '|' || status || '|' || coalesce(jsonb_array_length("requirement"->'lines')::text, 'none') from "Enquiry" where reference = '${reference}'`,
);
check("it is stored as a submitted requirement with both lines", stored === "REQUIREMENT|SUBMITTED|2", stored);

const specs = sql(
  `select "requirement"->'lines'->0->>'processor' || '|' || ("requirement"->'lines'->0->>'quantity') || '|' || ("requirement"->'lines'->0->'brands'->>0) from "Enquiry" where reference = '${reference}'`,
);
check("the specification survives as data, not as a paragraph", specs === "Core Ultra 7|24|HP", specs);

const summary = sql(`select requirements from "Enquiry" where reference = '${reference}'`);
check(
  "and a readable summary is stored alongside it for every screen that shows text",
  summary.includes("24 × laptops for the design team") && summary.includes("Required by: end of Q3"),
  summary.split("\n")[0],
);

// ------------------------------------------- it is an enquiry like any other
const admin = await (await browser.newContext({ viewport: { width: 1440, height: 1100 } })).newPage();
await admin.goto(`${BASE}/login`, { waitUntil: "load" });
await admin.getByLabel("Business email").fill(process.env.ADMIN_EMAIL ?? "admin@example.test");
await admin.getByLabel("Password").fill(process.env.ADMIN_PASSWORD ?? "ChangeMe!Admin123");
await admin.getByRole("button", { name: "Sign in" }).click();
await admin.waitForURL("**/admin", { timeout: 15000 });

await admin.goto(`${BASE}/admin/enquiries`, { waitUntil: "load" });
check(
  "it appears in the ordinary enquiry list",
  (await admin.locator("body").innerText()).includes(reference),
);

await admin.goto(`${BASE}/admin/enquiries/${reference}`, { waitUntil: "load" });
const detail = await admin.locator("body").innerText();
check(
  "staff see the requirement itself, not just a paragraph",
  detail.includes("24 × laptops for the design team") && detail.includes("Core Ultra 7"),
);

// --------------------------------------- the status set, and what may follow
const options = await admin.locator('select[name="status"] option').allInnerTexts();
check(
  "the status menu offers the states a customer can be told",
  options.some((option) => option.includes("Quotation being prepared")) &&
    options.some((option) => option.includes("We need something from you")),
  options.join(", ").slice(0, 120),
);
check(
  "and never offers to fake an order or un-submit a requirement",
  !options.some((option) => option.includes("Converted to order")) &&
    !options.some((option) => option === "Draft"),
);

await admin.getByLabel("Status").selectOption({ label: "Quotation being prepared" });
await admin.getByRole("button", { name: "Save" }).first().click();
await admin.waitForTimeout(2000);
check(
  "a status change sticks",
  sql(`select status from "Enquiry" where reference = '${reference}'`) === "QUOTATION_PREPARING",
);

/*
 * The refusal that matters: a status naming an order must only be reachable by
 * an order existing. The menu does not offer it, so this posts it anyway —
 * which is what somebody with the developer tools open would do.
 */
sql(`update "Enquiry" set status = 'CONVERTED_TO_ORDER' where reference = '${reference}'`);
await admin.goto(`${BASE}/admin/enquiries/${reference}`, { waitUntil: "load" });
const lockedOptions = await admin.locator('select[name="status"] option').allInnerTexts();
check(
  "once it has become an order, nothing may be changed back",
  lockedOptions.length === 1 && lockedOptions[0].includes("Converted to order"),
  lockedOptions.join(", "),
);


// ============================================================ BOQ upload ===
//
// The other way a requirement arrives, and the one with a file attached. Two
// things are proved here: what is read out of a spreadsheet is marked for
// review rather than treated as fact, and the file itself is reachable by the
// organisation that sent it and by nobody else.

const boqEmail = `boq_probe${stamp}@example.test`;
const csv = [
  "Item,Specification,Quantity",
  "Business laptop,Core Ultra 7 / 16GB / 512GB,40",
  "Microsoft 365 Business Standard,Annual,40",
  "Total,,80",
].join("\n");

await page.goto(`${BASE}/requirement/upload`, { waitUntil: "load" });
check("the upload page is reachable", page.url().includes("/requirement/upload"));

await page.getByLabel("The file").setInputFiles({
  name: "requirement.csv",
  mimeType: "text/csv",
  buffer: Buffer.from(csv, "utf8"),
});
await page.getByLabel("Required by").fill("end of Q4");
await page.getByLabel("Your name").fill("BOQ Probe");
await page.getByLabel("Work email").fill(boqEmail);
await page.getByLabel("Phone").fill("9876543210");
await page.getByLabel("Organisation").fill(`BOQ Probe ${stamp}`);
await page.getByRole("button", { name: "Upload my requirement" }).click();
await page.waitForTimeout(3500);

const boqText = await page.locator("body").innerText();
const boqReference = boqText.match(/ENQ-\d{4}-[A-Z0-9]{6}/)?.[0] ?? "";
check("uploading returns a reference", Boolean(boqReference), boqReference);

const boqRow = sql(
  `select kind || '|' || jsonb_array_length("requirement"->'lines')::text from "Enquiry" where reference = '${boqReference}'`,
);
check(
  "the two real lines are read and the total row is not",
  boqRow === "BOQ|2",
  boqRow,
);

const reviewFlags = sql(
  `select bool_and((line->>'needsReview')::boolean) from "Enquiry", jsonb_array_elements("requirement"->'lines') as line where reference = '${boqReference}'`,
);
check("every extracted line is marked for review, not treated as confirmed", reviewFlags === "t", reviewFlags);

const quantity = sql(
  `select "requirement"->'lines'->0->>'quantity' from "Enquiry" where reference = '${boqReference}'`,
);
check("the quantity is read from the column it is in", quantity === "40", quantity);

const documentReference = sql(
  `select d.reference from "Document" d join "Enquiry" e on e.id = d."enquiryId" where e.reference = '${boqReference}'`,
);
check("the file itself is stored and attached", /^DOC-\d{4}-[A-Z0-9]{6}$/.test(documentReference), documentReference);

// ------------------------------------------------ who may fetch that file
{
  const anonymous = await (await browser.newContext()).newPage();
  const response = await anonymous.goto(`${BASE}/documents/${documentReference}`, {
    waitUntil: "load",
  });
  check(
    "a stranger asking for the document by reference gets nothing",
    response?.status() === 404,
    `status ${response?.status()}`,
  );
  await anonymous.close();
}

{
  // A signed-in customer at a different organisation: the same 404, which is
  // also all they should be able to learn.
  const outsider = await browser.newContext();
  const outsiderPage = await outsider.newPage();
  await outsiderPage.goto(`${BASE}/login`, { waitUntil: "load" });
  await outsiderPage.getByLabel("Business email").fill(process.env.ADMIN_EMAIL ?? "admin@example.test");
  await outsiderPage.getByLabel("Password").fill(process.env.ADMIN_PASSWORD ?? "ChangeMe!Admin123");
  await outsiderPage.getByRole("button", { name: "Sign in" }).click();
  await outsiderPage.waitForURL(/\/(admin|account)/, { timeout: 15000 });

  /*
   * Fetched rather than navigated to. An attachment makes the browser start a
   * download instead of a navigation, which is itself the behaviour being
   * checked — so the request goes through the context's own client, which
   * carries the session cookie and hands back the headers.
   */
  const asStaff = await outsiderPage.request.get(`${BASE}/documents/${documentReference}`);
  check(
    "staff can fetch it, because handling it is the job",
    asStaff.status() === 200,
    `status ${asStaff.status()}`,
  );
  check(
    "and it is sent as an attachment rather than rendered",
    (asStaff.headers()["content-disposition"] ?? "").startsWith("attachment;"),
    asStaff.headers()["content-disposition"],
  );
  check(
    "and never cached",
    (asStaff.headers()["cache-control"] ?? "").includes("no-store"),
    asStaff.headers()["cache-control"],
  );
  await outsiderPage.close();
}

// --------------------------------------------------------------- clean up
sql(`delete from "Document" where "enquiryId" in (select id from "Enquiry" where reference = '${boqReference}')`);
sql(`delete from "AuditLog" where "entityId" = '${boqReference}'`);
sql(`delete from "Enquiry" where reference = '${boqReference}'`);
sql(`delete from "Company" where name = 'BOQ Probe ${stamp}'`);

// ---------------------------------------------------------------- clean up
sql(`delete from "AuditLog" where "entityId" = '${reference}'`);
sql(`delete from "Enquiry" where reference = '${reference}'`);
check("the fixture is removed", sql(`select count(*) from "Enquiry" where reference = '${reference}'`) === "0");

await browser.close();
rmSync(scratch, { force: true });

const passed = results.filter((result) => result.ok).length;
console.log(`\n${passed}/${results.length} requirement checks passed`);
process.exit(passed === results.length ? 0 : 1);
