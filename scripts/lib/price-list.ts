import { createHash } from "node:crypto";
import type { LicenceType, VariantAudience } from "@prisma/client";

import { readSheet } from "./xlsx";

/**
 * Postgres's `int4` bound — the same value `src/lib/pricing.ts` guards prices
 * with at write time. Duplicated rather than imported: these import scripts
 * are meant to run standalone, including inside the production container,
 * which ships the compiled `.next` build but never the `src/` tree a script
 * would need to import from.
 */
const MAX_AMOUNT_MINOR = 2_147_483_647;

/**
 * What a publisher's price list means.
 *
 * Reading a spreadsheet and writing to a database are two jobs, and only one of
 * them can be tested without a database in front of it. This file is the first:
 * given the rows, which products exist, which licence options sit beneath them,
 * what each is called, and what it costs. `scripts/import-price-list.ts` is the
 * second, and holds the command line and the writes.
 *
 * ## Two shapes of file
 *
 * The single-sheet exports name a product id, a SKU title, a billing plan, a
 * segment and one price. The channel workbook carries all of that on four tabs,
 * plus a SKU id, an explicit term, and — the reason for the care below — the
 * price this company pays.
 *
 * Columns are resolved by the name in the header row rather than by position,
 * because the two shapes put the same fields in different columns and a future
 * export will move them again. A fixed index that has quietly shifted does not
 * fail; it publishes the wrong number.
 *
 * ## Only ERP is read
 *
 * The channel workbook holds `Unit SELL Price`, `Discounted Price`, `Discount %`
 * and `Total` beside `ERP`. Unit SELL sits below ERP on every one of its rows —
 * it is the buy price, and the gap between the two is this company's margin.
 * None of those columns is read: the price column is found by the name `ERP`
 * alone, and `priceColumn` refuses to return a column whose header looks like a
 * cost. A catalogue page is a customer-facing surface, and a cost published
 * there is a margin published there.
 *
 * ## What the source says, and what is inferred
 *
 * **The term.** The channel workbook states it — `P1M`, `P1Y`, `P3Y` — and it is
 * taken at its word. The older single-sheet exports do not, so for those the
 * previous rule still applies: a (id, title, segment) key holding two prices in
 * a 3x ratio is the annual and three-year commitment of one SKU, and a pair in
 * any other ratio is left alone and reported, because a guess there would be a
 * wrong price rather than a missing one.
 *
 * **How it is billed.** `BillingPlan` separates an annual commitment paid up
 * front from the same commitment paid monthly, which the publisher charges
 * about 5% more for. Both are real options, so both are listed — but only where
 * the two prices actually differ. Several sheets carry one total under two
 * billing plans a few paise apart, and listing that twice would put two options
 * on a page that nobody could tell apart.
 *
 * **Who a price is for.** The segment column is authoritative, not the title.
 * Rows carry no "(Education ... Pricing)" suffix while the column says
 * Education — "Student Use Benefit", "for faculty", "Edu Sub" — and reading the
 * title instead would publish an academic rate as a commercial one. The suffix
 * is used only to strip the audience back out of the display name.
 *
 * Nothing else is added. Product descriptions state the licence types, terms and
 * audiences present in the data and stop there; this file has no basis for a
 * sentence about what a product does, and inventing one would put marketing
 * copy for somebody else's software under this company's name.
 */


// ─────────────────────────────────────────────────────────── source parsing

export type Source = "nce" | "est" | "perpetual" | "subscription";

/**
 * The channel workbook's tabs, by the name printed on the tab.
 *
 * `SUBSCRIPION` is not a second sheet: it is the same "Subscription" tab
 * under a misspelling this distributor's own export has carried before and
 * carried again in the September 2026 workbook — same header shape (Publisher,
 * ProductId, SkuId, SkuTitle, Segment, TermDuration, BillingPlan, ERP), same
 * row count class as prior "Subscription" tabs. Listed as its own alias rather
 * than matched loosely, so a *genuinely* unrecognised tab still stops the
 * import instead of being guessed at.
 */
