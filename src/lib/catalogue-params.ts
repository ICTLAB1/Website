import type { CatalogueFilters, SortOption } from "@/lib/queries/catalogue";

/**
 * Catalogue URL state.
 *
 * Filters live entirely in the query string so a filtered view can be shared,
 * bookmarked, crawled and reached with the browser's back button. Values are
 * parsed defensively - anything unexpected is dropped rather than trusted.
 */

export const SORT_OPTIONS: Array<{ value: SortOption; label: string }> = [
  { value: "relevance", label: "Most relevant" },
  { value: "popular", label: "Most popular" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
  { value: "name-asc", label: "Name: A to Z" },
  { value: "newest", label: "Recently added" },
];

const VALID_SORTS = new Set(SORT_OPTIONS.map((option) => option.value));

export type RawSearchParams = Record<string, string | string[] | undefined>;

/** `laptops` or `desktops`, and nothing else. */
function familyOf(value: string | string[] | undefined): "laptops" | "desktops" | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw === "laptops" || raw === "desktops" ? raw : undefined;
}

function toArray(value: string | string[] | undefined): string[] {
  if (!value) return [];
  const values = Array.isArray(value) ? value : value.split(",");
  return values
    .map((entry) => entry.trim().toLowerCase())
    // Slugs only: rejects anything that is not a plain identifier.
    .filter((entry) => entry.length > 0 && entry.length <= 64 && /^[a-z0-9-]+$/.test(entry))
    .slice(0, 20);
}

/** Rupees in the URL, paise internally. */
function toPriceMinor(value: string | string[] | undefined): number | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return undefined;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100_000_000) return undefined;
  return Math.round(parsed * 100);
}

export function parseCatalogueParams(params: RawSearchParams): CatalogueFilters {
  const rawQuery = Array.isArray(params.q) ? params.q[0] : params.q;
  const rawPage = Array.isArray(params.page) ? params.page[0] : params.page;
  const rawSort = Array.isArray(params.sort) ? params.sort[0] : params.sort;

  const page = Number(rawPage ?? 1);

  return {
    q: rawQuery?.trim().slice(0, 100) || undefined,
    brand: toArray(params.brand),
    category: toArray(params.category),
    licenceType: toArray(params.licence).map((value) => value.toUpperCase().replace(/-/g, "_")),
    // Both pass through `toArray`, so both are already constrained to plain
    // slugs; the query layer then checks the form factor against the enum and
    // parameterises the series. Neither reaches SQL as a string.
    formFactor: toArray(params.form),
    series: toArray(params.series),
    family: familyOf(params.family),
    availability: toArray(params.availability).map((value) => value.toUpperCase().replace(/-/g, "_")),
    minPriceMinor: toPriceMinor(params.min),
    maxPriceMinor: toPriceMinor(params.max),
    sort: rawSort && VALID_SORTS.has(rawSort as SortOption) ? (rawSort as SortOption) : "relevance",
    page: Number.isFinite(page) && page > 0 ? Math.min(Math.floor(page), 500) : 1,
  };
}

/** Rebuilds `/products?…` preserving current state, with targeted overrides. */
export function buildCatalogueHref(
  current: RawSearchParams,
  overrides: Record<string, string | string[] | number | undefined | null>,
  basePath = "/products",
): string {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(current)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) value.forEach((entry) => params.append(key, entry));
    else params.set(key, value);
  }

  for (const [key, value] of Object.entries(overrides)) {
    params.delete(key);
    if (value === null || value === undefined || value === "") continue;
    if (Array.isArray(value)) value.forEach((entry) => params.append(key, entry));
    else params.set(key, String(value));
  }

  // Any filter change resets to the first page.
  if (!("page" in overrides)) params.delete("page");
  if (params.get("page") === "1") params.delete("page");

  const query = params.toString();
  return query ? `${basePath}?${query}` : basePath;
}

/** Toggles one value inside a multi-select facet. */
export function toggleFacetHref(
  current: RawSearchParams,
  key: string,
  value: string,
  basePath = "/products",
): string {
  const existing = toArray(current[key]);
  const next = existing.includes(value)
    ? existing.filter((entry) => entry !== value)
    : [...existing, value];
  return buildCatalogueHref(current, { [key]: next.length ? next : null }, basePath);
}

export function isFacetActive(current: RawSearchParams, key: string, value: string): boolean {
  return toArray(current[key]).includes(value);
}

/** Chips shown above the results so active filters are always visible. */
export function activeFilterChips(
  current: RawSearchParams,
  labels: {
    brands: Map<string, string>;
    categories: Map<string, string>;
    /**
     * The listing these chips belong to. Without it a chip removed on
     * `/hardware` rebuilds its link against `/products` and moves the visitor
     * into a different catalogue — which reads as the filter having done
     * something far stranger than it did.
     */
    basePath?: string;
  },
): Array<{ label: string; removeHref: string }> {
  const chips: Array<{ label: string; removeHref: string }> = [];
  const base = labels.basePath;

  for (const slug of toArray(current.brand)) {
    chips.push({
      label: labels.brands.get(slug) ?? slug,
      removeHref: toggleFacetHref(current, "brand", slug, base),
    });
  }
  for (const slug of toArray(current.category)) {
    chips.push({
      label: labels.categories.get(slug) ?? slug,
      removeHref: toggleFacetHref(current, "category", slug, base),
    });
  }
  for (const value of toArray(current.licence)) {
    chips.push({
      label: value.replace(/-/g, " ").replace(/\b\w/g, (char) => char.toUpperCase()),
      removeHref: toggleFacetHref(current, "licence", value, base),
    });
  }
  for (const value of toArray(current.availability)) {
    chips.push({
      label: value.replace(/-/g, " ").replace(/\b\w/g, (char) => char.toUpperCase()),
      removeHref: toggleFacetHref(current, "availability", value, base),
    });
  }
  for (const value of toArray(current.form)) {
    chips.push({
      label: value.replace(/-/g, " ").replace(/\b\w/g, (char) => char.toUpperCase()),
      removeHref: toggleFacetHref(current, "form", value, base),
    });
  }
  for (const value of toArray(current.series)) {
    chips.push({
      label: value.replace(/-/g, " ").replace(/\b\w/g, (char) => char.toUpperCase()),
      removeHref: toggleFacetHref(current, "series", value, base),
    });
  }
  const min = Array.isArray(current.min) ? current.min[0] : current.min;
  const max = Array.isArray(current.max) ? current.max[0] : current.max;
  if (min || max) {
    chips.push({
      label: `Price ${min ? `₹${min}` : "0"} – ${max ? `₹${max}` : "any"}`,
      removeHref: buildCatalogueHref(current, { min: null, max: null }, base),
    });
  }

  return chips;
}
