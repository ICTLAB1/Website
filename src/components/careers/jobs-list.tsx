"use client";

import Link from "next/link";
import { useEffect, useId, useMemo, useState } from "react";

import { CareerLink } from "@/components/careers/career-button";
import { cn } from "@/lib/utils";
import type { DisplayJob } from "@/lib/queries/hr-feed";

/**
 * The open positions: search, three filters, and an expandable detail panel.
 *
 * Everything the visitor sees comes from the feed and is rendered as a React
 * child, which escapes it; there is no `dangerouslySetInnerHTML` here and there
 * must not be (`tests/careers-live.test.tsx` fails if one appears).
 *
 * The cards are in the server-rendered HTML — searching, filtering and
 * expanding only change what is shown — so a crawler or a visitor with scripts
 * off still gets every job and every link. A closed card keeps its detail panel
 * in the markup and `hidden`, for the same reason the site's menu does.
 *
 * The search box and filters collect nothing: they are read in the browser and
 * go nowhere. A filter appears only when the jobs actually differ on it, so a
 * list of three jobs in one department does not offer a department filter that
 * could only ever show the same three.
 */

const ALL = "All";

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <li className="rounded-full bg-career-mist px-3 py-1 text-[13px] font-medium text-career-navy ring-1 ring-inset ring-career-navy/10">
      {children}
    </li>
  );
}

function JobCard({ job }: { job: DisplayJob }) {
  const [open, setOpen] = useState(false);
  const detailId = useId();
  const hasDetail = job.responsibilities.length > 0 || job.requirements.length > 0;

  return (
    <li className="group rounded-[1rem] border border-line bg-white p-5 transition-all duration-200 hover:border-career-blue/40 hover:shadow-[0_14px_36px_-16px_rgba(11,42,91,0.28)] motion-reduce:transition-none sm:p-7">
      {job.department ? (
        <p className="mb-1.5 text-label font-semibold uppercase tracking-[0.12em] text-career-blue">
          {job.department}
        </p>
      ) : null}

      <h3 className="text-subsection text-career-navy">
        <Link href={job.url} className="hover:text-career-blue">
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
        <CareerLink href={job.applyUrl} arrow className="w-full sm:w-auto">
          Apply now
          <span className="sr-only"> for {job.title}</span>
        </CareerLink>
        {hasDetail ? (
          <button
            type="button"
            aria-expanded={open}
            aria-controls={detailId}
            onClick={() => setOpen((value) => !value)}
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-[0.5rem] border border-career-navy/25 bg-white px-5 text-[15px] font-semibold text-career-navy transition-colors hover:border-career-navy hover:bg-career-mist focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-career-blue sm:w-auto"
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
              <h4 className="text-[15px] font-semibold text-career-navy">Responsibilities</h4>
              <ul className="mt-2 list-disc space-y-1.5 pl-5 text-[15px] leading-relaxed text-ink-700">
                {job.responsibilities.map((line, index) => (
                  <li key={`${index}-${line}`}>{line}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {job.requirements.length > 0 ? (
            <div>
              <h4 className="text-[15px] font-semibold text-career-navy">Requirements</h4>
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

function distinct(values: Array<string | null>): string[] {
  return [...new Set(values.filter((value): value is string => Boolean(value)))].sort((a, b) =>
    a.localeCompare(b),
  );
}

function Filter({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (next: string) => void;
}) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-label font-semibold uppercase tracking-[0.1em] text-career-navy/70">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-12 w-full rounded-[0.5rem] border border-career-navy/20 bg-white px-3 text-[15px] text-career-navy focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-career-blue"
      >
        <option value={ALL}>{`All ${label.toLowerCase()}s`}</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}

export function JobsList({ jobs }: { jobs: DisplayJob[]; departments?: string[] }) {
  const searchId = useId();
  const [query, setQuery] = useState("");
  const [department, setDepartment] = useState(ALL);
  const [experience, setExperience] = useState(ALL);
  const [type, setType] = useState(ALL);

  // A category card on the page above fills the search in for the visitor.
  useEffect(() => {
    const onSearch = (event: Event) => {
      const detail = (event as CustomEvent<string>).detail;
      if (typeof detail === "string") setQuery(detail);
    };
    window.addEventListener("careers:search", onSearch);
    return () => window.removeEventListener("careers:search", onSearch);
  }, []);

  const departments = useMemo(() => distinct(jobs.map((job) => job.department)), [jobs]);
  const experiences = useMemo(() => distinct(jobs.map((job) => job.experience)), [jobs]);
  const types = useMemo(() => distinct(jobs.map((job) => job.employmentType)), [jobs]);

  const needle = query.trim().toLowerCase();
  const shown = jobs.filter((job) => {
    if (department !== ALL && job.department !== department) return false;
    if (experience !== ALL && job.experience !== experience) return false;
    if (type !== ALL && job.employmentType !== type) return false;
    if (!needle) return true;
    return [job.title, job.department, job.location, job.summary, job.employmentType]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(needle);
  });

  const filtering = needle !== "" || department !== ALL || experience !== ALL || type !== ALL;
  const filters = [
    departments.length > 1 && { label: "Department", value: department, options: departments, set: setDepartment },
    experiences.length > 1 && { label: "Experience", value: experience, options: experiences, set: setExperience },
    types.length > 1 && { label: "Type", value: type, options: types, set: setType },
  ].filter((entry) => entry !== false);

  return (
    <div>
      <div className="mb-8 rounded-[1rem] bg-career-mist p-4 sm:p-5">
        <label htmlFor={searchId} className="sr-only">
          Search positions
        </label>
        <div className="relative">
          <svg
            aria-hidden="true"
            width="18"
            height="18"
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-career-navy/60"
          >
            <circle cx="9" cy="9" r="5.5" />
            <path d="M13.5 13.5 17 17" />
          </svg>
          <input
            id={searchId}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by role, team or location"
            className="h-12 w-full rounded-[0.5rem] border border-career-navy/20 bg-white pl-11 pr-4 text-[15px] text-career-navy placeholder:text-ink-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-career-blue"
          />
        </div>

        {filters.length > 0 ? (
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            {filters.map((filter) => (
              <Filter
                key={filter.label}
                label={filter.label}
                value={filter.value}
                options={filter.options}
                onChange={filter.set}
              />
            ))}
          </div>
        ) : null}

        {filtering ? (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setDepartment(ALL);
              setExperience(ALL);
              setType(ALL);
            }}
            className="mt-4 inline-flex min-h-11 items-center text-[14px] font-semibold text-career-blue underline underline-offset-4 hover:text-career-navy"
          >
            Clear search and filters
          </button>
        ) : null}
      </div>

      {/* Said aloud when a search or filter changes what is on the page. */}
      <p className="sr-only" role="status">
        Showing {shown.length} of {jobs.length} {jobs.length === 1 ? "position" : "positions"}
      </p>

      {shown.length > 0 ? (
        <ul className="space-y-4">
          {shown.map((job) => (
            <JobCard key={job.id} job={job} />
          ))}
        </ul>
      ) : (
        <p className="rounded-[1rem] border border-dashed border-career-navy/25 p-6 text-[15px] text-ink-600">
          No positions match that search. Clear it to see all {jobs.length}.
        </p>
      )}
    </div>
  );
}
