import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function EmptyState({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-[--radius-lg] border border-dashed border-line-strong bg-surface-muted px-6 py-14 text-center",
        className,
      )}
    >
      <h3 className="text-base font-semibold text-navy-900">{title}</h3>
      {description ? (
        <p className="mt-2 max-w-md text-sm text-ink-600">{description}</p>
      ) : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function ErrorState({
  title = "Something went wrong",
  description,
  correlationId,
  action,
}: {
  title?: string;
  description?: string;
  correlationId?: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-[--radius-lg] border border-danger-600/25 bg-danger-50 px-6 py-8 text-center">
      <h3 className="text-base font-semibold text-danger-700">{title}</h3>
      {description ? <p className="mt-2 text-sm text-ink-700">{description}</p> : null}
      {correlationId ? (
        <p className="mt-3 font-mono text-[12px] text-ink-500">
          Reference: {correlationId}
        </p>
      ) : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

/** Non-animated skeleton block; respects prefers-reduced-motion via globals. */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn("animate-pulse rounded-[--radius-sm] bg-surface-sunken", className)}
      aria-hidden="true"
    />
  );
}

export function LoadingState({ label = "Loading" }: { label?: string }) {
  return (
    <div role="status" aria-live="polite" className="flex items-center gap-3 py-10 text-sm text-ink-500">
      <span
        aria-hidden="true"
        className="h-4 w-4 animate-spin rounded-full border-2 border-line-strong border-t-accent-700"
      />
      {label}…
    </div>
  );
}

export function ProductGridSkeleton({ count = 9 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="rounded-[--radius-lg] border border-line bg-white p-5">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="mt-3 h-5 w-3/4" />
          <Skeleton className="mt-2 h-4 w-full" />
          <Skeleton className="mt-2 h-4 w-2/3" />
          <Skeleton className="mt-5 h-7 w-28" />
          <Skeleton className="mt-4 h-10 w-full" />
        </div>
      ))}
    </div>
  );
}
