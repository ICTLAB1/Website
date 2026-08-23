import { chromium } from "playwright";
import { execFileSync } from "node:child_process";
import { writeFileSync, rmSync } from "node:fs";
import net from "node:net";

/**
 * What actually leaves the building when a quotation is sent.
 *
 * Everything else about this email is unit-tested against the builder. This is
 * about the envelope and the transport, which no builder test can reach:
 *
 *   the configured address is on the Cc, not the Bcc and not nowhere;
 *   the PDF is attached, and it is a PDF;
 *   the signature is in the message a mail server received, not merely in a
 *     string a function returned.
 *
 * It works by being the mail server. A throwaway SMTP sink listens on the
 * loopback, the settings point at it for the length of the run, and the
 * message is read off the wire exactly as a real server would receive it —
 * headers, MIME parts, base64 and all. Asserting against `sendMail`'s argument
 * instead would prove the caller's intent and nothing about whether nodemailer
 * or Graph carried it.
 */

const BASE = process.env.BASE ?? "http://localhost:3000";
const PORT = Number(process.env.SINK_PORT ?? 2526);
const results = [];
const check = (name, ok, detail = "") => {
  const result = { name, ok: Boolean(ok), detail };
  results.push(result);
  console.log(
    `  ${result.ok ? "✓" : "✗"} ${result.name}${result.ok || !result.detail ? "" : ` — ${result.detail}`}`,
  );
};

const scratch = `/tmp/verify-quote-email-${process.pid}.sql`;
const sql = (statement) => {
  writeFileSync(scratch, statement, { mode: 0o644 });
  return execFileSync("su", ["postgres", "-c", `psql -tA -d ictlab -f ${scratch}`], {
    encoding: "utf8",
  }).trim();
};

/*
 * ── the mail server ────────────────────────────────────────────────────────
 *
 * Enough SMTP to accept one message: a greeting, EHLO, the envelope, DATA, and
 * a goodbye. No STARTTLS is advertised, so nodemailer stays in the clear and
 * the message arrives readable. Deliberately not a library — a dependency
 * whose job is to be the thing under test is a dependency that can agree with
 * a bug.
 */
