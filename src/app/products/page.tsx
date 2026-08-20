import type { Metadata } from "next";
import Link from "next/link";

import { Breadcrumb } from "@/components/ui/breadcrumb";
import { EmptyState } from "@/components/ui/states";
import { Pagination } from "@/components/ui/pagination";
import { ButtonLink } from "@/components/ui/button";
import { ProductGrid } from "@/components/marketing/product-card";
import { FilterPanel, MobileFilterPanel } from "@/components/catalogue/filter-panel";
import { getFacets, listProducts, PAGE_SIZE } from "@/lib/queries/catalogue";
import {
  activeFilterChips,
  buildCatalogueHref,
  parseCatalogueParams,
  SORT_OPTIONS,
  type RawSearchParams,
} from "@/lib/catalogue-params";
import { buildMetadata } from "@/lib/seo";

type PageProps = { searchParams: Promise<RawSearchParams> };

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const params = await searchParams;
  const query = Array.isArray(params.q) ? params.q[0] : params.q;
  const hasFilters = Object.keys(params).some((key) => key !== "page" && params[key]);

  const title = query
    ? `Search results for “${query}”`
    : "Software Catalogue — Licensing from Every Major Vendor";

  return buildMetadata({
    title,
    description:
      "Browse enterprise software licensing from Microsoft, Adobe, Autodesk, Zoho, SketchUp, Corel, HPE and Dell. Filter by category, brand, licence type and price, with GST-inclusive quotations.",
    path: "/products",
    // Filtered permutations are near-duplicates of the base listing, so only
    // the canonical /products view is offered for indexing.
    noIndex: hasFilters,
  });
}

export default async function ProductsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const filters = parseCatalogueParams(params);

  const [{ items, total, page, totalPages }, facets] = await Promise.all([
    listProducts(filters),
    getFacets(),
  ]);

  const brandLabels = new Map(facets.brands.map((brand) => [brand.slug, brand.name]));
  const categoryLabels = new Map(
    facets.categories.flatMap((category) => [
      [category.slug, category.name] as const,
      ...category.children.map((child) => [child.slug, child.name] as const),
    ]),
  );
  const chips = activeFilterChips(params, { brands: brandLabels, categories: categoryLabels });

  const first = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const last = Math.min(page * PAGE_SIZE, total);

  return (
    <div className="container-page pb-16">
      <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "Products" }]} />

      <header className="mb-8 max-w-3xl">
        <h1 className="text-3xl sm:text-4xl">
          {filters.q ? `Results for “${filters.q}”` : "Software catalogue"}
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-ink-600">
          Licensing across Microsoft, Adobe, Autodesk, Zoho, SketchUp, Corel and enterprise
          infrastructure. Every price shown excludes GST and is confirmed on a written
          quotation before any order is placed.
        </p>
      </header>

      <div className="grid gap-8 lg:grid-cols-[17rem_minmax(0,1fr)]">
        <aside className="min-w-0 lg:sticky lg:top-32 lg:self-start">
          <div className="hidden lg:block">
            <FilterPanel facets={facets} params={params} />
          </div>
          <MobileFilterPanel facets={facets} params={params} />
        </aside>

        <section aria-labelledby="results-heading" className="min-w-0">
          <h2 id="results-heading" className="sr-only">
            Products
          </h2>
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
            <p className="text-[13px] text-ink-600" aria-live="polite">
              {total === 0 ? (
                "No products match these filters"
              ) : (
                <>
                  Showing <strong className="font-semibold text-navy-900">{first}–{last}</strong> of{" "}
                  <strong className="font-semibold text-navy-900">{total}</strong> products
                </>
              )}
            </p>

            {/* Sort is a set of links so it works without JavaScript and keeps
                each ordering independently addressable. */}
            <div className="flex min-w-0 max-w-full items-center gap-2">
              <span className="shrink-0 text-[13px] text-ink-500">Sort</span>
              <div className="scroll-x -mx-1 flex min-w-0 gap-1 px-1">
                {SORT_OPTIONS.map((option) => {
                  const active = (filters.sort ?? "relevance") === option.value;
                  return (
                    <Link
                      key={option.value}
                      href={buildCatalogueHref(params, {
                        sort: option.value === "relevance" ? null : option.value,
                      })}
                      className={`whitespace-nowrap rounded-[--radius-sm] px-2.5 py-1.5 text-[13px] ${
                        active
                          ? "bg-navy-900 font-medium text-white"
                          : "text-ink-600 hover:bg-surface-muted"
                      }`}
                    >
                      {option.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>

          {chips.length > 0 ? (
            <ul className="mb-5 flex flex-wrap gap-2">
              {chips.map((chip) => (
                <li key={chip.label}>
                  <Link
                    href={chip.removeHref}
                    className="inline-flex items-center gap-1.5 rounded-[--radius-sm] border border-line-strong bg-white py-1 pl-2.5 pr-2 text-[12px] text-ink-700 hover:border-danger-600 hover:text-danger-700"
                  >
                    {chip.label}
                    <span aria-hidden="true" className="text-ink-500">
                      ×
                    </span>
                    <span className="sr-only">Remove filter</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}

          {items.length === 0 ? (
            <EmptyState
              as="h3"
              title="No products match these filters"
              description="Try removing a filter, searching for a different term, or tell us what you need — we can source products that are not listed in the catalogue."
              action={
                <div className="flex flex-wrap justify-center gap-3">
                  <ButtonLink href="/products" variant="outline">
                    Clear filters
                  </ButtonLink>
                  <ButtonLink href="/contact">Ask us to source it</ButtonLink>
                </div>
              }
            />
          ) : (
            <>
              <ProductGrid products={items} />
              <Pagination
                page={page}
                totalPages={totalPages}
                buildHref={(target) => buildCatalogueHref(params, { page: target })}
              />
            </>
          )}

          <div className="mt-14 rounded-[--radius-lg] border border-line bg-surface-muted p-6 sm:p-8">
            <h2 className="text-[1.25rem]">Cannot find what you need?</h2>
            <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-ink-600">
              This catalogue lists our most-requested licensing. We source considerably more
              than is listed here, including hardware configurations and vendor products that
              are only ever quoted. Tell us the requirement and we will price it.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <ButtonLink href="/enquiry">Request enterprise pricing</ButtonLink>
              <ButtonLink href="/contact" variant="outline">
                Talk to a specialist
              </ButtonLink>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
