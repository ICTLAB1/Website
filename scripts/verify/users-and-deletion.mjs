import { chromium } from "playwright";

/**
 * Creating accounts, and removing records.
 *
 * Two surfaces that did not exist before and that a mistake in is expensive in
 * opposite directions: one hands out access, the other destroys data. The
 * checks below care less about the happy path than about the refusals — an
 * account created without an invitation, a delete that runs on a mistyped
 * reference, or a SALES user reaching either, are the failures worth catching.
 */

const BASE = process.env.BASE ?? "http://localhost:3000";
const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? "admin@example.test";
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? "ChangeMe!Admin123";

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const results = [];
const check = (name, ok, detail = "") => results.push({ name, ok: Boolean(ok), detail });
const text = async (page) => (await page.locator("body").innerText()).replace(/\s+/g, " ");

async function signIn(email, password) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1200 } });
  const page = await context.newPage();
  await page.goto(`${BASE}/login`, { waitUntil: "load" });
  await page.getByLabel("Business email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL("**/admin", { timeout: 20000 });
  return page;
}

const admin = await signIn(ADMIN_EMAIL, ADMIN_PASSWORD);
const stamp = Date.now().toString().slice(-8);
const salesEmail = `verify.sales.${stamp}@example.test`;

// ───────────────────────────────────────────────── creating a user
await admin.goto(`${BASE}/admin/users`, { waitUntil: "load" });

const createForm = admin.locator("section", { hasText: "Add a user" }).locator("form");
await createForm.getByLabel("Full name").fill(`Verify Sales ${stamp}`);
await createForm.getByLabel("Email address").fill(salesEmail);
await createForm.getByLabel("Role").selectOption("SALES");
await createForm.getByRole("button", { name: /Create and invite/i }).click();
await admin.waitForTimeout(2500);

const afterCreate = await text(admin);
/*
 * Mail is not configured in this environment, so the expected outcome is the
 * account existing and the panel handing back the set-up link rather than
 * pretending an email went out. Both readings count as created.
 */
check(
  "creating a user reports either delivery or the fallback link",
  /has been added as/.test(afterCreate) || /could not be sent/.test(afterCreate),
  afterCreate.slice(0, 200),
);

await admin.goto(`${BASE}/admin/users`, { waitUntil: "load" });
const listed = await text(admin);
check("the new user appears in the staff list", listed.includes(salesEmail));
check("the new user has never signed in", listed.includes("Not yet"));

// ───────────────────────────────── the account cannot be signed in to yet
{
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(`${BASE}/login`, { waitUntil: "load" });
  await page.getByLabel("Business email").fill(salesEmail);
  // The password the account was created with is 32 random bytes nobody holds.
  await page.getByLabel("Password").fill("ChangeMe!Admin123");
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForTimeout(2500);
  check(
    "a created account cannot be signed in to before its password is set",
    !page.url().includes("/admin"),
    page.url(),
  );
  await context.close();
}

// ───────────────────────────────────────── duplicate address is refused
await admin.goto(`${BASE}/admin/users`, { waitUntil: "load" });
{
  const form = admin.locator("section", { hasText: "Add a user" }).locator("form");
  await form.getByLabel("Full name").fill("Duplicate Attempt");
  await form.getByLabel("Email address").fill(salesEmail);
  await form.getByRole("button", { name: /Create and invite/i }).click();
  await admin.waitForTimeout(2000);
  check("a second account on the same address is refused", (await text(admin)).includes("already uses that address"));
}

// ─────────────────────────── permanent delete refuses a mistyped reference
await admin.goto(`${BASE}/admin/users`, { waitUntil: "load" });
const row = admin.locator("details", { hasText: salesEmail }).first();
// `.first()` matters: the danger zone nests a second <details> inside this one,
// so a bare summary locator matches the card and the delete disclosure both.
await row.locator("summary").first().click();
await row.locator("summary", { hasText: "Delete permanently" }).click();
await admin.waitForTimeout(400);

await row.getByLabel(/Type the email address to confirm/i).fill("not-the-right-address@example.test");
await row.getByRole("button", { name: /Delete this staff user permanently/i }).click();
await admin.waitForTimeout(2000);
check(
  "a permanent delete on a mistyped reference is refused",
  (await text(admin)).includes("does not match"),
  (await text(admin)).slice(0, 180),
);

await admin.goto(`${BASE}/admin/users`, { waitUntil: "load" });
check("the user still exists after the refused delete", (await text(admin)).includes(salesEmail));