export const WORKBOOK_SHEETS: Record<string, Source> = {
  NCE: "nce",
  EST: "est",
  PERPETUAL: "perpetual",
  SUBSCRIPTION: "subscription",
  SUBSCRIPION: "subscription",
};

export type Row = {
  source: Source;
  productId: string;
  title: string;
  segment: string;
  /** Months, or null for a perpetual licence and for a term the file omits. */
  termMonths: number | null;
  /** Whether the file settled the term, as against this being worked out below. */
  termStated: boolean;
  billedMonthly: boolean;
  /** Whole rupees. Always the ERP figure — see the note above. */
  priceMajor: number;
};

/**
 * Column headers that must never be read as a price.
 *
 * Not a second line of defence on an already-narrow lookup: it is the defence.
 * `ERP` is what the price column is called on all seven sheets this script has
 * seen, and if an export renames it the right outcome is a refusal to import,
 * not a fallback onto whichever neighbouring column also holds rupees — because
 * the neighbouring column is the cost.
 */
export const COST_HEADERS = /sell|discount|margin|cost|landed|buy|total|net\s*price|purchase/i;

export function headerIndex(head: string[], name: string): number {
  return head.findIndex((cell) => cell.trim().toLowerCase() === name.toLowerCase());
}

/** The ERP column, or nothing. Never a column whose name reads like a cost. */
export function priceColumn(head: string[]): number {
  const index = head.findIndex((cell) => /^erp\b/i.test(cell.trim()));
  if (index < 0) return -1;
  if (COST_HEADERS.test(head[index] ?? "")) return -1;
  return index;
}

/** "P1Y" to 12. Anything else is reported by the caller rather than guessed at. */
export function monthsOf(term: string): number | null {
  const match = /^P(\d+)([MY])$/i.exec(term.trim());
  if (!match) return null;
  const count = Number.parseInt(match[1] ?? "", 10);
  if (!Number.isFinite(count) || count <= 0) return null;
  return match[2]?.toUpperCase() === "Y" ? count * 12 : count;
}

export type Parsed = {
  rows: Row[];
  /** Whether the sheet has a TermDuration column, which decides the term rule. */
  hasTermColumn: boolean;
  /** Cost columns present in the file and deliberately not read. */
  ignoredColumns: string[];
  /** Terms in a shape this script does not recognise. */
  badTerms: string[];
};

export function parseSheet(path: string, source: Source, sheetName?: string): Parsed {
  const sheet = readSheet(path, sheetName);
  const where = sheetName ? `${path} [${sheetName}]` : path;
  if (sheet.length < 2) throw new Error(`${where}: no data rows.`);

  const head = sheet[0] ?? [];
  const iProduct = headerIndex(head, "ProductId");
  const iTitle = headerIndex(head, "SkuTitle");
  const iSegment = headerIndex(head, "Segment");
  const iTerm = headerIndex(head, "TermDuration");
  const iBilling = headerIndex(head, "BillingPlan");
  const iPrice = priceColumn(head);

  for (const [label, index] of [
    ["ProductId", iProduct],
    ["SkuTitle", iTitle],
    ["Segment", iSegment],
  ] as const) {
    if (index < 0) throw new Error(`${where}: no "${label}" column. Header: ${head.join(" | ")}`);
  }

  if (iPrice < 0) {
    throw new Error(
      `${where}: no ERP column, and nothing else in this file may be published as a price. ` +
        `Header: ${head.join(" | ")}`,
    );
  }

  const ignoredColumns = head.filter(
    (cell, index) => index !== iPrice && cell !== "" && COST_HEADERS.test(cell),
  );
  const badTerms: string[] = [];
  const rows: Row[] = [];

  for (const cells of sheet.slice(1)) {
    const productId = (cells[iProduct] ?? "").trim();
    const title = (cells[iTitle] ?? "").trim();
    if (!productId && !title) continue;

    let termMonths: number | null = null;
    let termStated = false;

    if (iTerm >= 0) {
      const raw = (cells[iTerm] ?? "").trim();
      if (raw) {
        termMonths = monthsOf(raw);
        termStated = termMonths !== null;
        if (termMonths === null) badTerms.push(`${raw} — ${title}`);
      }
    }

    // A perpetual licence has no term, and says so by having no term column.
    if (source === "perpetual") {
      termMonths = null;
      termStated = true;
    }

    const billing = iBilling >= 0 ? (cells[iBilling] ?? "").trim().toLowerCase() : "";
    const priceMajor = Number.parseFloat(cells[iPrice] ?? "");

    rows.push({
      source,
      productId,
      title,
      segment: (cells[iSegment] ?? "").trim(),
      termMonths,
      termStated,
      // A one-month term is billed monthly by definition. Saying so on the page
      // would be a distinction without a difference, and it is not a premium.
      billedMonthly: billing === "monthly" && termMonths !== 1,
      priceMajor: Number.isFinite(priceMajor) ? priceMajor : Number.NaN,
    });
  }

  return { rows, hasTermColumn: iTerm >= 0, ignoredColumns, badTerms };
}

