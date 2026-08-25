import net from "node:net";
import { execFileSync } from "node:child_process";
import { writeFileSync, rmSync } from "node:fs";

/**
 * Chasing quotations, and the four ways a chase would be a lie.
 *
 * The feature sends email to real customers on a clock, so this suite is
 * arranged around what must *not* happen rather than what must:
 *
 * - **Nobody is chased twice for the same step.** Two overlapping runs — a cron
 *   that overran, an operator pressing the endpoint by hand — must produce one
 *   message, not two.
 * - **Nobody is chased about a quotation they answered**, or one whose pricing
 *   has lapsed, or one somebody here paused.
 * - **Nothing is sent by an unauthenticated caller.** The endpoint's whole job
 *   is sending mail to customers.
 * - **What was sent is recorded**, with where it went, so "did anyone chase
 *   this?" has an answer that is not somebody's memory.
 *
 * It is the mail server, like the quotation email suite: a throwaway SMTP sink
 * on a spare port, and the application pointed at it for the duration.
 */

const BASE = process.env.BASE ?? "http://localhost:3000";
const TOKEN = process.env.QUOTE_FOLLOWUP_TOKEN;
const PORT = 3527;

const results = [];
const check = (name, ok, detail = "") => {
  const result = { name, ok: Boolean(ok), detail };
  results.push(result);
  console.log(`  ${result.ok ? "✓" : "✗"} ${result.name}${result.ok || !result.detail ? "" : ` — ${result.detail}`}`);
};

if (!TOKEN) {
  console.error(
    "QUOTE_FOLLOWUP_TOKEN is not set.\n" +
      "Start the server with it and export the same value here — the suite calls the\n" +
      "scheduled endpoint, and an endpoint that sends customer email has no open mode\n" +
      "to fall back to.",
  );
  process.exit(1);
}

const scratch = `/tmp/verify-follow-ups-${process.pid}.sql`;
const sql = (statement) => {
  writeFileSync(scratch, statement, { mode: 0o644 });
  return execFileSync("su", ["postgres", "-c", `psql -tA -d ictlab -f ${scratch}`], {
    encoding: "utf8",
  }).trim();
};

