import Link from "next/link";

import { safeBrandLogo } from "@/lib/brand-logo";

/**
 * Brand tiles.
 *
 * A publisher's own logo where one has been put on file, and a styled wordmark
 * where one has not. The wordmark was the only option for a long time and
 * remains the default: this business does not hold artwork for every brand it
 * supplies, and a missing logo must degrade to something deliberate rather than
 * to a broken image.
 *
 * `safeBrandLogo` decides. An administrator types that value, so it is treated
 * as untrusted and constrained to a filename inside `/brands/`; see the note in
 * `lib/brand-logo`.
 *
 * Plain `<img>` rather than `next/image`: these are small, mostly SVG, already
 * local, and the optimiser does not process SVG anyway — so the component would
 * add a required width and height for no benefit.
 */

type BrandArtwork = { name: string; accentColor: string; logoUrl?: string | null };

function BrandMark({ brand, size }: { brand: BrandArtwork; size: "sm" | "md" }) {
  const logo = safeBrandLogo(brand.logoUrl);
  const box = size === "md" ? "h-9 w-9" : "h-5 w-5";

  if (logo) {
    return (
      /*
       * `next/image` would want a width and a height for a 20–36 px mark that
       * is already local, already tiny, and usually an SVG — which the image
       * optimiser passes through untouched anyway. The rule exists to catch
       * unoptimised remote hero images; this is neither.
       */
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={logo}
        // The name, not "logo": a screen reader announcing "Microsoft" is the
        // useful reading, and the surrounding link already says it is a brand.
        alt={brand.name}
        className={`${box} shrink-0 rounded-[--radius-sm] object-contain`}
        loading="lazy"
        decoding="async"
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      className={`${box} inline-flex shrink-0 items-center justify-center rounded-[--radius-sm] font-bold text-white ${
        size === "md" ? "text-[15px]" : "text-[11px]"
      }`}
      style={{ backgroundColor: brand.accentColor }}
    >
      {brand.name.charAt(0)}
    </span>
  );
}

export function BrandCard({
  brand,
}: {
  brand: {
    slug: string;
    name: string;
    tagline: string | null;
    accentColor: string;
    logoUrl?: string | null;
    productCount?: number;
  };
}) {
  return (
    <Link
      href={`/brands/${brand.slug}`}
      className="group flex flex-col rounded-[--radius-lg] border border-line bg-white p-5 lift hover:border-graphite-300"
    >
      <span className="mb-4 inline-flex">
        <BrandMark brand={brand} size="md" />
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

/** Compact strip of brands used under the hero. */
export function BrandStrip({
  brands,
}: {
  brands: Array<{ slug: string; name: string; accentColor: string; logoUrl?: string | null }>;
}) {
  return (
    <ul className="flex flex-wrap items-center justify-center gap-x-3 gap-y-3 sm:gap-x-4">
      {brands.map((brand) => (
        <li key={brand.slug}>
          <Link
            href={`/brands/${brand.slug}`}
            className="inline-flex items-center gap-2 rounded-[--radius-md] border border-line bg-white px-3.5 py-2 text-[13px] font-medium text-ink-700 lift hover:border-graphite-300 hover:text-graphite-900"
          >
            <BrandMark brand={brand} size="sm" />
            {brand.name}
          </Link>
        </li>
      ))}
    </ul>
  );
}