/**
 * Confirms the segment column is the one that determines price.
 *
 * Only for sheets that do not state a term. If a single (id, title, segment) key
 * holds two prices that are not an annual/three-year pair, the column being read
 * is not the one that varies the price — which is exactly what happens if an
 * export swaps the perpetual list's two "Segment" columns. Better to stop than
 * to publish the wrong half.
 */
export function checkSegmentColumn(rows: Row[], source: Source): string[] {
  const groups = new Map<string, number[]>();
  for (const row of rows) {
    const key = `${row.productId} ${row.title} ${row.segment}`;
    groups.set(key, [...(groups.get(key) ?? []), row.priceMajor]);
  }

  const suspect: string[] = [];
  for (const [key, prices] of groups) {
    const distinct = [...new Set(prices.filter((value) => value > 0))].sort((a, b) => a - b);
    const [lower, higher] = distinct;
    if (distinct.length < 2 || lower === undefined || higher === undefined) continue;
    if (distinct.length === 2 && isTriennialPair(lower, higher)) continue;
    suspect.push(`${source}: ${key.split(" ")[1]} — ${distinct.join(", ")}`);
  }
  return suspect;
}

/** Within 1%, to absorb the publisher's own rounding on a per-month figure. */
export function isTriennialPair(lower: number, higher: number): boolean {
  if (lower <= 0) return false;
  return Math.abs(higher / lower - 3) < 0.01;
}

/**
 * Whether two figures are the same money written twice.
 *
 * The sheets derive a term total from a per-month unit price, so one amount
 * arrives as 15293 under one billing plan and 15293.01 under another. Half a
 * percent sits far below the ~5% charged for paying monthly and far above that
 * rounding, so it tells a real second option from a duplicate one.
 */
export function sameMoney(a: number, b: number): boolean {
  const larger = Math.max(a, b);
  if (larger <= 0) return true;
  return Math.abs(a - b) / larger < 0.005;
}

// ──────────────────────────────────────────────────────── interpretation

const AUDIENCE: Record<string, VariantAudience> = {
  commercial: "COMMERCIAL",
  education: "EDUCATION",
  charity: "NON_PROFIT",
  "non-profit": "NON_PROFIT",
  nonprofit: "NON_PROFIT",
};

export function audienceOf(segment: string): VariantAudience | null {
  return AUDIENCE[segment.trim().toLowerCase()] ?? null;
}

/**
 * The display name, with the audience taken back out.
 *
 * "Advanced Communications (Education Student Pricing)" and "Advanced
 * Communications" are one product at two prices, not two products. The suffix
 * also appears mid-title ("... (Non-Profit Pricing) - 3 Year"), so this is not
 * anchored to the end. Normalised first because one row uses a non-breaking
 * hyphen in "Non-Profit".
 *
 * Term markers such as "(36mo)" are deliberately not stripped, even though the
 * term now arrives separately. A title carrying one is already a product with
 * its own page and its own address, and folding it into its sibling would retire
 * a URL to tidy up a name.
 */
export const AUDIENCE_SUFFIX = /\s*\(([^()]*(?:Pricing|Use Benefit)[^()]*)\)/gi;

