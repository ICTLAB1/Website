import { chromium } from "playwright";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

/**
 * Uploading a product photograph from the admin panel.
 *
 * The point of the feature is that artwork can reach a running site without a
 * developer, a commit and a deploy. The point of this suite is that it can only
 * reach it as a picture.
 *
 * Most of what follows is refusals, because an upload endpoint is the classic
 * way into a site and the happy path is the easy half. The three that matter:
 *
 * - **A file is what its bytes say, not what its name says.** HTML renamed
 *   `.png` must be refused; a filename check would wave it through.
 * - **No SVG here.** Logos accept SVG because vector artwork is the point, and
 *   `app/uploads/[name]/route.ts` has to defang it as a result — an SVG is a
 *   document that can carry script. A photograph has no such need, so the
 *   narrower surface is taken, and this proves it was.
 * - **The picture actually reaches the public page.** An upload that writes a
 *   row and a file but leaves the catalogue showing "Photograph to follow" is
 *   the failure somebody discovers from a customer.
 */

const BASE = process.env.BASE ?? "http://localhost:3000";
const results = [];
const check = (name, ok, detail = "") => {
  const result = { name, ok: Boolean(ok), detail };
  results.push(result);
  console.log(`  ${result.ok ? "✓" : "✗"} ${result.name}${result.ok || !result.detail ? "" : ` — ${result.detail}`}`);
};

const scratch = `/tmp/verify-product-photos-${process.pid}.sql`;
const sql = (statement) => {
  writeFileSync(scratch, statement, { mode: 0o644 });
  return execFileSync("su", ["postgres", "-c", `psql -tA -d ictlab -f ${scratch}`], {
    encoding: "utf8",
  }).trim();
};

const stamp = Date.now().toString().slice(-6);
const FIXTURE_HASH = "$2b$12$Y1EnHFQUoF4sKzWulgpRre1IGREZUDi/nFfN6QycEnigobTHRMj5e";
const password = "CorrectHorse9";
const staffEmail = `pp_staff${stamp}@example.test`;
const slug = `photo-probe-${stamp}`;

// ── fixtures on disk ────────────────────────────────────────────────────────
const dir = mkdtempSync(join(tmpdir(), "photo-"));
const files = {
  // A real 4×4 red PNG. Small, but a genuine one — the detector reads the
  // signature, so a fake would prove nothing.
  good: join(dir, "product.png"),
  // HTML in a .png coat: the case a filename check waves through.
  disguised: join(dir, "not-an-image.png"),
  // A valid SVG, which logos accept and photographs must not.
  vector: join(dir, "drawing.svg"),
  // Past the photograph budget.
  huge: join(dir, "huge.png"),
};

writeFileSync(
  files.good,
  Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAYAAACp8Z5+AAAAFUlEQVR4nGP8z4AATAxIYJRDGgcAV+gBFPtHhbcAAAAASUVORK5CYII=",
    "base64",
  ),
);
writeFileSync(files.disguised, "<html><script>alert(document.domain)</script></html>");
writeFileSync(
  files.vector,
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><rect width="48" height="48"/></svg>',
);
/*
 * A real PNG header followed by filler, so it is refused for its size and not
 * merely for not being an image — those are different code paths.
 *
 * Sized deliberately between the two limits: over `MAX_PHOTO_BYTES` (2 MB) so
 * the action refuses it, but under the Server Action `bodySizeLimit` (3 MB) so
 * the request actually reaches the action. A fixture past both would prove only
 * that the framework has a limit, and would leave the application's own message
 * — the one a person actually reads — untested.
 */
writeFileSync(
  files.huge,
  Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    Buffer.alloc(Math.round(2.4 * 1024 * 1024), 0x41),
  ]),
);

// ── a product with no photograph ────────────────────────────────────────────
const brandId = sql(`select id from "Brand" where "deletedAt" is null limit 1`);
const categoryId = sql(`select id from "Category" where "deletedAt" is null limit 1`);

sql(
  `insert into "User" (id, email, "passwordHash", name, role, "emailVerified", "createdAt", "updatedAt") values ('pps${stamp}', '${staffEmail}', '${FIXTURE_HASH}', 'Photo Probe Staff', 'ADMIN', now(), now(), now())`,
);
sql(
  `insert into "Product" (id, slug, name, "shortDescription", description, "brandId", "categoryId", status, availability, "purchaseMode", featured, popularity, features, compatibility, keywords, "formFactor", "searchText", "createdAt", "updatedAt") values ('ppp${stamp}', '${slug}', 'Photo Probe Tower ${stamp}', 'A fixture product used to prove photograph upload.', 'A fixture product used to prove photograph upload.', '${brandId}', '${categoryId}', 'ACTIVE', 'ON_REQUEST', 'ENQUIRY', false, 0, '{}', '{}', '{}', 'DESKTOP_TOWER', 'photo probe tower ${stamp}', now(), now())`,
);

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const context = await browser.newContext({ viewport: { width: 1440, height: 1200 } });
const page = await context.newPage();

await page.goto(`${BASE}/login`, { waitUntil: "load" });
await page.getByLabel("Business email").fill(staffEmail);
await page.getByLabel("Password").fill(password);
await page.getByRole("button", { name: "Sign in" }).click();
await page.waitForURL(/\/(admin|account)/, { timeout: 20000 });

// ── the worklist ────────────────────────────────────────────────────────────
await page.goto(`${BASE}/admin/products/photos`, { waitUntil: "load" });
const worklist = (await page.locator("body").innerText()).replace(/\s+/g, " ");