// ────────────────────────────────────── you cannot remove your own account
{
  const self = admin.locator("details", { hasText: ADMIN_EMAIL }).first();
  check(
    "your own account is not offered for removal",
    (await self.count()) === 0,
    `${await self.count()} disclosure(s) matched the signed-in administrator`,
  );
}

// ───────────────────────────────────────── the correct reference deletes
{
  const target = admin.locator("details", { hasText: salesEmail }).first();
  await target.locator("summary").first().click();
  await target.locator("summary", { hasText: "Delete permanently" }).click();
  await admin.waitForTimeout(400);
  await target.getByLabel(/Type the email address to confirm/i).fill(salesEmail.toUpperCase());
  await target.getByRole("button", { name: /Delete this staff user permanently/i }).click();
  await admin.waitForTimeout(3000);
}

const afterDelete = await text(admin);
check("a permanent delete redirects to the list", admin.url().includes("/admin/users"), admin.url());
check("the list confirms what was deleted", afterDelete.includes("permanently deleted"), afterDelete.slice(0, 200));
/*
 * Against the table, not the page. The confirmation notice names the address
 * that was deleted, so a whole-page search for it finds the receipt and reports
 * that the delete failed — which is what the first version of this check did.
 */
const tableText = (await admin.locator("table").first().innerText()).replace(/\s+/g, " ");
check("the deleted user is gone from the list", !tableText.includes(salesEmail), tableText.slice(0, 200));

// ───────────────────────────────────────── the last administrator is safe
{
  await admin.goto(`${BASE}/admin/users`, { waitUntil: "load" });
  const body = await text(admin);
  // With only one administrator seeded, there is nobody else to remove — the
  // protection is that the signed-in administrator is not listed at all.
  check(
    "an administrator cannot reach a control that would leave nobody in charge",
    !body.includes(`${ADMIN_EMAIL} Delete permanently`),
  );
}

// ─────────────── the invitation link actually works, and lands on SALES
/*
 * The whole point of the feature. Mail is not configured here, so the link is
 * read off the panel's fallback message — the same string a real administrator
 * would forward. Following it must set a password, verify the address, and
 * produce an account with exactly the role that was chosen.
 */
const invitee = `verify.invite.${stamp}@example.test`;
const inviteePassword = "Verify!Invite2026";

await admin.goto(`${BASE}/admin/users`, { waitUntil: "load" });
{
  const form = admin.locator("section", { hasText: "Add a user" }).locator("form");
  await form.getByLabel("Full name").fill(`Verify Invite ${stamp}`);
  await form.getByLabel("Email address").fill(invitee);
  await form.getByLabel("Role").selectOption("SALES");
  await form.getByRole("button", { name: /Create and invite/i }).click();
  await admin.waitForTimeout(2500);
}

const inviteMessage = await text(admin);
const linkMatch = inviteMessage.match(/https?:\/\/\S*\/reset-password\?token=[A-Za-z0-9_%-]+/);
check("the panel surfaces the set-up link when mail cannot be sent", Boolean(linkMatch), inviteMessage.slice(0, 220));

