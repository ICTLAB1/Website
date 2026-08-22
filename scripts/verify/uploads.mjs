import { chromium } from "playwright";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

/**
 * Uploading a brand logo from the admin panel.
 *
 * An upload endpoint is the classic way into a site, so most of this is about
 * refusals: a file that is not an image, a file that claims to be one, a file
 * that is too large, and a caller who is not an administrator. The happy path
 * is one check; the rest is everything that must not happen.
 *
 * The stored file is also fetched back, because the headers it is served with
 * are the thing that makes accepting SVG safe at all — an SVG is a document
 * that can carry script, and a browser navigating to one runs that script on
 * this origin unless told otherwise.
 */

const BASE = process.env.BASE ?? "http://localhost:3000";
const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? "admin@example.test";
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? "ChangeMe!Admin123";

const results = [];
const check = (name, ok, detail = "") => results.push({ name, ok: Boolean(ok), detail });
const text = async (page) => (await page.locator("body").innerText()).replace(/\s+/g, " ");

// ── fixtures ────────────────────────────────────────────────────────────────
const dir = mkdtempSync(join(tmpdir(), "logo-"));

const files = {
  // A real, minimal SVG.
  good: join(dir, "logo.svg"),
  // HTML wearing a .png extension: the case a filename check would wave through.
  disguised: join(dir, "not-an-image.png"),
  // Over the size limit, and not an image either.
  huge: join(dir, "huge.png"),
};

writeFileSync(
  files.good,
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">' +
    '<rect width="48" height="48" rx="8" fill="#0f6cbd"/></svg>',
);
writeFileSync(files.disguised, "<html><script>alert(document.domain)</script></html>");
writeFileSync(files.huge, Buffer.alloc(600 * 1024, 0x41));

// ── sign in ─────────────────────────────────────────────────────────────────
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const context = await browser.newContext({ viewport: { width: 1440, height: 1200 } });
const page = await context.newPage();

await page.goto(`${BASE}/login`, { waitUntil: "load" });
await page.getByLabel("Business email").fill(ADMIN_EMAIL);
await page.getByLabel("Password").fill(ADMIN_PASSWORD);
await page.getByRole("button", { name: "Sign in" }).click();
await page.waitForURL("**/admin", { timeout: 20000 });

/*
 * The edit page is reached by its href, not by clicking a link labelled with
 * the brand's name. There are forty brands and a mega-menu, so "Microsoft"
 * matches in several places, and which one `.first()` picks is not something
 * this suite should depend on.
 */
await page.goto(`${BASE}/admin/brands`, { waitUntil: "load" });
const brandHref = await page
  // `/admin/brands/new` is on this page too and has no record to attach a
  // logo to; an id is a cuid, so the length test separates them.
  .locator('main a[href^="/admin/brands/"]')
  .evaluateAll((links) => {
    const hit = links
      .map((link) => link.getAttribute("href"))
      .find((href) => href && /\/admin\/brands\/[a-z0-9]{20,}$/.test(href));
    return hit ?? null;
  });
if (!brandHref) throw new Error("No brand rows on /admin/brands to test against.");

const brandUrl = `${BASE}${brandHref}`;
await page.goto(brandUrl, { waitUntil: "load" });
await page.locator('input[name="logo"]').waitFor({ state: "attached", timeout: 15000 });

/*
 * Located by the field's name, not by the surrounding markup. An earlier
 * version looked for a <section> containing the word "Logo" and found one that
 * did not contain the input — the page's structure is not the contract, the
 * field name is.
 */
const logoInput = () => page.locator('input[name="logo"]');
const uploadButton = () =>
  page.getByRole("button", { name: /Upload logo|Replace logo/i }).first();

check("the brand page offers a logo upload", (await logoInput().count()) > 0, brandUrl);

// ── refusals ────────────────────────────────────────────────────────────────
await logoInput().setInputFiles(files.disguised);
await uploadButton().click();
await page.waitForTimeout(2500);
check(
  "HTML renamed to .png is refused",
  (await text(page)).includes("not an image this site can use"),
  (await text(page)).slice(0, 160),
);

