"use client";

import Link from "next/link";
import { useId, useState } from "react";

import { ButtonLink } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { DisplayJob } from "@/lib/queries/hr-feed";

/**
 * The open positions, with department filters and an expandable detail panel.
 *
 * Everything the visitor sees comes from the feed and is rendered as a React
 * child, which escapes it; there is no `dangerouslySetInnerHTML` here and there
 * must not be (`tests/careers-live.test.tsx` fails if one appears).
 *
 * The cards are in the server-rendered HTML — filtering and expanding only
 * change what is shown — so a crawler or a visitor with scripts off still gets
 * every job and every link. A closed card keeps its detail panel in the markup
 * and `hidden`, for the same reason the site's menu does.
 */

const OTHER = "Other";

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <li className="rounded-full bg-graphite-50 px-3 py-1 text-[13px] font-medium text-graphite-800 ring-1 ring-inset ring-line">
      {children}
    </li>
  );
}

function JobCard({ job }: { job: DisplayJob }) {
  const [open, setOpen] = useState(false);
  const detailId = useId();
  const hasDetail = job.responsibilities.length > 0 || job.requirements.length > 0;

  return (
    <li className="rounded-[--radius-lg] border border-line bg-white p-5 transition-all duration-200 hover:border-accent-300 hover:shadow-[0_10px_30px_-12px_rgba(32,28,24,0.18)] motion-reduce:transition-none sm:p-6">
      {job.department ? (
        <p className="mb-1.5 text-label font-semibold uppercase tracking-[0.12em] text-accent-700">
          {job.department}
        </p>
      ) : null}

      <h3 className="text-subsection text-graphite-900">
        <Link href={job.url} className="hover:text-accent-700">
          {job.title}
        </Link>
      </h3>

      <ul className="mt-3 flex flex-wrap gap-2">
        {job.location ? <Chip>{job.location}</Chip> : null}
        {job.employmentType ? <Chip>{job.employmentType}</Chip> : null}
        {job.experience ? <Chip>{job.experience}</Chip> : null}
        {job.salary ? <Chip>{job.salary}</Chip> : null}
      </ul>

      {job.summary ? (
        <p className="mt-3 max-w-3xl text-[15px] leading-relaxed text-ink-600">{job.summary}</p>
      ) : null}

      {job.postedLabel || job.applyByLabel ? (
        <p className="mt-3 text-meta text-ink-500">
          {[job.postedLabel, job.applyByLabel ? `Apply by ${job.applyByLabel}` : null]
            .filter(Boolean)
            .join(" · ")}
        </p>
      ) : null}

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <ButtonLink href={job.applyUrl} className="w-full sm:w-auto">
          Apply now
          <span className="sr-only"> for {job.title}</span>
        </ButtonLink>
        {hasDetail ? (
          <button
            type="button"
            aria-expanded={open}
            aria-controls={detailId}
            onClick={() => setOpen((value) => !value)}
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-[--radius-md] border border-line-strong bg-white px-5 text-sm font-medium text-graphite-900 transition-colors hover:border-graphite-400 hover:bg-graphite-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-graphite-700 sm:w-auto"
          >
            {open ? "Hide details" : "View details"}
            <svg
              width="14"
              height="14"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
              className={cn("transition-transform", open && "rotate-180")}
            >
              <path d="M5.5 7.5 10 12l4.5-4.5z" />
            </svg>
          </button>
        ) : null}
      </div>

      {hasDetail ? (
        <div id={detailId} hidden={!open} className="mt-5 grid gap-6 border-t border-line pt-5 md:grid-cols-2">
          {job.responsibilities.length > 0 ? (
            <div>
              <h4 className="text-[15px] font-semibold text-graphite-900">Responsibilities</h4>
              <ul className="mt-2 list-disc space-y-1.5 pl-5 text-[15px] leading-relaxed text-ink-700">
                {job.responsibilities.map((line, index) => (
                  <li key={`${index}-${line}`}>{line}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {job.requirements.length > 0 ? (
            <div>
              <h4 className="text-[15px] font-semibold text-graphite-900">Requirements</h4>
              <ul className="mt-2 list-disc space-y-1.5 pl-5 text-[15px] leading-relaxed text-ink-700">
                {job.requirements.map((line, index) => (
                  <li key={`${index}-${line}`}>{line}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}
    </li>
  );
}

export function JobsList({ jobs, departments }: { jobs: DisplayJob[]; departments: string[] }) {
  const [filter, setFilter] = useState<string>("All");

  // A job with no department can only be reached through "All" unless there is
  // somewhere for it to go; "Other" is that place, and only when it is needed.
  const hasUnassigned = jobs.some((job) => !job.department);
  const chips = departments.length + (hasUnassigned ? 1 : 0) > 1
    ? ["All", ...departments, ...(hasUnassigned ? [OTHER] : [])]
    : [];

  const shown = jobs.filter((job) =>
    filter === "All" ? true : filter === OTHER ? !job.department : job.department === filter,
  );

  return (
    <div>
      {chips.length > 0 ? (
        <div role="group" aria-label="Filter by department" className="mb-6 flex flex-wrap gap-2">
          {chips.map((chip) => {
            const active = chip === filter;
            return (
              <button
                key={chip}
                type="button"
                aria-pressed={active}
                onClick={() => setFilter(chip)}
                className={cn(
                  "inline-flex min-h-11 items-center rounded-full border px-4 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-graphite-700",
                  active
                    ? "border-graphite-900 bg-graphite-900 text-white"
                    : "border-line-strong bg-white text-graphite-800 hover:border-graphite-400",
                )}
              >
                {chip}
              </button>
            );
          })}
        </div>
      ) : null}

      {/* Said aloud when a filter changes what is on the page. */}
      <p className="sr-only" role="status">
        Showing {shown.length} of {jobs.length} {jobs.length === 1 ? "position" : "positions"}
      </p>

      <ul className="space-y-4">
        {shown.map((job) => (
          <JobCard key={job.id} job={job} />
        ))}
      </ul>
    </div>
  );
}
