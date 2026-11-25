import Link from "next/link";

import { BrandShelfClient, type ShelfGroup, type ShelfProduct } from "@/components/marketing/brand-shelf-client";
import { DIRECT_PURCHASE_ENABLED } from "@/lib/catalogue/quote-only";
import { isDirectlyPurchasable } from "@/lib/catalogue/audience";
import { prisma } from "@/lib/db";
import { tags } from "@/lib/cache";
import { isQuoteOnly } from "@/lib/catalogue/quote-only";
import { effectivePriceMinor, formatMoney, gstAmountMinor } from "@/lib/money";
import { cached } from "@/lib/queries/cached";
import { productListSelect, type ProductListItem } from "@/lib/queries/catalogue";

/**
 * Every product of a brand, on the brand's own page, grouped by family and visible at once.
 *
 * The three publisher hub pages used to open with several screens of explanation and keep
 * their products in a grid of three to six further down, so a buyer who came for "what do
 * you sell from Microsoft" had to dig. This sits directly under the page's opening section:
 * a row of family links, then each family with its products, each with a price where the
 * catalogue has one and "Get today's price" where it does not. It reads the catalogue as it
 * stands, so a product added tomorrow appears tomorrow with nothing to edit.
 */
type PlansLink = { href: string; label: string };
const ACCENT = { microsoft: "#0f6cbd", adobe: "#c8102e", autodesk: "#0696d7" };
const MS_PLANS: PlansLink[] = [
  { href: "/microsoft-365-business-plans-and-pricing", label: "Microsoft 365 business plans and pricing" },
  { href: "/microsoft-365-enterprise-plans-and-pricing", label: "Microsoft 365 enterprise plans and pricing" },
];
const BRANDS: Record<string, { brand: string; name: string; plans: PlansLink[]; accent: string }> = {
  microsoft: { brand: "microsoft", name: "Microsoft", plans: MS_PLANS, accent: ACCENT.microsoft },
  "microsoft-licensing": { brand: "microsoft", name: "Microsoft", plans: MS_PLANS, accent: ACCENT.microsoft },
  adobe: { brand: "adobe", name: "Adobe", plans: [{ href: "/adobe-plans-and-pricing", label: "Adobe plans and pricing" }], accent: ACCENT.adobe },
  "adobe-licensing": { brand: "adobe", name: "Adobe", plans: [{ href: "/adobe-plans-and-pricing", label: "Adobe plans and pricing" }], accent: ACCENT.adobe },
  autodesk: { brand: "autodesk", name: "Autodesk", plans: [{ href: "/autodesk-plans-and-pricing", label: "Autodesk plans and pricing" }], accent: ACCENT.autodesk },
  "autodesk-licensing": { brand: "autodesk", name: "Autodesk", plans: [{ href: "/autodesk-plans-and-pricing", label: "Autodesk plans and pricing" }], accent: ACCENT.autodesk },
};

export function hasBrandShelf(slug: string): boolean {
  return slug in BRANDS;
}

const load = cached(
  async (brand: string) =>
    prisma.product.findMany({
      where: { status: "ACTIVE", deletedAt: null, brand: { slug: brand } },
      select: productListSelect,
      orderBy: [{ featured: "desc" }, { popularity: "desc" }, { name: "asc" }],
    }),
  ["brand-shelf-products-v2"],
  [tags.catalogue],
);

/** Microsoft's range in the families a buyer thinks in, rather than the catalogue's fourteen categories. */
const MS_GROUPS: ShelfGroup[] = [
  { key: "m365", name: "Microsoft 365", blurb: "Plans for email, Office apps, Teams and security, from small business to enterprise." },
  { key: "office", name: "Office, Project & Visio", blurb: "Office editions, Project and Visio, bought once or by subscription." },
  { key: "teams", name: "Teams, email & collaboration", blurb: "Exchange, SharePoint, OneDrive and Teams, standalone or as add-ons." },
  { key: "windows", name: "Windows & Windows Server", blurb: "Windows 11, Windows 365 Cloud PCs, Windows Server and its client access licences." },
  { key: "data", name: "Data, developer & Power Platform", blurb: "SQL Server and its CALs, Visual Studio, Power BI, Power Apps, Power Automate and Copilot Studio." },
  { key: "dynamics", name: "Dynamics 365", blurb: "Sales, customer service, finance and supply chain business applications." },
  { key: "security", name: "Security & identity", blurb: "Defender, Entra ID and Intune for protecting people, devices and data." },
  { key: "azure", name: "Azure", blurb: "Microsoft cloud consumption, quoted to your commitment." },
];

