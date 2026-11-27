import Link from "next/link";

import { prisma } from "@/lib/db";

/**
 * Every product of a brand, as plain links grouped by category.
 *
 * The featured grid shows six and the series grids show hardware families, so a
 * brand with dozens of quote-only models left most of them reachable only from
 * the sitemap and from the price list, which does not list products without a
 * price. A page a crawler can reach only through the sitemap carries no internal
 * signal of importance, and search engines were leaving those unindexed.
 *
 * Plain links, one per product, so each model has a real path from its brand's
 * hub. Names only: this is an index, not a second catalogue.
 */
export async function BrandProductIndex({ brandId, brandName }: { brandId: string; brandName: string }) {
  const rows = await prisma.product.findMany({
    where: { brandId, status: "ACTIVE", deletedAt: null },
    select: { slug: true, name: true, category: { select: { name: true, displayOrder: true } } },
    orderBy: [{ name: "asc" }],
  });
  if (rows.length <= 6) return null;

  const groups = new Map<string, { order: number; items: Array<{ slug: string; name: string }> }>();
  for (const row of rows) {
    const key = row.category.name;
    const group = groups.get(key) ?? { order: row.category.displayOrder, items: [] };
    group.items.push({ slug: row.slug, name: row.name });
    groups.set(key, group);
  }
  const ordered = [...groups.entries()].sort((a, b) => a[1].order - b[1].order || a[0].localeCompare(b[0]));

  return (
    <section aria-labelledby="brand-product-index" className="border-t border-line py-14">
      <h2 id="brand-product-index" className="text-[1.5rem] font-semibold text-graphite-900">
        All {brandName} products ({rows.length})
      </h2>
      <p className="mt-2 max-w-3xl text-[15px] text-ink-600">
        Every {brandName} product we supply. Models without a listed price are quoted to your configuration and
        quantity on a written quotation with a GST invoice.
      </p>
      <div className="mt-6 space-y-8">
        {ordered.map(([category, group]) => (
          <div key={category}>
            <h3 className="text-label font-semibold uppercase tracking-[0.1em] text-ink-500">{category}</h3>
            <ul className="mt-3 grid gap-x-6 gap-y-1.5 sm:grid-cols-2 lg:grid-cols-3">
              {group.items.map((item) => (
                <li key={item.slug}>
                  <Link href={`/products/${item.slug}`} className="inline-block py-1 text-[14px] text-accent-700 underline underline-offset-2 hover:text-accent-800">
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
