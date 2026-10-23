/**
 * What the live catalogue is actually listing, as a report rather than a test.
 *
 * `live.mjs` asserts facts somebody already knew to check. This prints the
 * rows, which is what answers "the page is showing something I do not
 * recognise" — a name, a SKU and a figure, straight off the rendered card,
 * next to what this branch would produce for the same slug.
 *
 * Read-only, and everything it prints is served to every visitor.
 *
 *   node scripts/diagnostics/catalogue.mjs /brands/adobe
 */

const SITE = (process.env.SITE ?? "https://techzoidtechnologies.com").replace(/\/$/, "");
const PATHS = process.argv.slice(2);
if (PATHS.length === 0) PATHS.push("/brands/adobe");

const decode = (value) =>
  value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)));

/**
 * One card per product anchor.
 *
 * The anchor on the title is the only reliable landmark: the class strings
 * around it are Tailwind and change whenever the card is restyled, so keying
 * off them would make this report go quiet rather than wrong — which is the
 * failure mode worth avoiding in something whose whole job is to be read.
 */
function cards(body) {
  const anchors = [...body.matchAll(/href="\/products\/([a-z0-9-]+)"[^>]*>([^<]*)</g)];
  const seen = new Set();
  const rows = [];

  for (const [index, match] of anchors.entries()) {
    const slug = match[1];
    const name = decode(match[2]).trim();
    // "View details" and the card's other links point at the same slug.
    if (!name || seen.has(slug)) continue;
    seen.add(slug);

    const start = match.index;
    const end = anchors[index + 1]?.index ?? Math.min(body.length, start + 4000);
    const chunk = body.slice(start, end);

    const sku = /font-mono[^>]*>([^<]+)</.exec(chunk)?.[1]?.trim() ?? "—";
    const rupees = /&#x20B9;([\d,]+)|₹([\d,]+)/.exec(chunk);
    const price = rupees ? `₹${rupees[1] ?? rupees[2]}` : "quoted";

    rows.push({ slug, name, sku, price });
  }
  return rows;
}

for (const path of PATHS) {
  const response = await fetch(`${SITE}${path}`, {
    headers: { "user-agent": "techzoid-live-diagnostics" },
  });
  const body = await response.text();
  console.log(`\n${path}  →  ${response.status}`);
  if (response.status !== 200) continue;

  const rows = cards(body);
  console.log(`${rows.length} product card(s)\n`);
  for (const row of rows) {
    console.log(`  ${row.price.padStart(12)}  ${row.sku.padEnd(24)}  ${row.slug}`);
    console.log(`                ${row.name}`);
  }
}