export function baseName(title: string): string {
  return title
    .normalize("NFKC")
    .replace(/‑/g, "-")
    .replace(AUDIENCE_SUFFIX, " ")
    .replace(/\s{2,}/g, " ")
    .replace(/\s*[-–]\s*$/, "")
    .trim();
}

export function slugify(value: string): string {
  return value
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "");
}

/**
 * What kind of licence this is.
 *
 * By source, except that a one-month term is a monthly subscription whichever
 * sheet it arrived on — that is what the field is for, and the product page
 * prints it.
 */
export function licenceTypeFor(source: Source, termMonths: number | null): LicenceType {
  if (source === "perpetual") return "PERPETUAL";
  if (termMonths === 1) return "SUBSCRIPTION_MONTHLY";
  return source === "subscription" ? "SUBSCRIPTION_ANNUAL" : "CSP";
}

/**
 * A stable SKU.
 *
 * The publisher's own product id arrived with the channel workbook, and is
 * deliberately not used alone as this key: every SKU already in the catalogue
 * was keyed by this formula, and changing it would archive the whole
 * Microsoft catalogue and write it again under new keys, breaking the link
 * from every past order line. It is still captured — see `partNumber` on
 * `VariantPlan`, which is the manufacturer's own identifier shown to a buyer
 * comparing against their own copy of the price list, kept separate from this
 * site's internal key.
 *
 * So the key stays what it was — the product id, the audience, the term and a
 * digest of the exact title — with one addition. An annual commitment billed
 * monthly is a second option at the same term, and it takes an `M`. The up-front
 * option takes no suffix, which is what leaves every key the previous import
 * wrote still matching.
 */
export function skuFor(
  row: Row,
  audience: VariantAudience,
  termMonths: number | null,
  billedMonthly: boolean,
): string {
  const digest = createHash("sha256").update(row.title.normalize("NFKC")).digest("hex").slice(0, 6);
  const audienceCode = audience === "COMMERCIAL" ? "C" : audience === "EDUCATION" ? "E" : "N";
  const term = termMonths === null ? "P" : String(termMonths);
  return `${row.productId}-${audienceCode}${term}${billedMonthly ? "M" : ""}-${digest}`.toUpperCase();
}

/** Category by keyword, most specific first. Unmatched products fall to a parent. */
const CATEGORY_RULES: Array<[RegExp, string]> = [
  [
    /\b(dynamics 365|power apps|power automate|power pages|power platform|power virtual agent|business central|dataverse)\b/i,
    "crm-sales",
  ],
  [/\bpower bi\b/i, "analytics-bi"],
  [/\b(sql server|azure sql|biztalk|sql 20\d\d|big data)\b/i, "database-servers"],
  [/\b(windows server|system center|remote desktop|rms cal|server 20\d\d)\b/i, "server-os"],
  [/\b(windows 1[01]|windows ltsc|windows 365|windows enterprise)\b/i, "desktop-os"],
  [
    /\b(defender|sentinel|purview|security|threat|ediscovery|audit log|data residency|cloud pki|priva|compliance manager|insider risk|rights management)\b/i,
    "endpoint-protection",
  ],
  [/\b(entra|intune|identity|access|azure ad|conditional access)\b/i, "identity-access"],
  [
    /\b(exchange|teams|sharepoint|onedrive|viva|communications|skype|operator connect|planner|stream|dial-out)\b/i,
    "email-collaboration",
  ],
  [/\b(microsoft 365|office 365|copilot|m365)\b/i, "microsoft-365-plans"],
  [
    /\b(visio|project|access ltsc|word|excel|powerpoint|publisher|office ltsc|outlook)\b/i,
    "office-suites",
  ],
  [/\b(clipchamp)\b/i, "single-creative-apps"],
];

export const FALLBACK_CATEGORY = "productivity-collaboration";

/**
 * The denormalised search haystack, built here rather than imported.
 *
 * `lib/search-text` is the authority for this and would be the obvious import,
 * but it is marked `server-only` and refuses to load outside a React server
 * context — a command-line script is exactly that. The seed script keeps its
 * own copy for the same reason; this is the third, and all three must agree on
 * the field order because the trigram index is built over the result.
 */
