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

/** One stroke style for every icon on the page. */
function Icon({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <svg
      aria-hidden="true"
      width="22"
      height="22"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {children}
    </svg>
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

/*
 * The three facts beside the headline. Each is something this site already
 * states elsewhere or the hiring brief supplied — nothing here is a number or a
 * perk that somebody would have to be asked to stand behind.
 */
const FACTS = [
  { label: "Where", value: "Netaji Subhash Place, New Delhi" },
  { label: "What we do", value: "Microsoft, Adobe and Autodesk licensing" },
  { label: "How to join", value: "Apply online in about 2 minutes" },
];

/** The small gold line above a section heading. */
function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-2 text-label font-semibold uppercase tracking-[0.14em] text-accent-700">
      {children}
    </p>
  );
}

export default function CareersPage() {
  return (
    <div className="container-page pb-20">
      <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "Careers" }]} />

      {/* a) Banner */}
      <section className="relative isolate mb-16 overflow-hidden rounded-[1.5rem] bg-graphite-950 px-6 py-12 text-white sm:px-10 sm:py-16 lg:px-14 lg:py-20">
        {/* Light, not decoration: a warm glow from the corner the headline sits
            under, and a faint grid that fades out before it reaches the text. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60rem_30rem_at_85%_-10%,color-mix(in_srgb,var(--color-accent-500)_38%,transparent),transparent_60%),radial-gradient(40rem_24rem_at_-10%_110%,color-mix(in_srgb,var(--color-accent-700)_30%,transparent),transparent_65%)]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 opacity-[0.07] [background-image:linear-gradient(to_right,white_1px,transparent_1px),linear-gradient(to_bottom,white_1px,transparent_1px)] [background-size:44px_44px] [mask-image:radial-gradient(ellipse_at_80%_20%,black,transparent_70%)]"
        />

        <div className="grid items-end gap-10 lg:grid-cols-[1.35fr_1fr] lg:gap-14">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-3.5 py-1.5 text-label font-semibold uppercase tracking-[0.14em] text-accent-300">
              <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-accent-400" />
              Careers · New Delhi
            </p>
            <h1 className="mt-5 max-w-3xl text-[clamp(2.25rem,1.6rem+3.2vw,3.75rem)] font-semibold leading-[1.05] tracking-tight text-white">
              Careers at TechZoid
            </h1>
            <p className="mt-5 max-w-xl text-[17px] leading-relaxed text-graphite-200 sm:text-[18px]">
              Build India&rsquo;s digital backbone with people who care.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <ButtonLink href="#jobs" size="lg" className="w-full sm:w-auto">
                See open positions
              </ButtonLink>
              <ButtonLink
                href="#hiring"
                size="lg"
                variant="onDark"
                className="w-full sm:w-auto"
              >
                See how we hire
              </ButtonLink>
            </div>
          </div>

          <dl className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            {FACTS.map((fact) => (
              <div
                key={fact.label}
                className="rounded-[--radius-lg] border border-white/12 bg-white/[0.06] px-5 py-4 backdrop-blur-sm"
              >
                <dt className="text-label font-semibold uppercase tracking-[0.12em] text-accent-300">
                  {fact.label}
                </dt>
                <dd className="mt-1 text-[15px] font-medium leading-snug text-white">
                  {fact.value}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* b) The live jobs list: the main part of the page */}
      <section id="jobs" className="mb-20 scroll-mt-40" aria-labelledby="jobs-heading">
        <div className="mb-8 max-w-2xl">
          <Eyebrow>Join the team</Eyebrow>
          <h2 id="jobs-heading" className="text-section">
            Open positions
          </h2>
        </div>
        {/* Streams in behind a placeholder of the same height, so the sections
            below do not move when the cards arrive. */}
        <Suspense fallback={<JobsSkeleton />}>
          <LiveJobs />
        </Suspense>
      </section>

      {/* c) Why work with us */}
      <section className="mb-20" aria-labelledby="why-heading">
        <div className="mb-8 max-w-2xl">
          <Eyebrow>Life at TechZoid</Eyebrow>
          <h2 id="why-heading" className="text-section">
            Why work with us
          </h2>
        </div>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {REASONS.map((reason) => (
            <li
              key={reason.title}
              className="group relative overflow-hidden rounded-[--radius-lg] border border-line bg-white p-6 transition-all duration-200 hover:-translate-y-0.5 hover:border-accent-300 hover:shadow-[0_10px_30px_-12px_rgba(32,28,24,0.18)] motion-reduce:transition-none motion-reduce:hover:translate-y-0"
            >
              <span
                aria-hidden="true"
                className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-100 text-accent-700 transition-colors group-hover:bg-accent-700 group-hover:text-white"
              >
                <Icon>{reason.icon}</Icon>
              </span>
              <h3 className="text-[17px] font-semibold text-graphite-900">{reason.title}</h3>
              <p className="mt-2 text-meta leading-relaxed text-ink-600">{reason.text}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* d) How hiring works */}
      <section id="hiring" className="mb-20 scroll-mt-40" aria-labelledby="hiring-heading">
        <div className="mb-8 max-w-2xl">
          <Eyebrow>Our process</Eyebrow>
          <h2 id="hiring-heading" className="text-section">
            How hiring works
          </h2>
        </div>
        {/* A real sequence, so a real ordered list: the numbers carry meaning.
            On a wide screen a line runs through the numbers, behind them. */}
        <ol className="relative grid gap-5 lg:grid-cols-4 lg:gap-6">
          <span
            aria-hidden="true"
            className="absolute left-[2.25rem] right-[2.25rem] top-[1.375rem] hidden h-px bg-gradient-to-r from-accent-300 via-line-strong to-accent-300 lg:block"
          />
          {STEPS.map((step, index) => (
            <li key={step} className="relative flex gap-4 lg:flex-col lg:gap-5">
              <span
                aria-hidden="true"
                className="relative z-10 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent-700 text-[16px] font-semibold text-white ring-4 ring-white"
              >
                {index + 1}
              </span>
              <p className="rounded-[--radius-lg] border border-line bg-surface-muted p-4 text-[15px] leading-relaxed text-graphite-900 lg:flex-1">
                {step}
              </p>
            </li>
          ))}
        </ol>
      </section>

      {/* e) Closing strip */}
      <section
        aria-labelledby="closing-heading"
        className="relative isolate overflow-hidden rounded-[1.5rem] bg-graphite-900 px-6 py-10 text-white sm:px-10 sm:py-12"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(30rem_16rem_at_100%_0%,color-mix(in_srgb,var(--color-accent-500)_32%,transparent),transparent_70%)]"
        />
        <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <h2 id="closing-heading" className="text-section text-white">
              Don&rsquo;t see a role that fits?
            </h2>
            <p className="mt-3 text-[16px] leading-relaxed text-graphite-200">
              Send your resume to{" "}
              <a
                href={`mailto:${HR_EMAIL}`}
                className="font-medium text-accent-300 underline underline-offset-4 hover:text-accent-200"
              >
                {HR_EMAIL}
              </a>
            </p>
          </div>
          <ButtonLink href={PORTAL_URL} size="lg" className="w-full lg:w-auto">
            Open careers portal
          </ButtonLink>
        </div>
      </section>
    </div>
  );
}