check("the photographs worklist is served", page.url().includes("/admin/products/photos"));
check("it lists the product that has no photograph", worklist.includes(`Photo Probe Tower ${stamp}`));
check(
  "it says how many still need one",
  // Case-insensitive: the badge is uppercased in CSS, so `innerText` returns it
  // that way and an exact-case match would fail on a page that reads correctly.
  /\d+ of \d+ photographed/i.test(worklist),
  worklist.slice(0, 200),
);

/*
 * Licences must not be on this list. There is nothing to photograph, and sixty
 * rows of work nobody should do would bury the models that genuinely need one.
 */
const softwareName = sql(
  `select name from "Product" where "formFactor" is null and "deletedAt" is null and status = 'ACTIVE' limit 1`,
);
check(
  "software is not listed as missing a photograph",
  softwareName.length === 0 || !worklist.includes(softwareName),
  softwareName,
);

// ── refusals ────────────────────────────────────────────────────────────────
const row = page.locator("li").filter({ hasText: `Photo Probe Tower ${stamp}` }).first();
const input = row.locator('input[type="file"]').first();

async function upload(path) {
  await input.setInputFiles(path);
  await row.getByRole("button", { name: /Upload photograph|Replace photograph/ }).click();
  await page.waitForTimeout(2500);
  return sql(`select coalesce("imageUrl", '') from "Product" where id = 'ppp${stamp}'`);
}

check("HTML renamed as a .png is refused", (await upload(files.disguised)) === "");
check("an SVG is refused for a product photograph", (await upload(files.vector)) === "");
check(
  "a file over the size limit is refused",
  (await upload(files.huge)) === "",
);
check(
  "and refused with the application's own message, not an opaque framework error",
  (await page.locator("body").innerText()).includes("The limit is 2 MB"),
);

// ── the happy path ──────────────────────────────────────────────────────────
const stored = await upload(files.good);
check("a real photograph is accepted", stored.startsWith("/uploads/"), stored);
check(
  "and is stored under a digest of its own contents, not its filename",
  /^\/uploads\/[0-9a-f]{32}\.png$/.test(stored),
  stored,
);

const served = await context.request.get(`${BASE}${stored}`);
check("the stored photograph is served back", served.status() === 200, `status ${served.status()}`);
check(
  "as the type its bytes say it is",
  served.headers()["content-type"] === "image/png",
  served.headers()["content-type"],
);
check(
  "and the browser is told not to re-interpret it",
  served.headers()["x-content-type-options"] === "nosniff",
);

// ── it reaches the public page ──────────────────────────────────────────────
await page.goto(`${BASE}/products/${slug}`, { waitUntil: "load" });
const publicPage = await page.content();

check("the photograph is on the public product page", publicPage.includes(stored));
/*
 * Scoped to this product's own frame, not the whole page.
 *
 * The related-products grid at the foot of the page legitimately shows
 * "Photograph to follow" for other models that have none, so an assertion over
 * the whole document would fail on a page that is entirely correct. What must
 * be true is narrower: the placeholder does not appear outside the cards.
 */
const placeholdersAnywhere = await page.getByText("Photograph to follow").count();
const placeholdersInCards = await page
  .locator("article")
  .getByText("Photograph to follow")
  .count();
check(
  "and this product's own frame shows the photograph rather than the labelled gap",
  placeholdersAnywhere === placeholdersInCards,
  `${placeholdersAnywhere} on the page, ${placeholdersInCards} of them in related-product cards`,
);
/*
 * The product's own photograph is not a representative illustration, so the
 * badge and the disclaimer must both be absent. A caveat over a real photograph
 * teaches a reader to ignore it on the page where it counts.
 */
check(
  "it is not badged as a representative image",
  !publicPage.includes("Representative image"),
);

// ── removal ─────────────────────────────────────────────────────────────────
await page.goto(`${BASE}/admin/products/${sql(`select id from "Product" where id = 'ppp${stamp}'`)}`, {
  waitUntil: "load",
});
await page.getByRole("button", { name: "Remove photograph" }).first().click();
await page.waitForTimeout(2500);
check(
  "removing the photograph clears it",
  sql(`select coalesce("imageUrl", '') from "Product" where id = 'ppp${stamp}'`) === "",
);

// ── the audit trail ─────────────────────────────────────────────────────────
check(
  "every upload and removal is audited",
  sql(
    `select count(*) from "AuditLog" where "entityId" = 'ppp${stamp}' and action in ('admin.product_photo_uploaded', 'admin.product_photo_removed')`,
  ) === "2",
  sql(`select count(*) from "AuditLog" where "entityId" = 'ppp${stamp}'`),
);

// ── a signed-out caller ─────────────────────────────────────────────────────
const stranger = await browser.newContext();
const refused = await stranger.request.post(`${BASE}/admin/products/photos`, {
  multipart: { productId: `ppp${stamp}`, photo: { name: "x.png", mimeType: "image/png", buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47]) } },
  failOnStatusCode: false,
});
check(
  "a signed-out caller cannot post to the upload screen",
  refused.status() >= 300,
  `status ${refused.status()}`,
);
check(
  "and the product is still without a photograph",
  sql(`select coalesce("imageUrl", '') from "Product" where id = 'ppp${stamp}'`) === "",
);

await browser.close();

// ── clean up ────────────────────────────────────────────────────────────────
sql(`delete from "AuditLog" where "entityId" = 'ppp${stamp}'`);
sql(`delete from "Product" where id = 'ppp${stamp}'`);
sql(`delete from "Session" where "userId" = 'pps${stamp}'`);
sql(`delete from "User" where id = 'pps${stamp}'`);
rmSync(scratch, { force: true });
rmSync(dir, { recursive: true, force: true });

const failed = results.filter((result) => !result.ok).length;
console.log(`\n${results.length - failed}/${results.length} product photograph checks passed`);
process.exit(failed ? 1 : 0);
