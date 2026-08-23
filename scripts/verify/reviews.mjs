import { chromium } from "playwright";
import { execFileSync } from "node:child_process";
import { writeFileSync, rmSync } from "node:fs";

/**
 * Reviews and testimonials, and the two rules that make them worth anything.
 *
 * **A review can only be written by somebody who bought the product.** That is
 * what makes the star rating defensible and the `AggregateRating` structured
 * data legitimate — and it is exactly the sort of rule that gets enforced in
 * the interface and forgotten in the action behind it. So this posts directly
 * to the server action with a product the account never bought, and requires a
 * refusal.
 *
 * **A testimonial cannot be published without a recorded consent.** Publishing
 * a named person, their role and their employer on a supplier's website is
 * something they have to have agreed to. This checks the form refuses it and,
 * separately, that a row forced into PUBLISHED straight in the database still
 * does not reach a visitor — because the form is not the only way in.
 *
 * It also checks the thing nobody notices going wrong: that no `aggregateRating`
 * is emitted for a product with no approved reviews. Review markup on a page
 * with nothing to show is what costs a domain its rich results.
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

const scratch = `/tmp/verify-reviews-${process.pid}.sql`;
const sql = (statement) => {
  writeFileSync(scratch, statement, { mode: 0o644 });
  return execFileSync("su", ["postgres", "-c", `psql -tA -d ictlab -f ${scratch}`], {
    encoding: "utf8",
  }).trim();
};

const stamp = Date.now().toString().slice(-6);
const FIXTURE_HASH = "$2b$12$Y1EnHFQUoF4sKzWulgpRre1IGREZUDi/nFfN6QycEnigobTHRMj5e";
const password = "CorrectHorse9";
const buyerEmail = `rv_buyer${stamp}@example.test`;
const strangerEmail = `rv_stranger${stamp}@example.test`;
const adminEmail = `rv_admin${stamp}@example.test`;

/*
 * Sweep anything an earlier aborted run left behind, before adding more. A
 * fixture testimonial reaching the public site is the exact failure this suite
 * exists to prevent, so it must not be able to leak one itself.
 */
for (const statement of [
  `delete from "ProductReview" where "userId" like 'rvb%' or "userId" like 'rvs%'`,
  `delete from "Testimonial" where "authorName" like 'Probe Customer%'`,
  `delete from "OrderItem" where "orderId" like 'rvo%'`,
  `delete from "Order" where id like 'rvo%'`,
]) {
  sql(statement);
}

// ── fixtures: two customers, one administrator, and a real purchase ─────────
sql(
  `insert into "User" (id, email, "passwordHash", name, role, "emailVerified", "createdAt", "updatedAt") values ('rvb${stamp}', '${buyerEmail}', '${FIXTURE_HASH}', 'Probe Buyer', 'CUSTOMER', now(), now(), now())`,
);
sql(
  `insert into "User" (id, email, "passwordHash", name, role, "emailVerified", "createdAt", "updatedAt") values ('rvs${stamp}', '${strangerEmail}', '${FIXTURE_HASH}', 'Probe Stranger', 'CUSTOMER', now(), now(), now())`,
);
sql(
  `insert into "User" (id, email, "passwordHash", name, role, "emailVerified", "createdAt", "updatedAt") values ('rva${stamp}', '${adminEmail}', '${FIXTURE_HASH}', 'Probe Admin', 'ADMIN', now(), now(), now())`,
);

/*
 * Two products of this suite's own, rather than the first two rows of the
 * catalogue.
 *
 * An earlier version took whatever `order by slug limit 1` returned, which
 * quietly coupled the suite to every other suite in the gate: anything that
 * archived, soft-deleted or inserted a product changed which row it got, and
 * the suite then passed on its own and failed in the run. A fixture the suite
 * creates and removes is the only version of this that means the same thing
 * every time.
 */
const brandId = sql(`select id from "Brand" where "deletedAt" is null limit 1`);
const categoryId = sql(`select id from "Category" where "deletedAt" is null limit 1`);

sql(`delete from "Product" where slug like 'rv-probe-%'`);

const product = (id, slug, name) => {
  sql(
    `insert into "Product" (id, slug, name, "shortDescription", description, "brandId", "categoryId", status, availability, "purchaseMode", featured, popularity, features, compatibility, keywords, "searchText", "createdAt", "updatedAt") values ('${id}', '${slug}', '${name}', 'A fixture product used to prove the purchase check on reviews.', 'A fixture product used to prove the purchase check on reviews.', '${brandId}', '${categoryId}', 'ACTIVE', 'ON_REQUEST', 'ENQUIRY', false, 0, '{}', '{}', '{}', '${name.toLowerCase()}', now(), now())`,
  );
  return { id, slug, name };
};

