import { chromium } from "playwright";
import { execFileSync } from "node:child_process";
import { createHmac } from "node:crypto";

/**
 * Taking a card payment, end to end, against the running site.
 *
 * The gateway itself is never called. That is deliberate rather than a
 * shortcut: what needs proving here is not that Razorpay works, but that this
 * system believes exactly the right things about what Razorpay tells it — that
 * a correctly signed message is honoured, an incorrectly signed one is not, the
 * same capture reported twice produces one payment, and an amount that
 * disagrees with the order is refused rather than reconciled. All four are
 * decided by code in this repository, and all four fail silently if they are
 * wrong.
 *
 * So the suite plays the gateway's part: it sets a known key secret through the
 * admin panel, then signs messages with it exactly as Razorpay would, and
 * checks what the database looks like afterwards.
 *
 *   npm run verify:payments
 */

const BASE = process.env.BASE ?? "http://localhost:3000";
const DB = process.env.VERIFY_DB ?? "ictlab";

const results = [];
const check = (name, ok, detail = "") => results.push({ name, ok: Boolean(ok), detail });

const stamp = Date.now().toString().slice(-9);
const KEY_ID = `rzp_test_${stamp}ab`;
const KEY_SECRET = `verify_key_secret_${stamp}`;
const WEBHOOK_SECRET = `verify_webhook_secret_${stamp}`;

const ORDER_REF = `ORD-2026-V${stamp.slice(-5)}`.slice(0, 15).toUpperCase();
const ORDER_ID = `verify_order_${stamp}`;
const TOTAL_MINOR = 9_000_000; // ₹90,000

function sql(statement) {
  /*
   * Collapsed to a single line before it goes anywhere near psql.
   *
   * `psql -c` treats a leading backslash as a meta-command, and a multi-line
   * statement arrives here with its newlines escaped as literal `\n` by the
   * quoting below — which psql then reads as the meta-command `\n` and refuses.
   * The statements are written across several lines because they are easier to
   * read that way; this is where that convenience is paid for.
   */
  const oneLine = statement.replace(/\s+/g, " ").trim();
  return execFileSync("su", ["postgres", "-c", `psql -tA -d ${DB} -c ${JSON.stringify(oneLine)}`])
    .toString()
    .trim();
}

const sign = (secret, payload) => createHmac("sha256", secret).update(payload).digest("hex");

/** The three values Razorpay Checkout hands the page on success. */
function checkoutPayload(providerOrderId, providerPaymentId, secret = KEY_SECRET) {
  return {
    razorpay_order_id: providerOrderId,
    razorpay_payment_id: providerPaymentId,
    razorpay_signature: sign(secret, `${providerOrderId}|${providerPaymentId}`),
  };
}

async function postJson(path, body) {
  const response = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return { status: response.status, body: await response.json().catch(() => null) };
}

/** A webhook call, signed over the exact bytes sent — as Razorpay signs it. */
async function postWebhook(event, secret = WEBHOOK_SECRET, mangle = (raw) => raw) {
  const raw = JSON.stringify(event);
  const response = await fetch(`${BASE}/api/payments/webhook`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-razorpay-signature": sign(secret, raw),
    },
    body: mangle(raw),
  });
  return response.status;
}

const capturedEvent = (providerOrderId, providerPaymentId, amount) => ({
  event: "payment.captured",
  payload: {
    payment: {
      entity: { id: providerPaymentId, order_id: providerOrderId, amount, method: "card" },
    },
  },
});

// ── Set known credentials through the admin panel ────────────────────────────
//
// Through the real form rather than by writing the database, so the encryption
// path is the one the suite depends on. If the admin form ever stopped storing
// a usable secret, every signature check below would fail and say so.
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const context = await browser.newContext({ viewport: { width: 1440, height: 1400 } });
const page = await context.newPage();

await page.goto(`${BASE}/login`, { waitUntil: "load" });
await page.getByLabel("Business email").fill(process.env.ADMIN_EMAIL ?? "admin@example.test");
await page.getByLabel("Password").fill(process.env.ADMIN_PASSWORD ?? "ChangeMe!Admin123");
await page.getByRole("button", { name: "Sign in" }).click();
await page.waitForURL("**/admin", { timeout: 20000 });

async function savePaymentSettings({ enabled }) {
  await page.goto(`${BASE}/admin/settings`, { waitUntil: "load" });
  const main = page.locator("main");
  await main.locator('[name="razorpayKeyId"]').fill(KEY_ID);
  await main.locator('[name="razorpayKeySecret"]').fill(KEY_SECRET);
  await main.locator('[name="razorpayWebhookSecret"]').fill(WEBHOOK_SECRET);
  await main.locator('select[name="mode"]').selectOption("TEST");
  if (enabled) await main.locator('[name="enabled"]').check();
  else await main.locator('[name="enabled"]').uncheck();
  await main.getByRole("button", { name: /Save payment settings/i }).click();
  await page.waitForTimeout(1200);
}

