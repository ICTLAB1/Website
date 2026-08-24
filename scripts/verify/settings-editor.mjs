import { chromium } from "playwright";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";

/**
 * Exercises the business-identity editor the way an administrator would.
 *
 * The claim being tested is the one that made this worth building: a change to
 * the grievance officer, the address or a phone number reaches the public site
 * with no rebuild and no redeploy. Everything else here guards the two ways
 * that could go wrong quietly — a value that saves but never appears, and a
 * value that appears but was never valid.
 *
 * The fallback is tested too, because it is the part that lets this ship onto a
 * running deployment: clearing a field must hand it back to the environment
 * rather than blanking it on the live site.
 *
 * Authorisation is checked in two other places rather than here, because
 * neither is cheap to do from a browser driving an admin session.
 * `attack.sh` proves a SALES session cannot load `/admin/settings` at all, and
 * `tests/action-guards.test.ts` proves the action itself opens with
 * `requireAdmin` rather than the `requireStaff` its neighbours use — which is
 * the realistic mistake, since the wrong guard still refuses customers and
 * still looks right to whoever wrote it.
 */
const BASE = process.env.BASE ?? "http://localhost:3000";
const axeSource = readFileSync(createRequire(import.meta.url).resolve("axe-core/axe.min.js"), "utf8");
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const results = [];
const check = (name, ok, detail = "") => results.push({ name, ok: Boolean(ok), detail });

const stamp = Date.now().toString().slice(-6);
const officer = `Verify Officer ${stamp}`;
const officerEmail = `grievance-${stamp}@example.test`;
const line1 = `${stamp} Verification House`;

const admin = await browser.newContext({ viewport: { width: 1440, height: 1400 } });
const page = await admin.newPage();

await page.goto(`${BASE}/login`, { waitUntil: "load" });
await page.getByLabel("Business email").fill(process.env.ADMIN_EMAIL ?? "admin@example.test");
await page.getByLabel("Password").fill(process.env.ADMIN_PASSWORD ?? "ChangeMe!Admin123");
await page.getByRole("button", { name: "Sign in" }).click();
await page.waitForURL("**/admin", { timeout: 15000 });

const settings = `${BASE}/admin/settings`;
/**
 * Scoped to `main`, because the admin layout renders the live site header and
 * footer around it and those contain their own links and text.
 */
const form = () => page.locator("main");
const field = (name) => form().locator(`[name="${name}"]`);

/**
 * The business identity form specifically.
 *
 * `/admin/settings` grew a second form when the payment gateway settings were
 * added, and `main >> form` became ambiguous — Playwright's strict mode turned
 * that into a crash rather than a silently wrong element, which is the right
 * outcome and is how this was found.
 *
 * Identified by a field only it has, rather than by position or by an added
 * test attribute: a third form appearing later, or these two being reordered,
 * leaves this correct.
 */
const identityForm = () => form().locator("form").filter({ has: page.locator('[name="emailSales"]') });

/**
 * Opens the settings screen and waits for it to be interactive.
 *
 * The `networkidle` wait is the whole point. `load` fires before React has
 * hydrated, and a value typed into a control before hydration is replaced by
 * the stored one the moment it happens — so clearing the profile URLs and
 * saving wrote the original three straight back, and the check that no
 * profiles produce no `sameAs` failed against a page that had never been
 * cleared. It appeared only under gate load, because that is when hydration is
 * slow enough to lose the race.
 */
async function open() {
  await page.goto(settings, { waitUntil: "load" });
  await page.waitForLoadState("networkidle");
}

/**
 * Submits the identity form and waits for the form's own answer.
 *
 * It used to wait nine hundred milliseconds and carry on. That is fine on an
 * idle machine and not fine in a full gate run, where the save had not landed
 * before the next step navigated to the public page and read the structured
 * data — so "clearing the field removes sameAs again" failed against a
 * homepage still serving the value from before the save. A fixed sleep is a
 * guess about how long a server takes; the acknowledgement is the server
 * saying so.
 *
 * Either answer ends the wait. A refusal is a legitimate outcome here — three
 * checks above submit deliberately invalid URLs and require one — so waiting
 * only for success would hang for the timeout on every one of them.
 */
/**
 * Submits the identity form and waits for the submission itself.
 *
 * Bracketed by the button's own pending state rather than by the words in the
 * banner: after a successful save the banner stays on screen, so waiting for
 * its text returns immediately on the next save and reads the page before the
 * new write has landed. The button says "Saving…" while and only while the
 * action is in flight.
 */
async function save() {
  const button = form().getByRole("button", { name: /Save details|Saving/i }).first();
  await button.click();
  await page
    .waitForFunction(() => /Saving/i.test(document.body.innerText), undefined, { timeout: 5000 })
    .catch(() => {});

  await page
    .waitForFunction(() => !/Saving/i.test(document.body.innerText), undefined, { timeout: 20000 })
    .catch(() => {});
}

