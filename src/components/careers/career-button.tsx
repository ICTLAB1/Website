import Link from "next/link";

import { cn } from "@/lib/utils";

/**
 * The careers pages' buttons: navy, never orange.
 *
 * White on the logo's orange is under 4.5:1, so orange is kept for large type
 * and thin accents and the buttons are navy (or white on the dark panels).
 * Every one is at least 44px tall.
 */
const BASE =
  "inline-flex h-12 items-center justify-center gap-2 rounded-[0.5rem] px-6 text-[15px] font-semibold transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 motion-reduce:transition-none";

const VARIANTS = {
  navy: "bg-career-navy text-white hover:bg-career-blue focus-visible:outline-career-blue",
  outline:
    "border border-career-navy/25 bg-white text-career-navy hover:border-career-navy hover:bg-career-mist focus-visible:outline-career-blue",
  white: "bg-white text-career-navy hover:bg-career-mist focus-visible:outline-white",
  ghostOnDark:
    "border border-white/40 text-white hover:bg-white/10 focus-visible:outline-white",
} as const;

export function CareerLink({
  href,
  variant = "navy",
  arrow = false,
  className,
  children,
}: {
  href: string;
  variant?: keyof typeof VARIANTS;
  arrow?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Link href={href} className={cn(BASE, VARIANTS[variant], className)}>
      {children}
      {arrow ? (
        <svg
          aria-hidden="true"
          width="16"
          height="16"
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M4 10h12M11 5l5 5-5 5" />
        </svg>
      ) : null}
    </Link>
  );
}
