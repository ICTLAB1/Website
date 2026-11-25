import Link from "next/link";

import { prisma } from "@/lib/db";
import { tags } from "@/lib/cache";
import { isQuoteOnly } from "@/lib/catalogue/quote-only";
import { formatMoney } from "@/lib/money";
import { cached } from "@/lib/queries/cached";
import { lowestPriceMinor, productListSelect, type ProductListItem } from "@/lib/queries/catalogue";

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
const BRANDS: Record<string, { brand: string; name: string }> = {
  microsoft: { brand: "microsoft", name: "Microsoft" },
  "microsoft-licensing": { brand: "microsoft", name: "Microsoft" },
  adobe: { brand: "adobe", name: "Adobe" },
  "adobe-licensing": { brand: "adobe", name: "Adobe" },
  autodesk: { brand: "autodesk", name: "Autodesk" },
  "autodesk-licensing": { brand: "autodesk", name: "Autodesk" },
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
  ["brand-shelf-products-v1"],
  [tags.catalogue],
);

type Family = { slug: string; name: string; items: ProductListItem[]; weight: number };

function group(products: ProductListItem[]): Family[] {
  const families = new Map<string, Family>();
  for (const product of products) {
    const entry = families.get(product.category.slug) ?? { slug: product.category.slug, name: product.category.name, items: [], weight: 0 };
    entry.items.push(product);
    entry.weight += product.popularity + (product.featured ? 50 : 0);
    families.set(product.category.slug, entry);
  }
  return [...families.values()].sort((a, b) => b.weight - a.weight || a.name.localeCompare(b.name));
}

export async function BrandShelf({ slug }: { slug: string }) {
  const hub = BRANDS[slug];
  if (!hub) return null;
  const products = await load(hub.brand);
  if (products.length === 0) return null;
  const families = group(products);

  return (
    <section aria-labelledby="brand-shelf" className="border-b border-line bg-surface-muted py-10">
      <div className="container-page">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="brand-shelf" className="text-[1.7rem] font-bold text-career-navy">
              All {hub.name} products
            </h2>
            <p className="mt-1 text-[15px] text-ink-600">
              {products.length} products in {families.length} families. Prices are tentative and exclude GST; where there is no
              price, ask for today&apos;s price on a written quotation.
            </p>
          </div>
          <Link
            href={`/products?brand=${hub.brand}`}
            className="inline-flex min-h-11 items-center rounded-(--radius-md) border border-line bg-white px-4 text-[14px] font-medium text-graphite-900 hover:border-graphite-300"
          >
            Search and filter all {hub.name} products
          </Link>
        </div>

        <nav aria-label={`${hub.name} product families`} className="mt-5 flex flex-wrap gap-2">
          {families.map((family) => (
            <a
              key={family.slug}
              href={`#shelf-${family.slug}`}
              className="inline-flex min-h-11 items-center rounded-full border border-line bg-white px-4 text-[14px] font-medium text-graphite-900 hover:border-accent-700 hover:text-accent-700"
            >
              {family.name} <span className="ml-1.5 text-ink-500">{family.items.length}</span>
            </a>
          ))}
        </nav>

        <div className="mt-8 space-y-10">
          {families.map((family) => (
            <div key={family.slug} id={`shelf-${family.slug}`} className="scroll-mt-32">
              <h3 className="text-[1.15rem] font-semibold text-graphite-900">{family.name}</h3>
              <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {family.items.map((product) => {
                  const price = isQuoteOnly(product) ? null : lowestPriceMinor(product);
                  return (
                    <li key={product.slug}>
                      <Link
                        href={`/products/${product.slug}`}
                        className="flex h-full flex-col rounded-(--radius-lg) border border-line bg-white p-4 transition-colors hover:border-graphite-300"
                      >
                        <span className="text-[15px] font-semibold text-graphite-900">{product.name}</span>
                        <span className="mt-1 line-clamp-2 text-[13px] leading-relaxed text-ink-600">{product.shortDescription}</span>
                        <span className="mt-auto pt-3 text-[14px]">
                          {price != null && price > 0 ? (
                            <>
                              <span className="font-semibold text-graphite-900">from {formatMoney(price)}</span>
                              <span className="text-ink-500"> excl. GST</span>
                            </>
                          ) : (
                            <span className="font-medium text-accent-700">Get today&apos;s price</span>
                          )}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