await savePaymentSettings({ enabled: true });
check(
  "test credentials saved and payments switched on",
  await page
    .locator("main")
    .getByText(/Card payments are on in TEST mode/i)
    .isVisible()
    .catch(() => false),
);

// ── A scratch order and one payment attempt against it ───────────────────────
//
// Written directly, because the gateway leg of creating one cannot be reached
// from here. Everything the suite actually tests happens after this point.
function seedOrder() {
  sql(`
    insert into "Order" (id, reference, status, currency, "subtotalMinor", "discountMinor",
                         "taxMinor", "totalMinor", "billingName", "billingEmail",
                         "placedAt", "createdAt", "updatedAt")
    values ('${ORDER_ID}', '${ORDER_REF}', 'PENDING', 'INR', ${TOTAL_MINOR}, 0, 0, ${TOTAL_MINOR},
            'Verification Buyer', 'verify@example.test', now(), now(), now())
    on conflict (id) do nothing
  `);
}

function seedAttempt(id, providerOrderId, amountMinor = TOTAL_MINOR) {
  sql(`
    insert into "Payment" (id, "orderId", provider, "providerOrderId", status,
                           "amountMinor", currency, mode, "createdAt", "updatedAt")
    values ('${id}', '${ORDER_ID}', 'razorpay', '${providerOrderId}', 'CREATED',
            ${amountMinor}, 'INR', 'TEST', now(), now())
    on conflict (id) do nothing
  `);
}

const orderStatus = () => sql(`select status from "Order" where id='${ORDER_ID}'`);
const attempt = (providerOrderId) =>
  sql(
    `select status || '|' || coalesce("providerPaymentId",'') || '|' ||
            case when "capturedAt" is null then 'never' else 'captured' end
       from "Payment" where "providerOrderId"='${providerOrderId}'`,
  );
const captureCount = () =>
  Number(sql(`select count(*) from "Payment" where "orderId"='${ORDER_ID}' and status='CAPTURED'`));

seedOrder();
seedAttempt("verify_pay_a", "order_verify_a");

// ── 1. A forged signature is refused ─────────────────────────────────────────
const forged = await postJson(
  "/api/payments/verify",
  checkoutPayload("order_verify_a", "pay_forged", "not-the-real-key-secret"),
);
check("a payment signed with the wrong secret is refused", forged.status === 403, `status=${forged.status}`);
check(
  "the refused payment changed nothing",
  attempt("order_verify_a") === "CREATED||never" && orderStatus() === "PENDING",
  attempt("order_verify_a"),
);

// ── 2. A genuine signature is honoured ───────────────────────────────────────
const genuine = await postJson(
  "/api/payments/verify",
  checkoutPayload("order_verify_a", "pay_verify_a"),
);
check("a correctly signed payment is accepted", genuine.status === 200, `status=${genuine.status}`);
check(
  "the payment is recorded as captured",
  attempt("order_verify_a") === "CAPTURED|pay_verify_a|captured",
  attempt("order_verify_a"),
);
check("the order moves to CONFIRMED", orderStatus() === "CONFIRMED", orderStatus());

// ── 3. Reporting the same capture again is a no-op ───────────────────────────
//
// The normal case, not an edge case: Razorpay reports every success twice, to
// the browser and to the webhook, in no guaranteed order.
const capturedAtBefore = sql(`select "capturedAt" from "Payment" where id='verify_pay_a'`);
const replay = await postJson(
  "/api/payments/verify",
  checkoutPayload("order_verify_a", "pay_verify_a"),
);
check("replaying the same capture is accepted, not an error", replay.status === 200, `status=${replay.status}`);
check("replaying it does not create a second capture", captureCount() === 1, `count=${captureCount()}`);
check(
  "replaying it does not move the capture time",
  sql(`select "capturedAt" from "Payment" where id='verify_pay_a'`) === capturedAtBefore,
);

// ── 4. The webhook, arriving second ──────────────────────────────────────────
const hookSame = await postWebhook(capturedEvent("order_verify_a", "pay_verify_a", TOTAL_MINOR));
check("a webhook for an already-captured payment is accepted", hookSame === 200, `status=${hookSame}`);
check("it still leaves exactly one capture", captureCount() === 1, `count=${captureCount()}`);

// ── 5. An unsigned or wrongly signed webhook ─────────────────────────────────
seedAttempt("verify_pay_b", "order_verify_b");

const hookWrongSecret = await postWebhook(
  capturedEvent("order_verify_b", "pay_verify_b", TOTAL_MINOR),
  "not-the-webhook-secret",
);
check("a webhook signed with the wrong secret is refused", hookWrongSecret === 400, `status=${hookWrongSecret}`);

const unsigned = await fetch(`${BASE}/api/payments/webhook`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify(capturedEvent("order_verify_b", "pay_verify_b", TOTAL_MINOR)),
});
check("a webhook with no signature at all is refused", unsigned.status === 400, `status=${unsigned.status}`);

