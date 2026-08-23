import Link from "next/link";
import type { Metadata } from "next";

import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { liveJobs } from "@/lib/queries/careers";
import {
  EMPLOYMENT_TYPE_LABELS,
  experienceLabel,
  locationLabel,
  payRange,
} from "@/lib/careers";
import { formatMoney } from "@/lib/money";
import { getSiteConfig } from "@/lib/site-config";
import { buildMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = buildMetadata({
  title: "Careers",
  description:
    "Open roles at TechZoid Technologies — sales, technical and operations positions in enterprise software licensing and IT procurement.",
  path: "/careers",
});

/**
 * Open roles.
 *
 * ## When there are none
 *
 * The page still exists and says so. A careers page that 404s when nothing is
 * open loses whatever ranking it has built and tells a speculative applicant
 * nothing; one that says "nothing open right now, here is where to write
 * anyway" keeps both. That state is the normal one for a company this size,
 * not an error.
 *
 * ## What is on a card
 *
 * Enough to decide whether to click: what the role is, where it is, how much
 * experience it wants, and the pay if any is advertised. Not the description —
 * a careers page whose cards are three paragraphs each is a page nobody scans.
 */
export default async function CareersPage() {
  const [jobs, config] = await Promise.all([liveJobs(), getSiteConfig()]);

  return (
    <div className="container-page pb-16">
      <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "Careers" }]} />

      <header className="mb-10 max-w-3xl">
        <h1 className="text-3xl sm:text-4xl">Careers at {config.tradingName}</h1>
        <p className="mt-4 text-[16px] leading-relaxed text-ink-600">
          We supply software licensing and IT infrastructure to organisations that cannot afford to
          get either wrong. That takes people who are careful with detail and straight with
          customers.
        </p>
      </header>

      {jobs.length === 0 ? (
        <section className="rounded-[--radius-lg] border border-line bg-surface-muted p-6 sm:p-8">
          <h2 className="text-[1.05rem]">No open roles at the moment</h2>
          <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-ink-600">
            Nothing is being advertised right now. If you think you would be a fit here anyway,
            write to us — we would rather hear from you than not.
          </p>
          {config.email.sales ? (
            <div className="mt-6">
              <ButtonLink href={`mailto:${config.email.sales}`} variant="outline">
                Write to us
              </ButtonLink>
            </div>
          ) : null}
        </section>
      ) : (
        <section>
          <h2 className="mb-5 text-[1.05rem]">
            {jobs.length} open {jobs.length === 1 ? "role" : "roles"}
          </h2>
          <ul className="space-y-4">
            {jobs.map((job) => {
              const pay = payRange(job);
              const experience = experienceLabel(job);
              return (
                <li key={job.id}>
                  <Link
                    href={`/careers/${job.slug}`}
                    className="block rounded-[--radius-lg] border border-line bg-white p-6 transition-colors hover:border-graphite-400"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
                      <div className="min-w-0">
                        <h3 className="text-[1.05rem] font-semibold text-graphite-900">
                          {job.title}
                        </h3>
                        {job.team ? (
                          <p className="mt-1 text-meta text-ink-500">{job.team}</p>
                        ) : null}
                      </div>
                      <Badge tone="accent">{EMPLOYMENT_TYPE_LABELS[job.employmentType]}</Badge>
                    </div>

                    <p className="mt-3 max-w-3xl text-[15px] leading-relaxed text-ink-700">
                      {job.summary}
                    </p>

                    <p className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-meta text-ink-500">
                      <span>{locationLabel(job)}</span>
                      {experience ? <span>{experience}</span> : null}
                      {/*
                        Pay only where a complete statement exists. An amount
                        with no period, or a range with one end, is worse than
                        silence — see `payRange`.
                      */}
                      {pay ? (
                        <span className="font-medium text-graphite-900">
                          {formatMoney(pay.min, job.salaryCurrency)}
                          {pay.max ? ` – ${formatMoney(pay.max, job.salaryCurrency)}` : "+"} per{" "}
                          {pay.period}
                        </span>
                      ) : null}
                    </p>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