export function buildSearchText(input: {
  name: string;
  brandName: string;
  categoryName: string;
  shortDescription: string;
  keywords: string[];
  skus: string[];
}): string {
  return [
    input.name,
    input.brandName,
    input.categoryName,
    input.shortDescription,
    ...input.keywords,
    ...input.skus,
  ]
    .join(" ")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 2000);
}

export function categoryFor(name: string): string {
  for (const [pattern, slug] of CATEGORY_RULES) if (pattern.test(name)) return slug;
  return FALLBACK_CATEGORY;
}

// ────────────────────────────────────────────────────────────── shaping

export type VariantPlan = {
  sku: string;
  name: string;
  audience: VariantAudience;
  licenceType: LicenceType;
  termMonths: number | null;
  billedMonthly: boolean;
  listPriceMinor: number;
  /**
   * Microsoft's own Product ID for this row — distinct from `sku`, which is
   * this site's key (see `skuFor`). Every row in the group `plan()` builds
   * this variant from shares one `productId`, because it is part of the key
   * that group was formed from, so `first.productId` is exact rather than a
   * representative sample.
   */
  partNumber: string;
};

export type ProductPlan = {
  slug: string;
  name: string;
  categorySlug: string;
  variants: VariantPlan[];
};

export type Skipped = { title: string; segment: string; why: string };

/** One purchasable option: a term, a way of paying for it, and a price. */
export type Option = { termMonths: number | null; billedMonthly: boolean; price: number };

/**
 * Options from a sheet that states the term.
 *
 * Each (term, billing) pair is one option. A pair arriving twice at figures that
 * differ only by rounding is one price written two ways, so the larger is taken;
 * a genuine spread is reported, because the two figures cannot both be right.
 * Finally a monthly-billed option that costs the same as paying up front is
 * dropped: it is the same money on a different schedule, and listing it would
 * put two indistinguishable rows on the page.
 */
export function optionsFromStatedTerms(rows: Row[], report: (why: string) => void): Option[] {
  const buckets = new Map<string, { termMonths: number | null; billedMonthly: boolean; prices: number[] }>();

  for (const row of rows) {
    const key = `${row.termMonths ?? "P"}|${row.billedMonthly}`;
    const bucket = buckets.get(key) ?? {
      termMonths: row.termMonths,
      billedMonthly: row.billedMonthly,
      prices: [],
    };
    bucket.prices.push(row.priceMajor);
    buckets.set(key, bucket);
  }

  const options: Option[] = [];
  for (const bucket of buckets.values()) {
    const distinct = [...new Set(bucket.prices)].sort((a, b) => a - b);
    const lowest = distinct[0] as number;
    const highest = distinct[distinct.length - 1] as number;
    if (distinct.length > 1 && !sameMoney(lowest, highest)) {
      report(`one term priced ${distinct.join(", ")}; the highest was taken`);
    }
    options.push({
      termMonths: bucket.termMonths,
      billedMonthly: bucket.billedMonthly,
      price: highest,
    });
  }

  return options.filter((option) => {
    if (!option.billedMonthly) return true;
    const upfront = options.find(
      (other) => !other.billedMonthly && other.termMonths === option.termMonths,
    );
    return !upfront || !sameMoney(upfront.price, option.price);
  });
}

/**
 * Options from a sheet that does not state the term.
 *
 * The older exports carry one price column and nothing that separates an annual
 * commitment from a three-year one. The ratio between two prices under one key
 * is the only thing that does, and only when it is exactly three.
 */
export function optionsFromPriceRatio(
  rows: Row[],
  source: Source,
  report: (why: string) => void,
): Option[] {
  const prices = [...new Set(rows.map((row) => row.priceMajor))].sort((a, b) => a - b);
  const cheapest = prices[0] as number;
  const second = prices[1];

  if (source === "perpetual") {
    return [{ termMonths: null, billedMonthly: false, price: prices[prices.length - 1] as number }];
  }

  if (prices.length === 2 && second !== undefined && isTriennialPair(cheapest, second)) {
    return [
      { termMonths: 12, billedMonthly: false, price: cheapest },
      { termMonths: 36, billedMonthly: false, price: second },
    ];
  }

  for (const extra of prices.slice(1)) {
    report(`second price ${extra} is not 3x ${cheapest}; term unknown`);
  }

  return [{ termMonths: 12, billedMonthly: false, price: cheapest }];
}

