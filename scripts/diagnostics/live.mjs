/**
 * What the live site is actually serving.
 *
 * Read-only, and it runs on a GitHub Actions runner rather than a developer's
 * machine for one reason: the machine the work is done on cannot always reach
 * the production host, and "the deploy went green" is not evidence that a page
 * changed. Two findings in this codebase's audit were originally misdiagnosed
 * from the source and settled in minutes by reading production instead.
 *
 * It asserts the things the last release changed, and nothing else:
 *
 *   - the Microsoft URLs each state one purpose, and no two share a title or
 *     description;
 *   - the three hardware families are indexable landing pages with their own
 *     heading, while a family plus another filter is not;
 *   - robots.txt does not disallow a parameterised URL, which would stop a
 *     crawler ever reading the `noindex` on one;
 *   - a product's structured data states the basis of its prices;
 *   - the brand monogram is not in the document text;
 *   - the withdrawn duplicate server URLs redirect rather than 404.
 *
 * Everything it prints is already public: a title, a canonical, a robots tag
 * and a JSON-LD block are served to every visitor. Nothing here reads a
 * cookie, signs in, or touches the database, so there is nothing it could
 * disturb and nothing it could leak.
 *
 * Node's own `fetch`, so it needs no install step after the checkout.
 */

const SITE = (process.env.SITE ?? "https://techzoidtechnologies.com").replace(/\/$/, "");

