import Link from "next/link";

import { safeBrandLogo } from "@/lib/brand-logo";
import { PartnerBadge } from "@/components/marketing/partner-badge";

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

export function BrandMark({
  brand,
  size,
  alt = "",
  eager = false,
}: {
  brand: BrandArtwork;
  size: "sm" | "md";
  /**
   * The mark's alternative text.
   *
   * Empty by default, and that default is the common case: both callers that
   * pass nothing print the brand's name in text beside the mark, so alt text
   * would make a screen reader say "Microsoft Microsoft" — noise to a person
   * and an `image-redundant-alt` violation to axe.
   *
   * The belt is the exception. It shows the mark *instead of* the name, so
   * there the alt text is not a duplicate: it is the only name the link has.
   */
  alt?: string;
  /**
   * Load the file immediately rather than when it scrolls into view.
   *
   * Lazy is right for a page of brand cards. It is wrong on the belt, where
   * the marks off the right-hand edge are seconds away from sliding into view
   * under their own power — deferring them means a reader watches empty chips
   * fill in as they arrive, which reads as a broken page rather than a lazy
   * one.
   */
  eager?: boolean;
}) {
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
        /* Empty unless the caller is showing the mark instead of the name;
           see the prop's own note above. */
        alt={alt}
        className={`${mark} shrink-0 object-contain object-left`}
        loading={eager ? "eager" : "lazy"}
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
    partnerLabel?: string | null;
    partnerConfirmedAt?: Date | string | null;
    partnerPublic?: boolean | null;
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
      <span className="mt-auto" />

      {/*
        Under the description rather than beside the name: a designation is a
        fact about the relationship, not part of the brand's title.
      */}
      <PartnerBadge brand={brand} className="mt-4 self-start" />

      {typeof brand.productCount === "number" ? (
        <span className="mt-3 text-label font-medium text-ink-500">
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
