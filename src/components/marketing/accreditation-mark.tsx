import { safeMarkImage } from "@/lib/mark-image";

/**
 * A programme or accreditation mark, where one has been put on file.
 *
 * Renders nothing at all when the path is not a mark this site serves. That is
 * the point of the component: the two places that show a mark cannot forget to
 * validate, and a payload edited in the admin panel cannot turn into a request
 * to somebody else's server.
 *
 * Unlike the brand marks on catalogue cards, this one takes a real `alt`. A
 * brand mark sits beside the brand's name in text and is therefore decorative;
 * a mark like GeM is often the only thing that names the programme, so a reader
 * who cannot see it would otherwise lose the statement entirely.
 */
export function AccreditationMark({
  src,
  alt,
  className,
}: {
  src: string | null | undefined;
  alt: string;
  className?: string;
}) {
  const mark = safeMarkImage(src);
  if (!mark) return null;

  return (
    /*
     * `next/image` wants intrinsic dimensions for what is a small, local,
     * already-compressed file the optimiser has nothing to add to — the same
     * reasoning as the brand marks in `marketing/brand-card`.
     */
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={mark}
      alt={alt}
      className={`w-auto object-contain object-left ${className ?? "h-12"}`}
      loading="lazy"
      decoding="async"
    />
  );
}
