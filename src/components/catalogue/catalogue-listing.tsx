import Link from "next/link";

import { EmptyState } from "@/components/ui/states";
import { Pagination } from "@/components/ui/pagination";
import { ButtonLink } from "@/components/ui/button";
import { ProductGrid } from "@/components/marketing/product-card";
import { FilterPanel, MobileFilterPanel, hasAnyFacet } from "@/components/catalogue/filter-panel";
import { getFacets, listProducts, PAGE_SIZE, type CatalogueFilters } from "@/lib/queries/catalogue";
import {
  activeFilterChips,
  buildCatalogueHref,
  SORT_OPTIONS,
  type RawSearchParams,
} from "@/lib/catalogue-params";

/**
 * The filtered listing: facets, sort, chips, grid, pagination.
 *
 * Extracted so the software catalogue and the hardware catalogue are the same
 * screen at two addresses rather than two screens that happen to look alike.
 * The alternative — copying the page and changing the query — is how a site
 * ends up with a sort control that works on one listing and not the other, six
 * months after nobody remembers there are two.
 *
 * `basePath` threads through every generated link, so a facet clicked at
 * `/hardware` stays at `/hardware`. Getting that wrong is not a broken link; it
 * is a filter that silently moves the visitor into a different catalogue.
 */
export async function CatalogueListing({
  params,
  filters,
  basePath,
  emptyDescription,
}: {
  params: RawSearchParams;
  filters: CatalogueFilters;
  basePath: string;
  emptyDescription?: string;
}) {
  const [{ items, total, page, totalPages }, facets] = await Promise.all([
    listProducts(filters),
    // Counted within this catalogue, so every facet's number matches what
    // clicking it returns.
    getFacets(filters.kind),
  ]);

  const brandLabels = new Map(facets.brands.map((brand) => [brand.slug, brand.name]));
  const categoryLabels = new Map(
    facets.categories.flatMap((category) => [
      [category.slug, category.name] as const,
      ...category.children.map((child) => [child.slug, child.name] as const),
    ]),
  );
  const chips = activeFilterChips(params, {
    brands: brandLabels,
    categories: categoryLabels,
    basePath,
  });

  const first = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const last = Math.min(page * PAGE_SIZE, total);

  /*
   * The column is reserved only when there is a panel to put in it. An empty
   * catalogue has no facets, and a seventeen-rem void beside the words "no
   * products match" reads as a layout that broke rather than a range that is
   * empty.
   */
  const showFilters = hasAnyFacet(facets);

  return (
    <div className={showFilters ? "grid gap-8 lg:grid-cols-[17rem_minmax(0,1fr)]" : ""}>
      {/*
        No price filter, because there are no prices to filter by.
        It read `filters.kind !== "hardware"` when hardware alone was
        quote-only. The whole catalogue is now — see `lib/catalogue/quote-only`
        — and a band of "Under ₹5,000" over a listing that shows no figures is
        a control that cannot do anything.
      */}
      {showFilters ? (
      <aside className="min-w-0 lg:sticky lg:top-32 lg:self-start">
        <div className="hidden lg:block">
          <FilterPanel
            facets={facets}
            params={params}
            basePath={basePath}
            showPrice={false}
          />
        </div>
        <MobileFilterPanel
          facets={facets}
          params={params}
          basePath={basePath}
          showPrice={false}
        />
      </aside>
      ) : null}

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
                Showing{" "}
                <strong className="font-semibold text-graphite-900">
                  {first}–{last}
                </strong>{" "}
                of <strong className="font-semibold text-graphite-900">{total}</strong> products
              </>
            )}
          </p>

          {/* Sort is a set of links so it works without JavaScript and keeps
              each ordering independently addressable. */}
          <div className="flex min-w-0 max-w-full items-center gap-2">
            <span className="shrink-0 text-[13px] text-ink-500">Sort</span>
            <div className="scroll-x -mx-1 flex min-w-0 gap-1 px-1">
              {SORT_OPTIONS.filter(
                // A price sort on a catalogue with no prices orders by nothing
                // and tells the visitor there are prices to be had.
                (option) =>
                  filters.kind !== "hardware" ||
                  (option.value !== "price-asc" && option.value !== "price-desc"),
              ).map((option) => {
                const active = (filters.sort ?? "relevance") === option.value;
                return (
                  <Link
                    key={option.value}
                    href={buildCatalogueHref(
                      params,
                      { sort: option.value === "relevance" ? null : option.value },
                      basePath,
                    )}
                    className={`whitespace-nowrap rounded-[--radius-sm] px-2.5 py-1.5 text-[13px] ${
                      active
                        ? "bg-graphite-900 font-medium text-white"
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
            description={
              emptyDescription ??
              "Try removing a filter, searching for a different term, or tell us what you need — we can source products that are not listed in the catalogue."
            }
            action={
              <div className="flex flex-wrap justify-center gap-3">
                <ButtonLink href={basePath} variant="outline">
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
              buildHref={(target) => buildCatalogueHref(params, { page: target }, basePath)}
            />
          </>
        )}
      </section>
    </div>
  );
}