export function plan(rows: Row[]): { products: ProductPlan[]; skipped: Skipped[] } {
  const skipped: Skipped[] = [];

  /*
   * Grouped by (id, title, segment): one product, for one audience. Which
   * options sit beneath that key is settled per group, because the answer
   * depends on whether the sheet the rows came from stated a term.
   */
  const groups = new Map<string, Row[]>();
  for (const row of rows) {
    const key = `${row.productId} ${row.title} ${row.segment}`;
    groups.set(key, [...(groups.get(key) ?? []), row]);
  }

  const byProduct = new Map<string, ProductPlan>();
  const takenSlugs = new Map<string, string>();
  const takenSkus = new Set<string>();

  for (const members of groups.values()) {
    const first = members[0];
    if (!first) continue;
    const audience = audienceOf(first.segment);

    if (!audience) {
      skipped.push({ title: first.title, segment: first.segment, why: "unrecognised segment" });
      continue;
    }

    /*
     * A zero here is a genuinely free SKU, or a trial. Neither is imported: a
     * zero-rupee catalogue line becomes a free order, and "included at no
     * charge" is a sales conversation rather than a checkout.
     */
    const priced = members.filter((row) => Number.isFinite(row.priceMajor) && row.priceMajor > 0);
    if (priced.length === 0) {
      skipped.push({ title: first.title, segment: first.segment, why: "no price" });
      continue;
    }

    const report = (why: string) =>
      skipped.push({ title: first.title, segment: first.segment, why });

    const options = priced.every((row) => row.termStated)
      ? optionsFromStatedTerms(priced, report)
      : optionsFromPriceRatio(priced, first.source, report);

    const name = baseName(first.title);
    if (!name) {
      skipped.push({ title: first.title, segment: first.segment, why: "empty name" });
      continue;
    }

    // Slugs are claimed by name, so two products that normalise to the same
    // slug get suffixed rather than silently overwriting one another.
    let slug = slugify(name);
    if (!slug) slug = `sku-${first.productId.toLowerCase()}`;
    const owner = takenSlugs.get(slug);
    if (owner && owner !== name) {
      slug = `${slug}-${first.productId.slice(-4).toLowerCase()}`;
    }
    takenSlugs.set(slug, name);

    const product =
      byProduct.get(slug) ??
      (() => {
        const created: ProductPlan = {
          slug,
          name,
          categorySlug: categoryFor(name),
          variants: [],
        };
        byProduct.set(slug, created);
        return created;
      })();

    for (const option of options) {
      const sku = skuFor(first, audience, option.termMonths, option.billedMonthly);
      if (takenSkus.has(sku)) continue;
      takenSkus.add(sku);

      /*
       * Prices are stored in paise as a 32-bit integer, so anything above
       * Rs 2,14,74,836 does not fit — and a handful of Dynamics 365 tiers are
       * well past it, especially at the three-year commitment.
       *
       * Those are listed at zero, which the catalogue already renders as "On
       * quote" and which the order path already refuses to sell. The product
       * stays visible and enquirable with an honest absence of a figure, rather
       * than being dropped or, worse, shown a wrapped number.
       */
      const listPriceMinor = Math.round(option.price * 100);
      const storable = listPriceMinor <= MAX_AMOUNT_MINOR;

      if (!storable) {
        report("above the maximum storable price; listed on quote");
      }

      product.variants.push({
        sku,
        name: variantName(first.title, audience, option.termMonths, option.billedMonthly),
        audience,
        licenceType: licenceTypeFor(first.source, option.termMonths),
        termMonths: option.termMonths,
        billedMonthly: option.billedMonthly,
        listPriceMinor: storable ? listPriceMinor : 0,
        partNumber: first.productId,
      });
    }
  }

  return { products: [...byProduct.values()], skipped };
}

