import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * Link-based pagination: every page is a real, crawlable URL that preserves the
 * current filters, so results can be shared and indexed.
 */
export function Pagination({
  page,
  totalPages,
  buildHref,
}: {
  page: number;
  totalPages: number;
  buildHref: (page: number) => string;
}) {
  if (totalPages <= 1) return null;

  const pages = pageWindow(page, totalPages);
  const linkClass =
    "inline-flex h-9 min-w-9 items-center justify-center rounded-[--radius-md] border px-2.5 text-sm";

  return (
    <nav aria-label="Pagination" className="mt-10 flex flex-wrap items-center justify-center gap-1.5">
      {page > 1 ? (
        <Link
          href={buildHref(page - 1)}
          rel="prev"
          className={cn(linkClass, "border-line-strong bg-white text-navy-800 hover:bg-navy-50")}
        >
          <span aria-hidden="true">&larr;</span>
          <span className="ml-1.5 hidden sm:inline">Previous</span>
          <span className="sr-only sm:hidden">Previous page</span>
        </Link>
      ) : (
        <span className={cn(linkClass, "border-line bg-surface-muted text-ink-400")} aria-hidden="true">
          &larr;
        </span>
      )}

      {pages.map((entry, index) =>
        entry === "gap" ? (
          <span key={`gap-${index}`} className="px-1.5 text-ink-400" aria-hidden="true">
            …
          </span>
        ) : (
          <Link
            key={entry}
            href={buildHref(entry)}
            aria-current={entry === page ? "page" : undefined}
            className={cn(
              linkClass,
              entry === page
                ? "border-navy-900 bg-navy-900 font-semibold text-white"
                : "border-line-strong bg-white text-navy-800 hover:bg-navy-50",
            )}
          >
            {entry}
          </Link>
        ),
      )}

      {page < totalPages ? (
        <Link
          href={buildHref(page + 1)}
          rel="next"
          className={cn(linkClass, "border-line-strong bg-white text-navy-800 hover:bg-navy-50")}
        >
          <span className="mr-1.5 hidden sm:inline">Next</span>
          <span className="sr-only sm:hidden">Next page</span>
          <span aria-hidden="true">&rarr;</span>
        </Link>
      ) : (
        <span className={cn(linkClass, "border-line bg-surface-muted text-ink-400")} aria-hidden="true">
          &rarr;
        </span>
      )}
    </nav>
  );
}

function pageWindow(page: number, totalPages: number): Array<number | "gap"> {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, index) => index + 1);

  const output: Array<number | "gap"> = [1];
  const start = Math.max(2, page - 1);
  const end = Math.min(totalPages - 1, page + 1);

  if (start > 2) output.push("gap");
  for (let index = start; index <= end; index += 1) output.push(index);
  if (end < totalPages - 1) output.push("gap");
  output.push(totalPages);
  return output;
}