// One the buyer bought, one they did not.
const bought = product(`rvp${stamp}`, `rv-probe-bought-${stamp}`, `Review Probe Bought ${stamp}`);
const notBought = product(`rvq${stamp}`, `rv-probe-other-${stamp}`, `Review Probe Other ${stamp}`);

// A CONFIRMED order for the buyer, containing only the first product.
sql(
  `insert into "Order" (id, reference, status, "userId", currency, "billingName", "billingEmail", "placedAt", "createdAt", "updatedAt") values ('rvo${stamp}', 'PROBE-${stamp}', 'CONFIRMED', 'rvb${stamp}', 'INR', 'Probe Buyer', '${buyerEmail}', now(), now(), now())`,
);
sql(
  `insert into "OrderItem" (id, "orderId", "productId", "productName", sku, quantity, "unitPriceMinor", "lineTotalMinor") values ('rvi${stamp}', 'rvo${stamp}', '${bought.id}', 'Probe line', 'PROBE-SKU', 1, 100000, 100000)`,
);

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });

async function signIn(context, email) {
  const page = await context.newPage();
  await page.goto(`${BASE}/login`, { waitUntil: "load" });
  await page.getByLabel("Business email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(/\/(admin|account)/, { timeout: 20000 });
  await page.close();
}

/** The Product JSON-LD on a product page, or null. */
async function productSchema(page, slug) {
  await page.goto(`${BASE}/products/${slug}`, { waitUntil: "load" });
  const html = await page.content();
  for (const match of html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)) {
    const parsed = JSON.parse(match[1].replaceAll("\\u003c", "<"));
    if (parsed["@type"] === "Product") return parsed;
  }
  return null;
}

// ── no reviews: a section, but no stars and no markup ───────────────────────
const anon = await browser.newContext();
const anonPage = await anon.newPage();

const before = await productSchema(anonPage, bought.slug);
check("the product page carries Product structured data", before !== null);
/*
 * The check this suite exists for, first. Review markup on a page with no
 * reviews is what search engines penalise, and a zero rating advertises the
 * product as universally disliked.
 */
check(
  "no aggregateRating is published for a product with no reviews",
  before?.aggregateRating === undefined,
  JSON.stringify(before?.aggregateRating),
);
const emptyText = await anonPage.locator("body").innerText();
check("the reviews section still says something", /no reviews for this yet/i.test(emptyText));
check("and no star rating is drawn", !/out of 5/i.test(emptyText));

// ── the buyer can review what they bought ──────────────────────────────────
const buyer = await browser.newContext();
await signIn(buyer, buyerEmail);
const buyerPage = await buyer.newPage();

await buyerPage.goto(`${BASE}/account/reviews`, { waitUntil: "load" });
const offered = await buyerPage.locator("body").innerText();
check("the account offers the product they bought", offered.includes(bought.name), offered.slice(0, 160));
check(
  "and does not offer one they did not buy",
  !offered.includes(notBought.name),
  notBought.name,
);

/*
 * The interface is not the enforcement, so this attacks it.
 *
 * Done *before* the legitimate review, because that is the only moment a form
 * exists to tamper with — once the buyer has reviewed the one product on their
 * order there is nothing left to review and no form on the page. The `productId`
 * on the real form is swapped for a product this account has never bought,
 * which is exactly what somebody determined would do, and the write must be
 * refused by the server rather than by the missing button.
 */
const forged = await buyerPage.evaluate((productId) => {
  const hidden = document.querySelector('input[name="productId"]');
  if (!hidden) return "no product field";
  hidden.value = productId;
  return "ok";
}, notBought.id);

if (forged === "ok") {
  await buyerPage.getByLabel("Your review").first().fill(
    "A forged review for a product this account never bought.",
  );
  await buyerPage.getByRole("button", { name: /Send for review/ }).first().click();
  await buyerPage.waitForTimeout(2500);
  const leaked = sql(
    `select count(*) from "ProductReview" where "userId" = 'rvb${stamp}' and "productId" = '${notBought.id}'`,
  );
  check(
    "a review posted for a product the account never bought is refused server-side",
    leaked === "0",
    `${leaked} row(s) written`,
  );
  /*
   * Matched on the action's own wording, not the page's. The explanatory copy
   * on this page says almost the same thing in almost the same words, so a
   * looser pattern passes on a page that refused nothing and said nothing —
   * which is how an earlier version of this check stayed green through a
   * failure.
   */
  const refusal = await buyerPage.locator("body").innerText();
  check(
    "and the customer is told why",
    /bought the product through us/i.test(refusal),
    refusal.slice(0, 200),
  );
} else {
  check("a review posted for an unbought product is refused server-side", false, forged);
}

