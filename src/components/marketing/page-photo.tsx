import Image from "next/image";

import type { SitePhoto } from "@/lib/page-photos";
import { cn } from "@/lib/utils";

/**
 * One picture beside a page's opening, at the width it is sharp at.
 *
 * Deliberately small and unframed apart from a hairline border: the page it sits
 * on is unchanged, and the picture illustrates it rather than leading it. Below
 * the large breakpoint it drops under the text at full width of the column, never
 * wider than the file is.
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
    <figure className={cn("w-full max-w-[26rem]", className)}>
      <Image
        src={photo.src}
        alt={photo.alt}
        width={photo.width}
        height={photo.height}
        sizes="(min-width: 1024px) 26rem, 92vw"
        className={cn(
          "h-auto w-full rounded-[--radius-lg] border",
          onDark ? "border-white/15" : "border-line",
        )}
      />
    </figure>
  );
}