const results = [];
const check = (label, ok, detail = "") => {
  results.push({ label, ok });
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${label}${ok || !detail ? "" : `\n          ${detail}`}`);
};

const slept = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * One page, with one retry.
 *
 * A container that has just restarted answers the first request slowly or not
 * at all, and this is meant to run immediately after a deploy. A single
 * timeout would be reported as a missing page, which is the wrong conclusion
 * and the sort that sends somebody looking in the wrong place.
 */
async function fetchPage(path, { redirect = "follow" } = {}) {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await fetch(`${SITE}${path}`, {
        redirect,
        headers: { "user-agent": "techzoid-live-diagnostics" },
      });
      const body = redirect === "manual" ? "" : await response.text();
      return { status: response.status, location: response.headers.get("location"), body };
    } catch (error) {
      if (attempt === 1) return { status: 0, location: null, body: "", error: String(error) };
      await slept(3000);
    }
  }
  return { status: 0, location: null, body: "" };
}

const decode = (value) =>
  value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)));

function metaOf(body) {
  const one = (pattern) => {
    const found = pattern.exec(body);
    return found ? decode(found[1]).trim() : "";
  };
  return {
    title: one(/<title>([\s\S]*?)<\/title>/),
    description: one(/<meta name="description" content="([\s\S]*?)"/),
    canonical: one(/<link rel="canonical" href="([\s\S]*?)"/),
    robots: one(/<meta name="robots" content="([\s\S]*?)"/),
    h1: one(/<h1[^>]*>([\s\S]*?)<\/h1>/).replace(/<[^>]+>/g, "").trim(),
  };
}

/** The document's visible words, near enough for a doubled-letter check. */
function textOf(body) {
  const main = /<main[\s\S]*?<\/main>/.exec(body)?.[0] ?? body;
  return decode(
    main
      .replace(/<script[\s\S]*?<\/script>/g, " ")
      .replace(/<style[\s\S]*?<\/style>/g, " ")
      .replace(/<[^>]+>/g, " "),
  ).replace(/\s+/g, " ");
}

console.log(`Reading ${SITE}\n`);

// ── the site is serving at all ─────────────────────────────────────────────
console.log("Serving");
const root = await fetchPage("/");
check("the home page answers 200", root.status === 200, root.error ?? `status ${root.status}`);

if (root.status !== 200) {
  console.log("\nThe site is not answering; nothing below would mean anything. Stopping.");
  process.exit(1);
}

// ── one purpose per Microsoft URL ──────────────────────────────────────────
console.log("\nMicrosoft URLs, one purpose each");

const MICROSOFT = [
  "/microsoft",
  "/microsoft-365",
  "/microsoft-office",
  "/microsoft-office-ltsc",
  "/microsoft-licensing",
  "/microsoft-csp",
  "/brands/microsoft",
];

const microsoft = new Map();
for (const path of MICROSOFT) {
  const page = await fetchPage(path);
  if (page.status !== 200) {
    check(`${path} answers 200`, false, `status ${page.status}`);
    continue;
  }
  microsoft.set(path, metaOf(page.body));
}

for (const [path, entry] of microsoft) {
  check(`${path} is indexable`, !/noindex/i.test(entry.robots), `robots: ${entry.robots}`);
  check(`${path} canonicalises to itself`, entry.canonical.endsWith(path), entry.canonical);
}

for (const field of ["title", "description"]) {
  const seen = new Map();
  const collisions = [];
  for (const [path, entry] of microsoft) {
    const value = entry[field].trim().toLowerCase();
    if (!value) continue;
    if (seen.has(value)) collisions.push(`${seen.get(value)} and ${path} both: "${entry[field]}"`);
    else seen.set(value, path);
  }
  check(`no two share a ${field}`, collisions.length === 0, collisions.join("\n          "));
}

/*
 * The content migration is what carries these three, so a failure here is the
 * one that matters most: it means the release deployed and the copy did not.
 */
check(
  "/microsoft-365 names the product in its title",
  /microsoft 365/i.test(microsoft.get("/microsoft-365")?.title ?? ""),
  microsoft.get("/microsoft-365")?.title ?? "(not read)",
);
check(
  "/microsoft-office is positioned as the LTSC comparison",
  /ltsc/i.test(microsoft.get("/microsoft-office")?.title ?? ""),
  microsoft.get("/microsoft-office")?.title ?? "(not read)",
);
check(
  "/brands/microsoft is titled as a catalogue",
  /catalogue/i.test(microsoft.get("/brands/microsoft")?.title ?? ""),
  microsoft.get("/brands/microsoft")?.title ?? "(not read)",
);

// ── the catalogue's indexation rules ──────────────────────────────────────
console.log("\nCatalogue indexation");

const families = new Map();
for (const family of ["laptops", "desktops", "servers"]) {
  const page = await fetchPage(`/hardware?family=${family}`);
  if (page.status !== 200) {
    check(`/hardware?family=${family} answers 200`, false, `status ${page.status}`);
    continue;
  }
  const entry = metaOf(page.body);
  families.set(family, entry);
  check(`/hardware?family=${family} is indexable`, !/noindex/i.test(entry.robots), `robots: ${entry.robots}`);
  check(`  canonicalises to itself`, entry.canonical.includes(`family=${family}`), entry.canonical);
  check(
    `  and has its own heading`,
    !/commercial computers for business and enterprise/i.test(entry.h1),
    entry.h1,
  );
}

check(
  "each family heading is distinct",
  new Set([...families.values()].map((entry) => entry.h1)).size === families.size,
  [...families.values()].map((entry) => entry.h1).join(" / "),
);

for (const path of [
  "/hardware?family=servers&sort=price-asc",
  "/products?category=software",
  "/products?sort=price-asc",
]) {
  const page = await fetchPage(path);
  const entry = metaOf(page.body);
  check(`${path} is noindex`, /noindex/i.test(entry.robots), entry.robots || "(no robots meta)");
}

const robots = await fetchPage("/robots.txt");
const disallowsAQuery = robots.body
  .split("\n")
  .map((line) => line.trim())
  .filter((line) => /^Disallow:/i.test(line) && line.includes("?"));
check(
  "robots.txt disallows no parameterised URL",
  disallowsAQuery.length === 0,
  disallowsAQuery.join(" | "),
);
check(
  "robots.txt still disallows the transactional paths",
  ["/admin", "/account", "/api/", "/login"].every((path) => robots.body.includes(`Disallow: ${path}`)),
  robots.body.slice(0, 300),
);

// ── a price states its basis ──────────────────────────────────────────────
console.log("\nPrice basis in structured data");

const productPage = await fetchPage("/products/microsoft-365-business-standard");
if (productPage.status !== 200) {
  check("the product page answers 200", false, `status ${productPage.status}`);
} else {
  let product = null;
  for (const [, block] of productPage.body.matchAll(
    /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g,
  )) {
    try {
      const parsed = JSON.parse(decode(block));
      if (parsed?.["@type"] === "Product") product = parsed;
    } catch {
      /* a block that is not JSON is a different diagnostic's problem */
    }
  }

  check("the product page emits a Product block", product !== null);

  const aggregate = product?.offers;
  check("with an aggregate offer", aggregate?.["@type"] === "AggregateOffer");
  check(
    "that states the range excludes GST",
    aggregate?.valueAddedTaxIncluded === false,
    `valueAddedTaxIncluded: ${aggregate?.valueAddedTaxIncluded}`,
  );

  const offers = aggregate?.offers ?? [];
  const prices = offers.map((offer) => Number(offer.price));
  check(
    "a high price as well as a low one",
    prices.length < 2 || Math.max(...prices) === Math.min(...prices)
      ? true
      : Number(aggregate?.highPrice) === Math.max(...prices),
    `lowPrice ${aggregate?.lowPrice}, highPrice ${aggregate?.highPrice}, actual ${Math.min(...prices)}–${Math.max(...prices)}`,
  );

  const visible = textOf(productPage.body);
  for (const offer of offers) {
    const spec = offer.priceSpecification;
    check(
      `${offer.sku} states its price basis`,
      spec?.["@type"] === "UnitPriceSpecification" && spec.valueAddedTaxIncluded === false,
      JSON.stringify(spec) ?? "(none)",
    );
    const formatted = Number(offer.price).toLocaleString("en-IN", { maximumFractionDigits: 0 });
    check(
      `  and appears on the page as ₹${formatted}`,
      visible.includes(formatted),
      `₹${formatted} is in the markup and not on the page`,
    );
  }
}

// ── the monogram, and the withdrawn URLs ──────────────────────────────────
console.log("\nEarlier repairs, still holding");

const brands = await fetchPage("/brands");
const brandText = textOf(brands.body);
const doubled = /\b([A-Z])\1[a-z]{2,}/.exec(brandText);
check(
  "no brand monogram is in the document text",
  doubled === null,
  doubled ? `found "${doubled[0]}"` : "",
);

for (const [withdrawn, survivor] of [
  ["/products/dell-poweredge-r760-server", "dell-poweredge-r760"],
  ["/products/hpe-proliant-dl380-server", "hpe-proliant-dl380-gen11"],
]) {
  const page = await fetchPage(withdrawn, { redirect: "manual" });
  check(
    `${withdrawn} redirects rather than 404s`,
    page.status >= 300 && page.status < 400 && (page.location ?? "").includes(survivor),
    `status ${page.status}, location ${page.location ?? "(none)"}`,
  );
}

const delhi = await fetchPage("/software-licensing-company-delhi");
check("the Delhi page is served", delhi.status === 200, `status ${delhi.status}`);
check(
  "and is linked from the footer of the home page",
  root.body.includes('href="/software-licensing-company-delhi"'),
  "no link to it in the home page markup",
);

// ── result ────────────────────────────────────────────────────────────────
const failed = results.filter((result) => !result.ok).length;
console.log(`\n${results.length - failed}/${results.length} live checks passed`);

if (failed > 0) {
  console.log(
    "\nA failure here means the deploy succeeded and the page did not change.\n" +
      "The usual cause is a content migration that did not run: the container\n" +
      "entrypoint applies them, so check the container's startup log before\n" +
      "changing anything in the repository.",
  );
}

process.exit(failed ? 1 : 0);