if (linkMatch) {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(linkMatch[0], { waitUntil: "load" });
  await page.getByLabel(/New password/i).fill(inviteePassword);
  await page.getByRole("button", { name: "Change password" }).click();
  await page.waitForTimeout(2500);
  check(
    "the invitation sets a password",
    /has been changed|sign in with your new password/i.test(await text(page)),
    (await text(page)).slice(0, 180),
  );

  await page.goto(`${BASE}/login`, { waitUntil: "load" });
  await page.getByLabel("Business email").fill(invitee);
  await page.getByLabel("Password").fill(inviteePassword);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForTimeout(3000);
  check("the invited user can sign in", !page.url().includes("/login"), page.url());

  // Verification: an unverified account is blocked from transacting, so
  // reaching the panel at all shows the link settled the address too.
  await page.goto(`${BASE}/admin`, { waitUntil: "load" });
  check("the invited user reaches the admin area as staff", page.url().endsWith("/admin"), page.url());

  // ─────────────────── SALES is refused administrator-only screens
  await page.goto(`${BASE}/admin/users`, { waitUntil: "load" });
  check("SALES is redirected away from the staff screen", !page.url().includes("/admin/users"), page.url());

  await page.goto(`${BASE}/admin/settings`, { waitUntil: "load" });
  check("SALES is redirected away from settings", !page.url().includes("/admin/settings"), page.url());

  /*
   * Hidden is not refused, and this is where that gets proved.
   *
   * A plain POST to the page URL never reaches a Server Action — Next routes
   * actions by a `Next-Action` header carrying an id that lives in the client
   * bundle, so a hand-rolled fetch just renders the page and returns 200. An
   * earlier version of this check did exactly that and called the 200 a
   * failure, which was the test being wrong rather than the code.
   *
   * So the real request is captured from an administrator's browser — headers,
   * body and all — intercepted before it reaches the server, and then replayed
   * on the SALES session. That is precisely what an attacker with a sales login
   * and the developer tools open would do.
   */
  const throwaway = `verify.victim.${stamp}@example.test`;
  await admin.goto(`${BASE}/admin/users`, { waitUntil: "load" });
  {
    const form = admin.locator("section", { hasText: "Add a user" }).locator("form");
    await form.getByLabel("Full name").fill("Deletion Target");
    await form.getByLabel("Email address").fill(throwaway);
    await form.getByLabel("Role").selectOption("CUSTOMER");
    await form.getByRole("button", { name: /Create and invite/i }).click();
    await admin.waitForTimeout(2500);
  }

  let captured = null;
  await admin.route("**/admin/customers**", async (route) => {
    if (route.request().method() === "POST" && !captured) {
      captured = {
        url: route.request().url(),
        headers: route.request().headers(),
        body: route.request().postData(),
      };
      // Aborted, so the administrator never actually performs this delete —
      // only the SALES replay below is allowed to reach the server.
      await route.abort();
      return;
    }
    await route.continue();
  });

  await admin.goto(`${BASE}/admin/customers?q=${encodeURIComponent(throwaway)}`, { waitUntil: "load" });
  const victim = admin.locator("details", { hasText: throwaway }).first();
  await victim.locator("summary").first().click();
  await victim.locator("summary", { hasText: "Delete permanently" }).click();
  await admin.waitForTimeout(300);
  await victim.getByLabel(/Type the email address to confirm/i).fill(throwaway);
  await victim.getByRole("button", { name: /Delete this customer permanently/i }).click();
  await admin.waitForTimeout(2000);
  await admin.unroute("**/admin/customers**");

  check("the administrator's delete request was captured for replay", Boolean(captured?.body));

  if (captured?.body) {
    const replay = await page.request.post(captured.url, {
      headers: captured.headers,
      data: captured.body,
      maxRedirects: 0,
      failOnStatusCode: false,
    });
    // The assertion that matters is not the status code but the database.
    await admin.goto(`${BASE}/admin/customers?q=${encodeURIComponent(throwaway)}`, { waitUntil: "load" });
    check(
      "a replayed removal request on a SALES session does not delete the record",
      (await text(admin)).includes(throwaway),
      `replay status ${replay.status()}`,
    );
  }

  // Clean up the target with the account entitled to do it.
  {
    const target = admin.locator("details", { hasText: throwaway }).first();
    if ((await target.count()) > 0) {
      await target.locator("summary").first().click();
      await target.locator("summary", { hasText: "Delete permanently" }).click();
      await admin.waitForTimeout(300);
      await target.getByLabel(/Type the email address to confirm/i).fill(throwaway);
      await target.getByRole("button", { name: /Delete this customer permanently/i }).click();
      await admin.waitForTimeout(2500);
    }
  }

  await context.close();
}

{
  const context = await browser.newContext();
  const page = await context.newPage();
  const response = await page.goto(`${BASE}/admin/users`, { waitUntil: "load" });
  check(
    "the staff screen is not reachable without signing in",
    page.url().includes("/login") || (response && response.status() >= 400),
    page.url(),
  );
  await context.close();
}

// ───────────────────────────────────────────────────────── tidy up
await admin.goto(`${BASE}/admin/users`, { waitUntil: "load" });
{
  const target = admin.locator("details", { hasText: invitee }).first();
  if ((await target.count()) > 0) {
    await target.locator("summary").first().click();
    await target.locator("summary", { hasText: "Delete permanently" }).click();
    await admin.waitForTimeout(300);
    await target.getByLabel(/Type the email address to confirm/i).fill(invitee);
    await target.getByRole("button", { name: /Delete this staff user permanently/i }).click();
    await admin.waitForTimeout(2500);
  }
  const remaining = (await admin.locator("table").first().innerText()).replace(/\s+/g, " ");
  check("the verification accounts are cleaned up", !remaining.includes(invitee), remaining.slice(0, 200));
}

await browser.close();
for (const r of results) console.log(`${r.ok ? "  ✓" : "  ✗"} ${r.name}${!r.ok && r.detail ? ` — ${r.detail}` : ""}`);
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} user and deletion checks passed`);
process.exit(failed ? 1 : 0);
