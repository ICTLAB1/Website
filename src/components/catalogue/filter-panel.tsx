import Link from "next/link";

import { DEFAULT_GST_RATE, formatMoney } from "@/lib/money";
import { toDisplay } from "@/lib/currency";
import { getDisplayCurrency } from "@/lib/display-currency";
import type { PriceDisplay } from "@/lib/price-display";
import {
  buildCatalogueHref,
  isFacetActive,
  toggleFacetHref,
  type RawSearchParams,
} from "@/lib/catalogue-params";
import { humanise } from "@/lib/utils";

/**
 * Catalogue facets.
 *
 * Every control is a real link that changes the URL, so filtering works without
 * JavaScript, is shareable, and each filtered view is independently reachable.
 */

export type Facets = {
  brands: Array<{ slug: string; name: string; count: number }>;
  categories: Array<{
    slug: string;
    name: string;
    count: number;
    children: Array<{ slug: string; name: string; count: number }>;
  }>;
  licenceTypes: Array<{ value: string; count: number }>;
  /** Empty until the catalogue holds hardware; see the note at the render. */
  formFactors: Array<{ value: string; label: string; count: number }>;
  series: Array<{ value: string; label: string; count: number }>;
};

/**
 * Whether these facets can narrow anything.
 *
 * Shared with the listing, which reserves a column for the panel: without one
 * answer to this question the panel can hide itself and still leave a
 * seventeen-rem gap where it used to be, which is how the empty hardware
 * catalogue looked before both sides agreed.
 *
 * Availability is excluded on purpose — it is a fixed list rather than a
 * counted one, so it is "available" even when the catalogue holds nothing.
 */
export function hasAnyFacet(facets: Facets): boolean {
  return (
    facets.categories.some((category) => category.count > 0) ||
    facets.brands.some((brand) => brand.count > 0) ||
    facets.licenceTypes.length > 0 ||
    facets.formFactors.length > 0 ||
    facets.series.length > 0
  );
}

const AVAILABILITY_OPTIONS = [
  { value: "in-stock", label: "Available now" },
  { value: "made-to-order", label: "Made to order" },
  { value: "on-request", label: "On request" },
];

/**
 * The bands, as rupee boundaries. Labels are built from these per currency.
 *
 * The filter itself always works in rupees, because that is what the catalogue
 * is priced in and what the query compares against — only the label changes.
 * Hard-coded rupee labels used to sit here, which meant a visitor reading in
 * dollars was offered "Under ₹5,000" beside prices in dollars.
 */
const PRICE_BANDS: Array<{ min?: string; max?: string }> = [
  { max: "5000" },
  { min: "5000", max: "25000" },
  { min: "25000", max: "100000" },
  { min: "100000", max: "500000" },
  { min: "500000" },
];

/**
 * A band boundary written in the visitor's currency.
 *
 * Converted at the standard GST rate rather than a per-product one, because a
 * band spans many products with potentially different rates and no single
 * figure could be exact for all of them. That is acceptable for a filter — the
 * bands are approximate by design — and it is why the label rounds to whole
 * units rather than pretending to the penny.
 */
function bandBoundary(rupees: string, display: PriceDisplay): string {
  const baseMinor = Number(rupees) * 100;
  if (display.currency === "INR") return formatMoney(baseMinor, "INR");
  const view = toDisplay(baseMinor, DEFAULT_GST_RATE, display.currency, display.rates);
  return formatMoney(Math.round(view.amountMinor / 100) * 100, view.currency, {
    showDecimals: false,
  });
}

function bandLabel(band: { min?: string; max?: string }, display: PriceDisplay): string {
  if (!band.min) return `Under ${bandBoundary(band.max!, display)}`;
  if (!band.max) return `Over ${bandBoundary(band.min, display)}`;
  return `${bandBoundary(band.min, display)} – ${bandBoundary(band.max, display)}`;
}

function FacetGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-line py-5 first:pt-0 last:border-b-0">
      <h3 className="mb-3 text-label font-semibold uppercase tracking-[0.1em] text-ink-500">
        {title}
      </h3>
      {children}
    </div>
  );
}