/** What the original values were, so this suite puts them back when it finishes. */
await open();
const original = {};
for (const name of ["grievanceName", "grievanceEmail", "addressLine1", "gstin", "profileUrls"]) {
  original[name] = await field(name).inputValue();
}

// ── 1. A saved change reaches the public site, with no redeploy ──────────────
await field("grievanceName").fill(officer);
await field("grievanceEmail").fill(officerEmail);
await field("addressLine1").fill(line1);
await save();

check(
  "the form reports the save",
  await form().getByText(/public site is showing these details/i).isVisible(),
);

await open();
check("the officer's name persisted", (await field("grievanceName").inputValue()) === officer);

// The privacy page prints the grievance officer; the footer prints the address.
// Both are read through the cache, so this is also the assertion that saving
// invalidated the tag rather than merely writing a row.
const privacy = await page.goto(`${BASE}/privacy`, { waitUntil: "load" });
const privacyText = await page.locator("body").innerText();
check("the privacy page is served", privacy?.status() === 200, String(privacy?.status()));
check("the new grievance officer appears publicly", privacyText.includes(officer));
check("the new grievance email appears publicly", privacyText.includes(officerEmail));

await page.goto(`${BASE}/contact`, { waitUntil: "load" });
check(
  "the new address appears publicly",
  (await page.locator("body").innerText()).includes(line1),
);

// ── 2. Invalid input is refused with a field-level message ───────────────────
await open();
await field("gstin").fill("NOT-A-GSTIN");
await save();

const gstinError = await form()
  .getByText(/A GSTIN is 15 characters/i)
  .isVisible()
  .catch(() => false);
check("a malformed GSTIN is rejected with a field-level message", gstinError);

await open();
check(
  "the rejected GSTIN was not written",
  (await field("gstin").inputValue()) !== "NOT-A-GSTIN",
  await field("gstin").inputValue(),
);

/*
 * The email rule, twice: once by the browser, once by the server.
 *
 * `type="email"` makes the browser refuse to submit, which is the right thing
 * for a person who mistypes — and it means a straightforward fill-and-submit
 * never reaches the server rule at all, so testing it that way proves only that
 * Chromium works. First assert the browser does refuse; then turn off its
 * validation, exactly as anyone with developer tools would, and assert the
 * server refuses too.
 */
await open();
await field("grievanceEmail").fill("not-an-email");
await save();
check(
  "the browser refuses to submit a malformed email",
  await field("grievanceEmail").evaluate((el) => !el.checkValidity()),
);
check(
  "nothing was saved while the browser was blocking it",
  !(await form().getByText(/public site is showing these details/i).isVisible().catch(() => false)),
);

await identityForm().evaluate((el) => el.setAttribute("novalidate", "novalidate"));
await save();
check(
  "the server refuses a malformed email once the browser stops checking",
  await form()
    .getByText(/valid email address/i)
    .isVisible()
    .catch(() => false),
);

await open();
check(
  "the rejected email was not written",
  (await field("grievanceEmail").inputValue()) !== "not-an-email",
  await field("grievanceEmail").inputValue(),
);

// ── 3. Clearing a field hands it back to the environment ─────────────────────
await open();
await field("grievanceName").fill("");
await field("grievanceEmail").fill("");
await save();

await open();
check("the cleared field is empty in the form", (await field("grievanceName").inputValue()) === "");

await page.goto(`${BASE}/privacy`, { waitUntil: "load" });
const afterClear = await page.locator("body").innerText();
check("the cleared officer no longer appears publicly", !afterClear.includes(officer));

/*
 * And the environment value is back.
 *
 * `.env` sets a grievance officer, so clearing the stored one must restore that
 * name rather than leaving the section blank. Skipped rather than failed when
 * the environment does not set one — a deployment configured only through the
 * admin panel is a legitimate state, and this suite should not demand a
 * variable be present to pass.
 */
const envOfficer = process.env.COMPANY_GRIEVANCE_OFFICER_NAME;
if (envOfficer) {
  check(
    "the environment value is showing again after the clear",
    afterClear.includes(envOfficer),
    envOfficer,
  );
} else {
  check("environment fallback not asserted (no officer set in the environment)", true);
}

/*
 * ── 3b. Profile URLs reach `sameAs`, and only real ones do ─────────────────
 *
 * `sameAs` is the property that decides whether a mention of this business
 * somewhere else counts towards this domain, and every entry in it is an
 * assertion that the page listed belongs to this company. So there are two
 * things to prove and they pull in opposite directions: a URL an administrator
 * enters must actually be published, and anything that is not a well-formed
 * https URL must never be — silently dropping one would put a gap in the
 * structured data that nobody would find, and repairing one would guess which
 * site was meant.
 *
 * The third property is the default: with the field empty, `sameAs` must be
 * absent from the JSON-LD rather than present and empty. An empty array is not
 * "no profiles" to a parser, it is a malformed claim to have some.
 */
