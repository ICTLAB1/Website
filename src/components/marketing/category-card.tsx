import Link from "next/link";

import { glyph } from "@/lib/glyphs";

export function CategoryCard({
  category,
}: {
  category: { slug: string; name: string; summary: string | null; icon: string | null; count?: number };
}) {
  const path = glyph(category.icon);

  return (
    <Link
      href={`/products?category=${encodeURIComponent(category.slug)}`}
      className="group flex flex-col rounded-[--radius-lg] border border-line bg-white p-5 lift hover:border-graphite-300"
    >
      <span
        aria-hidden="true"
        className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-[--radius-md] bg-graphite-50 text-graphite-700 group-hover:bg-accent-50 group-hover:text-accent-700"
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
          <path d={path} />
        </svg>
      </span>
      <span className="text-body font-semibold text-graphite-900 group-hover:text-accent-700">
        {category.name}
      </span>
      {category.summary ? (
        <span className="clamp-2 mt-1.5 text-meta leading-relaxed text-ink-600">
          {category.summary}
        </span>
      ) : null}
      {typeof category.count === "number" && category.count > 0 ? (
        <span className="mt-4 text-label font-medium text-ink-500">
          {category.count} {category.count === 1 ? "product" : "products"}
        </span>
      ) : null}
    </Link>
  );
}