const received = [];
const sink = net.createServer((socket) => {
  let buffer = "";
  let inData = false;
  let message = "";
  const envelope = { to: [] };

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
          received.push({ envelope: { ...envelope, to: [...envelope.to] }, message });
          message = "";
          envelope.to.length = 0;
          socket.write("250 2.0.0 Ok: queued\r\n");
          continue;
        }
        // Dot-stuffing, undone the way a real server does.
        message += `${line.startsWith("..") ? line.slice(1) : line}\n`;
        continue;
      }

      const verb = line.split(" ")[0]?.toUpperCase() ?? "";
      if (verb === "EHLO") socket.write("250-sink.local\r\n250 SIZE 52428800\r\n");
      else if (verb === "HELO") socket.write("250 sink.local\r\n");
      else if (verb === "MAIL") socket.write("250 2.1.0 Ok\r\n");
      else if (verb === "RCPT") {
        // The envelope recipients — every address the server was told to
        // deliver to, which is what a Bcc would show up in and a header
        // would not.
        const address = line.match(/<([^>]*)>/)?.[1];
        if (address) envelope.to.push(address);
        socket.write("250 2.1.5 Ok\r\n");
      } else if (verb === "DATA") {
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
const staffEmail = `qm_staff${stamp}@example.test`;
const customerEmail = `qm_cust${stamp}@example.test`;
const copyEmail = `qm_copy${stamp}@example.test`;
const quoteRef = `QTE-2026-QM${stamp.slice(-4)}`;
const enquiryRef = `ENQ-2026-QM${stamp.slice(-4)}`;
const ownerName = `Owner Probe ${stamp}`;

/*
 * ── point the application at the sink, remembering what was there ──────────
 *
 * A run that dies between configuring the sink and restoring leaves the sink's
 * own host in the settings, and the next run would then faithfully "restore" it
 * — the deployment would be left pointing at a port with nothing behind it, and
 * every email after that would silently fail. So a sink host is swept first and
 * never treated as a prior value.
 */
sql(
  `update "MailSettings" set host = null, port = null, secure = null, "fromAddress" = null, "fromName" = null
     where id = 'singleton' and host = '127.0.0.1'`,
);

const priorSettings = sql(
  `select coalesce(provider::text,''), coalesce(host,''), coalesce(port::text,''),
          coalesce(secure::text,''), coalesce("fromAddress",''), coalesce("quoteCopyEmail",'')
     from "MailSettings" where id = 'singleton'`,
);
const hadRow = priorSettings !== "";

sql(
  `insert into "MailSettings" (id, provider, host, port, secure, "fromAddress", "fromName", "quoteCopyEmail", "updatedAt")
   values ('singleton', 'SMTP', '127.0.0.1', ${PORT}, false, 'no-reply@example.test', 'Quote Probe', '${copyEmail}', now())
   on conflict (id) do update set provider = 'SMTP', host = '127.0.0.1', port = ${PORT}, secure = false,
     "fromAddress" = 'no-reply@example.test', "quoteCopyEmail" = '${copyEmail}', "updatedAt" = now()`,
);

// ── a draft quotation, owned by somebody, ready to send ────────────────────
sql(
  `insert into "Company" (id, name, country, "createdAt", "updatedAt") values ('qmc${stamp}', 'Quote Mail Probe ${stamp}', 'India', now(), now())`,
);
sql(
  `insert into "User" (id, email, "passwordHash", name, role, "emailVerified", "createdAt", "updatedAt") values ('qms${stamp}', '${staffEmail}', '${FIXTURE_HASH}', '${ownerName}', 'ADMIN', now(), now(), now())`,
);
sql(
  `insert into "User" (id, email, "passwordHash", name, role, "companyRole", "companyId", "emailVerified", "createdAt", "updatedAt") values ('qmu${stamp}', '${customerEmail}', '${FIXTURE_HASH}', 'Mail Probe Customer', 'CUSTOMER', 'ADMIN', 'qmc${stamp}', now(), now(), now())`,
);
sql(
  `insert into "Enquiry" (id, reference, status, "userId", "companyId", "contactName", "contactEmail", "contactPhone", "companyName", "createdAt", "updatedAt") values ('qme${stamp}', '${enquiryRef}', 'QUOTATION_PREPARING', 'qmu${stamp}', 'qmc${stamp}', 'Mail Probe Customer', '${customerEmail}', '+91 00000 00000', 'Quote Mail Probe ${stamp}', now(), now())`,
);
sql(
  `insert into "Quote" (id, reference, status, version, "rootId", "userId", "companyId", "enquiryId", "ownerId", currency, "subtotalMinor", "discountMinor", "taxMinor", "totalMinor", "validUntil", "createdAt", "updatedAt") values ('qmq${stamp}', '${quoteRef}', 'DRAFT', 1, 'qmq${stamp}', 'qmu${stamp}', 'qmc${stamp}', 'qme${stamp}', 'qms${stamp}', 'INR', 100000, 0, 18000, 118000, now() + interval '30 days', now(), now())`,
);
sql(
  `insert into "QuoteItem" (id, "quoteId", "productName", sku, quantity, "unitPriceMinor", "discountMinor", "gstRatePercent", "lineTotalMinor") values ('qmi${stamp}', 'qmq${stamp}', 'Probe licence, annual', 'QM-SKU-1', 1, 100000, 0, 18, 100000)`,
);

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const staff = await browser.newContext();
const login = await staff.newPage();
await login.goto(`${BASE}/login`, { waitUntil: "load" });
await login.getByLabel("Business email").fill(staffEmail);
await login.getByLabel("Password").fill(password);
await login.getByRole("button", { name: "Sign in" }).click();
await login.waitForURL(/\/(admin|account)/, { timeout: 20000 });
await login.close();

const page = await staff.newPage();
await page.goto(`${BASE}/admin/quotes/${quoteRef}`, { waitUntil: "load" });
await page.getByRole("button", { name: "Send to customer" }).click();
await page.waitForTimeout(1500);

// The send is deliberately not awaited by the action, so wait for the wire
// rather than for the screen.
for (let waited = 0; waited < 30 && received.length === 0; waited += 1) {
  await page.waitForTimeout(500);
}

check("the quotation was sent", sql(`select status from "Quote" where id = 'qmq${stamp}'`) === "SENT");
check("and a message reached the mail server", received.length === 1, `${received.length} messages`);

const sent = received[0];
if (sent) {
  const headerBlock = sent.message.split("\n\n")[0] ?? "";
  // Unfold RFC 5322 continuation lines before matching, or a long header
  // wrapped by the client reads as two.
  const headers = headerBlock.replace(/\n[ \t]+/g, " ");

  // ── the copy ─────────────────────────────────────────────────────────────
  check(
    "the customer is the addressee",
    new RegExp(`^To:.*${customerEmail}`, "mi").test(headers),
    headers.match(/^To:.*/mi)?.[0] ?? "",
  );
  check(
    "the configured address is copied",
    new RegExp(`^Cc:.*${copyEmail}`, "mi").test(headers),
    headers.match(/^Cc:.*/mi)?.[0] ?? "(no Cc header)",
  );
  /*
   * Visible, not hidden. A Bcc reaches the envelope and never the headers, so
   * an address on the envelope but absent from `Cc:` is exactly the failure
   * this distinguishes — and the two are not interchangeable on a commercial
   * document, where a reply-all is supposed to reach everybody on it.
   */
  check(
    "and the copy is visible to the customer, not a blind one",
    sent.envelope.to.includes(copyEmail) && /^Cc:/mi.test(headers),
    sent.envelope.to.join(", "),
  );

  // ── the attachment ───────────────────────────────────────────────────────
  check(
    "the message carries an attachment",
    /Content-Disposition:\s*attachment/i.test(sent.message),
    "",
  );
  check(
    "which is declared as a PDF",
    /Content-Type:\s*application\/pdf/i.test(sent.message),
    sent.message.match(/Content-Type:.*/gi)?.join(" | ").slice(0, 160) ?? "",
  );

  /*
   * And is one. A part labelled `application/pdf` that decodes to something
   * else is the version of this bug that survives every header assertion, so
   * the base64 is decoded and the magic bytes are read.
   */
  const part = sent.message.split(/\n--/).find((section) => /application\/pdf/i.test(section));
  const encoded = (part?.split("\n\n").slice(1).join("\n\n") ?? "").replace(/[^A-Za-z0-9+/=]/g, "");
  const bytes = Buffer.from(encoded, "base64");
  check(
    "and decodes to a real PDF, not merely a part labelled as one",
    bytes.subarray(0, 5).toString() === "%PDF-",
    `${bytes.length} bytes, starts ${JSON.stringify(bytes.subarray(0, 8).toString("latin1"))}`,
  );
  check("the attachment is named for the quotation", /filename=.*\.pdf/i.test(sent.message));

  // ── the signature ────────────────────────────────────────────────────────
  /*
   * Read from the message on the wire. The body is quoted-printable, so soft
   * line breaks are undone before matching — otherwise a name that happens to
   * straddle the 76th column reads as absent.
   */
  const body = sent.message.replace(/=\r?\n/g, "").replace(/=([0-9A-F]{2})/g, (_, hex) =>
    String.fromCharCode(parseInt(hex, 16)),
  );
  check(
    "the person who owns the quotation signs it",
    body.includes(ownerName),
    "the owner's name is not in the message",
  );
  check(
    "the signature names the legal entity",
    /Private Limited|TechZoid/i.test(body),
    "",
  );
  check(
    "and the message says the PDF is attached",
    /attached/i.test(body),
    "",
  );
}

await browser.close();
sink.close();

// ── put the mail settings back ─────────────────────────────────────────────
if (hadRow) {
  const [provider, host, port, secure, fromAddress, quoteCopyEmail] = priorSettings.split("|");
  const orNull = (value) => (value === "" ? "null" : `'${value.replace(/'/g, "''")}'`);
  sql(
    `update "MailSettings" set provider = ${provider ? `'${provider}'::"MailProvider"` : `'SMTP'`},
       host = ${orNull(host)}, port = ${port === "" ? "null" : port},
       secure = ${secure === "" ? "null" : secure === "t"},
       "fromAddress" = ${orNull(fromAddress)}, "quoteCopyEmail" = ${orNull(quoteCopyEmail)}
     where id = 'singleton'`,
  );
} else {
  sql(`delete from "MailSettings" where id = 'singleton'`);
}

// ── clean up ───────────────────────────────────────────────────────────────
sql(`delete from "AuditLog" where "entityId" in ('${quoteRef}','qmi${stamp}')`);
sql(`delete from "QuoteItem" where "quoteId" = 'qmq${stamp}'`);
sql(`delete from "Quote" where id = 'qmq${stamp}'`);
sql(`delete from "EnquiryItem" where "enquiryId" = 'qme${stamp}'`);
sql(`delete from "Enquiry" where id = 'qme${stamp}'`);
sql(`delete from "Session" where "userId" in ('qms${stamp}', 'qmu${stamp}')`);
sql(`delete from "User" where id in ('qms${stamp}', 'qmu${stamp}')`);
sql(`delete from "Company" where id = 'qmc${stamp}'`);
rmSync(scratch, { force: true });

const failed = results.filter((result) => !result.ok).length;
console.log(`\n${results.length - failed}/${results.length} quotation email checks passed`);
process.exit(failed ? 1 : 0);