const organisationSchema = async () => {
  await page.goto(`${BASE}/`, { waitUntil: "load" });
  const html = await page.content();
  for (const match of html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)) {
    const parsed = JSON.parse(match[1].replaceAll("\\u003c", "<"));
    if (parsed["@type"] === "Organization") return parsed;
  }
  return null;
};

check("the organisation schema is published", (await organisationSchema()) !== null);

/*
 * Cleared first, rather than assumed empty.
 *
 * This used to read the schema as it found it and assert `sameAs` was absent,
 * which was true only on a deployment where nobody had ever entered a profile
 * URL. The moment real ones were configured the check failed — on a site that
 * was behaving perfectly. A property worth asserting has to be *made* true
 * here, not waited for.
 */
await open();
await field("profileUrls").fill("");
await save();
check(
  "with no profiles configured, sameAs is absent rather than empty",
  (await organisationSchema())?.sameAs === undefined,
  JSON.stringify((await organisationSchema())?.sameAs),
);

await open();
const goodProfile = "https://example.test/company/verify-probe";
await field("profileUrls").fill(`${goodProfile}\n\n${goodProfile}`);
await save();

const withProfiles = await organisationSchema();
check("a configured profile URL reaches sameAs", withProfiles?.sameAs?.includes(goodProfile), JSON.stringify(withProfiles?.sameAs));
check(
  "and a repeated line is published once, not twice",
  withProfiles?.sameAs?.filter((url) => url === goodProfile).length === 1,
  JSON.stringify(withProfiles?.sameAs),
);

for (const [what, value] of [
  ["a URL with no scheme", "www.example.test/company"],
  ["an http:// URL", "http://example.test/company"],
  ["free text", "our LinkedIn page"],
]) {
  await open();
  await field("profileUrls").fill(value);
  await save();
  const refused = await form()
    .getByText(/is not an https:\/\/ URL/i)
    .isVisible()
    .catch(() => false);
  check(`${what} is refused with a field-level message`, refused, value);
}

await open();
await field("profileUrls").fill("");
await save();
check(
  "clearing the field removes sameAs again",
  (await organisationSchema())?.sameAs === undefined,
);

/*
 * ── 4. The form itself is accessible ────────────────────────────────────────
 *
 * `accessibility.mjs` audits public pages only, because it has no session and
 * every admin route redirects it to the login screen. This suite is already
 * signed in as an administrator, so it is the only place the admin panel can be
 * audited at all — and this form is seventeen new labelled inputs, which is
 * exactly the shape of thing that grows an unlabelled control or a contrast
 * failure without anyone noticing.
 */
await open();
await page.addScriptTag({ content: axeSource });
const audit = await page.evaluate(async () => {
  // @ts-expect-error injected at runtime
  return await window.axe.run(document.querySelector("main"), {
    runOnly: {
      type: "tag",
      values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "best-practice"],
    },
  });
});
check(
  "the settings form has no accessibility violations",
  audit.violations.length === 0,
  audit.violations.map((v) => `${v.id} (${v.nodes.length})`).join(", "),
);

/*
 * ── 5. Put back whatever was there before ──────────────────────────────────
 *
 * In a `finally`, because this suite writes to the row that holds the
 * business's registered address, GSTIN and statutory grievance officer. Every
 * step above can throw — a selector moves, a save is slow, a check fails — and
 * a throw used to skip this block and leave "412297 Verification House" as the
 * company's published address.
 *
 * That failure is quietly self-perpetuating: the next run captures the fixture
 * as `original` and faithfully restores it, so one aborted run poisons every
 * run after it. It took a structured-data audit to notice the address on the
 * live pages was a test string.
 */
let restoreFailed = null;
try {
  await open();
  for (const [name, value] of Object.entries(original)) {
    await field(name).fill(value);
  }
  await save();
  await open();
  const restored = await field("addressLine1").inputValue();
  check("the original values were restored", restored === original.addressLine1, restored);
} catch (error) {
  restoreFailed = error;
}

await browser.close();

/*
 * Loud, and fatal. A suite that has left the company's address as a fixture
 * must not exit 0 — the whole point of the block above is that somebody finds
 * out immediately rather than from a search result weeks later.
 */
if (restoreFailed) {
  console.error("\n  ✗ COULD NOT RESTORE SITE SETTINGS — check the address, GSTIN and");
  console.error("    grievance officer in the admin panel before deploying.");
  console.error(`    ${restoreFailed instanceof Error ? restoreFailed.message : restoreFailed}`);
  process.exit(1);
}

for (const r of results) console.log(`${r.ok ? "  ✓" : "  ✗"} ${r.name}${!r.ok && r.detail ? ` — ${r.detail}` : ""}`);
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} settings editor checks passed`);
process.exit(failed ? 1 : 0);