// Signed correctly, then the body altered in flight — what a signature exists
// to catch.
const tampered = await postWebhook(
  capturedEvent("order_verify_b", "pay_verify_b", TOTAL_MINOR),
  WEBHOOK_SECRET,
  (raw) => raw.replace('"method":"card"', '"method":"upi"'),
);
check("a webhook altered after signing is refused", tampered === 400, `status=${tampered}`);

check(
  "none of the refused webhooks captured anything",
  attempt("order_verify_b") === "CREATED||never",
  attempt("order_verify_b"),
);

// ── 6. A genuine webhook captures on its own ─────────────────────────────────
//
// The case the whole endpoint exists for: the customer closed the tab and the
// browser never reported anything.
const hookGenuine = await postWebhook(capturedEvent("order_verify_b", "pay_verify_b", TOTAL_MINOR));
check("a correctly signed webhook captures the payment", hookGenuine === 200, `status=${hookGenuine}`);
check(
  "the webhook-captured payment is recorded",
  attempt("order_verify_b") === "CAPTURED|pay_verify_b|captured",
  attempt("order_verify_b"),
);

// ── 7. An amount that disagrees with the order ───────────────────────────────
seedAttempt("verify_pay_c", "order_verify_c");

const underpaid = await postWebhook(capturedEvent("order_verify_c", "pay_verify_c", 100));
check("a webhook reporting a smaller amount is not retried", underpaid === 200, `status=${underpaid}`);
check(
  "a payment for the wrong amount is NOT recorded as captured",
  attempt("order_verify_c") === "CREATED||never",
  attempt("order_verify_c"),
);

// ── 8. Card payments disappear when switched off ─────────────────────────────
await savePaymentSettings({ enabled: false });

seedAttempt("verify_pay_d", "order_verify_d");
const whileOff = await postJson(
  "/api/payments/verify",
  checkoutPayload("order_verify_d", "pay_verify_d"),
);
check(
  "a payment cannot be confirmed while the gateway is switched off",
  whileOff.status !== 200,
  `status=${whileOff.status}`,
);

const hookWhileOff = await postWebhook(capturedEvent("order_verify_d", "pay_verify_d", TOTAL_MINOR));
check(
  "a webhook is refused while the gateway is switched off, and retriable",
  hookWhileOff === 503,
  `status=${hookWhileOff}`,
);
check(
  "nothing was captured while switched off",
  attempt("order_verify_d") === "CREATED||never",
  attempt("order_verify_d"),
);

// ── 9. Nothing secret reaches a browser ──────────────────────────────────────
await savePaymentSettings({ enabled: true });

/*
 * Asked of the catalogue rather than hard-coded.
 *
 * A SKU written into this file is correct until somebody renames a product,
 * after which the suite fails with "the checkout page loads: false" and sends
 * whoever is reading it hunting for a payments bug that does not exist.
 */
const sku =
  process.env.VERIFY_SKU ??
  sql(`
    select v.sku from "ProductVariant" v
    join "Product" p on p.id = v."productId"
    where p."purchaseMode"::text in ('DIRECT','BOTH')
      and p.status::text = 'ACTIVE'
      and v."listPriceMinor" > 0
      and v."deletedAt" is null and p."deletedAt" is null
    order by v.sku limit 1
  `);

const buyPage = await page.goto(`${BASE}/buy?sku=${encodeURIComponent(sku)}`, { waitUntil: "load" });
const html = buyPage && buyPage.ok() ? await page.content() : "";

check("the checkout page loads", Boolean(html), `sku=${sku}`);
check("the key secret is not in the checkout page", !html.includes(KEY_SECRET));
check("the webhook secret is not in the checkout page", !html.includes(WEBHOOK_SECRET));
check(
  "the card payment option is offered when the gateway is on",
  html.includes("Pay now by card"),
);
check(
  "the invoice route is still offered alongside it",
  html.includes("Invoice me"),
  "the purchase-order route must never be removed",
);

// ── Clean up ─────────────────────────────────────────────────────────────────
sql(`delete from "Payment" where "orderId"='${ORDER_ID}'`);
sql(`delete from "Order" where id='${ORDER_ID}'`);

// Leave the gateway off and the credentials cleared, which is how it was found.
await page.goto(`${BASE}/admin/settings`, { waitUntil: "load" });
const main = page.locator("main");
await main.locator('[name="enabled"]').uncheck();
await main.locator('[name="razorpayKeyId"]').fill("");
const clearKey = main.locator('[name="clearKeySecret"]');
if (await clearKey.count()) await clearKey.check();
const clearHook = main.locator('[name="clearWebhookSecret"]');
if (await clearHook.count()) await clearHook.check();
await main.getByRole("button", { name: /Save payment settings/i }).click();
await page.waitForTimeout(1000);

await browser.close();

for (const r of results) {
  console.log(`${r.ok ? "  ✓" : "  ✗"} ${r.name}${!r.ok && r.detail ? ` — ${r.detail}` : ""}`);
}
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} payment checks passed`);
process.exit(failed ? 1 : 0);
