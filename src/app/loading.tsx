import { Skeleton } from "@/components/ui/states";

export default function Loading() {
  return (
    <div className="container-page py-16">
      <span className="sr-only" role="status">
        Loading page
      </span>
      <Skeleton className="h-4 w-40" />
      <Skeleton className="mt-5 h-10 w-2/3 max-w-xl" />
      <Skeleton className="mt-4 h-5 w-full max-w-2xl" />
      <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-56" />
        ))}
      </div>
    </div>
  );
}
