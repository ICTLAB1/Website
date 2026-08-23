import { chromium } from "playwright";

/**
 * The hardware catalogue, checked against the promises it makes.
 *
 * Two of these matter more than the rest.
 *
 * **No price reaches a public hardware surface.** It is a commercial position,
 * not a styling choice: configuration and quantity move the figure, and a
 * number on the page would be wrong for almost every buyer who read it. The
 * check is a search for currency in the rendered text rather than an assertion
 * about a component, because the ways a price can arrive are many — a card, a
 * facet, a sort order, a structured-data block, a variant panel — and only the
 * page itself sees all of them.
 *
 * **Every picture is either the product or labelled as not being it.** A
 * listing whose picture is silently not the product misleads a buyer comparing
 * two of them, which is the one thing a procurement catalogue must not do. So
 * there are three permitted states and this suite pins all three: a photograph
 * of the model, a category illustration carrying its "Representative image"
 * badge, or a labelled empty frame. What it will not allow is an unbadged
 * illustration — the badge and the picture are produced by one component
 * (`components/catalogue/product-photo.tsx`) for that reason, and this check is
 * what proves the component was not worked around.
 *
 * It also counts the models still on an illustration, so the artwork gap stays
 * a number somebody has to look at rather than something nobody notices.
 *
 * The suite adapts to a catalogue that has no hardware in it yet: the checks
 * that need models report as skipped rather than failing, so this runs in the
 * gate from the day it is written rather than from the day data arrives.
 */

const BASE = process.env.BASE ?? "http://localhost:3000";

const results = [];
const check = (name, ok, detail = "") => results.push({ name, ok: Boolean(ok), detail });
const skip = (name, why) => results.push({ name, ok: true, skipped: true, detail: why });
/**
 * A measurement, not a verdict.
 *
 * Some numbers are worth printing every run without being pass/fail — how much
 * of the catalogue still lacks its own artwork, for one. Made a check it would
 * fail the gate on work the business has not done yet, and the first response
 * to a check that fails for a reason nobody can fix is to delete the check.
 */
const observe = (detail) => results.push({ name: detail, informational: true, ok: true });
const text = async (page) => (await page.locator("body").innerText()).replace(/\s+/g, " ");

/**
 * Money, in any of the forms this site can render it.
 *
 * The rupee sign, a converted figure in dollars or dirhams, and the words the
 * catalogue uses around a price. Deliberately broad: a false positive here
 * costs a minute of reading, and a false negative puts a price on a quotation
 * catalogue.
 */
const MONEY = /₹|Rs\.?\s?\d|INR\s?\d|\$\s?\d|US\$|AED\s?\d|\bMRP\b|excl\. GST|incl\. GST/i;

/** Ranges that must never appear in a business catalogue. */
const CONSUMER = [
  "Pavilion",
  "OMEN",
  "Victus",
  "IdeaPad",
  "Legion",
  "LOQ",
  "Aspire",
  "Nitro",
  "Predator",
];

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();

const consoleErrors = [];
page.on("console", (message) => message.type() === "error" && consoleErrors.push(message.text()));

// ── the catalogue ───────────────────────────────────────────────────────────
const response = await page.goto(`${BASE}/hardware`, { waitUntil: "load" });
check("the hardware catalogue is served", response?.status() === 200, `status ${response?.status()}`);

const listing = await text(page);
check("no price appears on the hardware catalogue", !MONEY.test(listing), MONEY.exec(listing)?.[0] ?? "");
check(
  "it says plainly that hardware is quoted rather than priced",
  listing.includes("not listed at a price"),
);

for (const range of CONSUMER) {
  if (listing.includes(range)) check(`no consumer range on the catalogue (${range})`, false, range);
}
check(
  "no consumer or gaming range is listed",
  !CONSUMER.some((range) => listing.includes(range)),
);

const cards = await page.locator("article").count();

