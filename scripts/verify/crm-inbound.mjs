import { chromium } from "playwright";
import { execFileSync } from "node:child_process";
import { createHmac, randomUUID } from "node:crypto";
import { writeFileSync, rmSync } from "node:fs";

/**
 * The half of the CRM integration where another system changes this pipeline.
 *
 * This suite *is* the customer's CRM. It signs deliveries the way the far end
 * has been told to, posts them at the real endpoint, and reads the pipeline
 * afterwards — so what is proved here is the wire contract, not a function call
 * with the transport imagined away.
 *
 * Five properties, and every one of them is a way this could go wrong quietly:
 *
 *   an unsigned or wrongly signed delivery changes nothing, and is not told
 *     that the endpoint exists;
 *   a captured delivery cannot be replayed later;
 *   the same event delivered twice is applied once;
 *   an event older than the state it describes does not undo a newer decision;
 *   an applied change does not go back out to the system that asked for it.
 *
 * The last one is the one a reviewer will not think of and the one that takes a
 * production system down: the outbound half sends every stage change, so an
 * inbound change that emits is a loop between two servers that each believe the
 * other started it.
 */

const BASE = process.env.BASE ?? "http://localhost:3000";
const results = [];
const check = (name, ok, detail = "") => {
  const result = { name, ok: Boolean(ok), detail };
  results.push(result);
  console.log(
    `  ${result.ok ? "✓" : "✗"} ${result.name}${result.ok || !result.detail ? "" : ` — ${result.detail}`}`,
  );
};

const scratch = `/tmp/verify-crm-inbound-${process.pid}.sql`;
const sql = (statement) => {
  writeFileSync(scratch, statement, { mode: 0o644 });
  return execFileSync("su", ["postgres", "-c", `psql -tA -d ictlab -f ${scratch}`], {
    encoding: "utf8",
  }).trim();
};

const stamp = Date.now().toString().slice(-6);
const SECRET = "inbound-fixture-secret-for-the-verify-suite";
const reference = `DEAL-IN-${stamp}`;

// Sweep anything an aborted run left behind before adding more.
sql(`delete from "CrmInboundEvent" where "entityId" like 'DEAL-IN-%'`);
sql(`delete from "Activity" where "dealId" in (select id from "Deal" where reference like 'DEAL-IN-%')`);
sql(`delete from "CrmEvent" where "entityId" like 'DEAL-IN-%'`);
sql(`delete from "Deal" where reference like 'DEAL-IN-%'`);

/*
 * The integration, switched on with a secret this suite knows.
 *
 * Restored at the end. `enabled` is left as it was found: this suite is about
 * the inbound direction and has no business switching the outbound one on, on
 * a machine that might have a real endpoint configured.
 */
const priorSecret = sql(
  `select coalesce("inboundSecret",'') || '|' || coalesce("inboundEnabled"::text,'false') from "CrmSettings" where id = 'singleton'`,
);

sql(
  `insert into "CrmSettings" (id, "inboundEnabled", "updatedAt") values ('singleton', true, now())
   on conflict (id) do update set "inboundEnabled" = true, "updatedAt" = now()`,
);

/*
 * The secret is set the way an administrator sets it: typed into the form.
 *
 * Not written into the row directly. It is stored encrypted, so a row this
 * suite wrote as plaintext would decrypt to nothing and the route would answer
 * 404 to everything — which looks exactly like the failure this suite exists to
 * catch. Going through the screen also exercises the save path, including the
 * refusal below.
 */
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const page = await (await browser.newContext()).newPage();

await page.goto(`${BASE}/login`, { waitUntil: "load" });
await page.getByLabel("Business email").fill(process.env.ADMIN_EMAIL ?? "admin@example.test");
await page.getByLabel("Password").fill(process.env.ADMIN_PASSWORD ?? "ChangeMe!Admin123");
await page.getByRole("button", { name: "Sign in" }).click();
await page.waitForURL("**/admin", { timeout: 20000 });

const receivingForm = () =>
  page.locator("form").filter({ has: page.locator('[name="inboundSecret"]') });