function FacetLink({
  href,
  label,
  count,
  active,
  indented = false,
}: {
  href: string;
  label: string;
  count?: number;
  active: boolean;
  indented?: boolean;
}) {
  return (
    <li>
      <Link
        href={href}
        className={`flex items-center gap-2.5 rounded-[--radius-sm] px-2 py-1.5 text-meta transition-colors ${
          active ? "bg-accent-50 text-accent-800" : "text-ink-700 hover:bg-surface-muted"
        } ${indented ? "ml-3" : ""}`}
      >
        <span
          aria-hidden="true"
          className={`grid h-4 w-4 shrink-0 place-items-center rounded-[--radius-xs] border ${
            active ? "border-accent-700 bg-accent-700 text-white" : "border-line-strong bg-white"
          }`}
        >
          {active ? (
            <svg width="10" height="10" viewBox="0 0 12 12" fill="currentColor">
              <path d="M4.7 8.6 2.2 6.1l.9-.9 1.6 1.6 4-4 .9.9z" />
            </svg>
          ) : null}
        </span>
        <span className="min-w-0 flex-1 truncate">{label}</span>
        {/* aria-pressed is invalid on a link, so the state is carried in the
            accessible name instead. */}
        <span className="sr-only">{active ? " — filter applied, activate to remove" : " — activate to apply filter"}</span>
        {typeof count === "number" ? (
          <span className="shrink-0 text-label tabular-nums text-ink-500">{count}</span>
        ) : null}
      </Link>
    </li>
  );
}

