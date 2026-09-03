import { createHash } from "node:crypto";
import type { LicenceType } from "@prisma/client";

import { MAX_AMOUNT_MINOR } from "../../src/lib/pricing";
import { readSheet } from "./xlsx";

/**
 * What a row on Adobe's channel Commercial sheet means.
 *
 * A different shape from `price-list.ts` (Microsoft's channel workbook), not
 * an extension of it: different headers, no stable SKU, and a price column
 * named ESP rather than ERP. Kept as its own file rather than bent into the
 * Microsoft one, on the same reasoning that file already gives for reading a
 * price list at all — a fixed column index or a shared assumption that has
 * quietly stopped holding does not fail, it publishes the wrong number.
 *
 * ## Only ESP is read
 *
 * The sheet carries `DTP per Year /Per TXn` beside `ESP per Year/Per Txn` —
 * distributor cost beside sell price, the same pairing `price-list.ts` found
 * on the Microsoft workbook under different names. Only the ESP column is
 * read; `priceColumn` refuses one whose header suggests a cost, the same
 * defence that file uses.
 *
 * ## There is no SKU
 *
 * `Part Number` is blank on every Commercial row this file has seen — Adobe's
 * distributor export does not carry one for this sheet. `skuFor` below builds
 * a stable key from the row's own descriptive fields instead: same fields in,
 * same key out, so a re-run updates the row already written rather than
 * creating a second one. It is prefixed `ADB-` and is explicitly this site's
 * own key, not a claim about Adobe's part numbering.
 *
 * ## Repeated rows, different prices
 *
 * A handful of (family, type, detail, additional detail, users, metric,
 * duration) combinations appear more than once with different ESP figures —
 * almost certainly volume-tier pricing whose tier label did not survive this
 * export (the `Level Detail` column that names tiers on the small CC Standard
 * and NCO sheets is empty throughout Commercial). There is no column left
 * that says which price is which tier, so rather than guess, the highest is
 * kept — the same "never invent a lower price than might be true" rule
 * `optionsFromStatedTerms` in `price-list.ts` applies to a rounding
 * discrepancy — and every collapsed group is counted in the report.
 *
 * ## What "Approval Required from Adobe" means here
 *
 * Some rows carry that exact remark. A price a customer cannot simply pay —
 * Adobe has to approve the deal first — is not "buy now", so any product with
 * at least one such row is imported enquiry-only in full, not partially: a
 * shopper choosing between two options on one page has no reliable way to
 * know which one needed approval and which did not.
 */

const HEADER = {
  segment: "Segment",
  partNumber: "Part Number",
  family: "Product Family",
  type: "Product Type",
  typeDetail: "Product Type Detail",
  additional: "Additional Detail",
  users: "Users",
  metric: "Metric",
  duration: "Duration",
  remarks: "Remarks",
  dtp: "DTP per Year /Per TXn",
  esp: "ESP per Year/Per Txn",
} as const;

export type Row = {
  family: string;
  type: string;
  typeDetail: string;
  additional: string;
  users: string;
  metric: string;
  duration: string;
  remarks: string;
  priceMajor: number;
};

const COST_HEADERS = /\bdtp\b|distributor|dealer|cost|buy|purchase/i;

function priceColumn(head: string[]): number {
  const index = head.findIndex((cell) => /^esp\b/i.test(cell.trim()));
  if (index < 0) return -1;
  if (COST_HEADERS.test(head[index] ?? "")) return -1;
  return index;
}

