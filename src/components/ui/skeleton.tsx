import { cn } from "@/lib/utils";

/**
 * Loading placeholders.
 *
 * Each skeleton reserves the same space as the content it stands in for, so
 * the page does not jump when real content arrives. They are `aria-hidden`
 * with a single polite status message alongside, rather than announcing a
 * dozen shimmering boxes to a screen reader.
 */
export function Skeleton({ className }: { className?: string }) {
  return <span aria-hidden="true" className={cn("skeleton block", className)} />;
}

export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <span aria-hidden="true" className={cn("block space-y-2", className)}>
      {Array.from({ length: lines }, (_, index) => (
        <Skeleton
          key={index}
          className={cn("h-3", index === lines - 1 ? "w-3/5" : "w-full")}
        />
      ))}
    </span>
  );
}

/** Mirrors the product card's layout so the grid does not reflow on load. */
export function ProductCardSkeleton() {
  return (
    <div className="flex flex-col rounded-[--radius-lg] border border-line bg-white p-5">
      <Skeleton className="h-3 w-16" />
      <Skeleton className="mt-3 h-4 w-4/5" />
      <SkeletonText lines={2} className="mt-3" />
      <Skeleton className="mt-6 h-5 w-24" />
      <Skeleton className="mt-4 h-10 w-full" />
    </div>
  );
}

export function ProductGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <>
      <p role="status" className="sr-only">
        Loading products
      </p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: count }, (_, index) => (
          <ProductCardSkeleton key={index} />
        ))}
      </div>
    </>
  );
}
