import { chromium } from "playwright";

const BASE = "http://localhost:3000";
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const results = [];
const check = (name, ok, detail = "") => results.push({ name, ok: Boolean(ok), detail });

const email = `lifecycle${Date.now()}@example.test`;
const password = "CorrectHorse9";

// ------------------------------------------- customer: register and enquire
const customer = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const cust = await customer.newPage();

await cust.goto(`${BASE}/register`, { waitUntil: "load" });
await cust.getByLabel("Full name").fill("Lifecycle Buyer");
await cust.getByLabel("Company name").fill("Lifecycle Test Pvt Ltd");
await cust.getByLabel("Business email").fill(email);
await cust.getByLabel("Password").fill(password);
await cust.getByRole("button", { name: "Create account" }).click();
await cust.waitForURL("**/account", { timeout: 15000 });
check("customer account created", cust.url().includes("/account"));

// Build a two-line basket and submit it.
for (const [slug, qty] of [["microsoft-365-business-standard", "40"], ["adobe-acrobat-pro-teams", "15"]]) {
  await cust.goto(`${BASE}/products/${slug}`, { waitUntil: "load" });
  await cust.getByLabel("Quantity").fill(qty);
  await cust.getByRole("complementary").getByRole("button", { name: "Add to Enquiry" }).click();
  await cust.waitForTimeout(250);
}

await cust.goto(`${BASE}/enquiry`, { waitUntil: "load" });
await cust.waitForTimeout(400);
await cust.getByLabel("Phone", { exact: false }).first().fill("+91 99999 99999");
await cust.getByRole("button", { name: "Request Enterprise Quote" }).click();
await cust.waitForURL("**/enquiry/submitted**", { timeout: 15000 });
const enquiryRef = (await cust.locator("body").innerText()).match(/ENQ-\d{4}-[A-Z0-9]{6}/)?.[0];
check("enquiry submitted while signed in", Boolean(enquiryRef), enquiryRef ?? "");

// ------------------------------------------------- staff: quote the enquiry
const staff = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const admin = await staff.newPage();
await admin.goto(`${BASE}/login`, { waitUntil: "load" });
await admin.getByLabel("Business email").fill("admin@example.test");
await admin.getByLabel("Password").fill("ChangeMe!Admin123");
await admin.getByRole("button", { name: "Sign in" }).click();
await admin.waitForURL("**/admin", { timeout: 15000 });

await admin.goto(`${BASE}/admin/enquiries/${enquiryRef}`, { waitUntil: "load" });
await admin.getByRole("button", { name: "Draft quotation" }).click();
await admin.waitForURL("**/admin/quotes/QTE-**", { timeout: 15000 });
const quoteRef = admin.url().match(/QTE-\d{4}-[A-Z0-9]{6}/)?.[0];
check("quotation drafted from the enquiry", Boolean(quoteRef), quoteRef ?? admin.url());

let page = await admin.locator("body").innerText();
check("quote lines were priced from the catalogue", page.includes("Microsoft 365") && page.includes("Acrobat"));
const draftTotal = page.match(/Total\s*₹([\d,]+)/)?.[1];
check("draft carries a non-zero total", Boolean(draftTotal) && draftTotal !== "0", draftTotal ?? "");

// Apply a 10% discount to the first line and confirm the header recalculates.
await admin.locator("details").first().click();
await admin.waitForTimeout(300);
await admin.locator('input[name="discountPercent"]').first().fill("10");
await admin.getByRole("button", { name: "Update line" }).first().click();
await admin.waitForTimeout(1200);
page = await admin.locator("body").innerText();
const discountedTotal = page.match(/Total\s*₹([\d,]+)/)?.[1];
check("discount recalculates the document total",
  Boolean(discountedTotal) && discountedTotal !== draftTotal, `${draftTotal} → ${discountedTotal}`);

// Issue it.
await admin.getByRole("button", { name: "Send to customer" }).click();
await admin.waitForTimeout(1500);
page = await admin.locator("body").innerText();
check("quotation issued", page.includes("Sent") || page.includes("issued"), page.slice(0, 60));

// A sent quotation must no longer be editable.
check("sent quotation is frozen against edits",
  page.includes("frozen") || !(await admin.getByRole("button", { name: "Update line" }).count()));

// ----------------------------------------- customer: review and accept
await cust.goto(`${BASE}/account/quotes`, { waitUntil: "load" });
page = await cust.locator("body").innerText();
check("quotation appears in the customer's account", page.includes(quoteRef ?? "!"), page.slice(0, 120));

await cust.goto(`${BASE}/account/quotes/${quoteRef}`, { waitUntil: "load" });
page = await cust.locator("body").innerText();
check("customer sees the quoted lines", page.includes("Microsoft 365") && page.includes("GST"));

await cust.getByLabel("Your purchase order number").fill("PO-LIFECYCLE-001");
await cust.getByRole("button", { name: "Accept quotation" }).click();
await cust.waitForTimeout(2000);
page = await cust.locator("body").innerText();
const orderRef = page.match(/ORD-\d{4}-[A-Z0-9]{6}/)?.[0];
check("accepting raises an order", Boolean(orderRef), orderRef ?? page.slice(0, 140));

await cust.goto(`${BASE}/account/orders`, { waitUntil: "load" });
page = await cust.locator("body").innerText();
check("order appears in the customer's account", page.includes(orderRef ?? "!"));
check("purchase order number recorded", page.includes("PO-LIFECYCLE-001"));

// -------------------------------------------------- staff: fulfil the order
await admin.goto(`${BASE}/admin/orders/${orderRef}`, { waitUntil: "load" });
page = await admin.locator("body").innerText();
check("order is visible to staff", page.includes(orderRef ?? "!"));
await admin.getByRole("button", { name: "Mark fulfilled" }).click();
await admin.waitForTimeout(2000);
page = await admin.locator("body").innerText();
check("fulfilment issues licences", page.includes("Licences issued") && page.includes("LIC-"));

// -------------------------------------- customer: licences and renewals
await cust.goto(`${BASE}/account/licences`, { waitUntil: "load" });
await cust.waitForTimeout(500);
page = await cust.locator("body").innerText();
check("licences appear for the customer",
  page.includes("Microsoft 365") && /\bACTIVE\b/i.test(page),
  page.replace(/\s+/g, " ").slice(0, 200));

await cust.goto(`${BASE}/account/renewals`, { waitUntil: "load" });
await cust.waitForTimeout(500);
page = await cust.locator("body").innerText();
check("renewal reminders were scheduled", /\bUPCOMING\b/i.test(page),
  page.replace(/\s+/g, " ").slice(0, 200));

// ------------------------------------------------ dashboard now has revenue
await admin.goto(`${BASE}/admin`, { waitUntil: "load" });
page = await admin.locator("body").innerText();
const revenue = page.match(/Fulfilled revenue\s*₹([\d,]+)/)?.[1];
check("dashboard revenue reflects the fulfilled order",
  Boolean(revenue) && revenue !== "0", `₹${revenue ?? "?"}`);

await browser.close();

for (const r of results) console.log(`${r.ok ? "  ✓" : "  ✗"} ${r.name}${!r.ok && r.detail ? ` — ${r.detail}` : ""}`);
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} lifecycle checks passed`);
process.exit(failed ? 1 : 0);
