/**
 * Renders a sample quotation in each foreign currency, as the customer
 * receives it: the PDF and the HTML of the email that carries it.
 *
 * Not a test — nothing is asserted. It exists so the documents can be read
 * before the feature is live, which is the only way to catch the things a
 * check cannot phrase: a tax line that should not be there, a total written
 * out in lakhs on a dollar document, a column heading that no longer fits.
 *
 * It works the same way `verify/quote-email.mjs` does, and for the same
 * reason: a throwaway SMTP sink on the loopback is the mail server for the
 * length of the run, so what is written to disk is what came off the wire
 * rather than what a function returned.
 *
 * Seeds its own fixtures and removes them, mail settings included.
 */
import { chromium } from "playwright";
import net from "node:net";
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync, rmSync } from "node:fs";

const BASE = process.env.BASE ?? "http://localhost:3000";
const PORT = Number(process.env.SINK_PORT ?? 2527);
const OUT = process.argv[2];
if (!OUT) {
  console.error("usage: node scripts/sample-foreign-quote.mjs <output-directory>");
  process.exit(2);
}
mkdirSync(OUT, { recursive: true });

const scratch = `/tmp/sample-foreign-quote-${process.pid}.sql`;
const sql = (statement) => {
  writeFileSync(scratch, statement, { mode: 0o644 });
  return execFileSync("su", ["postgres", "-c", `psql -tA -d ictlab -f ${scratch}`], {
    encoding: "utf8",
  }).trim();
};

const received = [];
const sink = net.createServer((socket) => {
  let buffer = "";
  let inData = false;
  let message = "";
  socket.write("220 sink.local ESMTP\r\n");
  socket.on("data", (chunk) => {
    buffer += chunk.toString("utf8");
    for (;;) {
      const at = buffer.indexOf("\r\n");
      if (at === -1) break;
      const line = buffer.slice(0, at);
      buffer = buffer.slice(at + 2);
      if (inData) {
        if (line === ".") {
          inData = false;
          received.push(message);
          message = "";
          socket.write("250 2.0.0 Ok: queued\r\n");
          continue;
        }
        message += `${line.startsWith("..") ? line.slice(1) : line}\n`;
        continue;
      }
      const verb = line.split(" ")[0]?.toUpperCase() ?? "";
      if (verb === "EHLO") socket.write("250-sink.local\r\n250 SIZE 52428800\r\n");
      else if (verb === "HELO") socket.write("250 sink.local\r\n");
      else if (verb === "DATA") {
        inData = true;
        socket.write("354 End data with <CR><LF>.<CR><LF>\r\n");
      } else if (verb === "QUIT") {
        socket.write("221 2.0.0 Bye\r\n");
        socket.end();
      } else socket.write("250 2.0.0 Ok\r\n");
    }
  });
  socket.on("error", () => {});
});
await new Promise((resolve) => sink.listen(PORT, "127.0.0.1", resolve));

const stamp = Date.now().toString().slice(-6);
const FIXTURE_HASH = "$2b$12$Y1EnHFQUoF4sKzWulgpRre1IGREZUDi/nFfN6QycEnigobTHRMj5e";
const password = "CorrectHorse9";
const staffEmail = `sm_staff${stamp}@example.test`;

const hadMail = sql(`select count(*) from "MailSettings" where id = 'singleton'`) !== "0";
const priorMail = hadMail
  ? sql(
      `select provider || '|' || coalesce(host, '') || '|' || coalesce(port::text, '') || '|' || coalesce(secure::text, '') || '|' || coalesce("fromAddress", '')
       from "MailSettings" where id = 'singleton'`,
    )
  : "";
if (hadMail) {
  sql(
    `update "MailSettings" set provider = 'SMTP', host = '127.0.0.1', port = ${PORT}, secure = false, "fromAddress" = 'sales@techzoidtechnologies.com', "fromName" = 'TechZoid Technologies', "quoteCopyEmail" = null, "updatedAt" = now() where id = 'singleton'`,
  );
} else {
  sql(
    `insert into "MailSettings" (id, provider, host, port, secure, "fromAddress", "fromName", "updatedAt") values ('singleton', 'SMTP', '127.0.0.1', ${PORT}, false, 'sales@techzoidtechnologies.com', 'TechZoid Technologies', now())`,
  );
}

sql(
  `insert into "User" (id, email, "passwordHash", name, role, "emailVerified", "createdAt", "updatedAt") values ('sms${stamp}', '${staffEmail}', '${FIXTURE_HASH}', 'Abhinav Jain', 'ADMIN', now(), now(), now())`,
);

