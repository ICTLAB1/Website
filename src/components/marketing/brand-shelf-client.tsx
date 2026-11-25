"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

/**
 * The interactive part of the brand shelf: family filter and a text search over products
 * the server has already priced. Nothing here knows a price or a family — it filters what
 * it is given, so a product added to the catalogue appears here with no edit.
 */
export type ShelfProduct = {
  slug: string;
  name: string;
  description: string;
  group: string;
  /** "₹10,320" — null when the catalogue holds no price. */
  price: string | null;
  term: string | null;
  gstIncl: string | null;
  buyHref: string | null;
};

export type ShelfGroup = { key: string; name: string; blurb: string };

export function BrandShelfClient({
  brandName,
  accent,
  groups,
  products,
  catalogueHref,
}: {
  brandName: string;
  accent: string;
  groups: ShelfGroup[];
  products: ShelfProduct[];
  catalogueHref: string;
}) {
  const [active, setActive] = useState<string>("all");
  const [query, setQuery] = useState("");
  const needle = query.trim().toLowerCase();

  const visible = useMemo(
    () =>
      products.filter(
        (product) =>
          (active === "all" || product.group === active) &&
          (needle === "" || `${product.name} ${product.description}`.toLowerCase().includes(needle)),
      ),
    [products, active, needle],
  );
  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const product of products) map.set(product.group, (map.get(product.group) ?? 0) + 1);
    return map;
  }, [products]);

  const shownGroups = groups.filter((group) => visible.some((product) => product.group === group.key));

  const chip = (selected: boolean) =>
    `inline-flex min-h-11 items-center rounded-full border px-4 text-[14px] font-medium transition-colors ${
      selected ? "border-transparent text-white" : "border-line bg-white text-graphite-900 hover:border-graphite-300"
    }`;

  return (
    <div>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div role="group" aria-label={`${brandName} product families`} className="flex flex-1 flex-wrap gap-2">
          <button
            type="button"
            aria-pressed={active === "all"}
            onClick={() => setActive("all")}
            className={chip(active === "all")}
            style={active === "all" ? { backgroundColor: accent } : undefined}
          >
            All <span className="ml-1.5 opacity-80">{products.length}</span>
          </button>
          {groups
            .filter((group) => counts.has(group.key))
            .map((group) => (
              <button
                key={group.key}
                type="button"
                aria-pressed={active === group.key}
                onClick={() => setActive(group.key)}
                className={chip(active === group.key)}
                style={active === group.key ? { backgroundColor: accent } : undefined}
              >
                {group.name} <span className="ml-1.5 opacity-80">{counts.get(group.key)}</span>
              </button>
            ))}
        </div>
        <label className="block lg:w-80 lg:shrink-0">
          <span className="sr-only">Search {brandName} products</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={`Search ${brandName} products`}
            className="min-h-11 w-full rounded-(--radius-md) border border-line bg-white px-4 text-[15px] text-graphite-900 placeholder:text-ink-500 focus:border-accent-700 focus:outline-none"
          />
        </label>
      </div>

      <p className="mt-3 text-[14px] text-ink-600" aria-live="polite">
        Showing {visible.length} of {products.length} products. Prices are per user unless stated, tentative and exclude GST.
      </p>

      {visible.length === 0 ? (
        <div className="mt-8 rounded-(--radius-lg) border border-line bg-white p-8 text-center">
          <p className="text-[16px] font-medium text-graphite-900">No {brandName} product matches “{query}”.</p>
          <p className="mt-1 text-[14px] text-ink-600">
            We can source products that are not listed. <Link href="/enquiry" className="text-accent-700 underline underline-offset-2">Tell us what you need</Link>,
            or <Link href={catalogueHref} className="text-accent-700 underline underline-offset-2">search the full catalogue</Link>.
          </p>
        </div>
      ) : (
        <div className="mt-8 space-y-12">
          {shownGroups.map((group) => {
            const items = visible.filter((product) => product.group === group.key);
            return (
              <section key={group.key} aria-labelledby={`shelf-${group.key}`}>
                <div className="flex items-center gap-3 border-l-4 pl-4" style={{ borderColor: accent }}>
                  <div>
                    <h3 id={`shelf-${group.key}`} className="text-[1.3rem] font-bold text-graphite-900">
                      {group.name}
                    </h3>
                    <p className="text-[14px] text-ink-600">{group.blurb}</p>
                  </div>
                </div>
                <ul className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {items.map((product) => (
                    <li key={product.slug} className="flex flex-col rounded-(--radius-lg) border border-line bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
                      <Link href={`/products/${product.slug}`} className="text-[16px] font-semibold text-graphite-900 hover:text-accent-700">
                        {product.name}
                      </Link>
                      <p className="mt-1.5 line-clamp-3 text-[13.5px] leading-relaxed text-ink-600">{product.description}</p>
                      <div className="mt-auto pt-4">
                        {product.price ? (
                          <p>
                            <span className="text-[1.5rem] font-bold text-graphite-900">{product.price}</span>
                            <span className="ml-1.5 text-[13px] text-ink-600">{product.term}</span>
                            <span className="block text-[12px] text-ink-500">
                              excl. GST{product.gstIncl ? ` · ${product.gstIncl} incl.` : ""}
                            </span>
                          </p>
                        ) : (
                          <p>
                            <span className="text-[1.15rem] font-bold text-graphite-900">Get today&apos;s price</span>
                            <span className="block text-[12px] text-ink-500">Quoted on a written quotation</span>
                          </p>
                        )}
                        <div className="mt-3 flex gap-2">
                          {product.buyHref ? (
                            <Link
                              href={product.buyHref}
                              className="inline-flex min-h-11 flex-1 items-center justify-center rounded-(--radius-md) bg-accent-700 px-3 text-[14px] font-semibold text-white hover:bg-accent-800"
                            >
                              Buy now
                            </Link>
                          ) : (
                            <Link
                              href="/enquiry"
                              className="inline-flex min-h-11 flex-1 items-center justify-center rounded-(--radius-md) bg-accent-700 px-3 text-[14px] font-semibold text-white hover:bg-accent-800"
                            >
                              Get a quote
                            </Link>
                          )}
                          <Link
                            href={`/products/${product.slug}`}
                            className="inline-flex min-h-11 flex-1 items-center justify-center rounded-(--radius-md) border border-line bg-white px-3 text-[14px] font-medium text-graphite-900 hover:border-graphite-300"
                          >
                            Details
                          </Link>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