export function parseCommercialSheet(path: string): { rows: Row[]; ignoredColumns: string[] } {
  const sheet = readSheet(path, "Commercial");
  if (sheet.length < 2) throw new Error(`${path}: "Commercial" sheet has no data rows.`);

  const head = sheet[0] ?? [];
  const at = (name: string) => head.indexOf(name);

  const iSegment = at(HEADER.segment);
  const iFamily = at(HEADER.family);
  const iType = at(HEADER.type);
  const iTypeDetail = at(HEADER.typeDetail);
  const iAdditional = at(HEADER.additional);
  const iUsers = at(HEADER.users);
  const iMetric = at(HEADER.metric);
  const iDuration = at(HEADER.duration);
  const iRemarks = at(HEADER.remarks);
  const iPrice = priceColumn(head);

  for (const [label, index] of [
    ["Product Family", iFamily],
    ["Product Type", iType],
  ] as const) {
    if (index < 0) throw new Error(`${path}: no "${label}" column. Header: ${head.join(" | ")}`);
  }

  if (iPrice < 0) {
    throw new Error(
      `${path}: no ESP column, and nothing else in this file may be published as a price. Header: ${head.join(" | ")}`,
    );
  }

  const ignoredColumns = head.filter(
    (cell, index) => index !== iPrice && cell !== "" && COST_HEADERS.test(cell),
  );

  const rows: Row[] = [];
  for (const cells of sheet.slice(1)) {
    const family = (cells[iFamily] ?? "").trim();
    if (!family) continue;

    // Every row seen so far reads "Commercial" here — the sheet's own name
    // repeated as data — but a row that disagrees is skipped rather than
    // silently published as commercial, since this importer's whole mandate
    // is the Commercial segment only.
    if (iSegment >= 0 && (cells[iSegment] ?? "").trim() !== "Commercial") continue;

    const priceMajor = Number.parseFloat(cells[iPrice] ?? "");

    rows.push({
      family,
      type: (cells[iType] ?? "").trim(),
      typeDetail: (cells[iTypeDetail] ?? "").trim(),
      additional: (cells[iAdditional] ?? "").trim(),
      users: (cells[iUsers] ?? "").trim(),
      metric: (cells[iMetric] ?? "").trim(),
      duration: (cells[iDuration] ?? "").trim(),
      remarks: (cells[iRemarks] ?? "").trim(),
      priceMajor: Number.isFinite(priceMajor) ? priceMajor : Number.NaN,
    });
  }

  return { rows, ignoredColumns };
}

// ──────────────────────────────────────────────────────── interpretation

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
 * Whether a row is a one-time purchase rather than a subscription.
 *
 * "Transaction New" rows sell a fixed bundle — a credit pack, a block of
 * signature transactions — at one price, once. `Duration` carries a number
 * for these ("33") that is not a subscription term this site has any basis
 * for stating, so it is read as what the type already says: no recurring
 * term at all.
 */
function isOneTime(type: string): boolean {
  return /transaction|consumption/i.test(type);
}

export function termMonthsFor(row: Row): number | null {
  if (isOneTime(row.type)) return null;
  const match = /^(\d+)\s*month/i.exec(row.duration);
  if (match) return Number.parseInt(match[1] ?? "", 10);
  // "Duration" holding a bare number on a subscription row is read the same
  // way — a month count the file did not bother to spell out — never as
  // anything this file has no column to justify.
  const bare = Number.parseInt(row.duration, 10);
  return Number.isFinite(bare) && bare > 0 ? bare : 12;
}

export function licenceTypeFor(row: Row): LicenceType {
  if (isOneTime(row.type)) return "PERPETUAL";
  const months = termMonthsFor(row);
  return months === 1 ? "SUBSCRIPTION_MONTHLY" : "SUBSCRIPTION_ANNUAL";
}

/** The four fields that, together with the family, distinguish one licence option from another. */
function variantKey(row: Row): string {
  return [row.type, row.typeDetail, row.additional, row.users, row.metric, row.duration].join("|");
}

/**
 * A stable key for a row that has no Part Number of its own.
 *
 * Built from the same fields that distinguish it (`variantKey`) rather than
 * from row position, so a re-import of an updated price list matches this
 * row to the one already in the catalogue and updates its price instead of
 * creating a duplicate. `ADB-` marks it as this site's own key, never
 * Adobe's.
 */
export function skuFor(family: string, row: Row): string {
  const digest = createHash("sha256")
    .update(`${family}|${variantKey(row)}`.normalize("NFKC"))
    .digest("hex")
    .slice(0, 10);
  return `ADB-${digest}`.toUpperCase();
}

/**
 * What the option is called on the page.
 *
 * Built from the row's own fields — the term, how it's metered, any detail
 * Adobe attached — and nothing else. Long, descriptive `Additional Detail`
 * text (a sentence rather than a code) is included; a bare code the source
 * did not explain is left out rather than shown to a visitor as if it meant
 * something.
 */
export function variantName(row: Row): string {
  const parts: string[] = [];

  const months = termMonthsFor(row);
  if (isOneTime(row.type)) parts.push("One-time purchase");
  else if (months === 1) parts.push("Monthly subscription");
  else if (months === 12) parts.push("Annual commitment");
  else if (months !== null) parts.push(`${months}-month term`);

  if (row.metric && !/^\d+$/.test(row.metric)) parts.push(`per ${row.metric.toLowerCase()}`);
  else if (row.users) parts.push(row.users);

  // A code (bare digits) says nothing to a visitor; a sentence does.
  if (row.additional && !/^\d+$/.test(row.additional)) parts.push(row.additional);

  return parts.filter(Boolean).join(", ") || row.type || "Standard";
}

