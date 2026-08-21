"use client";

import Link from "next/link";
import { useBasket } from "@/components/enquiry/basket-provider";
import { cn } from "@/lib/utils";

/** Header entry point to the enquiry basket, with a live line count. */
export function BasketButton({ className }: { className?: string }) {
  const { lines, ready } = useBasket();
  const count = lines.length;

  return (
    <Link
      href="/enquiry"
      className={cn(
        "relative inline-flex h-10 items-center gap-2 rounded-[--radius-md] border border-line-strong px-3 text-sm font-medium text-graphite-900 hover:border-graphite-400 hover:bg-graphite-50",
        className,
      )}
    >
      <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
        <path d="M3 3a1 1 0 0 0 0 2h1.2l1.9 8.4A2 2 0 0 0 8.05 15h7.1a2 2 0 0 0 1.94-1.51L18.6 7H6.24l-.35-1.55A2 2 0 0 0 3.94 3z" />
        <path d="M8 18.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3M15.5 18.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3" />
      </svg>
      <span className="hidden lg:inline">Enquiry</span>
      {ready && count > 0 ? (
        <span className="grid h-5 min-w-5 place-items-center rounded-full bg-accent-700 px-1 text-[11px] font-semibold text-white">
          {count > 99 ? "99+" : count}
        </span>
      ) : null}
      <span className="sr-only">
        {ready ? `Enquiry basket, ${count} ${count === 1 ? "item" : "items"}` : "Enquiry basket"}
      </span>
    </Link>
  );
}