async function saveReceiving({ secret, enabled }) {
  await page.goto(`${BASE}/admin/settings/crm`, { waitUntil: "load" });
  await page.waitForLoadState("networkidle");

  if (secret !== undefined) await receivingForm().locator('[name="inboundSecret"]').fill(secret);
  const box = receivingForm().locator('[name="inboundEnabled"]');
  if (enabled) await box.check();
  else await box.uncheck();

  await receivingForm().getByRole("button", { name: /Save/i }).click();
  await page
    .waitForFunction(
      () => /Saved\.|before switching receiving on/i.test(document.body.innerText),
      undefined,
      { timeout: 15000 },
    )
    .catch(() => {});
}

/*
 * ── receiving cannot be switched on without a secret ──────────────────────
 *
 * An administrator who ticks the box, sees "Saved" and tells the CRM team to
 * go ahead has been misled: every delivery would answer 404 and the far end
 * would report an outage nobody here could explain.
 */
sql(`update "CrmSettings" set "inboundSecret" = null, "inboundEnabled" = false where id = 'singleton'`);
await saveReceiving({ enabled: true });
check(
  "receiving cannot be switched on with no secret to verify against",
  sql(`select "inboundEnabled"::text from "CrmSettings" where id = 'singleton'`) === "false",
  sql(`select "inboundEnabled"::text from "CrmSettings" where id = 'singleton'`),
);
check(
  "and the administrator is told why",
  /before switching receiving on/i.test(await page.locator("main").innerText()),
);

await saveReceiving({ secret: SECRET, enabled: true });
check(
  "a secret and the switch together are accepted",
  sql(`select "inboundEnabled"::text from "CrmSettings" where id = 'singleton'`) === "true",
);
check(
  "and the secret is stored encrypted, not as typed",
  !sql(`select coalesce("inboundSecret",'') from "CrmSettings" where id = 'singleton'`).includes(
    SECRET,
  ),
);
check(
  "and never reaches the browser",
  !(await page.content()).includes(SECRET),
);

// A deal for the far end to move. Created directly, because this suite is about
// what arrives from outside, not about how a deal comes to exist.
sql(
  `insert into "Deal" (id, reference, title, stage, source, "stageChangedAt", "expectedValueMinor", currency, "createdAt", "updatedAt")
   values ('din${stamp}', '${reference}', 'Inbound probe ${stamp}', 'QUALIFYING', 'DIRECT', now() - interval '1 hour', 5000000, 'INR', now(), now())`,
);

const sign = (body, secret = SECRET, at = new Date()) => {
  const t = Math.floor(at.getTime() / 1000);
  const digest = createHmac("sha256", secret).update(`${t}.${body}`).digest("hex");
  return `t=${t},v1=${digest}`;
};

async function deliver(envelope, options = {}) {
  const { secret = SECRET, at = new Date() } = options;
  const body = JSON.stringify(envelope);
  const headers = { "content-type": "application/json" };

  /*
   * `"signature" in options`, not `options.signature ?? sign(...)`.
   *
   * Nullish coalescing falls through on null, so passing `signature: null` to
   * mean "send none" signed it anyway — the unsigned-delivery check was posting
   * a perfectly valid delivery, getting a 200, and applying a stage change that
   * then made three later checks read the wrong state. Presence of the key is
   * the instruction; its value is what to send.
   */
  const value = "signature" in options ? options.signature : sign(body, secret, at);
  if (typeof value === "string") headers["x-crm-signature"] = value;

  const response = await fetch(`${BASE}/api/crm/inbound`, { method: "POST", headers, body });
  const text = await response.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    /* a 404 answers in plain text */
  }
  return { status: response.status, json, text };
}

const envelope = (overrides = {}) => ({
  version: 1,
  id: randomUUID(),
  kind: "deal.stage_changed",
  occurredAt: new Date().toISOString(),
  entity: { type: "Deal", id: reference },
  data: { to: "NEGOTIATION" },
  ...overrides,
});

const stageOf = () => sql(`select stage::text from "Deal" where reference = '${reference}'`);

