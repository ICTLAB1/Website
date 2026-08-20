import type { Metadata } from "next";
import Link from "next/link";

import { Breadcrumb } from "@/components/ui/breadcrumb";
import { EmptyState } from "@/components/ui/states";
import { SearchBox } from "@/components/layout/search-box";
import { ButtonLink } from "@/components/ui/button";
import { normaliseQuery, searchAll, type SearchResult } from "@/lib/queries/search";
import { buildMetadata } from "@/lib/seo";

type PageProps = { searchParams: Promise<{ q?: string | string[] }> };

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const params = await searchParams;
  const raw = Array.isArray(params.q) ? params.q[0] : params.q;
  const term = normaliseQuery(raw);

  return buildMetadata({
    title: term ? `Search results for “${term}”` : "Search",
    description:
      "Search across the software catalogue, vendors, managed services, licensing guidance and frequently asked questions.",
    path: "/search",
    // Search result pages are not useful in an index and create unbounded URLs.
    noIndex: true,
  });
}

function ResultGroup({ heading, results }: { heading: string; results: SearchResult[] }) {
  if (results.length === 0) return null;
  return (
    <section className="mb-10">
      <h2 className="mb-4 flex items-baseline gap-2 text-[15px] font-semibold text-navy-900">
        {heading}
        <span className="text-[13px] font-normal text-ink-400">({results.length})</span>
      </h2>
      <ul className="divide-y divide-line rounded-[--radius-lg] border border-line bg-white">
        {results.map((result) => (
          <li key={result.href}>
            <Link href={result.href} className="flex items-start gap-4 px-5 py-4 hover:bg-surface-muted">
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-medium text-navy-900">{result.title}</span>
                <span className="clamp-2 mt-1 block text-[13px] leading-relaxed text-ink-600">
                  {result.subtitle}
                </span>
              </span>
              {result.badge ? (
                <span className="mt-0.5 shrink-0 rounded-[--radius-xs] bg-ink-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-ink-600">
                  {result.badge}
                </span>
              ) : null}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default async function SearchPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const raw = Array.isArray(params.q) ? params.q[0] : params.q;
  const term = normaliseQuery(raw);
  const results = await searchAll(term);

  return (
    <div className="container-page pb-16">
      <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "Search" }]} />

      <header className="mb-8 max-w-2xl">
        <h1 className="text-3xl sm:text-4xl">Search</h1>
        <p className="mt-3 text-[15px] text-ink-600">
          Search products by name or SKU, plus vendors, services, articles and FAQs.
        </p>
        <div className="mt-6">
          <SearchBox size="lg" autoFocus placeholder="Search products, SKU, vendors or services" />
        </div>
      </header>

      {!term ? (
        <EmptyState
          title="Enter a search term"
          description="Try a product name such as “Acrobat”, a SKU, a vendor name, or a service like “email migration”."
        />
      ) : results.total === 0 ? (
        <EmptyState
          title={`No results for “${term}”`}
          description="We may still be able to source what you need — a great deal of what we supply is quoted rather than listed."
          action={
            <div className="flex flex-wrap justify-center gap-3">
              <ButtonLink href="/products" variant="outline">
                Browse catalogue
              </ButtonLink>
              <ButtonLink href="/contact">Ask us to source it</ButtonLink>
            </div>
          }
        />
      ) : (
        <>
          <p className="mb-8 text-[13px] text-ink-600" aria-live="polite">
            <strong className="font-semibold text-navy-900">{results.total}</strong> results for{" "}
            <strong className="font-semibold text-navy-900">“{term}”</strong>
          </p>
          <ResultGroup heading="Products" results={results.products} />
          <ResultGroup heading="Vendors" results={results.brands} />
          <ResultGroup heading="Services" results={results.services} />
          <ResultGroup heading="Articles" results={results.articles} />
          <ResultGroup heading="Questions" results={results.faqs} />
        </>
      )}
    </div>
  );
}
