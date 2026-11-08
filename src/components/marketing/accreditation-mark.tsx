import Image from "next/image";

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
     * Optimised rather than served as-is, which is a correction.
     *
     * This component used to render a plain `<img>`, on the stated grounds
     * that these are "small, local, already-compressed file[s] the optimiser
     * has nothing to add to". That was measured on 7 November 2026 and is not
     * true of the files actually on file here:
     *
     *   /certifications/ISO-27001-2022.png        420x420   40 KB
     *   /certifications/ISO-IEC-20000-1-2018.png  420x420   37 KB
     *   /certifications/ISO-9001-2015.png         420x420   34 KB
     *   /badges/microsoft-solutions-partner.png   -         43 KB
     *
     * The trust bar renders them at `h-9 w-9` — 36 CSS pixels. A 420-pixel
     * PNG delivered for a 36-pixel slot is 111 KB of certification marks on
     * every page of the site, and the optimiser has a great deal to add: it
     * resizes to the slot and serves AVIF, which `next.config.ts` has been
     * configured for all along.
     *
     * The source files are deliberately left alone. They are read off disk at
     * full resolution and embedded in generated quotation PDFs
     * (`lib/pdf/assets.ts`), where 420 pixels is the right size and 36 would
     * print as a smudge. Optimising on delivery serves the browser a small
     * file without touching what print uses — which resizing the masters
     * would not.
     *
     * `height` and `width` are the intrinsic square the marks are supplied
     * as, so the aspect ratio is right; `sizes` is what the slot actually
     * takes, and it is what keeps the generated srcset small. `className`
     * still owns the rendered height, as before.
     */
    <Image
      src={mark}
      alt={alt}
      width={420}
      height={420}
      sizes="(max-width: 768px) 48px, 128px"
      className={`w-auto object-contain object-left ${className ?? "h-12"}`}
      loading="lazy"
      decoding="async"
    />
  );
}
