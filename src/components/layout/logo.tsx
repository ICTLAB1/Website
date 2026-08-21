import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * Wordmark rather than an image asset: it stays crisp at any size, needs no
 * network request, and adapts to the surface it sits on.
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
      className={cn("group inline-flex min-w-0 items-center gap-2.5", className)}
      aria-label={`${name} — home`}
    >
      <span
        aria-hidden="true"
        className={cn(
          "grid h-8 w-8 shrink-0 place-items-center rounded-[--radius-sm] text-[15px] font-bold",
          onDark ? "bg-white text-graphite-900" : "bg-graphite-900 text-white",
        )}
      >
        {name.trim().charAt(0).toUpperCase() || "I"}
      </span>
      <span className="flex min-w-0 flex-col leading-none">
        <span
          className={cn(
            "truncate text-[17px] font-semibold tracking-tight",
            onDark ? "text-white" : "text-graphite-900",
          )}
        >
          {name}
        </span>
        <span
          className={cn(
            // Hidden on the narrowest screens: decorative, and it competes
            // with the header actions for horizontal space.
            "mt-0.5 hidden truncate text-[10px] font-medium uppercase tracking-[0.14em] min-[420px]:block",
            onDark ? "text-graphite-200" : "text-ink-500",
          )}
        >
          Enterprise Technology
        </span>
      </span>
    </Link>
  );
}