const CATEGORY_RULES: Array<[RegExp, string]> = [
  [/\b(substance 3d|dimension)\b/i, "media-entertainment"],
  [/\b(creative cloud (all apps|pro))\b/i, "creative-suites"],
  [
    /\b(photoshop|illustrator|premiere|after effects|indesign(?! server)|lightroom|audition|animate|dreamweaver|xd|fresco|character animator|bridge|media encoder)\b/i,
    "single-creative-apps",
  ],
  [
    /\b(acrobat|sign|pdf|indesign server|robohelp|captivate|technical suite|frame\s?maker)\b/i,
    "document-workflow",
  ],
  [/\b(express|stock|portfolio|generative credits|ai assistant)\b/i, "design-creative"],
];

export const FALLBACK_CATEGORY = "design-creative";

/**
 * "Adobe " prefixed, and the audience word after "for" capitalised —
 * "Acrobat Pro for teams" becomes "Adobe Acrobat Pro for Teams", matching
 * the eight products already in the catalogue this import updates in place.
 * Everything else in the source text is left exactly as Adobe wrote it:
 * "InDesign", "ColdFusion" and the rest already carry their own correct
 * capitalisation, and re-casing them by a generic rule would as easily break
 * one as fix another.
 */
export function displayName(family: string): string {
  const cased = family.replace(/\bfor (team|enterprise|business)(s)?\b/i, (_m, word: string, plural: string) => {
    const capitalised = (word[0] ?? "").toUpperCase() + word.slice(1);
    return `for ${capitalised}${plural ?? ""}`;
  });
  return `Adobe ${cased}`;
}

export function categoryFor(family: string): string {
  for (const [pattern, slug] of CATEGORY_RULES) if (pattern.test(family)) return slug;
  return FALLBACK_CATEGORY;
}

// ────────────────────────────────────────────────────────────── shaping

export type VariantPlan = {
  sku: string;
  name: string;
  licenceType: LicenceType;
  termMonths: number | null;
  listPriceMinor: number;
  requiresApproval: boolean;
};

export type ProductPlan = {
  slug: string;
  name: string;
  /** The Product Family text exactly as the sheet wrote it, for matching against a known alias. */
  rawFamily: string;
  categorySlug: string;
  variants: VariantPlan[];
  requiresApproval: boolean;
};

export type Skipped = { family: string; why: string };
export type Collapsed = { family: string; key: string; prices: number[] };

