import { Skeleton } from "@/components/ui/states";

/**
 * A loading boundary is scoped to /search deliberately.
 *
 * A Suspense boundary flushes the response — and therefore the 200 status —
 * before the page body resolves, which would turn any later notFound() into a
 * soft 404. /search never calls notFound(), so a boundary is safe here and is
 * not placed on segments that can 404.
 */
export default function Loading() {
  return (
    <div className="container-page py-16">
      <span className="sr-only" role="status">
        Searching
      </span>
      <Skeleton className="h-4 w-32" />
      <Skeleton className="mt-5 h-10 w-64" />
      <Skeleton className="mt-6 h-14 w-full max-w-2xl" />
      <div className="mt-10 space-y-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-20" />
        ))}
      </div>
    </div>
  );
}