/*
 * Two customers abroad, priced in their own currency.
 *
 * The figures are what a salesperson would land on after restating and then
 * editing — round, commercial numbers — rather than the output of a division,
 * because a sample whose prices nobody would ever quote does not show what the
 * document looks like in use.
 */
const samples = [
  {
    key: "usd",
    currency: "USD",
    rate: 8840,
    company: "Gulf Integrators FZ-LLC",
    country: "United Arab Emirates",
    contact: "Rania Haddad",
    customerReference: "RFQ-GI-4471",
    notes:
      "Priced in US dollars, inclusive of all charges. Settlement by wire transfer; bank details are on the invoice.",
    lines: [
      ["Microsoft 365 Business Standard — annual subscription", "MS-M365-BS-A1", 120, 15_900, 95_400, "Microsoft", "users"],
      ["Autodesk AutoCAD LT — annual subscription", "ADSK-ACADLT-A1", 8, 49_500, 0, "Autodesk", "users"],
      ["Tenant migration and configuration", "—", 1, 285_000, 0, null, "project"],
    ],
  },
  {
    key: "aed",
    currency: "AED",
    rate: 2407,
    company: "Jebel Ali Logistics LLC",
    country: "United Arab Emirates",
    contact: "Omar Al Mansoori",
    customerReference: "PR-2026-0912",
    notes:
      "Priced in UAE dirhams, inclusive of all charges. Delivery of licence keys within three working days of the purchase order.",
    lines: [
      ["Microsoft 365 E3 — annual subscription", "MS-M365-E3-A1", 60, 160_000, 0, "Microsoft", "users"],
      ["Veeam Backup Essentials — 3-year licence", "VEEAM-BE-3Y", 2, 1_295_000, 190_000, "Veeam", "sockets"],
    ],
  },
];

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const staff = await browser.newContext();
const login = await staff.newPage();
await login.goto(`${BASE}/login`, { waitUntil: "load" });
await login.getByLabel("Business email").fill(staffEmail);
await login.getByLabel("Password").fill(password);
await login.getByRole("button", { name: "Sign in" }).click();
await login.waitForURL(/\/(admin|account)/, { timeout: 20000 });
await login.close();

