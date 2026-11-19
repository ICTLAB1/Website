import type { Metadata } from "next";

import { Breadcrumb } from "@/components/ui/breadcrumb";
import { ButtonLink } from "@/components/ui/button";
import { Suspense } from "react";

import { JobsSkeleton, LiveJobs, HR_EMAIL } from "@/components/careers/live-jobs";
import { PORTAL_URL } from "@/lib/hr-feed";
import { buildMetadata } from "@/lib/seo";

/**
 * Careers: the open jobs, live from the HR system.
 *
 * ## The jobs are not ours
 *
 * They come from the HR system's public feed (see `queries/hr-feed.ts`), are
 * cached for about a minute, and are never written to this site's files or
 * database. When HR closes a job it leaves the feed and leaves this page with
 * it. Applications happen on the HR portal: this page links there, takes no
 * applicant data, and carries no `JobPosting` markup — the portal's own job
 * pages already have it, and a second copy on this domain would be a duplicate
 * for Google to reconcile.
 *
 * ## Same tab
 *
 * Every link to the portal opens in the current tab, with no `target="_blank"`.
 */

export const metadata: Metadata = buildMetadata({
  title: "Careers at TechZoid Technologies | Jobs in New Delhi",
  // The whole title was written for the search result, so the root layout's
  // "| TechZoid" suffix would repeat what it already says.
  absoluteTitle: true,
  description:
    "Join TechZoid Technologies, a Microsoft, Adobe and Autodesk partner in New Delhi. See open jobs in sales, pre-sales and operations and apply online.",
  path: "/careers",
});

/** One stroke style for all four, matching the icons on the category cards. */
function Icon({ children }: { children: React.ReactNode }) {
  return (
    <span
      aria-hidden="true"
      className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-[--radius-md] bg-graphite-50 text-graphite-700"
    >
      <svg
        width="20"
        height="20"
        viewBox="0 0 20 20"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {children}
      </svg>
    </span>
  );
}

const REASONS = [
  {
    title: "Fast growth & incentives",
    text: "Performance-linked incentives and quick promotions.",
    icon: <path d="M3 14l4.5-4.5 3 3L17 6m0 0h-4.5M17 6v4.5" />,
  },
  {
    title: "Product certifications",
    text: "Training on Microsoft, Adobe and Autodesk products.",
    icon: (
      <>
        <circle cx="10" cy="8" r="4.5" />
        <path d="M7.5 12l-1 5 3.5-2 3.5 2-1-5" />
      </>
    ),
  },
  {
    title: "Supportive leaders",
    text: "Learn directly from experienced managers.",
    icon: (
      <>
        <circle cx="7" cy="7" r="2.75" />
        <circle cx="14" cy="8" r="2.25" />
        <path d="M2 16c0-2.8 2.2-4.5 5-4.5s5 1.7 5 4.5M12.5 12c2.6-.3 5 1.1 5 3.8" />
      </>
    ),
  },
  {
    title: "Great location",
    text: "Our office is at Netaji Subhash Place, New Delhi, near the metro.",
    icon: (
      <>
        <path d="M10 18s5.5-5 5.5-9.5a5.5 5.5 0 10-11 0C4.5 13 10 18 10 18z" />
        <circle cx="10" cy="8.5" r="2" />
      </>
    ),
  },
];

const STEPS = [
  "Apply online with your resume (takes 2 minutes).",
  "HR calls you within a few working days if you are shortlisted.",
  "Interview, in person or on video, with a calendar invite.",
  "Offer sent by email, which you can accept online.",
];

export default function CareersPage() {
  return (
    <div className="container-page pb-16">
      <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "Careers" }]} />

      {/* a) Banner */}
      <section className="mb-14 rounded-[--radius-lg] bg-graphite-900 px-6 py-10 text-white sm:px-10 sm:py-14">
        <h1 className="max-w-3xl text-title text-white">Careers at TechZoid</h1>
        <p className="mt-4 max-w-2xl text-[16px] leading-relaxed text-graphite-200 sm:text-[17px]">
          Build India&rsquo;s digital backbone with people who care.
        </p>
        <div className="mt-8">
          <ButtonLink href="#jobs" size="lg" className="w-full sm:w-auto">
            See open positions
          </ButtonLink>
        </div>
      </section>

      {/* b) The live jobs list: the main part of the page */}
      <section id="jobs" className="mb-14 scroll-mt-40" aria-labelledby="jobs-heading">
        <h2 id="jobs-heading" className="mb-6 text-section">
          Open positions
        </h2>
        {/* Streams in behind a placeholder of the same height, so the sections
            below do not move when the cards arrive. */}
        <Suspense fallback={<JobsSkeleton />}>
          <LiveJobs />
        </Suspense>
      </section>

      {/* c) Why work with us */}
      <section className="mb-14" aria-labelledby="why-heading">
        <h2 id="why-heading" className="mb-6 text-section">
          Why work with us
        </h2>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {REASONS.map((reason) => (
            <li
              key={reason.title}
              className="rounded-[--radius-lg] border border-line bg-white p-5"
            >
              <Icon>{reason.icon}</Icon>
              <h3 className="text-body font-semibold text-graphite-900">{reason.title}</h3>
              <p className="mt-1.5 text-meta leading-relaxed text-ink-600">{reason.text}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* d) How hiring works */}
      <section className="mb-14" aria-labelledby="hiring-heading">
        <h2 id="hiring-heading" className="mb-6 text-section">
          How hiring works
        </h2>
        {/* A real sequence, so a real ordered list: the numbers carry meaning. */}
        <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step, index) => (
            <li
              key={step}
              className="flex gap-4 rounded-[--radius-lg] border border-line bg-white p-5 lg:flex-col"
            >
              <span
                aria-hidden="true"
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-700 text-[15px] font-semibold text-white"
              >
                {index + 1}
              </span>
              <p className="text-[15px] leading-relaxed text-graphite-900">{step}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* e) Closing strip */}
      <section
        aria-labelledby="closing-heading"
        className="rounded-[--radius-lg] border border-line bg-surface-muted px-6 py-8 sm:px-10"
      >
        <h2 id="closing-heading" className="text-section">
          Don&rsquo;t see a role that fits?
        </h2>
        <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-ink-600">
          Send your resume to{" "}
          <a
            href={`mailto:${HR_EMAIL}`}
            className="font-medium text-accent-700 underline underline-offset-2 hover:text-accent-800"
          >
            {HR_EMAIL}
          </a>
        </p>
        <div className="mt-6">
          <ButtonLink href={PORTAL_URL} className="w-full sm:w-auto">
            Open careers portal
          </ButtonLink>
        </div>
      </section>
    </div>
  );
}