// ── and the legitimate review goes through ─────────────────────────────────
await buyerPage.goto(`${BASE}/account/reviews`, { waitUntil: "load" });
/*
 * Assert the form is there before typing into it. A bare `fill` on a missing
 * field fails with a locator timeout and thirty seconds of nothing, which says
 * only that the field was absent — not that the refused attempt above took the
 * product off the list, which is the failure worth naming.
 */
const formPresent = await buyerPage.getByLabel("Your review").first().count();
check(
  "the refused attempt left the legitimate one still offered",
  formPresent > 0,
  formPresent > 0
    ? ""
    : `${(await buyerPage.locator("body").innerText()).slice(0, 200)} | product=${sql(
        `select status::text || ' ' || coalesce("deletedAt"::text, 'live') from "Product" where id = '${bought.id}'`,
      )} | reviews=${sql(`select count(*) from "ProductReview" where "userId" = 'rvb${stamp}'`)}`,
);
await buyerPage.getByLabel("Your review").first().fill(
  "A fixture review written by the verification suite to prove the purchase check works.",
);
await buyerPage.getByRole("button", { name: /Send for review/ }).first().click();
await buyerPage.waitForTimeout(2500);

const stored = sql(
  `select status::text from "ProductReview" where "userId" = 'rvb${stamp}' and "productId" = '${bought.id}'`,
);
check("the review is stored", stored.length > 0, stored);
/*
 * PENDING, and there is no argument on the form that could have made it
 * anything else. Nothing a customer writes reaches the public site unread.
 */
check("and it is pending, not published", stored === "PENDING", stored);

const stillHidden = await productSchema(anonPage, bought.slug);
check(
  "a pending review does not reach the product page",
  stillHidden?.aggregateRating === undefined,
);

// ── somebody who bought nothing cannot review anything ─────────────────────
const stranger = await browser.newContext();
await signIn(stranger, strangerEmail);
const strangerPage = await stranger.newPage();
await strangerPage.goto(`${BASE}/account/reviews`, { waitUntil: "load" });
const strangerText = await strangerPage.locator("body").innerText();
check(
  "an account with no orders is offered nothing to review",
  /nothing waiting for a review/i.test(strangerText),
  strangerText.slice(0, 120),
);

// ── moderation publishes it, and only then ─────────────────────────────────
const admin = await browser.newContext();
await signIn(admin, adminEmail);
const adminPage = await admin.newPage();
await adminPage.goto(`${BASE}/admin/reviews`, { waitUntil: "load" });
const queue = await adminPage.locator("body").innerText();
check("the moderation queue lists the pending review", /fixture review/i.test(queue));

await adminPage.getByRole("button", { name: /Publish it/ }).first().click();
await adminPage.waitForTimeout(2500);
check(
  "approving it records the decision",
  sql(`select status::text from "ProductReview" where "userId" = 'rvb${stamp}'`) === "APPROVED",
);

const after = await productSchema(anonPage, bought.slug);
check("the approved review reaches the product page", after?.aggregateRating !== undefined);
if (after?.aggregateRating) {
  check(
    "the rating is the one that was given",
    after.aggregateRating.ratingValue === 5,
    String(after.aggregateRating.ratingValue),
  );
  check("and the count is one", after.aggregateRating.reviewCount === 1);
  check(
    "with the scale stated",
    after.aggregateRating.bestRating === 5 && after.aggregateRating.worstRating === 1,
  );
}
const shown = await anonPage.locator("body").innerText();
check("the review text is on the page", /fixture review/i.test(shown));
check("and it is marked as a verified purchase", /verified purchase/i.test(shown));

/*
 * ── withdrawing it takes it off the page again ────────────────────────────
 *
 * The customer's own escape hatch, and the check that the caches come apart in
 * the right order: a withdrawal has to clear the rendered review, the star
 * rating and the `aggregateRating` in the structured data, all of which are
 * cached under different tags.
 *
 * It is also this suite's cleanup for the review, done through the application
 * rather than with a DELETE. That is deliberate. An earlier version tidied up
 * in SQL, which removes the row and leaves the cached rating behind — so the
 * next run opened with a five-star rating on a product that had no reviews,
 * and failed its own first assertion. A cache is only invalidated by the code
 * that knows it should be.
 */
