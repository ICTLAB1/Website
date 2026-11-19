import type { Metadata } from "next";

import { Breadcrumb } from "@/components/ui/breadcrumb";
import { ButtonLink } from "@/components/ui/button";
import { buildMetadata } from "@/lib/seo";

/**
 * Careers: where a job seeker is sent to the HR portal.
 *
 * ## This page holds no jobs and no application form
 *
 * Open roles, their details, the application form and the resume upload all
 * live in the HR system at `PORTAL`, and applications go straight into it. This
 * site stores nothing about an applicant, and lists no vacancy of its own — a
 * second list would only ever drift out of date behind the portal's.
 *
 * It used to be a job board backed by this site's own database. That page, the
 * per-role pages under `/careers/<role>` and their `JobPosting` markup were
 * retired when the portal launched; the role URLs redirect here (see
 * `next.config.ts`) so links already out in the world still land somewhere
 * useful.
 *
 * ## Same tab
 *
 * Every portal link opens in the current tab, with no `target="_blank"`. A job
 * seeker on a phone should not be left with a second tab to find their way back
 * from, and the portal is the next step of the same journey.
 */

const PORTAL = "https://hr.techzoidtechnologies.com/careers";
const HR_EMAIL = "hr.preeti@techzoidtechnologies.com";

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

const TEAMS = [
  "Sales / Business Development",
  "Pre-sales & Technical",
  "Operations & GeM",
  "Accounts",
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
          <ButtonLink href={PORTAL} size="lg" className="w-full sm:w-auto">
            View open positions
          </ButtonLink>
        </div>
      </section>

      {/* b) Why work with us */}
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

      {/* c) How hiring works */}
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

      {/* d) Teams we hire for: text only, not links */}
      <section className="mb-14" aria-labelledby="teams-heading">
        <h2 id="teams-heading" className="mb-6 text-section">
          Teams we hire for
        </h2>
        <ul className="flex flex-wrap gap-3">
          {TEAMS.map((team) => (
            <li
              key={team}
              className="rounded-full border border-line-strong bg-white px-4 py-2 text-[14px] font-medium text-graphite-800"
            >
              {team}
            </li>
          ))}
        </ul>
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
          <ButtonLink href={PORTAL} className="w-full sm:w-auto">
            View open positions
          </ButtonLink>
        </div>
      </section>
    </div>
  );
}