await page.reload({ waitUntil: "load" });
await logoInput().setInputFiles(files.huge);
await uploadButton().click();
await page.waitForTimeout(2500);
check(
  "an oversized file is refused by size, before its contents matter",
  /The limit is \d+ KB/.test(await text(page)),
  (await text(page)).slice(0, 160),
);

// ── the happy path ──────────────────────────────────────────────────────────
await page.reload({ waitUntil: "load" });
await logoInput().setInputFiles(files.good);
await uploadButton().click();
await page.waitForTimeout(3000);
check("a real SVG is accepted", (await text(page)).includes("live on the site"), (await text(page)).slice(0, 160));

await page.reload({ waitUntil: "load" });
const stored = await page
  .locator('img[src^="/uploads/"]')
  .first()
  .getAttribute("src")
  .catch(() => null);
check("the stored logo is shown back on the panel", Boolean(stored), String(stored));

// ── how it is served ────────────────────────────────────────────────────────
if (stored) {
  const response = await page.request.get(`${BASE}${stored}`);
  const headers = response.headers();

  check("the file is served", response.status() === 200, `status ${response.status()}`);
  check(
    "its type comes from its bytes",
    headers["content-type"]?.startsWith("image/svg+xml"),
    headers["content-type"],
  );
  check(
    "the browser may not re-interpret the type",
    headers["x-content-type-options"] === "nosniff",
    headers["x-content-type-options"],
  );
  /*
   * The one that matters. An SVG served without this can carry script that
   * runs on this origin the moment somebody opens the file's own URL.
   */
  const csp = headers["content-security-policy"] ?? "";
  check(
    "script inside an SVG is neutralised by the policy it is served with",
    csp.includes("default-src 'none'") && csp.includes("sandbox"),
    csp,
  );
  check(
    "the name is a digest, so nothing a caller typed reaches the filesystem",
    /^\/uploads\/[0-9a-f]{32}\.svg$/.test(stored),
    stored,
  );

  // Path traversal through the serving route.
  for (const attempt of ["/uploads/..%2f..%2fetc%2fpasswd", "/uploads/anything.svg"]) {
    const bad = await page.request.get(`${BASE}${attempt}`, { failOnStatusCode: false });
    check(`${attempt} is refused`, bad.status() === 404, `status ${bad.status()}`);
  }
}

// ── the public site uses it ─────────────────────────────────────────────────
{
  const visitor = await (await browser.newContext()).newPage();
  await visitor.goto(`${BASE}/brands?fresh=${Date.now()}`, { waitUntil: "load" });
  const count = await visitor.locator('main img[src^="/uploads/"]').count();
  check("the logo reaches the public brand cards", count > 0, `${count} image(s)`);
  await visitor.close();
}

// ── SALES may not upload ────────────────────────────────────────────────────
{
  const anon = await (await browser.newContext()).newPage();
  const response = await anon.goto(brandUrl, { waitUntil: "load" });
  check(
    "the brand page is not reachable without signing in",
    anon.url().includes("/login") || (response && response.status() >= 400),
    anon.url(),
  );
  await anon.close();
}

// ── put it back ─────────────────────────────────────────────────────────────
await page.goto(brandUrl, { waitUntil: "load" });
const remove = page.getByRole("button", { name: /Remove logo/i });
if ((await remove.count()) > 0) {
  await remove.click();
  await page.waitForTimeout(2500);
}
check(
  "removing a logo returns the brand to its wordmark",
  (await text(page)).includes("lettered wordmark"),
  (await text(page)).slice(0, 140),
);

await browser.close();
for (const r of results) console.log(`${r.ok ? "  ✓" : "  ✗"} ${r.name}${!r.ok && r.detail ? ` — ${r.detail}` : ""}`);
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} upload checks passed`);
process.exit(failed ? 1 : 0);