const ids = [];
for (const [index, sample] of samples.entries()) {
  const id = `sm${sample.key}${stamp}`;
  // Exactly six characters after the year: the reference schema the actions
  // validate against admits no other shape.
  const reference = `QTE-2026-S${sample.key[0].toUpperCase()}${stamp.slice(-4)}`;
  ids.push({ id, reference });

  sql(
    `insert into "Company" (id, name, country, "createdAt", "updatedAt") values ('${id}c', '${sample.company}', '${sample.country}', now(), now())`,
  );
  sql(
    `insert into "User" (id, email, "passwordHash", name, role, "companyRole", "companyId", "emailVerified", "createdAt", "updatedAt") values ('${id}u', 'sm_${sample.key}${stamp}@example.test', '${FIXTURE_HASH}', '${sample.contact}', 'CUSTOMER', 'ADMIN', '${id}c', now(), now(), now())`,
  );

  /*
   * The enquiry behind it, because the email is addressed from there.
   *
   * `sendQuote` takes the recipient from the quotation's enquiry — in the
   * application every quotation has one, since drafting from an enquiry is the
   * only way to raise the first version — so a fixture without one is issued
   * and then silently not emailed.
   */
  sql(
    `insert into "Enquiry" (id, reference, status, "userId", "companyId", "contactName", "contactEmail", "contactPhone", "companyName", "createdAt", "updatedAt")
     values ('${id}e', 'ENQ-2026-S${sample.key[0].toUpperCase()}${stamp.slice(-4)}', 'QUOTATION_PREPARING', '${id}u', '${id}c', '${sample.contact}', 'sm_${sample.key}${stamp}@example.test', '+971 00 000 0000', '${sample.company}', now(), now())`,
  );

  const subtotal = sample.lines.reduce((sum, [, , qty, unit]) => sum + qty * unit, 0);
  const discount = sample.lines.reduce((sum, [, , , , disc]) => sum + disc, 0);
  sql(
    `insert into "Quote" (id, reference, "documentNo", status, version, "rootId", "userId", "companyId", "enquiryId", "ownerId", currency, "exchangeRatePaise", "subtotalMinor", "discountMinor", "taxMinor", "totalMinor", "validUntil", notes, "paymentTerms", "customerReference", "createdAt", "updatedAt")
     values ('${id}', '${reference}', 'TZT/QTN/26-27/S${stamp}${index}', 'DRAFT', 1, '${id}', '${id}u', '${id}c', '${id}e', 'sms${stamp}', '${sample.currency}', ${sample.rate}, ${subtotal}, ${discount}, 0, ${subtotal - discount}, now() + interval '30 days', '${sample.notes.replace(/'/g, "''")}', '50% advance against purchase order, balance within 15 days of delivery.', '${sample.customerReference}', now(), now())`,
  );
  for (const [position, [name, sku, qty, unit, disc, brand, unitLabel]] of sample.lines.entries()) {
    sql(
      `insert into "QuoteItem" (id, "quoteId", "productName", sku, quantity, "unitPriceMinor", "discountMinor", "gstRatePercent", "lineTotalMinor", "brandName", "unitLabel")
       values ('${id}i${position}', '${id}', '${name.replace(/'/g, "''")}', '${sku}', ${qty}, ${unit}, ${disc}, 0, ${qty * unit - disc}, ${brand ? `'${brand}'` : "null"}, '${unitLabel}')`,
    );
  }

  // Issued through the screen, so the document written out is the one the
  // application actually sends rather than one this script composed.
  const before = received.length;
  const page = await staff.newPage();
  await page.goto(`${BASE}/admin/quotes/${reference}`, { waitUntil: "load" });
  await page.getByRole("button", { name: "Send to customer" }).click();
  /*
   * The send is fire-and-forget inside the action, and the PDF is built and
   * base64-encoded on the way out, so the wire lags the screen by seconds.
   * Waited for generously: this script runs by hand, and a sample that is
   * silently missing is worse than one that takes a minute.
   */
  for (let waited = 0; waited < 120 && received.length === before; waited += 1) {
    await page.waitForTimeout(500);
  }
  await page.close();

  const message = received[before];
  if (!message) {
    console.log(`  ✗ ${sample.currency}: no message reached the sink`);
    continue;
  }

  const parts = message.split(/\n--/);
  const htmlPart = parts.find((part) => /Content-Type:\s*text\/html/i.test(part)) ?? "";
  const html = htmlPart
    .split("\n\n")
    .slice(1)
    .join("\n\n")
    .replace(/=\r?\n/g, "")
    .replace(/=([0-9A-F]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
  writeFileSync(`${OUT}/quotation-${sample.key}-email.html`, html);

  const pdfPart = parts.find((part) => /application\/pdf/i.test(part)) ?? "";
  const encoded = (pdfPart.split("\n\n").slice(1).join("\n\n") || "").replace(/[^A-Za-z0-9+/=]/g, "");
  writeFileSync(`${OUT}/quotation-${sample.key}.pdf`, Buffer.from(encoded, "base64"));

  console.log(`  ✓ ${sample.currency}: ${reference} — quotation-${sample.key}.pdf, quotation-${sample.key}-email.html`);
}

await browser.close();
sink.close();

// ── clean up ────────────────────────────────────────────────────────────────
for (const { id, reference } of ids) {
  sql(`delete from "AuditLog" where "entityId" = '${reference}' or metadata::text like '%${reference}%'`);
  sql(`delete from "QuoteFollowUp" where "quoteId" = '${id}'`);
  sql(`delete from "QuoteMessage" where "quoteId" = '${id}'`);
  sql(`delete from "QuoteItem" where "quoteId" = '${id}'`);
  sql(`delete from "Quote" where id = '${id}'`);
  sql(`delete from "Session" where "userId" = '${id}u'`);
  sql(`delete from "User" where id = '${id}u'`);
  sql(`delete from "Enquiry" where id = '${id}e'`);
  sql(`delete from "Company" where id = '${id}c'`);
}
sql(`delete from "Session" where "userId" = 'sms${stamp}'`);
sql(`delete from "User" where id = 'sms${stamp}'`);
if (hadMail) {
  const [provider, host, port, secure, fromAddress] = priorMail.split("|");
  const orNull = (value) => (value === "" ? "null" : `'${value.replace(/'/g, "''")}'`);
  sql(
    `update "MailSettings" set provider = '${provider}'::"MailProvider", host = ${orNull(host)}, port = ${port === "" ? "null" : port}, secure = ${secure === "" ? "null" : secure}, "fromAddress" = ${orNull(fromAddress)}, "updatedAt" = now() where id = 'singleton'`,
  );
} else {
  sql(`delete from "MailSettings" where id = 'singleton'`);
}
rmSync(scratch, { force: true });
