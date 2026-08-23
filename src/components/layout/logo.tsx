import Link from "next/link";
import { BrandLogo } from "@/components/brand/logo";
import { cn } from "@/lib/utils";

/**
 * The home link in the header and footer.
 *
 * The lockup is artwork, so the accessible name is supplied here from the
 * configured trading name rather than being inferred from it. A screen reader
 * hears "TechZoid, home"; a sighted reader sees the mark. That division is why
 * `BrandLogo` renders its image `aria-hidden` — the name belongs on the control,
 * once.
 *
 * `onDark` is threaded through rather than inferred from a CSS variable: the
 * lockup is two different files, not one file recoloured, and only the caller
 * knows which ground it is sitting on.
 */
export function Logo({
  name,
  onDark = false,
  withStrapline = false,
  className,
}: {
  name: string;
  onDark?: boolean;
  /** Passed through. The footer has the room for it; the header does not. */
  withStrapline?: boolean;
  className?: string;
}) {
  return (
    <Link
      href="/"
      aria-label={`${name} — home`}
      className={cn(
        "inline-flex min-w-0 items-center rounded-[--radius-sm]",
        onDark ? "text-white" : "text-graphite-900",
        className,
      )}
    >
      <BrandLogo onDark={onDark} withStrapline={withStrapline} className={withStrapline ? "h-16" : undefined} />
    </Link>
  );
}
