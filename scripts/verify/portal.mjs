import { chromium } from "playwright";
import { execFileSync } from "node:child_process";
import { writeFileSync, rmSync } from "node:fs";

/**
 * The customer portal: devices, warranty, delivery, tickets and renewals.
 *
 * The properties worth proving here are the ones a page cannot be trusted to
 * hold by inspection:
 *
 *   - a device with no warranty date is described as "not recorded" and never
 *     as out of warranty, on a real page and not only in a unit test;
 *   - another organisation's device, ticket and order are unreachable by
 *     reference, which is the rule the whole portal rests on;
 *   - a tracking link typed into the panel cannot become a `javascript:` link
 *     on a customer's screen;
 *   - a reply written on one side appears on the other, in one thread.
 */

const BASE = process.env.BASE ?? "http://localhost:3000";
const results = [];
const check = (name, ok, detail = "") => {
  const result = { name, ok: Boolean(ok), detail };
  results.push(result);
  console.log(`  ${result.ok ? "✓" : "✗"} ${result.name}${result.detail ? ` — ${result.detail}` : ""}`);
};

const scratch = `/tmp/verify-portal-${process.pid}.sql`;
const sql = (statement) => {
  writeFileSync(scratch, statement, { mode: 0o644 });
  return execFileSync("su", ["postgres", "-c", `psql -tA -d ictlab -f ${scratch}`], {
    encoding: "utf8",
  }).trim();
};

const stamp = Date.now().toString().slice(-6);
const FIXTURE_HASH = "$2b$12$Y1EnHFQUoF4sKzWulgpRre1IGREZUDi/nFfN6QycEnigobTHRMj5e";
const password = "CorrectHorse9";
const customerEmail = `portal_probe${stamp}@example.test`;
const outsiderEmail = `portal_outsider${stamp}@example.test`;

// ------------------------------------------------------------ fixtures ---
sql(
  `insert into "Company" (id, name, country, "createdAt", "updatedAt") values ('pc${stamp}', 'Portal Probe ${stamp}', 'India', now(), now())`,
);
sql(
  `insert into "User" (id, email, "passwordHash", name, role, "companyRole", "companyId", "emailVerified", "createdAt", "updatedAt") values ('pu${stamp}', '${customerEmail}', '${FIXTURE_HASH}', 'Portal Probe', 'CUSTOMER', 'ADMIN', 'pc${stamp}', now(), now(), now())`,
);
sql(
  `insert into "Company" (id, name, country, "createdAt", "updatedAt") values ('po${stamp}', 'Portal Outsider ${stamp}', 'India', now(), now())`,
);
sql(
  `insert into "User" (id, email, "passwordHash", name, role, "companyRole", "companyId", "emailVerified", "createdAt", "updatedAt") values ('pou${stamp}', '${outsiderEmail}', '${FIXTURE_HASH}', 'Portal Outsider', 'CUSTOMER', 'ADMIN', 'po${stamp}', now(), now(), now())`,
);

/*
 * Two devices, deliberately different in the one way that matters: one has a
 * warranty end date and one has none at all.
 */
const datedRef = `DEV-2026-PA${stamp.slice(-4)}`;
const undatedRef = `DEV-2026-PB${stamp.slice(-4)}`;
sql(
  `insert into "Device" (id, reference, "companyId", "userId", "brandName", model, serial, status, "warrantyEndsAt", "createdAt", "updatedAt") values ('pd1${stamp}', '${datedRef}', 'pc${stamp}', 'pu${stamp}', 'HP', 'ProBook 450 G10', 'SER${stamp}A', 'IN_SERVICE', now() + interval '400 days', now(), now())`,
);
sql(
  `insert into "Device" (id, reference, "companyId", "userId", "brandName", model, serial, status, "createdAt", "updatedAt") values ('pd2${stamp}', '${undatedRef}', 'pc${stamp}', 'pu${stamp}', 'Lenovo', 'ThinkPad E14', 'SER${stamp}B', 'IN_SERVICE', now(), now())`,
);