export function plan(rows: Row[]): { products: ProductPlan[]; skipped: Skipped[]; collapsed: Collapsed[] } {
  const skipped: Skipped[] = [];
  const collapsed: Collapsed[] = [];

  const groups = new Map<string, Row[]>();
  for (const row of rows) {
    const key = `${row.family} ${variantKey(row)}`;
    groups.set(key, [...(groups.get(key) ?? []), row]);
  }

  const byProduct = new Map<string, ProductPlan>();

  for (const members of groups.values()) {
    const first = members[0];
    if (!first) continue;

    const priced = members.filter((row) => Number.isFinite(row.priceMajor) && row.priceMajor > 0);
    if (priced.length === 0) {
      skipped.push({ family: first.family, why: "no price" });
      continue;
    }

    const distinct = [...new Set(priced.map((row) => row.priceMajor))].sort((a, b) => a - b);
    const price = distinct[distinct.length - 1] as number;
    if (distinct.length > 1) {
      collapsed.push({ family: first.family, key: variantKey(first), prices: distinct });
    }

    const slug = slugify(first.family);
    if (!slug) {
      skipped.push({ family: first.family, why: "empty name after slugifying" });
      continue;
    }

    const product =
      byProduct.get(slug) ??
      (() => {
        const created: ProductPlan = {
          slug,
          name: displayName(first.family),
          rawFamily: first.family,
          categorySlug: categoryFor(first.family),
          variants: [],
          requiresApproval: false,
        };
        byProduct.set(slug, created);
        return created;
      })();

    const requiresApproval = priced.some((row) => /approval required/i.test(row.remarks));
    if (requiresApproval) product.requiresApproval = true;

    const listPriceMinorRaw = Math.round(price * 100);
    const storable = listPriceMinorRaw <= MAX_AMOUNT_MINOR;
    if (!storable) skipped.push({ family: first.family, why: "above the maximum storable price; listed on quote" });

    product.variants.push({
      sku: skuFor(first.family, first),
      name: variantName(first),
      licenceType: licenceTypeFor(first),
      termMonths: termMonthsFor(first),
      listPriceMinor: storable ? listPriceMinorRaw : 0,
      requiresApproval,
    });
  }

  /*
   * A second collapse, across variants rather than within one key.
   *
   * Several rows differ only in a code this file has no way to interpret —
   * `Additional Detail` or `Metric` holding a bare number rather than text —
   * and `variantName` already leaves an uninterpreted code out of what a
   * visitor is shown, on the same "never invent a meaning" rule everywhere
   * else in this file. Two rows that are priced the same and now read the
   * same are the same option from a shopper's chair, whatever distinct codes
   * Adobe's export gave them, and showing both would be five identical
   * "Annual commitment, ₹X" buttons on one page with no way to tell them
   * apart. The first SKU seen is kept; the rest are silently absorbed into
   * it rather than reported, since nothing about the catalogue is wrong —
   * only the export's row count was more granular than what can be shown.
   */
  for (const product of byProduct.values()) {
    const seen = new Map<string, VariantPlan>();
    for (const variant of product.variants) {
      const key = `${variant.name}|${variant.licenceType}|${variant.termMonths}|${variant.listPriceMinor}`;
      if (!seen.has(key)) seen.set(key, variant);
    }
    product.variants = [...seen.values()];

    /*
     * Where the collapse above still leaves two variants reading identically
     * — same term, same "per X", no code this file could turn into text —
     * they are genuinely different prices with nothing left to tell them
     * apart by. Numbering them ("Option 1", "Option 2", lowest price first)
     * is the honest version of that: it says there is a real, unexplained
     * distinction rather than hiding one price or inventing a reason for it.
     */
    const byName = new Map<string, VariantPlan[]>();
    for (const variant of product.variants) {
      byName.set(variant.name, [...(byName.get(variant.name) ?? []), variant]);
    }
    for (const group of byName.values()) {
      if (group.length < 2) continue;
      group.sort((a, b) => a.listPriceMinor - b.listPriceMinor);
      group.forEach((variant, index) => {
        variant.name = `${variant.name} (option ${index + 1} of ${group.length})`;
      });
    }
  }

  return { products: [...byProduct.values()], skipped, collapsed };
}

/**
 * Which variant a card quotes a price from.
 *
 * The cheapest option is not always the standard one: a "High Growth Offer
 * 500 MOQ" or a "10 Pack" is real, but leading a card with it prices the
 * product as if every buyer qualified for a bulk promotion. Preferred
 * instead: an option with no qualifying detail beyond the term itself —
 * plain "Annual commitment", not "Annual commitment, 1 User, 500 MOQ" — and
 * only where every option carries a qualifier does the cheapest stand in.
 */
export function defaultVariant(variants: VariantPlan[]): VariantPlan | undefined {
  const sorted = [...variants].sort((a, b) => a.listPriceMinor - b.listPriceMinor);
  const plain = sorted.filter((variant) => !/,/.test(variant.name.replace(/ \(option \d+ of \d+\)$/, "")));
  return plain[0] ?? sorted[0];
}

export function describe(product: ProductPlan): { short: string; long: string } {
  const terms = new Set(
    product.variants.map((variant) =>
      variant.termMonths === null
        ? "a one-time purchase"
        : variant.termMonths === 1
          ? "a monthly subscription"
          : variant.termMonths === 12
            ? "an annual commitment"
            : `a ${variant.termMonths}-month term`,
    ),
  );
  const termText = [...terms].join(" or ");
  const approval = product.requiresApproval
    ? " This offer requires Adobe's approval before an order can be placed; we handle that as part of your enquiry."
    : "";

  return {
    short: `${product.name} from Adobe, available as ${termText}. Prices exclude GST.`,
    long: [
      `${product.name} is an Adobe licence supplied by TechZoid Technologies.`,
      "",
      `Available as ${termText}. All prices are exclusive of GST, which is applied at the prevailing rate on the tax invoice.${approval}`,
      "",
      "Licence terms, entitlements and support are set by Adobe. Contact us for a written quotation covering the seat count and term you need.",
    ].join("\n"),
  };
}