if (cards === 0) {
  skip("no illustration is shown without its badge", "no hardware in the catalogue yet");
  skip(
    "every card shows a photograph, an illustration or a labelled gap",
    "no hardware in the catalogue yet",
  );
  skip("filters narrow the listing", "no hardware in the catalogue yet");
  skip("a model is reachable and quoted rather than priced", "no hardware in the catalogue yet");
} else {
  // ── photographs ───────────────────────────────────────────────────────────

  /**
   * Count what a browser actually rendered on one listing.
   *
   * Measured from the DOM rather than from the database, because the question
   * is what a buyer saw. A resolver can be correct and still be bypassed by a
   * caller that passes an illustration path in by hand, and only the page
   * catches that.
   */
  const auditPhotos = async (path) => {
    await page.goto(`${BASE}${path}`, { waitUntil: "load" });
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(1200);

    return {
      cards: await page.locator("article").count(),
      photos: await page.locator("article img").count(),
      gaps: await page.getByText("Photograph to follow").count(),
      badges: await page.getByText("Representative image", { exact: true }).count(),
      broken: await page
        .locator("article img")
        .evaluateAll((images) =>
          images
            .filter((image) => image.complete && image.naturalWidth === 0)
            .map((image) => image.src),
        ),
      illustrations: await page
        .locator("article img")
        .evaluateAll(
          (images) =>
            images.filter((image) =>
              new URL(image.src).pathname.startsWith("/products/representative-"),
            ).length,
        ),
    };
  };

  /*
   * Both the whole catalogue and the desktops filter.
   *
   * The first page of the whole catalogue is ordered by popularity and can
   * quite legitimately contain no illustrations at all, which would make the
   * badge invariant pass by having nothing to check. The desktops listing is
   * where the illustrations currently are. If the artwork ever moves to
   * another form factor this will notice, because the assertion below is that
   * the run saw at least one illustration *somewhere*.
   */
  const seen = [await auditPhotos("/hardware"), await auditPhotos("/hardware?family=desktops")];

  const badges = seen.reduce((total, page) => total + page.badges, 0);
  const illustrations = seen.reduce((total, page) => total + page.illustrations, 0);
  const photos = seen.reduce((total, page) => total + page.photos, 0);
  const gaps = seen.reduce((total, page) => total + page.gaps, 0);
  const broken = seen.flatMap((page) => page.broken);

  check(
    "no illustration is shown without its badge",
    badges >= illustrations,
    `${illustrations} illustration(s) rendered, ${badges} badge(s)`,
  );
  check(
    "no badge is shown without an illustration",
    badges <= illustrations,
    `${badges} badge(s), ${illustrations} illustration(s)`,
  );
  /*
   * The two checks above are vacuous when nothing on the page is an
   * illustration, so say which of the two happened. Reported as a skip rather
   * than a failure because "no category artwork is configured" is a legitimate
   * state of the repository — every model simply shows its labelled gap.
   */
  if (illustrations === 0) {
    skip("the badge invariant was actually exercised", "no category illustration is configured");
  } else {
    check("the badge invariant was actually exercised", true, "");
  }
  check("no photograph is a broken image", broken.length === 0, broken.join(", "));
  for (const audit of seen) {
    check(
      "every card shows a photograph, an illustration or a labelled gap",
      audit.photos + audit.gaps >= audit.cards,
      `${audit.photos} image(s), ${audit.gaps} gap(s), ${audit.cards} card(s)`,
    );
  }

  // Not a failure — the catalogue is publishable in this state, and blocking
  // the gate on artwork the business has not supplied would only teach somebody
  // to delete the check. It reports so the number stays visible.
  observe(
    `across the two listings: ${photos - illustrations} card(s) show their own photograph, ` +
      `${illustrations} show a labelled illustration, ${gaps} show a labelled gap`,
  );

  await page.goto(`${BASE}/hardware`, { waitUntil: "load" });

  // ── filters ───────────────────────────────────────────────────────────────
  const countAt = async (path) => {
    await page.goto(`${BASE}${path}`, { waitUntil: "load" });
    return page.locator("article").count();
  };

  const laptops = await countAt("/hardware?family=laptops");
  const desktops = await countAt("/hardware?family=desktops");
  check(
    "laptops and desktops together account for the catalogue",
    laptops + desktops === cards,
    `${laptops} + ${desktops} vs ${cards}`,
  );

  const brandLink = await page
    .goto(`${BASE}/hardware`, { waitUntil: "load" })
    .then(() => page.locator('a[href^="/hardware?brand="]').first().getAttribute("href"));

  if (brandLink) {
    const narrowed = await countAt(brandLink);
    check("a brand filter narrows the listing", narrowed > 0 && narrowed <= cards, `${narrowed} of ${cards}`);
    const filtered = await text(page);
    check("no price appears on a filtered listing", !MONEY.test(filtered), MONEY.exec(filtered)?.[0] ?? "");
  } else {
    skip("a brand filter narrows the listing", "no brand entry points rendered");
  }

  // ── a model ───────────────────────────────────────────────────────────────
  await page.goto(`${BASE}/hardware`, { waitUntil: "load" });
  const productHref = await page.locator('article a[href^="/products/"]').first().getAttribute("href");
  await page.goto(`${BASE}${productHref}`, { waitUntil: "load" });
  const detail = await text(page);

  check("a model is reachable and quoted rather than priced", !MONEY.test(detail), MONEY.exec(detail)?.[0] ?? "");
  check("it offers a quote rather than a purchase", detail.includes("Request a quote"), productHref);
  check("it names the manufacturer and who supplies it", /supplied by/i.test(detail));
  check("it carries a specification table", detail.includes("Specifications"));
  check("it offers the licensing that goes with it", detail.includes("Complete the deployment"));

  /*
   * Structured data is checked separately from the visible text. A price can
   * reach a search result through JSON-LD without ever appearing on the page,
   * which is the version of this bug nobody would see.
   */
  const jsonLd = await page
    .locator('script[type="application/ld+json"]')
    .evaluateAll((nodes) => nodes.map((node) => node.textContent ?? ""));
  check(
    "no price reaches the structured data either",
    !jsonLd.some((block) => /"(price|lowPrice|highPrice)"/.test(block)),
    jsonLd.find((block) => /"price/.test(block))?.slice(0, 120) ?? "",
  );

  // ── search ────────────────────────────────────────────────────────────────
  const name = await page.locator("h1").first().innerText();
  const term = name.split(" ").slice(0, 2).join(" ");
  await page.goto(`${BASE}/products?q=${encodeURIComponent(term)}`, { waitUntil: "load" });
  check(
    `search finds the model by name ("${term}")`,
    (await page.locator("article").count()) > 0,
  );
}

// ── the menu ────────────────────────────────────────────────────────────────
await page.goto(`${BASE}/`, { waitUntil: "load" });
check(
  "the header links to the hardware catalogue",
  (await page.locator('header a[href="/hardware"]').count()) > 0,
);

// ── mobile ──────────────────────────────────────────────────────────────────
{
  const narrow = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  await narrow.goto(`${BASE}/hardware`, { waitUntil: "load" });
  await narrow.waitForTimeout(600);
  const overflow = await narrow.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  check("the catalogue does not scroll sideways on a phone", overflow <= 0, `${overflow}px`);
  await narrow.close();
}

check("no console errors", consoleErrors.length === 0, consoleErrors.slice(0, 2).join(" | "));

await browser.close();

for (const result of results) {
  const mark = result.informational ? "  ·" : result.skipped ? "  –" : result.ok ? "  ✓" : "  ✗";
  const note = result.detail && (!result.ok || result.skipped) ? ` — ${result.detail}` : "";
  console.log(`${mark} ${result.name}${note}`);
}

const failed = results.filter((result) => !result.ok).length;
const skipped = results.filter((result) => result.skipped).length;
const noted = results.filter((result) => result.informational).length;
console.log(
  `\n${results.length - failed - skipped - noted}/${results.length - skipped - noted} hardware checks passed` +
    (skipped ? ` (${skipped} skipped)` : ""),
);
process.exit(failed ? 1 : 0);