// ── an unsigned delivery is not even told the endpoint exists ───────────────
const unsigned = await deliver(envelope(), { signature: null });
check("an unsigned delivery is refused", unsigned.status === 404, `status ${unsigned.status}`);
check("and learns nothing about the endpoint", !unsigned.text.includes("signature"), unsigned.text.slice(0, 80));
check("and changed nothing", stageOf() === "QUALIFYING", stageOf());

// ── a wrongly signed one likewise ──────────────────────────────────────────
const wrong = await deliver(envelope(), { secret: "not-the-secret" });
check("a delivery signed with the wrong secret is refused", wrong.status === 404, `status ${wrong.status}`);
check("and changed nothing", stageOf() === "QUALIFYING", stageOf());

/*
 * ── a captured delivery cannot be replayed tomorrow ───────────────────────
 *
 * Signed correctly, with a timestamp outside the tolerance. This is the check
 * that makes the signature worth having: without a bound on age, anybody who
 * ever saw one valid request owns this endpoint forever.
 */
const stale = await deliver(envelope(), { at: new Date(Date.now() - 40 * 60 * 1000) });
check("a correctly signed but stale delivery is refused", stale.status === 404, `status ${stale.status}`);
check("and changed nothing", stageOf() === "QUALIFYING", stageOf());

// ── a real one is applied ──────────────────────────────────────────────────
const move = envelope();
const applied = await deliver(move);
check("a signed delivery is accepted", applied.status === 200, `status ${applied.status}`);
check("and applied", applied.json?.status === "APPLIED", JSON.stringify(applied.json));
check("the deal moved", stageOf() === "NEGOTIATION", stageOf());
check(
  "and the change is in the deal's own history",
  sql(
    `select count(*) from "Activity" where "dealId" = 'din${stamp}' and subject like '%QUALIFYING%NEGOTIATION%'`,
  ) !== "0",
);

/*
 * ── and does not go back out to the system that asked for it ──────────────
 *
 * The check a reviewer does not think of. The outbound half sends every stage
 * change; an inbound change that emits is two servers each telling the other
 * about a change the other one made, forever.
 */
check(
  "an inbound change is not echoed back to the CRM",
  sql(`select count(*) from "CrmEvent" where "entityId" = '${reference}'`) === "0",
  sql(`select count(*) from "CrmEvent" where "entityId" = '${reference}'`),
);

// ── the same event twice is applied once ───────────────────────────────────
sql(`update "Deal" set stage = 'QUALIFYING' where reference = '${reference}'`);
const repeat = await deliver(move);
check("a repeated delivery is accepted", repeat.status === 200, `status ${repeat.status}`);
check("and reported as a duplicate", repeat.json?.duplicate === true, JSON.stringify(repeat.json));
check(
  "and did not apply a second time",
  stageOf() === "QUALIFYING",
  `${stageOf()} — the retry re-applied a change somebody had undone`,
);

// ── an event older than the state it describes loses ───────────────────────
sql(
  `update "Deal" set stage = 'WON', "stageChangedAt" = now() where reference = '${reference}'`,
);
const late = await deliver(
  envelope({ occurredAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() }),
);
check("a late delivery is accepted", late.status === 200, `status ${late.status}`);
check("and ignored rather than applied", late.json?.status === "IGNORED", JSON.stringify(late.json));
check("the newer decision stands", stageOf() === "WON", stageOf());
check(
  "and the reason is recorded for somebody to read",
  /older than the change recorded here/i.test(late.json?.detail ?? ""),
  late.json?.detail,
);

// ── money is refused, and said so ──────────────────────────────────────────
sql(
  `update "Deal" set stage = 'QUALIFYING', "stageChangedAt" = now() - interval '1 hour', "expectedValueMinor" = 5000000 where reference = '${reference}'`,
);
const withValue = await deliver(
  envelope({ data: { to: "QUOTED", expectedValueMinor: 99900000 } }),
);
check("a delivery carrying a value is accepted", withValue.json?.status === "APPLIED", JSON.stringify(withValue.json));
check("its stage is applied", stageOf() === "QUOTED", stageOf());
check(
  "its value is not",
  sql(`select "expectedValueMinor" from "Deal" where reference = '${reference}'`) === "5000000",
  sql(`select "expectedValueMinor" from "Deal" where reference = '${reference}'`),
);
check(
  "and the sender is told, rather than left believing it landed",
  /value/i.test(withValue.json?.detail ?? ""),
  withValue.json?.detail,
);