const orderRef = `ORD-2026-PT${stamp.slice(-4)}`;
sql(
  `insert into "Order" (id, reference, status, "userId", "companyId", currency, "subtotalMinor", "discountMinor", "taxMinor", "totalMinor", "billingName", "billingEmail", "placedAt", "createdAt", "updatedAt") values ('pord${stamp}', '${orderRef}', 'CONFIRMED', 'pu${stamp}', 'pc${stamp}', 'INR', 100000, 0, 18000, 118000, 'Portal Probe', '${customerEmail}', now(), now(), now())`,
);

const ticketRef = `TKT-2026-PT${stamp.slice(-4)}`;
sql(
  `insert into "SupportTicket" (id, reference, "userId", "companyId", subject, category, message, status, priority, "deviceId", "createdAt", "updatedAt") values ('ptk${stamp}', '${ticketRef}', 'pu${stamp}', 'pc${stamp}', 'Screen flickers on the ProBook', 'HARDWARE', 'It flickers when the lid is moved.', 'OPEN', 'NORMAL', 'pd1${stamp}', now(), now())`,
);

const licenceRef = `LIC-2026-PT${stamp.slice(-4)}`;
sql(
  `insert into "Licence" (id, reference, "userId", "companyId", "productName", sku, seats, status, "startsAt", "expiresAt", "createdAt", "updatedAt") values ('plic${stamp}', '${licenceRef}', 'pu${stamp}', 'pc${stamp}', 'Microsoft 365 Business Standard', 'M365-BS', 25, 'ACTIVE', now(), now() + interval '20 days', now(), now())`,
);
sql(
  `insert into "Renewal" (id, reference, "licenceId", status, "dueAt", seats, "createdAt", "updatedAt") values ('pren${stamp}', 'REN-2026-PT${stamp.slice(-4)}', 'plic${stamp}', 'UPCOMING', now() + interval '20 days', 25, now(), now())`,
);
sql(
  `insert into "Renewal" (id, reference, "licenceId", status, "dueAt", seats, "createdAt", "updatedAt") values ('pren2${stamp}', 'REN-2026-PU${stamp.slice(-4)}', 'plic${stamp}', 'UPCOMING', now() + interval '200 days', 25, now(), now())`,
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

const customer = await browser.newContext({ viewport: { width: 1280, height: 1200 } });
await signIn(customer, customerEmail, password);
const customerPage = await customer.newPage();

// ------------------------------------------------- the device register ---
await customerPage.goto(`${BASE}/account/devices`, { waitUntil: "load" });
const registerText = await customerPage.locator("body").innerText();

check("the register lists the organisation's devices", registerText.includes("ProBook 450 G10") && registerText.includes("ThinkPad E14"));

/*
 * Scoped to the row rather than to the page: the summary cards at the top
 * legitimately name every warranty state, including the one with a count of
 * zero. What must never happen is a device with no date on file being labelled
 * as out of cover, and that is a claim made in a row.
 */
{
  const row = await customerPage
    .locator("tr")
    .filter({ hasText: "ThinkPad E14" })
    .first()
    .innerText();
  check("a device with no warranty date is called not recorded", /not recorded/i.test(row), row.replace(/\s+/g, " "));
  check("and is never described as out of warranty", !/out of warranty|in warranty/i.test(row));
}

await customerPage.goto(`${BASE}/account/devices/${undatedRef}`, { waitUntil: "load" });
const undatedText = await customerPage.locator("body").innerText();
check(
  "the undated device asks for the date rather than guessing one",
  /no warranty end date on file/i.test(undatedText),
  undatedText.slice(0, 0),
);
check(
  "and states nothing about cover either way",
  !/covered by the manufacturer/i.test(undatedText) && !/the recorded warranty has ended/i.test(undatedText),
);

await customerPage.goto(`${BASE}/account/devices/${datedRef}`, { waitUntil: "load" });
check(
  "the dated device says it is in warranty",
  /in warranty/i.test(await customerPage.locator("body").innerText()),
);

// --------------------------------------------- adding and editing a device
{
  await customerPage.goto(`${BASE}/account/devices`, { waitUntil: "load" });
  const addForm = customerPage.locator("form").filter({ hasText: "Add device" }).first();
  await addForm.locator('input[name="brandName"]').fill("Acer");
  await addForm.locator('input[name="model"]').fill(`Veriton ${stamp}`);
  await addForm.locator('input[name="serial"]').fill(`SER${stamp}C`);
  // Deliberately unparseable: it must land as null, never as today.
  await addForm.locator('input[name="warrantyEndsAt"]').fill("");
  await addForm.getByRole("button", { name: "Add device" }).click();
  await customerPage.waitForTimeout(2500);

  const added = sql(
    `select ("warrantyEndsAt" is null)::text || '|' || "companyId" from "Device" where serial = 'SER${stamp}C'`,
  );
  check(
    "a device added with no warranty date stores null, not today",
    added === `true|pc${stamp}`,
    added,
  );
}

// -------------------------------------------- another organisation sees none
{
  const outsider = await browser.newContext();
  await signIn(outsider, outsiderEmail, password);
  const outsiderPage = await outsider.newPage();

  const device = await outsiderPage.goto(`${BASE}/account/devices/${datedRef}`, { waitUntil: "load" });
  check("another organisation cannot open a device", device?.status() === 404, `status ${device?.status()}`);

  const ticket = await outsiderPage.goto(`${BASE}/account/support/${ticketRef}`, { waitUntil: "load" });
  check("nor a ticket", ticket?.status() === 404, `status ${ticket?.status()}`);

  const order = await outsiderPage.goto(`${BASE}/account/orders/${orderRef}`, { waitUntil: "load" });
  check("nor an order", order?.status() === 404, `status ${order?.status()}`);

  const register = await outsiderPage.goto(`${BASE}/account/devices`, { waitUntil: "load" });
  check(
    "and their own register is empty of ours",
    !(await outsiderPage.locator("body").innerText()).includes("ProBook 450 G10"),
    `status ${register?.status()}`,
  );

  await outsiderPage.close();
  await outsider.close();
}

// --------------------------------------------------------- delivery ---
const staff = await browser.newContext({ viewport: { width: 1440, height: 1200 } });
await signIn(staff, process.env.ADMIN_EMAIL ?? "admin@example.test", process.env.ADMIN_PASSWORD ?? "ChangeMe!Admin123");
const staffPage = await staff.newPage();

await customerPage.goto(`${BASE}/account/orders/${orderRef}`, { waitUntil: "load" });
check(
  "an order that has not moved says so without promising anything",
  /not yet dispatched/i.test(await customerPage.locator("body").innerText()),
);

await staffPage.goto(`${BASE}/admin/orders/${orderRef}`, { waitUntil: "load" });
{
  const form = staffPage.locator("form").filter({ hasText: "Save delivery details" }).first();
  await form.locator('input[name="courier"]').fill("Blue Dart");
  await form.locator('input[name="trackingNumber"]').fill(`AWB${stamp}`);
  await form.locator('input[name="trackingUrl"]').fill("javascript:alert(document.cookie)");
  await form.locator('input[name="dispatchedAt"]').fill("2026-08-20T10:30");
  await form.getByRole("button", { name: "Save delivery details" }).click();
  await staffPage.waitForTimeout(2500);

  const stored = sql(`select coalesce("trackingUrl", 'none') from "Order" where reference = '${orderRef}'`);
  check("a javascript: tracking link is refused rather than stored", stored === "none", stored);

  await form.locator('input[name="trackingUrl"]').fill("https://www.bluedart.com/tracking");
  await form.getByRole("button", { name: "Save delivery details" }).click();
  await staffPage.waitForTimeout(2500);

  const saved = sql(
    `select courier || '|' || "trackingNumber" || '|' || ("dispatchedAt" is not null)::text from "Order" where reference = '${orderRef}'`,
  );
  check("an ordinary tracking link and the dispatch details are saved", saved === `Blue Dart|AWB${stamp}|true`, saved);
}

await customerPage.goto(`${BASE}/account/orders/${orderRef}`, { waitUntil: "load" });
{
  const text = await customerPage.locator("body").innerText();
  check("the customer sees the consignment on their order", text.includes(`AWB${stamp}`) && text.includes("Blue Dart"));
  check("and it is described as in transit", /in transit/i.test(text));

  const href = await customerPage.locator(`a:has-text("AWB${stamp}")`).first().getAttribute("href");
  check("the tracking link points at the courier", href === "https://www.bluedart.com/tracking", String(href));
}

// -------------------------------------------------- the ticket thread ---
await customerPage.goto(`${BASE}/account/support/${ticketRef}`, { waitUntil: "load" });
{
  const text = await customerPage.locator("body").innerText();
  check("the ticket page shows the opening message", text.includes("It flickers when the lid is moved."));
  check("and names the device it is about", text.includes("ProBook 450 G10") && text.includes(`SER${stamp}A`));

  const form = customerPage.locator("form").filter({ hasText: "Send reply" }).first();
  await form.locator("textarea").fill("It happens on battery as well as on mains.");
  await form.getByRole("button", { name: "Send reply" }).click();
  await customerPage.waitForTimeout(2500);
}

const customerWrote = sql(
  `select "fromStaff"::text from "TicketMessage" where "ticketId" = 'ptk${stamp}' order by "createdAt" desc limit 1`,
);
check("the customer's reply is recorded as theirs", customerWrote === "false", customerWrote);

await staffPage.goto(`${BASE}/admin/support/${ticketRef}`, { waitUntil: "load" });
{
  const text = await staffPage.locator("body").innerText();
  check("staff see the customer's reply in the same thread", text.includes("It happens on battery as well as on mains."));
  check("and the ticket reports that nobody has answered yet", /not yet answered/i.test(text));

  const form = staffPage.locator("form").filter({ hasText: "Send reply" }).first();
  await form.locator("textarea").fill("Thank you — we are arranging an on-site visit.");
  await form.locator('select[name="status"]').selectOption("WAITING_ON_CUSTOMER");
  await form.getByRole("button", { name: "Send reply" }).click();
  await staffPage.waitForTimeout(3000);
}

const answered = sql(
  `select status || '|' || ("firstReplyAt" is not null)::text from "SupportTicket" where reference = '${ticketRef}'`,
);
check("a staff reply stamps the first response and moves the status", answered === "WAITING_ON_CUSTOMER|true", answered);

await customerPage.goto(`${BASE}/account/support/${ticketRef}`, { waitUntil: "load" });
check(
  "the customer sees the reply on their own ticket",
  (await customerPage.locator("body").innerText()).includes("we are arranging an on-site visit"),
);

// A customer replying to a ticket that was waiting on them puts it back in our
// court, which is the whole meaning of the status.
{
  const form = customerPage.locator("form").filter({ hasText: "Send reply" }).first();
  await form.locator("textarea").fill("Any time next week suits us.");
  await form.getByRole("button", { name: "Send reply" }).click();
  await customerPage.waitForTimeout(2500);
}
check(
  "answering a ticket that was waiting on the customer reopens it",
  sql(`select status from "SupportTicket" where reference = '${ticketRef}'`) === "IN_PROGRESS",
);

/*
 * A read-only colleague, proven on the server rather than in the markup.
 *
 * The form is rendered while the account may still act, the role is then
 * demoted underneath it, and the already-loaded form is submitted. Hiding a
 * button is not an access control; this submits the button that was never
 * supposed to be there.
 */
{
  await customerPage.goto(`${BASE}/account/support/${ticketRef}`, { waitUntil: "load" });
  const form = customerPage.locator("form").filter({ hasText: "Send reply" }).first();
  await form.locator("textarea").fill("Sent after being demoted to read-only.");

  sql(`update "User" set "companyRole" = 'VIEWER' where email = '${customerEmail}'`);
  await form.getByRole("button", { name: "Send reply" }).click();
  await customerPage.waitForTimeout(2500);

  const leaked = sql(
    `select count(*) from "TicketMessage" where "ticketId" = 'ptk${stamp}' and body like 'Sent after being demoted%'`,
  );
  check("a read-only colleague cannot reply, whatever the page offered", leaked === "0", leaked);

  await customerPage.goto(`${BASE}/account/devices`, { waitUntil: "load" });
  const registerAsViewer = await customerPage.locator("body").innerText();
  check(
    "a read-only colleague still sees the register",
    registerAsViewer.includes("ProBook 450 G10"),
  );
  check(
    "and is told why they cannot change it",
    /read-only/i.test(registerAsViewer) && !registerAsViewer.includes("Add device"),
  );

  sql(`update "User" set "companyRole" = 'ADMIN' where email = '${customerEmail}'`);
}

// A closed ticket takes no more replies, and says why.
sql(`update "SupportTicket" set status = 'CLOSED' where reference = '${ticketRef}'`);
await customerPage.goto(`${BASE}/account/support/${ticketRef}`, { waitUntil: "load" });
{
  const text = await customerPage.locator("body").innerText();
  check("a closed ticket offers no reply box", !text.includes("Send reply"));
  check("and points at raising a new one", /raise a new ticket/i.test(text));
}

// ---------------------------------------------------------- renewals ---
await customerPage.goto(`${BASE}/account/renewals`, { waitUntil: "load" });
{
  const text = await customerPage.locator("body").innerText();
  check("the renewal due within the month is called out", /within a month/i.test(text));
  check("the calendar states the months", /2026/.test(text) && text.includes("Microsoft 365 Business Standard"));
  check(
    "and the review cadence is stated rather than implied",
    text.includes("120") && text.includes("7"),
  );
}

await staffPage.goto(`${BASE}/admin/renewals`, { waitUntil: "load" });
{
  const text = await staffPage.locator("body").innerText();
  check("the renewal book lists it for us too", text.includes("Microsoft 365 Business Standard"));
  check(
    "and claims to send nothing by itself",
    /nothing on this page sends anything/i.test(text),
  );
}

// ------------------------------------------------------------- clean up ---
await browser.close();

sql(`delete from "TicketMessage" where "ticketId" = 'ptk${stamp}'`);
sql(`delete from "Document" where "ticketId" = 'ptk${stamp}'`);
sql(`delete from "SupportTicket" where reference = '${ticketRef}'`);
sql(`delete from "Renewal" where "licenceId" = 'plic${stamp}'`);
sql(`delete from "Licence" where reference = '${licenceRef}'`);
sql(`delete from "Order" where reference = '${orderRef}'`);
sql(`delete from "Device" where "companyId" in ('pc${stamp}', 'po${stamp}')`);
sql(`delete from "AuditLog" where "actorId" in ('pu${stamp}', 'pou${stamp}') or "entityId" in ('${ticketRef}', '${orderRef}', '${datedRef}', '${undatedRef}')`);
sql(`delete from "Session" where "userId" in ('pu${stamp}', 'pou${stamp}')`);
sql(`delete from "User" where email in ('${customerEmail}', '${outsiderEmail}')`);
sql(`delete from "Company" where id in ('pc${stamp}', 'po${stamp}')`);
check("the fixtures are removed", sql(`select count(*) from "Device" where serial like 'SER${stamp}%'`) === "0");

rmSync(scratch, { force: true });

const passed = results.filter((result) => result.ok).length;
console.log(`\n${passed}/${results.length} portal checks passed`);
process.exit(passed === results.length ? 0 : 1);
