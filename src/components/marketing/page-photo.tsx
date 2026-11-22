import Image from "next/image";

import type { SitePhoto } from "@/lib/page-photos";
import { cn } from "@/lib/utils";

/**
 * One picture beside a page's opening, sized to fill the space beside the text.
 *
 * On a wide screen it takes the whole height of the opening and about a third of
 * its width, cropped (never stretched out of shape) to fit; on a phone it sits
 * under the text at full width in a 3:2 frame. The files are 832 pixels wide, so
 * at the 544 it is shown at on a desktop it is sharp, and twice that on a
 * high-density screen.
 */
export function PagePhoto({
  photo,
  className,
  onDark = false,
}: {
  photo: SitePhoto;
  className?: string;
  /** Uses a lighter hairline when the picture sits on a dark band. */
  onDark?: boolean;
}) {
  return (
    <figure
      className={cn(
        "relative aspect-[3/2] w-full overflow-hidden rounded-[--radius-lg] border lg:aspect-auto lg:h-full lg:min-h-[19rem]",
        onDark ? "border-white/15" : "border-line",
        className,
      )}
    >
      <Image
        src={photo.src}
        alt={photo.alt}
        fill
        // Always at the top of the page, beside the opening, so it must not be
        // lazy-loaded: a deferred picture there is a late largest-contentful-paint.
        priority
        sizes="(min-width: 1024px) 34rem, 92vw"
        className="object-cover"
      />
    </figure>
  );
}