// ── a deal cannot be created from outside ──────────────────────────────────
const created = await deliver(
  envelope({ kind: "deal.created", entity: { type: "Deal", id: `DEAL-IN-NEW-${stamp}` } }),
);
check("deal.created is refused", created.json?.status === "REFUSED", JSON.stringify(created.json));
check(
  "and no deal was invented",
  sql(`select count(*) from "Deal" where reference = 'DEAL-IN-NEW-${stamp}'`) === "0",
);

// ── an unknown deal is refused, not silently dropped ───────────────────────
const unknown = await deliver(envelope({ entity: { type: "Deal", id: `DEAL-IN-GONE-${stamp}` } }));
check("an event for an unknown deal is refused", unknown.json?.status === "REFUSED", JSON.stringify(unknown.json));
check(
  "and it is visible afterwards rather than lost",
  sql(`select count(*) from "CrmInboundEvent" where "entityId" = 'DEAL-IN-GONE-${stamp}'`) === "1",
);

// ── a loss still needs a reason ────────────────────────────────────────────
sql(`update "Deal" set stage = 'NEGOTIATION', "stageChangedAt" = now() - interval '1 hour' where reference = '${reference}'`);
const lost = await deliver(envelope({ kind: "deal.lost", data: {} }));
check("a loss with no reason is refused", lost.json?.status === "REFUSED", JSON.stringify(lost.json));
check("and the deal did not close", stageOf() === "NEGOTIATION", stageOf());

const lostProperly = await deliver(
  envelope({ kind: "deal.lost", data: { lostReason: "Went to the incumbent." } }),
);
check("a loss with a reason is applied", lostProperly.json?.status === "APPLIED", JSON.stringify(lostProperly.json));
check("and the reason is stored", sql(`select "lostReason" from "Deal" where reference = '${reference}'`) === "Went to the incumbent.");

// ── an activity arrives as an activity ─────────────────────────────────────
const note = await deliver(
  envelope({ kind: "activity.logged", data: { subject: `Called them back ${stamp}`, body: "They will confirm on Monday." } }),
);
check("an activity is applied", note.json?.status === "APPLIED", JSON.stringify(note.json));
check(
  "and appears on the deal",
  sql(
    `select count(*) from "Activity" where "dealId" = 'din${stamp}' and subject = 'Called them back ${stamp}'`,
  ) === "1",
);
check(
  "attributed to nobody here, because nobody here did it",
  sql(
    `select coalesce("userId",'(null)') from "Activity" where subject = 'Called them back ${stamp}'`,
  ) === "(null)",
);

// ── switching receiving off closes the door ────────────────────────────────
sql(`update "CrmSettings" set "inboundEnabled" = false where id = 'singleton'`);
const closed = await deliver(envelope({ data: { to: "NEW" } }));
check("with receiving off, a valid delivery is refused", closed.status === 404, `status ${closed.status}`);

await browser.close();

// ── clean up ───────────────────────────────────────────────────────────────
const [priorInbound, priorEnabled] = priorSecret.split("|");
sql(
  `update "CrmSettings" set "inboundSecret" = ${priorInbound ? `'${priorInbound}'` : "null"}, "inboundEnabled" = ${priorEnabled === "true" ? "true" : "false"} where id = 'singleton'`,
);
sql(`delete from "CrmInboundEvent" where "entityId" like 'DEAL-IN-%'`);
sql(`delete from "Activity" where "dealId" = 'din${stamp}'`);
sql(`delete from "AuditLog" where "entityId" like 'DEAL-IN-%'`);
sql(`delete from "CrmEvent" where "entityId" like 'DEAL-IN-%'`);
sql(`delete from "Deal" where reference like 'DEAL-IN-%'`);
rmSync(scratch, { force: true });

const failed = results.filter((result) => !result.ok).length;
console.log(`\n${results.length - failed}/${results.length} CRM inbound checks passed`);
process.exit(failed ? 1 : 0);
