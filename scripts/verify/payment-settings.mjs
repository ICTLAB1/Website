import { chromium } from "playwright";
import { execFileSync } from "node:child_process";

/**
 * The payment credential form, checked for the one thing that would be
 * catastrophic and invisible: a secret reaching a browser.
 *
 * Everything else about this form is ordinary. The reason it gets its own suite
 * is that its failure mode leaves no trace in the interface — a key secret
 * rendered into the page source looks exactly like a key secret that was not,
 * unless somebody reads the HTML. So this reads the HTML.
 *
 * The encryption itself is covered by `tests/secret-box.test.ts`. This covers
 * the boundary: what crosses from the server into the page.
 */
const BASE = process.env.BASE ?? "http://localhost:3000";
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const results = [];
const check = (name, ok, detail = "") => results.push({ name, ok: Boolean(ok), detail });

const stamp = Date.now().toString().slice(-8);
const keyId = `rzp_test_${stamp}abcd`;
const keySecret = `verify_secret_${stamp}_zzz`;
const webhookSecret = `verify_hook_${stamp}_yyy`;

const admin = await browser.newContext({ viewport: { width: 1440, height: 1400 } });
const page = await admin.newPage();

await page.goto(`${BASE}/login`, { waitUntil: "load" });
await page.getByLabel("Business email").fill(process.env.ADMIN_EMAIL ?? "admin@example.test");
await page.getByLabel("Password").fill(process.env.ADMIN_PASSWORD ?? "ChangeMe!Admin123");
await page.getByRole("button", { name: "Sign in" }).click();
await page.waitForURL("**/admin", { timeout: 15000 });

const settings = `${BASE}/admin/settings`;
const form = () => page.locator("main");
const field = (name) => form().locator(`[name="${name}"]`);
const open = () => page.goto(settings, { waitUntil: "load" });
async function save() {
  await form().getByRole("button", { name: /Save payment settings/i }).click();
  await page.waitForTimeout(900);
}

// ── 1. Enabling without credentials is refused ──────────────────────────────
await open();
await field("enabled").check();
await save();
check(
  "switching payments on with no keys is refused",
  await form().getByText(/Add both the key id and the key secret/i).isVisible().catch(() => false),
);

// ── 2. A malformed key id is refused ────────────────────────────────────────
await open();
await field("razorpayKeyId").fill("not-a-razorpay-key");
await save();
check(
  "a malformed key id is refused with a field-level message",
  await form().getByText(/A Razorpay key id looks like/i).isVisible().catch(() => false),
);

// ── 3. Saving real-shaped credentials works ─────────────────────────────────
await open();
await field("razorpayKeyId").fill(keyId);
await field("razorpayKeySecret").fill(keySecret);
await field("razorpayWebhookSecret").fill(webhookSecret);
await field("enabled").check();
await save();
check(
  "valid credentials save and switch payments on",
  await form().getByText(/Card payments are on in TEST mode/i).isVisible().catch(() => false),
);

// ── 4. The secrets never reach the browser ──────────────────────────────────
//
// The whole reason this suite exists. Read the raw HTML of the page that is
// most likely to leak — the one whose job is to display these settings.
await open();
const html = await page.content();

check("the key secret is not in the page source", !html.includes(keySecret));
check("the webhook secret is not in the page source", !html.includes(webhookSecret));
check(
  "the secret inputs are empty, not pre-filled",
  (await field("razorpayKeySecret").inputValue()) === "" &&
    (await field("razorpayWebhookSecret").inputValue()) === "",
);
check(
  "the key id IS shown, because it is not a secret",
  (await field("razorpayKeyId").inputValue()) === keyId,
);
check(
  "a masked hint identifies which secret is stored",
  html.includes(keySecret.slice(-4)),
  "the last four characters should appear so an admin can match it against Razorpay",
);

// ── 5. Stored encrypted, not in plain text ──────────────────────────────────
let stored = "";
try {
  stored = execFileSync("su", [
    "postgres",
    "-c",
    `psql -tA -d ictlab -c "select \\"razorpayKeySecret\\" from \\"PaymentSettings\\" where id='singleton'"`,
  ]).toString();
} catch (error) {
  stored = `ERROR ${String(error).slice(0, 80)}`;
}

check("the secret is not stored in plain text", !stored.includes(keySecret), stored.slice(0, 60));
check("the stored value is versioned ciphertext", stored.trim().startsWith("v1."), stored.slice(0, 20));

// ── 6. A blank field leaves the stored secret alone ─────────────────────────
//
// The form cannot show what is saved, so a blank box is its normal state.
// Treating that as "delete" would wipe the keys every time somebody toggled
// Test to Live.
await open();
await page.locator('select[name="mode"]').selectOption("LIVE");
await save();
await open();
check(
  "changing the mode does not wipe the stored secret",
  await form().getByText(new RegExp(keySecret.slice(-4))).isVisible().catch(() => false),
);
check(
  "the mode change took effect",
  (await page.locator('select[name="mode"]').inputValue()) === "LIVE",
);

// ── 7. Clearing is explicit, and works ──────────────────────────────────────
await open();
await field("enabled").uncheck();
await field("clearKeySecret").check();
await save();
await open();
check(
  "the explicit clear removes the secret",
  !(await form().getByText(new RegExp(keySecret.slice(-4))).isVisible().catch(() => false)),
);

// ── Leave payments off, which is how they were found ────────────────────────
await open();
await field("enabled").uncheck();
await field("clearWebhookSecret").check();
await page.locator('select[name="mode"]').selectOption("TEST");
await save();

await browser.close();

for (const r of results) console.log(`${r.ok ? "  ✓" : "  ✗"} ${r.name}${!r.ok && r.detail ? ` — ${r.detail}` : ""}`);
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} payment settings checks passed`);
process.exit(failed ? 1 : 0);
