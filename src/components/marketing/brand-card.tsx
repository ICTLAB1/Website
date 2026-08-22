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

  /*
   * A logo gets a fixed height and a free width; the wordmark tile gets a
   * square. That difference is the whole reason this is not one class name.
   *
   * Publishers' marks are not square. Some are close (Dropbox, Red Hat), and
   * several are long wordmarks six or seven times wider than they are tall
   * (VMware, SAP, Kaspersky, Synology). `object-contain` inside a square box
   * fits a 7:1 wordmark by its *width*, which leaves it five pixels tall and
   * unreadable — the artwork is there, correct, and useless.
   */
  const mark = size === "md" ? "h-8 w-auto max-w-[6.5rem]" : "h-4 w-auto max-w-[4.5rem]";

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
        /*
         * Empty, deliberately. Both places that render a mark print the brand's
         * name in text right beside it, so `alt="Microsoft"` makes a screen
         * reader say "Microsoft Microsoft" — which axe-core reports as
         * `image-redundant-alt` and a person using one hears as noise. The mark
         * carries no information the sighted reader does not also get from the
         * word; that is the definition of decorative.
         */
        alt=""
        className={`${mark} shrink-0 object-contain object-left`}
        loading="lazy"
        decoding="async"
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      className={`${box} inline-flex shrink-0 items-center justify-center rounded-[--radius-sm] font-bold text-white ${
        size === "md" ? "text-body" : "text-label"
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
      <span className="text-body font-semibold text-graphite-900 group-hover:text-accent-700">
        {brand.name}
      </span>
      {brand.tagline ? (
        <span className="clamp-2 mt-1.5 text-meta leading-relaxed text-ink-600">
          {brand.tagline}
        </span>
      ) : null}
      {typeof brand.productCount === "number" ? (
        <span className="mt-4 text-label font-medium text-ink-500">
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
            className="inline-flex items-center gap-2 rounded-[--radius-md] border border-line bg-white px-3.5 py-2 text-meta font-medium text-ink-700 lift hover:border-graphite-300 hover:text-graphite-900"
          >
            <BrandMark brand={brand} size="sm" />
            {brand.name}
          </Link>
        </li>
      ))}
    </ul>
  );
}
