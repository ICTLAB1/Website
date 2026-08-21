import Link from "next/link";
import { BrandLogo } from "@/components/brand/logo";
import { cn } from "@/lib/utils";

/**
 * The home link in the header and footer.
 *
 * The visible lockup is graphic — the O is a mark, not a letter — so the
 * accessible name is supplied here from the configured trading name rather than
 * being inferred from the letterforms. A screen reader hears "TechZoid, home";
 * a sighted reader sees the wordmark.
 */
export function Logo({
  name,
  onDark = false,
  className,
}: {
  name: string;
  onDark?: boolean;
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
      <BrandLogo />
    </Link>
  );
}
