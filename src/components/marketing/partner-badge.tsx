import {
  currentPartnerBadge,
  currentPartnerLabel,
  type PartnerFields,
} from "@/lib/brand-partner";

/**
 * A partner designation, where one may be stated.
 *
 * Renders nothing unless `lib/brand-partner` says the claim may be made — which
 * is the point of the component. Every surface that could print a partner
 * status goes through here, so there is one place that decides and no way to
 * print a designation by writing the markup slightly differently somewhere
 * else.
 *
 * The wording is whatever the programme calls it, taken from the record. It is
 * never composed from the brand's name, because "HP" plus the word "partner" is
 * a sentence HP did not write.
 */
export function PartnerBadge({
  brand,
  tone = "light",
  className,
}: {
  brand: PartnerFields | null | undefined;
  tone?: "light" | "dark";
  className?: string;
}) {
  const label = currentPartnerLabel(brand);
  if (!label) return null;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-[--radius-sm] border px-2.5 py-1 text-label font-medium ${
        tone === "dark"
          ? "border-accent-400/40 bg-accent-400/10 text-accent-200"
          : "border-accent-600/30 bg-accent-50 text-accent-800"
      } ${className ?? ""}`}
    >
      {/*
        A mark, not a tick. A tick reads as "verified by the manufacturer",
        which is a claim about their systems rather than ours.
      */}
      <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-current" />
      {label}
    </span>
  );
}

/**
 * The badge the publisher actually issued.
 *
 * Gated on exactly the same rule as the wording above it, through
 * `currentPartnerBadge`: a designation that may not be stated in words may not
 * be stated in artwork either. The opposite — a lapsed claim coming down as
 * text and staying up as a picture — would leave the more convincing half in
 * place.
 *
 * The badge already contains the publisher's own mark and the designation, so
 * the alt text names both. This is not decorative: it is the evidence, and a
 * reader who cannot see it should be told what it says.
 */
export function PartnerBadgeArtwork({
  brand,
  className,
  height = "h-10",
}: {
  brand: (PartnerFields & { name?: string; partnerBadgeUrl?: string | null }) | null | undefined;
  className?: string;
  height?: string;
}) {
  const badge = currentPartnerBadge(brand);
  const label = currentPartnerLabel(brand);
  if (!badge || !label) return null;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={badge}
      alt={brand?.name ? `${brand.name} ${label}` : label}
      className={`${height} w-auto object-contain object-left ${className ?? ""}`}
      loading="lazy"
      decoding="async"
    />
  );
}