export async function FilterPanel({
  facets,
  params,
  basePath = "/products",
  /**
   * Whether a price filter belongs here at all.
   *
   * False on the hardware catalogue, which carries no prices — a band of
   * rupee ranges over a listing that shows none is an offer to filter by
   * something the visitor cannot see, and every band returns nothing.
   */
  showPrice = true,
}: {
  facets: Facets;
  params: RawSearchParams;
  basePath?: string;
  showPrice?: boolean;
}) {
  // Resolved here rather than passed in, for the same reason as ProductGrid: a
  // caller that forgot would show rupee bands beside dollar prices.
  const display = await getDisplayCurrency();
  const hasFilters =
    Boolean(params.brand || params.category || params.licence || params.availability || params.min || params.max);

  const categories = facets.categories.filter((category) => category.count > 0);
  const brands = facets.brands.filter((brand) => brand.count > 0);

  const currentMin = Array.isArray(params.min) ? params.min[0] : params.min;
  const currentMax = Array.isArray(params.max) ? params.max[0] : params.max;

  // Nothing to filter, so no panel. The listing asks the same question before
  // it reserves a column for one.
  if (!hasAnyFacet(facets)) return null;

  return (
    <div className="rounded-[--radius-lg] border border-line bg-white px-5 py-5">
      <div className="mb-1 flex items-center justify-between gap-3">
        <h2 className="text-body font-semibold text-graphite-900">Filters</h2>
        {hasFilters ? (
          <Link
            href={buildCatalogueHref({}, { q: Array.isArray(params.q) ? params.q[0] : params.q }, basePath)}
            className="text-label font-medium text-accent-700 hover:underline"
          >
            Clear all
          </Link>
        ) : null}
      </div>

      {/*
        Only categories that hold something.
        A facet reading zero cannot be usefully clicked, and a column of them
        beside "no products match" reads as a broken page rather than an empty
        range — which is exactly how the hardware catalogue looked on the day it
        shipped with no models in it. The brand facet has always filtered this
        way; the category one did not, because until there were two catalogues
        every category held products.
      */}
      {categories.length > 0 ? (
      <FacetGroup title="Category">
        <ul className="space-y-0.5">
          {categories.map((category) => (
            <li key={category.slug}>
              <ul className="space-y-0.5">
                <FacetLink
                  href={toggleFacetHref(params, "category", category.slug, basePath)}
                  label={category.name}
                  count={category.count}
                  active={isFacetActive(params, "category", category.slug)}
                />
                {isFacetActive(params, "category", category.slug) && category.children.length > 0
                  ? category.children
                      .filter((child) => child.count > 0)
                      .map((child) => (
                        <FacetLink
                          key={child.slug}
                          href={toggleFacetHref(params, "category", child.slug, basePath)}
                          label={child.name}
                          count={child.count}
                          active={isFacetActive(params, "category", child.slug)}
                          indented
                        />
                      ))
                  : null}
              </ul>
            </li>
          ))}
        </ul>
      </FacetGroup>
      ) : null}

      {brands.length > 0 ? (
      <FacetGroup title="Brand">
        <ul className="space-y-0.5">
          {brands.map((brand) => (
              <FacetLink
                key={brand.slug}
                href={toggleFacetHref(params, "brand", brand.slug, basePath)}
                label={brand.name}
                count={brand.count}
                active={isFacetActive(params, "brand", brand.slug)}
              />
            ))}
        </ul>
      </FacetGroup>
      ) : null}

      {/*
        Hardware facets, rendered only when the catalogue holds hardware.
        The lists are counted from the data rather than declared, so a filter
        for something nothing carries never appears — a facet that returns
        nothing is worse than a missing one, because the visitor reads it as the
        catalogue being broken rather than as the range not existing.
      */}
      {facets.formFactors.length > 0 ? (
        <FacetGroup title="Product type">
          <ul className="space-y-0.5">
            {facets.formFactors.map((formFactor) => (
              <FacetLink
                key={formFactor.value}
                href={toggleFacetHref(params, "form", formFactor.value, basePath)}
                label={formFactor.label}
                count={formFactor.count}
                active={isFacetActive(params, "form", formFactor.value)}
              />
            ))}
          </ul>
        </FacetGroup>
      ) : null}

      {facets.series.length > 0 ? (
        <FacetGroup title="Series">
          <ul className="space-y-0.5">
            {facets.series.map((series) => (
              <FacetLink
                key={series.value}
                href={toggleFacetHref(params, "series", series.value, basePath)}
                label={series.label}
                count={series.count}
                active={isFacetActive(params, "series", series.value)}
              />
            ))}
          </ul>
        </FacetGroup>
      ) : null}

      {facets.licenceTypes.length > 0 ? (
      <FacetGroup title="Licence type">
        <ul className="space-y-0.5">
          {facets.licenceTypes.map((licence) => {
            const slug = licence.value.toLowerCase().replace(/_/g, "-");
            return (
              <FacetLink
                key={licence.value}
                href={toggleFacetHref(params, "licence", slug, basePath)}
                label={humanise(licence.value)}
                count={licence.count}
                active={isFacetActive(params, "licence", slug)}
              />
            );
          })}
        </ul>
      </FacetGroup>
      ) : null}

      {/* GST is named in rupees only — a converted band already includes it. */}
      {showPrice ? (
      <FacetGroup title={display.currency === "INR" ? "Price (excl. GST)" : "Price"}>
        <ul className="space-y-0.5">
          {PRICE_BANDS.map((band) => {
            const active = currentMin === band.min && currentMax === band.max;
            const label = bandLabel(band, display);
            return (
              <FacetLink
                key={label}
                href={buildCatalogueHref(
                  params,
                  active
                    ? { min: null, max: null }
                    : { min: band.min ?? null, max: band.max ?? null },
                  basePath,
                )}
                label={label}
                active={active}
              />
            );
          })}
        </ul>
      </FacetGroup>
      ) : null}

      <FacetGroup title="Availability">
        <ul className="space-y-0.5">
          {AVAILABILITY_OPTIONS.map((option) => (
            <FacetLink
              key={option.value}
              href={toggleFacetHref(params, "availability", option.value, basePath)}
              label={option.label}
              active={isFacetActive(params, "availability", option.value)}
            />
          ))}
        </ul>
      </FacetGroup>
    </div>
  );
}

/** Mobile presentation: the same panel inside a native disclosure. */
export async function MobileFilterPanel(props: Parameters<typeof FilterPanel>[0]) {
  return (
    <details className="lg:hidden">
      <summary className="flex h-11 cursor-pointer items-center justify-between rounded-[--radius-md] border border-line-strong bg-white px-4 text-sm font-medium text-graphite-900">
        Filters
        <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" className="text-ink-500">
          <path d="M3 5h14v2H3zM5 9h10v2H5zM8 13h4v2H8z" />
        </svg>
      </summary>
      <div className="mt-3">
        <FilterPanel {...props} />
      </div>
    </details>
  );
}
