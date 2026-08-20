import Link from "next/link";
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

type Facets = {
  brands: Array<{ slug: string; name: string; count: number }>;
  categories: Array<{
    slug: string;
    name: string;
    count: number;
    children: Array<{ slug: string; name: string; count: number }>;
  }>;
  licenceTypes: Array<{ value: string; count: number }>;
};

const AVAILABILITY_OPTIONS = [
  { value: "in-stock", label: "Available now" },
  { value: "made-to-order", label: "Made to order" },
  { value: "on-request", label: "On request" },
];

const PRICE_BANDS = [
  { label: "Under ₹5,000", min: undefined, max: "5000" },
  { label: "₹5,000 – ₹25,000", min: "5000", max: "25000" },
  { label: "₹25,000 – ₹1,00,000", min: "25000", max: "100000" },
  { label: "₹1,00,000 – ₹5,00,000", min: "100000", max: "500000" },
  { label: "Over ₹5,00,000", min: "500000", max: undefined },
];

function FacetGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-line py-5 first:pt-0 last:border-b-0">
      <h3 className="mb-3 text-[12px] font-semibold uppercase tracking-[0.1em] text-ink-500">
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
        className={`flex items-center gap-2.5 rounded-[--radius-sm] px-2 py-1.5 text-[13px] transition-colors ${
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
          <span className="shrink-0 text-[11px] tabular-nums text-ink-500">{count}</span>
        ) : null}
      </Link>
    </li>
  );
}

export function FilterPanel({
  facets,
  params,
  basePath = "/products",
}: {
  facets: Facets;
  params: RawSearchParams;
  basePath?: string;
}) {
  const hasFilters =
    Boolean(params.brand || params.category || params.licence || params.availability || params.min || params.max);

  const currentMin = Array.isArray(params.min) ? params.min[0] : params.min;
  const currentMax = Array.isArray(params.max) ? params.max[0] : params.max;

  return (
    <div className="rounded-[--radius-lg] border border-line bg-white px-5 py-5">
      <div className="mb-1 flex items-center justify-between gap-3">
        <h2 className="text-[15px] font-semibold text-navy-900">Filters</h2>
        {hasFilters ? (
          <Link
            href={buildCatalogueHref({}, { q: Array.isArray(params.q) ? params.q[0] : params.q }, basePath)}
            className="text-[12px] font-medium text-accent-700 hover:underline"
          >
            Clear all
          </Link>
        ) : null}
      </div>

      <FacetGroup title="Category">
        <ul className="space-y-0.5">
          {facets.categories.map((category) => (
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

      <FacetGroup title="Brand">
        <ul className="space-y-0.5">
          {facets.brands
            .filter((brand) => brand.count > 0)
            .map((brand) => (
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

      <FacetGroup title="Price (excl. GST)">
        <ul className="space-y-0.5">
          {PRICE_BANDS.map((band) => {
            const active = currentMin === band.min && currentMax === band.max;
            return (
              <FacetLink
                key={band.label}
                href={buildCatalogueHref(
                  params,
                  active
                    ? { min: null, max: null }
                    : { min: band.min ?? null, max: band.max ?? null },
                  basePath,
                )}
                label={band.label}
                active={active}
              />
            );
          })}
        </ul>
      </FacetGroup>

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
export function MobileFilterPanel(props: Parameters<typeof FilterPanel>[0]) {
  return (
    <details className="lg:hidden">
      <summary className="flex h-11 cursor-pointer items-center justify-between rounded-[--radius-md] border border-line-strong bg-white px-4 text-sm font-medium text-navy-900">
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
