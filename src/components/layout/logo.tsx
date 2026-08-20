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
      className={cn("group inline-flex items-center gap-2.5", className)}
      aria-label={`${name} — home`}
    >
      <span
        aria-hidden="true"
        className={cn(
          "grid h-8 w-8 shrink-0 place-items-center rounded-[--radius-sm] text-[15px] font-bold",
          onDark ? "bg-white text-navy-900" : "bg-navy-900 text-white",
        )}
      >
        {name.trim().charAt(0).toUpperCase() || "I"}
      </span>
      <span className="flex flex-col leading-none">
        <span
          className={cn(
            "text-[17px] font-semibold tracking-tight",
            onDark ? "text-white" : "text-navy-900",
          )}
        >
          {name}
        </span>
        <span
          className={cn(
            "mt-0.5 text-[10px] font-medium uppercase tracking-[0.14em]",
            onDark ? "text-navy-200" : "text-ink-500",
          )}
        >
          Enterprise Technology
        </span>
      </span>
    </Link>
  );
}
