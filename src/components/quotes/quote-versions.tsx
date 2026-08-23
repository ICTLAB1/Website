import Link from "next/link";

import { StatusBadge } from "@/components/ui/badge";
import { formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/utils";
import type { VersionRow } from "@/components/quotes/quote-thread";

/**
 * Every version of one quotation.
 *
 * Shown to both sides, with the figures, because "which version are we talking
 * about" is the question that costs the most time on a revised quotation. A
 * superseded version stays readable rather than disappearing: somebody is
 * holding a copy of it, and telling them it never existed helps nobody.
 */
export function QuoteVersions({
  versions,
  current,
  basePath,
}: {
  versions: VersionRow[];
  current: string;
  /** "/account/quotes" or "/admin/quotes". */
  basePath: string;
}) {
  if (versions.length <= 1) return null;

  return (
    <ol className="space-y-2">
      {versions.map((version) => {
        const isCurrent = version.reference === current;
        return (
          <li
            key={version.reference}
            className={`flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-[--radius-md] border px-4 py-3 ${
              isCurrent ? "border-graphite-400 bg-white" : "border-line bg-surface-muted"
            }`}
          >
            <div className="min-w-0">
              <span className="text-meta font-medium text-graphite-900">
                Version {version.version}
                {isCurrent ? " — you are looking at this one" : ""}
              </span>
              <span className="mt-0.5 block font-mono text-label text-ink-500">
                {isCurrent ? (
                  version.reference
                ) : (
                  <Link
                    href={`${basePath}/${version.reference}`}
                    className="underline underline-offset-2 hover:text-accent-700"
                  >
                    {version.reference}
                  </Link>
                )}
              </span>
              {version.revisionNote ? (
                <span className="mt-1 block text-label text-ink-600">{version.revisionNote}</span>
              ) : null}
            </div>

            <div className="flex items-center gap-3 text-right">
              <span className="text-meta tabular-nums text-graphite-900">
                {formatMoney(version.totalMinor, version.currency)}
              </span>
              <StatusBadge status={version.status} />
              <span className="text-label text-ink-500">
                {version.sentAt ? formatDate(version.sentAt) : formatDate(version.createdAt)}
              </span>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