/** "Annual commitment", "Three-year commitment", and so on. */
export function termLabel(termMonths: number | null): string {
  if (termMonths === null) return "Perpetual licence";
  if (termMonths === 1) return "Monthly subscription";
  if (termMonths === 12) return "Annual commitment";
  if (termMonths === 36) return "Three-year commitment";
  if (termMonths % 12 === 0) return `${termMonths / 12}-year commitment`;
  return `${termMonths}-month term`;
}

/**
 * What the licence option is called on the page.
 *
 * Built from facts in the row: the term, how it is paid for, and the audience
 * where it is not the commercial one. The audience is named because a price a
 * visitor is not entitled to must say so beside the number, not only in a
 * footnote.
 */
export function variantName(
  title: string,
  audience: VariantAudience,
  termMonths: number | null,
  billedMonthly: boolean,
): string {
  const parts: string[] = [termLabel(termMonths)];

  if (billedMonthly) parts.push("billed monthly");
  if (audience === "EDUCATION") parts.push("academic pricing");
  if (audience === "NON_PROFIT") parts.push("non-profit pricing");

  /*
   * Some titles distinguish real variants beneath one product — "1 User CAL"
   * against "1 Device CAL", or an 8-core pack against a 2-core one. Losing that
   * would leave two options on a page indistinguishable but differently priced.
   */
  const detail = /\b(\d+\s*[- ]?(?:core|user|device|seat)[^,()]*)/i.exec(baseName(title))?.[1];
  if (detail) parts.push(detail.trim().toLowerCase());

  return parts.join(", ");
}


/**
 * The product copy.
 *
 * Every sentence is a restatement of the imported rows. There is nothing in a
 * price list describing what a product does, and writing that here would be
 * inventing a claim about somebody else's software and publishing it as this
 * company's own.
 */
export function describe(product: ProductPlan): { short: string; long: string } {
  const terms = new Set(
    product.variants.map((variant) =>
      variant.termMonths === null
        ? "a perpetual licence"
        : variant.termMonths === 1
          ? "a monthly subscription"
          : variant.termMonths === 12
            ? "an annual commitment"
            : variant.termMonths === 36
              ? "a three-year commitment"
              : `a ${variant.termMonths}-month term`,
    ),
  );
  const audiences = new Set(product.variants.map((variant) => variant.audience));

  const termText = [...terms].join(" or ");
  const academic = audiences.has("EDUCATION")
    ? " Academic pricing is available to qualifying institutions."
    : "";
  const monthly = product.variants.some((variant) => variant.billedMonthly)
    ? " Where a commitment can be paid monthly, that option is priced separately."
    : "";

  return {
    short: `${product.name} from Microsoft, available as ${termText}. Prices exclude GST.`,
    long: [
      `${product.name} is a Microsoft licence supplied by TechZoid Technologies.`,
      "",
      `Available as ${termText}. All prices are exclusive of GST, which is applied at the prevailing rate on the tax invoice.${academic}${monthly}`,
      "",
      "Licence terms, entitlements and support are set by Microsoft. Contact us for a written quotation covering the seat count and term you need.",
    ].join("\n"),
  };
}

/**
 * Which option a card quotes a price from.
 *
 * The cheapest commercial option would be the obvious pick and is the wrong
 * one: a monthly subscription is a tenth of an annual commitment, so taking the
 * cheapest would drop every "from" price tenfold overnight and read as a price
 * cut rather than a shorter term. An annual commitment paid up front is the
 * comparable figure, and the cheapest of whatever is left is the fallback.
 */
export function defaultVariant(variants: VariantPlan[]): VariantPlan | undefined {
  const commercial = variants.filter((variant) => variant.audience === "COMMERCIAL");
  const pool = commercial.length > 0 ? commercial : variants;
  const annual = pool
    .filter((variant) => variant.termMonths === 12 && !variant.billedMonthly)
    .sort((a, b) => a.listPriceMinor - b.listPriceMinor);
  if (annual[0]) return annual[0];
  return [...pool].sort((a, b) => a.listPriceMinor - b.listPriceMinor)[0];
}

