import Link from "next/link";

/**
 * Brand tile. A styled wordmark rather than a brand logo file: we identify
 * the brands we supply without reproducing anyone's trademarked artwork.
 */
export function BrandCard({
  brand,
}: {
  brand: { slug: string; name: string; tagline: string | null; accentColor: string; productCount?: number };
}) {
  return (
    <Link
      href={`/brands/${brand.slug}`}
      className="group flex flex-col rounded-[--radius-lg] border border-line bg-white p-5 lift hover:border-graphite-300"
    >
      <span
        aria-hidden="true"
        className="mb-4 inline-flex h-9 w-9 items-center justify-center rounded-[--radius-sm] text-[15px] font-bold text-white"
        style={{ backgroundColor: brand.accentColor }}
      >
        {brand.name.charAt(0)}
      </span>
      <span className="text-[15px] font-semibold text-graphite-900 group-hover:text-accent-700">
        {brand.name}
      </span>
      {brand.tagline ? (
        <span className="clamp-2 mt-1.5 text-[13px] leading-relaxed text-ink-600">
          {brand.tagline}
        </span>
      ) : null}
      {typeof brand.productCount === "number" ? (
        <span className="mt-4 text-[12px] font-medium text-ink-500">
          {brand.productCount} {brand.productCount === 1 ? "product" : "products"}
        </span>
      ) : null}
    </Link>
  );
}

/** Compact strip of brand wordmarks used under the hero. */
export function BrandStrip({ brands }: { brands: Array<{ slug: string; name: string; accentColor: string }> }) {
  return (
    <ul className="flex flex-wrap items-center justify-center gap-x-3 gap-y-3 sm:gap-x-4">
      {brands.map((brand) => (
        <li key={brand.slug}>
          <Link
            href={`/brands/${brand.slug}`}
            className="inline-flex items-center gap-2 rounded-[--radius-md] border border-line bg-white px-3.5 py-2 text-[13px] font-medium text-ink-700 lift hover:border-graphite-300 hover:text-graphite-900"
          >
            <span
              aria-hidden="true"
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: brand.accentColor }}
            />
            {brand.name}
          </Link>
        </li>
      ))}
    </ul>
  );
}