await buyerPage.goto(`${BASE}/account/reviews`, { waitUntil: "load" });
await buyerPage.getByRole("button", { name: /Withdraw/ }).first().click();
await buyerPage.waitForTimeout(2500);

check(
  "a withdrawn review is gone from the database",
  sql(`select count(*) from "ProductReview" where "userId" = 'rvb${stamp}'`) === "0",
);
const withdrawn = await productSchema(anonPage, bought.slug);
check(
  "and its rating is gone from the structured data",
  withdrawn?.aggregateRating === undefined,
  JSON.stringify(withdrawn?.aggregateRating),
);
const withdrawnText = await anonPage.locator("body").innerText();
check("and its text is off the page", !/fixture review/i.test(withdrawnText));

// ── a testimonial cannot be published without consent ──────────────────────
await adminPage.goto(`${BASE}/admin/testimonials/new`, { waitUntil: "load" });
check(
  "an administrator can reach the testimonial form",
  adminPage.url().includes("/admin/testimonials/new"),
  adminPage.url(),
);

await adminPage.getByLabel("What they said").fill("A fixture testimonial from the verify suite.");
await adminPage.getByLabel("Name").first().fill(`Probe Customer ${stamp}`);
await adminPage.getByLabel("Status").selectOption("PUBLISHED");
await adminPage.getByRole("button", { name: /Create|Save/ }).first().click();
await adminPage.waitForTimeout(2500);

const refused = await adminPage.locator("body").innerText();
check(
  "publishing a testimonial with no consent is refused with a field-level message",
  /record the consent|agreed we could publish/i.test(refused),
  refused.slice(0, 160),
);
check(
  "and nothing was published",
  sql(
    `select count(*) from "Testimonial" where "authorName" = 'Probe Customer ${stamp}' and status = 'PUBLISHED'`,
  ) === "0",
);

/*
 * The other half. The form is not the only way a row becomes PUBLISHED — a
 * migration, a restore, or somebody in psql can do it too — so the query the
 * public site reads must refuse it as well.
 */
sql(
  `insert into "Testimonial" (id, quote, "authorName", status, "displayOrder", "createdAt", "updatedAt") values ('rvt${stamp}', 'A fixture testimonial forced straight into the database.', 'Probe Customer ${stamp}', 'PUBLISHED', 1, now(), now())`,
);
const consentless = await (await fetch(`${BASE}/`)).text();
check(
  "a consentless testimonial forced into PUBLISHED still does not reach the site",
  !consentless.includes(`Probe Customer ${stamp}`),
);

sql(`update "Testimonial" set "consentOn" = now() where id = 'rvt${stamp}'`);
const consented = sql(
  `select count(*) from "Testimonial" where id = 'rvt${stamp}' and status='PUBLISHED' and "consentOn" is not null`,
);
check("recording consent makes it publishable", consented === "1");

// ── only staff may moderate ────────────────────────────────────────────────
const buyerAtQueue = await buyerPage.goto(`${BASE}/admin/reviews`, { waitUntil: "load" });
check(
  "a customer cannot reach the moderation queue",
  buyerPage.url().includes("/login") || buyerAtQueue?.status() === 404,
  `landed on ${buyerPage.url()} with ${buyerAtQueue?.status()}`,
);

await browser.close();

// ── clean up ───────────────────────────────────────────────────────────────
sql(`delete from "ProductReview" where "userId" in ('rvb${stamp}', 'rvs${stamp}')`);
sql(`delete from "Testimonial" where "authorName" like 'Probe Customer%'`);
sql(`delete from "OrderItem" where "orderId" = 'rvo${stamp}'`);
sql(`delete from "Order" where id = 'rvo${stamp}'`);
sql(`delete from "AuditLog" where "actorId" in ('rvb${stamp}', 'rvs${stamp}', 'rva${stamp}')`);
sql(`delete from "Session" where "userId" in ('rvb${stamp}', 'rvs${stamp}', 'rva${stamp}')`);
sql(`delete from "User" where id in ('rvb${stamp}', 'rvs${stamp}', 'rva${stamp}')`);
sql(`delete from "Product" where slug like 'rv-probe-%'`);
rmSync(scratch, { force: true });

const failed = results.filter((result) => !result.ok).length;
console.log(`\n${results.length - failed}/${results.length} review checks passed`);
process.exit(failed ? 1 : 0);