function microsoftGroup(product: ProductListItem): string {
  const category = product.category.slug;
  if (/(^|-)(project|visio)(-|$)/.test(product.slug) && !category.startsWith("crm")) return "office";
  switch (category) {
    case "microsoft-365-plans":
      return "m365";
    case "office-suites":
      return "office";
    case "email-collaboration":
    case "productivity-collaboration":
      return "teams";
    case "desktop-os":
    case "server-os":
      return "windows";
    case "database-servers":
    case "analytics-bi":
    case "business-applications":
      return "data";
    case "crm-sales":
    case "finance-accounting":
    case "business-suites":
      return "dynamics";
    case "security-endpoint":
    case "endpoint-protection":
    case "identity-access":
      return "security";
    case "cloud-subscriptions":
      return "azure";
    default:
      return "data";
  }
}

function termLabel(months: number | null): string {
  if (months == null) return "one-time";
  if (months === 1) return "per month";
  if (months === 12) return "per user / year";
  if (months % 12 === 0) return `for ${months / 12} years`;
  return `for ${months} months`;
}

function toShelfProduct(product: ProductListItem, group: string): ShelfProduct {
  const quoteOnly = isQuoteOnly(product);
  const best = quoteOnly
    ? undefined
    : product.variants
        .map((variant) => ({ variant, price: effectivePriceMinor(variant.listPriceMinor, variant.salePriceMinor) }))
        .filter((entry) => entry.price > 0)
        .sort((a, b) => a.price - b.price)[0];
  const canBuy =
    DIRECT_PURCHASE_ENABLED && best != null && product.purchaseMode !== "ENQUIRY" && isDirectlyPurchasable(best.variant.audience);
  return {
    slug: product.slug,
    name: product.name,
    description: product.shortDescription,
    group,
    price: best ? formatMoney(best.price) : null,
    term: best ? termLabel(best.variant.termMonths) : null,
    gstIncl: best ? formatMoney(best.price + gstAmountMinor(best.price, best.variant.gstRatePercent)) : null,
    buyHref: canBuy ? `/buy?sku=${encodeURIComponent(best!.variant.sku)}` : null,
  };
}

export async function BrandShelf({ slug }: { slug: string }) {
  const hub = BRANDS[slug];
  if (!hub) return null;
  const rows = await load(hub.brand);
  if (rows.length === 0) return null;

  let groups: ShelfGroup[];
  let items: ShelfProduct[];
  if (hub.brand === "microsoft") {
    groups = MS_GROUPS;
    items = rows.map((row) => toShelfProduct(row, microsoftGroup(row)));
  } else {
    const seen = new Map<string, ShelfGroup & { weight: number }>();
    for (const row of rows) {
      const entry = seen.get(row.category.slug) ?? { key: row.category.slug, name: row.category.name, blurb: "", weight: 0 };
      entry.weight += row.popularity + (row.featured ? 50 : 0);
      seen.set(row.category.slug, entry);
    }
    groups = [...seen.values()].sort((a, b) => b.weight - a.weight || a.name.localeCompare(b.name));
    items = rows.map((row) => toShelfProduct(row, row.category.slug));
  }
  // Priced products first within a family, then by the catalogue's own order.
  items.sort((a, b) => Number(b.price != null) - Number(a.price != null));

  return (
    <section aria-labelledby="brand-shelf" className="border-b border-line bg-surface-muted py-12">
      <div className="container-page">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="max-w-3xl">
            <h2 id="brand-shelf" className="text-[1.9rem] font-bold text-career-navy">
              All {hub.name} products and prices
            </h2>
            <p className="mt-1 text-[15px] text-ink-600">
              Every {hub.name} product we supply, with its price from our catalogue. Where there is no price, ask for today&apos;s
              price on a written quotation with a GST invoice.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {hub.plans.map((plan) => (
              <Link
                key={plan.href}
                href={plan.href}
                className="inline-flex min-h-11 items-center rounded-(--radius-md) bg-accent-700 px-4 text-[14px] font-medium text-white hover:bg-accent-800"
              >
                {plan.label}
              </Link>
            ))}
          </div>
        </div>
        <div className="mt-6">
          <BrandShelfClient
            brandName={hub.name}
            accent={hub.accent}
            groups={groups}
            products={items}
            catalogueHref={`/products?brand=${hub.brand}`}
          />
        </div>
      </div>
    </section>
  );
}
