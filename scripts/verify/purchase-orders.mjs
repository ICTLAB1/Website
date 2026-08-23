import { chromium } from "playwright";
import { execFileSync } from "node:child_process";
import { writeFileSync, rmSync } from "node:fs";

/**
 * The customer's purchase order.
 *
 * The document, not the number. A PO number typed into a field is a reference
 * to a document nobody here holds; this proves the document itself arrives,
 * lands against the right order, is readable only by the organisation that sent
 * it, and — the part that matters commercially — that uploading it confirms
 * nothing until somebody here has opened it and said so.
 */

const BASE = process.env.BASE ?? "http://localhost:3000";
const results = [];
const check = (name, ok, detail = "") => {
  const result = { name, ok: Boolean(ok), detail };
  results.push(result);
  console.log(`  ${result.ok ? "✓" : "✗"} ${result.name}${result.detail ? ` — ${result.detail}` : ""}`);
};

const scratch = `/tmp/verify-purchase-orders-${process.pid}.sql`;
const sql = (statement) => {
  writeFileSync(scratch, statement, { mode: 0o644 });
  return execFileSync("su", ["postgres", "-c", `psql -tA -d ictlab -f ${scratch}`], {
    encoding: "utf8",
  }).trim();
};

const stamp = Date.now().toString().slice(-6);
const FIXTURE_HASH = "$2b$12$Y1EnHFQUoF4sKzWulgpRre1IGREZUDi/nFfN6QycEnigobTHRMj5e";
const password = "CorrectHorse9";
const customerEmail = `po_probe${stamp}@example.test`;
const orderRef = `ORD-2026-PO${stamp.slice(-4)}`;

sql(
  `insert into "Company" (id, name, country, "createdAt", "updatedAt") values ('poc${stamp}', 'PO Probe ${stamp}', 'India', now(), now())`,
);
sql(
  `insert into "User" (id, email, "passwordHash", name, role, "companyRole", "companyId", "emailVerified", "createdAt", "updatedAt") values ('pou${stamp}', '${customerEmail}', '${FIXTURE_HASH}', 'PO Probe', 'CUSTOMER', 'ADMIN', 'poc${stamp}', now(), now(), now())`,
);
sql(
  `insert into "Order" (id, reference, status, "userId", "companyId", currency, "subtotalMinor", "discountMinor", "taxMinor", "totalMinor", "billingName", "billingEmail", "placedAt", "createdAt", "updatedAt") values ('poo${stamp}', '${orderRef}', 'PENDING', 'pou${stamp}', 'poc${stamp}', 'INR', 100000, 0, 18000, 118000, 'PO Probe ${stamp}', '${customerEmail}', now(), now(), now())`,
);
sql(
  `insert into "OrderItem" (id, "orderId", "productName", sku, quantity, "unitPriceMinor", "discountMinor", "gstRatePercent", "lineTotalMinor") values ('poi${stamp}', 'poo${stamp}', 'Business laptop', 'PO-SKU-1', 1, 100000, 0, 18, 100000)`,
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

// ------------------------------------------------- the customer sends the PO
const customer = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
await signIn(customer, customerEmail, password);
const customerPage = await customer.newPage();
await customerPage.goto(`${BASE}/account/orders/${orderRef}`, { waitUntil: "load" });
check("the customer can open their order", (await customerPage.locator("body").innerText()).includes(orderRef));

// A real PDF header, so the byte sniffing has something honest to identify.
const pdf = Buffer.concat([
  Buffer.from("%PDF-1.7\n% purchase order fixture\n"),
  Buffer.alloc(512, 0x20),
]);

await customerPage.getByLabel("The file").setInputFiles({
  name: "purchase-order-4471.pdf",
  mimeType: "application/pdf",
  buffer: pdf,
});
await customerPage.getByLabel("Purchase order number").fill("PO-4471");
await customerPage.getByRole("button", { name: "Upload purchase order" }).click();
await customerPage.waitForTimeout(3000);

const stored = sql(
  `select d.kind || '|' || d.filename || '|' || coalesce(d."verifiedAt"::text, 'unverified') from "Document" d where d."orderId" = 'poo${stamp}'`,
);
check(
  "the file is stored against the order and starts unverified",
  stored === "PURCHASE_ORDER|purchase-order-4471.pdf|unverified",
  stored,
);

const poNumber = sql(`select "poNumber" from "Order" where reference = '${orderRef}'`);
check("the purchase order number is recorded on the order", poNumber === "PO-4471", poNumber);

await customerPage.goto(`${BASE}/account/orders/${orderRef}`, { waitUntil: "load" });
check(
  // Case-insensitive: the badge is uppercased in CSS, and innerText honours
  // text-transform.
  "and the customer is told it is waiting to be checked",
  /awaiting verification/i.test(await customerPage.locator("body").innerText()),
);

const documentReference = sql(`select reference from "Document" where "orderId" = 'poo${stamp}'`);

// ------------------------------------------------------- who may read it
{
  const stranger = await (await browser.newContext()).newPage();
  const response = await stranger.request.get(`${BASE}/documents/${documentReference}`);
  check(
    "a stranger cannot fetch the purchase order",
    response.status() === 404,
    `status ${response.status()}`,
  );
  await stranger.close();
}

// -------------------------------------------- and uploading confirms nothing
const statusAfterUpload = sql(`select status from "Order" where reference = '${orderRef}'`);
check(
  "uploading a purchase order does not confirm the order",
  statusAfterUpload === "PENDING",
  statusAfterUpload,
);

// ---------------------------------------------------- staff check and verify
const staff = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
await signIn(staff, process.env.ADMIN_EMAIL ?? "admin@example.test", process.env.ADMIN_PASSWORD ?? "ChangeMe!Admin123");
const staffPage = await staff.newPage();
await staffPage.goto(`${BASE}/admin/orders/${orderRef}`, { waitUntil: "load" });

const staffText = await staffPage.locator("body").innerText();
check("staff see the uploaded purchase order", staffText.includes("purchase-order-4471.pdf"));
check("and are told to check it before confirming", /check it against this order/i.test(staffText));

await staffPage.getByRole("button", { name: "Mark as verified" }).first().click();
await staffPage.waitForTimeout(2500);

const verified = sql(
  `select ("verifiedAt" is not null)::text from "Document" where reference = '${documentReference}'`,
);
check("verifying is recorded", verified === "true", verified);

await customerPage.goto(`${BASE}/account/orders/${orderRef}`, { waitUntil: "load" });
check(
  "and the customer sees that it has been checked",
  /\bverified\b/i.test(await customerPage.locator("body").innerText()),
);

// ---------------------------------------------------------------- clean up
sql(`delete from "Document" where "orderId" = 'poo${stamp}'`);
sql(`delete from "OrderItem" where "orderId" = 'poo${stamp}'`);
sql(`delete from "Order" where reference = '${orderRef}'`);
sql(`delete from "AuditLog" where "actorId" = 'pou${stamp}' or "entityId" = '${orderRef}' or "entityId" = '${documentReference}'`);
sql(`delete from "Session" where "userId" = 'pou${stamp}'`);
sql(`delete from "User" where email = '${customerEmail}'`);
sql(`delete from "Company" where id = 'poc${stamp}'`);
check("the fixtures are removed", sql(`select count(*) from "Order" where reference = '${orderRef}'`) === "0");

await browser.close();
rmSync(scratch, { force: true });

const passed = results.filter((result) => result.ok).length;
console.log(`\n${passed}/${results.length} purchase order checks passed`);
process.exit(passed === results.length ? 0 : 1);
