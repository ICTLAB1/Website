import Link from "next/link";
import { appUrl } from "@/lib/env";
import { jsonLdHtml } from "@/lib/seo";

export type Crumb = { label: string; href?: string };

/**
 * Renders the visible trail and the matching BreadcrumbList structured data
 * from one source, so the two can never drift apart.
 */
export function Breadcrumb({ items }: { items: Crumb[] }) {
  const base = appUrl();
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.label,
      ...(item.href ? { item: `${base}${item.href}` } : {}),
    })),
  };

  return (
    <>
      <nav aria-label="Breadcrumb" className="scroll-x">
        <ol className="flex items-center gap-1.5 whitespace-nowrap py-3 text-[13px] text-ink-500">
          {items.map((item, index) => {
            const isLast = index === items.length - 1;
            return (
              <li key={`${item.label}-${index}`} className="flex items-center gap-1.5">
                {item.href && !isLast ? (
                  <Link href={item.href} className="hover:text-accent-700 hover:underline">
                    {item.label}
                  </Link>
                ) : (
                  <span className={isLast ? "font-medium text-ink-700" : undefined} aria-current={isLast ? "page" : undefined}>
                    {item.label}
                  </span>
                )}
                {!isLast ? (
                  <span aria-hidden="true" className="text-ink-300">
                    /
                  </span>
                ) : null}
              </li>
            );
          })}
        </ol>
      </nav>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdHtml(jsonLd) }}
      />
    </>
  );
}
