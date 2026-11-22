import type { ContentMigration } from "./types";

/**
 * Microsoft prices, from the November 2026 channel price list.
 *
 * The business supplied `CHANNEL_PRICELIST_NOV_2026.xlsx` and asked for the
 * website's prices to follow it. These are the instructions that settled the
 * details:
 *
 * - **The ERP column, as listed.** The list carries a partner "Unit SELL Price"
 *   and an "ERP" (estimated retail price). The website shows the ERP, with no
 *   margin added. The earlier Microsoft 365 migration published ERP plus
 *   `MARGIN_PERCENT`; this one deliberately does not, so these prices are 20%
 *   below what the 365 plans showed. If a margin is wanted back, it is a change
 *   to this table, not to a rule.
 * - **Exact matches only.** A variant is changed only where one row of the
 *   Commercial segment matches its product title, term and billing plan.
 *   Everything else is listed in `docs/pricing/2026-11-channel-pricelist.md`.
 * - **Annual prices only.** The catalogue lists one annual price per plan; the
 *   monthly variants were retired earlier, so the list's monthly rows are not
 *   applied. The articles that describe the monthly options carry the list's
 *   figures for them (month to month: the "P1M / Monthly" price; annual commitment
 *   billed monthly: the "P1Y / Monthly" total divided by twelve, to the rupee).
 *
 * ## It only moves a price that is where it was
 *
 * Each row names the price it expects to replace. A variant whose price is
 * already something else was changed by a person, and is left alone and
 * reported. One that already holds the new price is counted as done.
 */

type Row = {
  sku: string;
  /** The row of the list this came from. */
  from: string;
  /** What the website shows now, in rupees. */
  was: number;
  /** The list's ERP, in rupees. */
  now: number;
};

export const PRICES: Row[] = [
  // Annual commitment, billed yearly: NCE sheet, P1Y / Annual
  {
    sku: "MS-M365-BB-A1",
    from: "Microsoft 365 Business Basic",
    was: 2550,
    now: 2040,
  },
  {
    sku: "MS-M365-BS-A1",
    from: "Microsoft 365 Business Standard",
    was: 12900,
    now: 10320,
  },
  {
    sku: "MS-M365-BP-A1",
    from: "Microsoft 365 Business Premium",
    was: 27450,
    now: 21960,
  },
  {
    sku: "MS-M365-BS-COPILOT-A1",
    from: "Microsoft 365 Business Standard with Copilot",
    was: 29325,
    now: 23460,
  },
  {
    sku: "MS-M365-BP-COPILOT-A1",
    from: "Microsoft 365 Business Premium with Copilot",
    was: 39900,
    now: 31920,
  },
  { sku: "MS-M365-E3-A1", from: "Microsoft 365 E3", was: 48675, now: 38940 },
  {
    sku: "MS-M365-E5-A1",
    from: "Microsoft 365 E5 without Audio Conferencing",
    was: 74850,
    now: 59880,
  },
  {
    sku: "MS-M365-E7-A1",
    from: "Microsoft 365 E7 without Audio Conferencing",
    was: 123525,
    now: 98820,
  },
  { sku: "MS-O365-E1-A1", from: "Office 365 E1", was: 12450, now: 9960 },
  { sku: "MS-O365-E3-A1", from: "Office 365 E3", was: 32475, now: 25980 },
  {
    sku: "MS-O365-E5-A1",
    from: "Office 365 E5 without Audio Conferencing",
    was: 51150,
    now: 40920,
  },
  {
    sku: "MS-D365-SALESPRO-A1",
    from: "Dynamics 365 Sales Professional",
    was: 55800,
    now: 64920,
  },
  { sku: "MS-VISIO-P1-A1", from: "Visio Plan 1", was: 6000, now: 4980 },
  { sku: "MS-VISIO-P2-A1", from: "Visio Plan 2", was: 15625, now: 15000 },

  // One-time: PERPETUAL sheet
  {
    sku: "MS-OFF-LTSC-PP24",
    from: "Office LTSC Professional Plus 2024",
    was: 62000,
    now: 57349,
  },
  {
    sku: "MS-WIN11-PRO-UPG",
    from: "Windows 11 Pro Upgrade",
    was: 15600,
    now: 15887,
  },
  {
    sku: "MS-WS2025-STD-2C",
    from: "Windows Server 2025 Standard - 2 Core",
    was: 42500,
    now: 12523,
  },
  {
    sku: "MS-WS2025-STD-16C",
    from: "Windows Server 2025 Standard - 16 Core License Pack",
    was: 340000,
    now: 99915,
  },
  {
    sku: "MS-WS2025-DC-2C",
    from: "Windows Server 2025 Datacenter - 2 Core",
    was: 247000,
    now: 71898,
  },
  {
    sku: "MS-WS2025-UCAL",
    from: "Windows Server 2025 - 1 User CAL",
    was: 3200,
    now: 4299,
  },
];

/**
 * The prices quoted in five articles, replaced sentence by sentence.
 *
 * An article is changed only if every old fragment is still in it, so one that
 * has been edited since is left whole and reported rather than half-updated.
 * Goods and services tax figures are the new price at 18%, to the rupee.
 */