// ── the mail server ────────────────────────────────────────────────────────
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
        message += `${line.startsWith("..") ? line.slice(1) : line}\n`;
        continue;
      }

      const verb = line.split(" ")[0]?.toUpperCase() ?? "";
      if (verb === "EHLO") socket.write("250-sink.local\r\n250 SIZE 52428800\r\n");
      else if (verb === "HELO") socket.write("250 sink.local\r\n");
      else if (verb === "MAIL") socket.write("250 2.1.0 Ok\r\n");
      else if (verb === "RCPT") {
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
const customerEmail = `fu_cust${stamp}@example.test`;

/*
 * Four quotations, one property each.
 *
 * Separate rows rather than one row mutated between assertions: a suite that
 * edits the same quotation four times cannot tell "the run skipped it" from
 * "the run had already dealt with it", and that is precisely the distinction
 * being checked.
 */
const quotes = {
  due: { id: `fuq_due${stamp}`, ref: `QTE-2026-FA${stamp.slice(-4)}` },
  accepted: { id: `fuq_acc${stamp}`, ref: `QTE-2026-FB${stamp.slice(-4)}` },
  expired: { id: `fuq_exp${stamp}`, ref: `QTE-2026-FC${stamp.slice(-4)}` },
  paused: { id: `fuq_pau${stamp}`, ref: `QTE-2026-FD${stamp.slice(-4)}` },
};

// ── point the application at the sink, remembering what was there ──────────
sql(
  `update "MailSettings" set host = null, port = null, secure = null, "fromAddress" = null
     where id = 'singleton' and host = '127.0.0.1'`,
);
const priorMail = sql(
  `select coalesce(provider::text,''), coalesce(host,''), coalesce(port::text,''),
          coalesce(secure::text,''), coalesce("fromAddress",''), coalesce("quoteCopyEmail",'')
     from "MailSettings" where id = 'singleton'`,
);
const hadMail = priorMail !== "";
sql(
  `insert into "MailSettings" (id, provider, host, port, secure, "fromAddress", "fromName", "updatedAt")
   values ('singleton', 'SMTP', '127.0.0.1', ${PORT}, false, 'no-reply@example.test', 'Follow-up Probe', now())
   on conflict (id) do update set provider = 'SMTP', host = '127.0.0.1', port = ${PORT}, secure = false,
     "fromAddress" = 'no-reply@example.test', "quoteCopyEmail" = null, "updatedAt" = now()`,
);

const priorFollowUps = sql(
  `select coalesce(enabled::text,''), coalesce(array_to_string(schedule, ','),''),
          coalesce("minimumGapDays"::text,''), coalesce("stopOnReply"::text,'')
     from "QuoteFollowUpSettings" where id = 'singleton'`,
);
const hadFollowUps = priorFollowUps !== "";
sql(
  `insert into "QuoteFollowUpSettings" (id, enabled, schedule, "minimumGapDays", "stopOnReply", "updatedAt")
   values ('singleton', true, ARRAY[3,7,14], 2, true, now())
   on conflict (id) do update set enabled = true, schedule = ARRAY[3,7,14],
     "minimumGapDays" = 2, "stopOnReply" = true, "updatedAt" = now()`,
);

// ── the fixtures ───────────────────────────────────────────────────────────
sql(
  `insert into "Company" (id, name, country, "createdAt", "updatedAt") values ('fuc${stamp}', 'Follow-up Probe ${stamp}', 'India', now(), now())`,
);
sql(
  `insert into "User" (id, email, "passwordHash", name, role, "companyRole", "companyId", "emailVerified", "createdAt", "updatedAt")
   values ('fuu${stamp}', '${customerEmail}', '${FIXTURE_HASH}', 'Follow-up Probe Customer', 'CUSTOMER', 'ADMIN', 'fuc${stamp}', now(), now(), now())`,
);
sql(
  `insert into "Enquiry" (id, reference, status, "userId", "companyId", "contactName", "contactEmail", "contactPhone", "companyName", "createdAt", "updatedAt")
   values ('fue${stamp}', 'ENQ-2026-FU${stamp.slice(-4)}', 'QUOTATION_SENT', 'fuu${stamp}', 'fuc${stamp}', 'Follow-up Probe Customer', '${customerEmail}', '+91 00000 00000', 'Follow-up Probe ${stamp}', now(), now())`,
);

const insertQuote = (quote, { status, sentDaysAgo, validDays, paused }) =>
  sql(
    `insert into "Quote" (id, reference, status, version, "rootId", "userId", "companyId", "enquiryId", currency,
       "subtotalMinor", "discountMinor", "taxMinor", "totalMinor", "sentAt", "validUntil", "followUpsPausedAt", "createdAt", "updatedAt")
     values ('${quote.id}', '${quote.ref}', '${status}', 1, '${quote.id}', 'fuu${stamp}', 'fuc${stamp}', 'fue${stamp}', 'INR',
       100000, 0, 18000, 118000, now() - interval '${sentDaysAgo} days',
       now() + interval '${validDays} days', ${paused ? "now()" : "null"}, now(), now())`,
  );

insertQuote(quotes.due, { status: "SENT", sentDaysAgo: 5, validDays: 20, paused: false });
insertQuote(quotes.accepted, { status: "ACCEPTED", sentDaysAgo: 5, validDays: 20, paused: false });
insertQuote(quotes.expired, { status: "SENT", sentDaysAgo: 40, validDays: -1, paused: false });
insertQuote(quotes.paused, { status: "SENT", sentDaysAgo: 5, validDays: 20, paused: true });

// ── an unauthenticated caller learns nothing and sends nothing ─────────────
const anonymous = await fetch(`${BASE}/api/quotes/follow-ups`, { method: "POST" });
check("an unauthenticated call is refused", anonymous.status === 404, `status ${anonymous.status}`);

const wrongToken = await fetch(`${BASE}/api/quotes/follow-ups`, {
  method: "POST",
  headers: { "x-follow-up-token": `${TOKEN}x` },
});
check("a wrong token is refused", wrongToken.status === 404, `status ${wrongToken.status}`);
check("and neither sent anything", received.length === 0, `${received.length} messages`);

// ── the run ────────────────────────────────────────────────────────────────
const run = async () => {
  const response = await fetch(`${BASE}/api/quotes/follow-ups`, {
    method: "POST",
    headers: { "x-follow-up-token": TOKEN },
  });
  return { status: response.status, body: await response.json() };
};

const first = await run();
check("the scheduled run is accepted", first.status === 200, `status ${first.status}`);
check("and reports one follow-up sent", first.body.sent === 1, JSON.stringify(first.body));

for (let waited = 0; waited < 30 && received.length === 0; waited += 1) {
  await new Promise((resolve) => setTimeout(resolve, 500));
}
check("a message reached the mail server", received.length === 1, `${received.length} messages`);

const message = received[0];
if (message) {
  const body = (message.message ?? "")
    .replace(/=\r?\n/g, "")
    .replace(/=([0-9A-F]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
  check("it went to the customer", message.envelope.to.includes(customerEmail), message.envelope.to.join(", "));
  check("it names the quotation being chased", body.includes(quotes.due.ref));
  /*
   * The document is not sent again. A follow-up that re-attaches the quotation
   * implies the first one may not have arrived, which is usually untrue — and
   * on a chase sent three times it is three copies of the same PDF.
   */
  check("it does not re-attach the quotation", !/Content-Disposition:\s*attachment/i.test(message.message));
}

// ── what was and was not touched ───────────────────────────────────────────
const sentFor = (id) =>
  Number(sql(`select count(*) from "QuoteFollowUp" where "quoteId" = '${id}'`) || "0");

check("the due quotation was chased once", sentFor(quotes.due.id) === 1, `${sentFor(quotes.due.id)}`);
check("the answered quotation was not chased", sentFor(quotes.accepted.id) === 0);
check("the paused quotation was not chased", sentFor(quotes.paused.id) === 0);
check("the lapsed quotation was not chased", sentFor(quotes.expired.id) === 0);
check(
  "and the lapsed quotation was marked expired by the same run",
  sql(`select status from "Quote" where id = '${quotes.expired.id}'`) === "EXPIRED",
);

const recorded = sql(
  `select kind::text, coalesce(step::text,'-'), "toEmail", delivered::text from "QuoteFollowUp" where "quoteId" = '${quotes.due.id}'`,
);
check("the record says what was sent, and where", recorded === `AUTOMATIC|1|${customerEmail}|true`, recorded);

// ── a second run sends nothing ─────────────────────────────────────────────
const second = await run();
check("a second run in the same day sends nothing", second.body.sent === 0, JSON.stringify(second.body));
await new Promise((resolve) => setTimeout(resolve, 1500));
check("and no second message reached the mail server", received.length === 1, `${received.length} messages`);

// ── the customer replies, and the chasing stops ────────────────────────────
sql(
  `insert into "QuoteMessage" (id, "quoteId", kind, body, "fromStaff", "createdAt")
   values ('fum${stamp}', '${quotes.due.id}', 'QUESTION', 'Can you re-quote for 40 seats?', false, now())`,
);
sql(`update "Quote" set "sentAt" = now() - interval '9 days' where id = '${quotes.due.id}'`);

const third = await run();
check(
  "a customer who has written is not chased again",
  third.body.sent === 0 && sentFor(quotes.due.id) === 1,
  JSON.stringify(third.body),
);

// ── put everything back ────────────────────────────────────────────────────
if (hadFollowUps) {
  const [enabled, schedule, gap, stopOnReply] = priorFollowUps.split("|");
  sql(
    /*
     * "true", not "t". A boolean cast to text in psql prints `true`; only an
     * uncast boolean column prints `t`. Comparing against "t" here would have
     * restored every setting as false — which is how a verify run quietly
     * switches a deployment's own settings off.
     */
    `update "QuoteFollowUpSettings" set enabled = ${enabled === "true"},
       schedule = ${schedule ? `ARRAY[${schedule}]` : "ARRAY[]::integer[]"},
       "minimumGapDays" = ${gap || 2}, "stopOnReply" = ${stopOnReply === "true"}, "updatedAt" = now()
     where id = 'singleton'`,
  );
} else {
  sql(`delete from "QuoteFollowUpSettings" where id = 'singleton'`);
}

if (hadMail) {
  const [provider, host, port, secure, fromAddress, quoteCopyEmail] = priorMail.split("|");
  const orNull = (value) => (value === "" ? "null" : `'${value.replace(/'/g, "''")}'`);
  sql(
    `update "MailSettings" set provider = ${provider ? `'${provider}'::"MailProvider"` : `'SMTP'`},
       host = ${orNull(host)}, port = ${port === "" ? "null" : port},
       secure = ${secure === "" ? "null" : secure === "true"},
       "fromAddress" = ${orNull(fromAddress)}, "quoteCopyEmail" = ${orNull(quoteCopyEmail)}
     where id = 'singleton'`,
  );
} else {
  sql(`delete from "MailSettings" where id = 'singleton'`);
}

const ids = Object.values(quotes)
  .map((quote) => `'${quote.id}'`)
  .join(",");
sql(`delete from "QuoteFollowUp" where "quoteId" in (${ids})`);
sql(`delete from "QuoteMessage" where "quoteId" in (${ids})`);
sql(`delete from "Quote" where id in (${ids})`);
sql(`delete from "Enquiry" where id = 'fue${stamp}'`);
sql(`delete from "Session" where "userId" = 'fuu${stamp}'`);
sql(`delete from "User" where id = 'fuu${stamp}'`);
sql(`delete from "Company" where id = 'fuc${stamp}'`);
rmSync(scratch, { force: true });
sink.close();

const failed = results.filter((result) => !result.ok).length;
console.log(`\n${results.length - failed}/${results.length} quotation follow-up checks passed`);
process.exit(failed ? 1 : 0);