const ARTICLES: Record<string, Array<[string, string]>> = {
  "microsoft-365-business-standard-price-in-india": [
    ["₹1,320 per user per month", "₹1,032 per user per month"],
    ["₹1,100 per user per month", "₹903 per user per month"],
    ["₹11,800 per user per year", "₹10,320 per user per year"],
    [
      "annual-billed-monthly plan's ₹13,200 total",
      "annual-billed-monthly plan's ₹10,836 total",
    ],
    ["about ₹1,558 a month", "about ₹1,218 a month"],
    ["about ₹1,298 a month", "about ₹1,066 a month"],
    ["about ₹13,924 a year", "about ₹12,178 a year"],
  ],
  "microsoft-365-business-basic-price-in-india": [
    ["₹540 per user per month", "₹204 per user per month"],
    ["₹5,040 per user per year", "₹2,040 per user per year"],
    [
      "works out to ₹420 a month — about 22% cheaper",
      "works out to ₹170 a month — about 17% cheaper",
    ],
    ["about ₹637 a month", "about ₹241 a month"],
    ["about ₹5,947 a year", "about ₹2,407 a year"],
  ],
  "microsoft-365-business-premium-price-in-india": [
    ["₹1,900 per user per month", "₹1,922 per user per month"],
    ["comes to ₹22,800", "comes to ₹23,064"],
    ["₹20,400 per user per year", "₹21,960 per user per year"],
    ["That is ₹2,400 cheaper", "That is ₹1,104 cheaper"],
    ["about ₹2,242 a month", "about ₹2,268 a month"],
    ["about ₹24,072 a year", "about ₹25,913 a year"],
    ["paying ₹20,400 per user upfront", "paying ₹21,960 per user upfront"],
  ],
  "windows-server-2025-core-licence-price-in-india": [
    ["the ₹42,500 core-pack price", "the ₹12,523 core-pack price"],
    ["2-core packs at ₹42,500 each", "2-core packs at ₹12,523 each"],
    [
      "comes to eight packs, ₹3,40,000, whether bought as eight packs or as one 16-core licence — the per-core rate is identical either way. Every 2 additional cores past that minimum add another ₹42,500.",
      "comes to eight packs, ₹1,00,184, or ₹99,915 bought as one 16-core licence — the per-core rate is almost identical either way. Every 2 additional cores past that minimum add another ₹12,523.",
    ],
    [
      "2-core packs at ₹2,47,000 each, excluding GST, roughly 5.8 times",
      "2-core packs at ₹71,898 each, excluding GST, roughly 5.7 times",
    ],
    [
      "works out to ₹19,76,000 for the licence alone",
      "works out to ₹5,75,184 for the licence alone",
    ],
    [
      "comes to about ₹50,150, the 16-core Standard minimum to about ₹4,01,200, and a Datacenter 2-core pack to about ₹2,91,460",
      "comes to about ₹14,777, the 16-core Standard minimum to about ₹1,17,900, and a Datacenter 2-core pack to about ₹84,840",
    ],
  ],
  "windows-11-pro-upgrade-licence-price-in-india": [
    ["₹15,600 per device, excluding GST", "₹15,887 per device, excluding GST"],
    ["about ₹18,408 per device", "about ₹18,747 per device"],
  ],
};

export const microsoftChannelPricelist: ContentMigration = {
  id: "2026-11-microsoft-channel-pricelist",
  describe: "Microsoft prices from the November 2026 channel price list",

  async apply(prisma) {
    const notes: string[] = [];
    let changed = 0;
    let already = 0;

    for (const row of PRICES) {
      const variant = await prisma.productVariant.findFirst({
        where: { sku: row.sku, deletedAt: null },
        select: { id: true, listPriceMinor: true, salePriceMinor: true },
      });
      if (!variant) {
        notes.push(`${row.sku}: not in the catalogue`);
        continue;
      }
      const wasMinor = row.was * 100;
      const nowMinor = row.now * 100;

      if (variant.listPriceMinor === nowMinor) {
        already += 1;
        continue;
      }
      if (variant.listPriceMinor !== wasMinor) {
        notes.push(
          `${row.sku}: left alone, price is ${variant.listPriceMinor / 100} (expected ${row.was})`,
        );
        continue;
      }

      // A sale price above the new list price would read as a price rise, so it goes.
      const clearSale =
        variant.salePriceMinor !== null && variant.salePriceMinor >= nowMinor;
      await prisma.productVariant.update({
        where: { id: variant.id },
        data: {
          listPriceMinor: nowMinor,
          ...(clearSale ? { salePriceMinor: null } : {}),
        },
      });
      changed += 1;
      if (clearSale)
        notes.push(
          `${row.sku}: sale price removed, it was above the new list price`,
        );
    }

    let articles = 0;
    for (const [slug, pairs] of Object.entries(ARTICLES)) {
      const post = await prisma.blogPost.findUnique({
        where: { slug },
        select: { id: true, body: true },
      });
      if (!post) continue;
      if (
        pairs.every(([, to]) => post.body.includes(to)) &&
        !pairs.some(([from]) => post.body.includes(from))
      ) {
        continue; // already done
      }
      if (!pairs.every(([from]) => post.body.includes(from))) {
        notes.push(`article ${slug}: left alone, its wording has changed`);
        continue;
      }
      let body = post.body;
      for (const [from, to] of pairs) body = body.split(from).join(to);
      await prisma.blogPost.update({ where: { id: post.id }, data: { body } });
      articles += 1;
    }

    return `${changed} prices changed, ${already} already current, ${articles} articles updated${
      notes.length ? `; ${notes.join("; ")}` : ""
    }`;
  },
};
