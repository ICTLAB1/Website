import type { Metadata } from "next";

import { Breadcrumb } from "@/components/ui/breadcrumb";
import Image from "next/image";
import { Suspense } from "react";

import { CareerLink } from "@/components/careers/career-button";
import { CategoryCard } from "@/components/careers/category-card";
import { Reveal } from "@/components/careers/reveal";
import { CAREERS_PHOTOS } from "@/lib/careers-media";

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
function Icon({ children }: { children: React.ReactNode }) {
  return (
    <svg
      aria-hidden="true"
      width="30"
      height="30"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  );
}

/** The small orange rule that sits above or under a heading. */
function Rule() {
  return <span aria-hidden="true" className="mt-4 block h-[3px] w-12 bg-career-orange" />;
}

const CATEGORIES = [
  {
    title: "Sales & Business Development",
    description:
      "Bring Microsoft, Adobe and Autodesk solutions to Indian businesses and grow lasting client relationships.",
    roles: ["Business Development", "Enterprise Sales", "IT Sales"],
    search: "sales",
    photo: CAREERS_PHOTOS.sales,
  },
  {
    title: "Technology & Solutions",
    description:
      "Turn a customer’s requirement into the right licences, set-up and support.",
    roles: ["Microsoft Licensing", "Software Licensing", "Pre-sales"],
    search: "licensing",
    photo: CAREERS_PHOTOS.tech,
  },
  {
    title: "Operations",
    description: "Keep orders, renewals and delivery running smoothly for every customer.",
    roles: ["Operations Executive"],
    search: "operations",
    photo: CAREERS_PHOTOS.operations,
  },
  {
    title: "Corporate Functions",
    description: "The people, finance and administration that keep the whole business moving.",
    roles: ["HR Executive"],
    search: "hr",
    photo: CAREERS_PHOTOS.corporate,
  },
];

const STAGES = [
  {
    label: "Early careers",
    text: "Kickstart your career, develop your skills and learn from experienced professionals.",
    icon: (
      <>
        <path d="M2 8l8-4 8 4-8 4-8-4z" />
        <path d="M5 10v4c0 1.2 2.2 2.5 5 2.5s5-1.3 5-2.5v-4" />
      </>
    ),
  },
  {
    label: "Experienced professionals",
    text: "Bring your expertise, take on bigger challenges and create meaningful impact.",
    icon: (
      <>
        <rect x="2.5" y="6" width="15" height="10" rx="1.5" />
        <path d="M7 6V4.5A1.5 1.5 0 018.5 3h3A1.5 1.5 0 0113 4.5V6M2.5 11h15" />
      </>
    ),
  },
  {
    label: "Team leaders",
    text: "Lead teams, mentor people and build high-performing business functions.",
    icon: (
      <>
        <circle cx="8" cy="7" r="2.75" />
        <path d="M2.5 16.5c0-3 2.4-4.8 5.5-4.8s5.5 1.8 5.5 4.8M15 3v5.5M15 3.5l3 1.2-3 1.2" />
      </>
    ),
  },
];

const VALUES = ["Inclusive workplace", "Open collaboration", "People first"];

const BENEFITS = [
  {
    title: "Learning & Development",
    text: "Continuous learning and skill building.",
    icon: (
      <>
        <path d="M10 5C8.5 3.8 6 3.5 3 4v11c3-.5 5.5-.2 7 1 1.5-1.2 4-1.5 7-1V4c-3-.5-5.5-.2-7 1z" />
        <path d="M10 5v11" />
      </>
    ),
  },
  {
    title: "Career Growth",
    text: "Clear opportunities for long-term progression.",
    icon: <path d="M3 14l4.5-4.5 3 3L17 6m0 0h-4.5M17 6v4.5" />,
  },
  {
    title: "Collaboration",
    text: "Work with passionate and diverse teams.",
    icon: (
      <>
        <circle cx="7" cy="7" r="2.75" />
        <circle cx="14" cy="8" r="2.25" />
        <path d="M2 16c0-2.8 2.2-4.5 5-4.5s5 1.7 5 4.5M12.5 12c2.6-.3 5 1.1 5 3.8" />
      </>
    ),
  },
  {
    title: "Recognition",
    text: "Be valued for your contributions and achievements.",
    icon: (
      <>
        <path d="M6 3h8v5a4 4 0 01-8 0V3z" />
        <path d="M6 5H3.5c0 2 1 3.2 2.7 3.5M14 5h2.5c0 2-1 3.2-2.7 3.5M10 12v3M7 17h6" />
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
    <div className="pb-24">
      <div className="container-page">
        <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "Careers" }]} />
      </div>

      {/* 1. Hero: the headline over a fade into the photograph. */}
      <section className="relative isolate overflow-hidden bg-white">
        <div className="relative aspect-[16/10] lg:absolute lg:inset-y-0 lg:right-0 lg:aspect-auto lg:w-[66%]">
          <Image
            src={CAREERS_PHOTOS.hero.src}
            alt={CAREERS_PHOTOS.hero.alt}
            width={CAREERS_PHOTOS.hero.width}
            height={CAREERS_PHOTOS.hero.height}
            priority
            sizes="(min-width: 1024px) 66vw, 100vw"
            className="h-full w-full object-cover object-[60%_30%]"
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 hidden bg-gradient-to-r from-white via-white/55 to-transparent lg:block"
          />
        </div>
        {/* Orange and navy corner wedges, as in the design. Large screens only. */}
        <div
          aria-hidden="true"
          className="absolute bottom-0 left-0 hidden h-28 w-72 bg-career-orange [clip-path:polygon(0_100%,100%_100%,0_30%)] lg:block"
        />
        <div
          aria-hidden="true"
          className="absolute bottom-0 left-0 hidden h-16 w-[26rem] bg-career-navy/90 [clip-path:polygon(0_100%,100%_100%,0_70%)] lg:block"
        />

        <div className="container-page relative z-10 py-10 lg:py-24">
          <div className="max-w-[34rem]">
            <p className="text-label font-semibold uppercase tracking-[0.18em] text-career-blue">
              Careers · TechZoid Technologies
            </p>
            <h1 className="mt-4 text-[clamp(3rem,2rem+5vw,5.5rem)] font-extrabold uppercase leading-[0.95] tracking-tight">
              <span className="sr-only">Careers at TechZoid. </span>
              <span className="block text-career-navy">Belong.</span>
              <span className="block text-career-blue">Build.</span>
              <span className="block text-career-orange">Become.</span>
            </h1>
            <p className="mt-6 max-w-md text-[18px] leading-relaxed text-ink-700">
              Build your skills. Solve real business challenges. Grow with TechZoid.
            </p>
            <p className="mt-2 max-w-md text-[15px] leading-relaxed text-ink-600">
              Build India&rsquo;s digital backbone with people who care.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <CareerLink href="#jobs" arrow className="w-full sm:w-auto">
                Explore open roles
              </CareerLink>
              <CareerLink href="#life" variant="outline" className="w-full sm:w-auto">
                Life at TechZoid
              </CareerLink>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Find your place */}
      <section className="container-page pt-20" aria-labelledby="place-heading">
        <Reveal>
          <h2 id="place-heading" className="text-[clamp(1.75rem,1.3rem+1.6vw,2.5rem)] font-bold leading-tight text-career-navy">
            Find your place at TechZoid
          </h2>
          <Rule />
          <p className="mt-4 max-w-xl text-[16px] leading-relaxed text-ink-600">
            Work on meaningful opportunities across business, technology and operations.
          </p>
        </Reveal>
        <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {CATEGORIES.map((category, index) => (
            <li key={category.title}>
              <Reveal delay={index * 90} className="h-full">
                <CategoryCard {...category} />
              </Reveal>
            </li>
          ))}
        </ul>
      </section>

      {/* 3. Wherever you are in your career */}
      <section className="container-page pt-24" aria-labelledby="stage-heading">
        <div className="grid gap-10 lg:grid-cols-[1fr_2.4fr] lg:gap-16">
          <Reveal>
            <h2 id="stage-heading" className="text-[clamp(1.75rem,1.3rem+1.6vw,2.5rem)] font-bold leading-tight text-career-navy">
              Wherever you are in your career
            </h2>
            <Rule />
            <p className="mt-4 text-[16px] leading-relaxed text-ink-600">
              Opportunities for every stage of your professional journey.
            </p>
          </Reveal>
          <ul className="grid gap-4 sm:grid-cols-3">
            {STAGES.map((stage, index) => (
              <li key={stage.label}>
                <Reveal delay={index * 90} className="h-full">
                  <a
                    href="#jobs"
                    className="group flex h-full flex-col rounded-[1rem] border border-line bg-white p-6 transition-all duration-200 hover:-translate-y-1 hover:border-career-blue/40 hover:shadow-[0_14px_36px_-16px_rgba(11,42,91,0.28)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-career-blue motion-reduce:transition-none motion-reduce:hover:translate-y-0"
                  >
                    <span className="text-career-orange">
                      <Icon>{stage.icon}</Icon>
                    </span>
                    <span className="mt-5 text-[18px] font-semibold text-career-navy">{stage.label}</span>
                    <span className="mt-2 flex-1 text-[15px] leading-relaxed text-ink-600">{stage.text}</span>
                    <span className="mt-5 inline-flex items-center gap-2 text-[14px] font-semibold text-career-blue">
                      See roles
                      <svg aria-hidden="true" width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="transition-transform duration-300 group-hover:translate-x-1 motion-reduce:transition-none">
                        <path d="M4 10h12M11 5l5 5-5 5" />
                      </svg>
                    </span>
                  </a>
                </Reveal>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* 4. Life at TechZoid: the photograph runs off the left edge. */}
      <section id="life" className="scroll-mt-40 pt-24" aria-labelledby="life-heading">
        <div className="grid items-center gap-10 lg:grid-cols-[1.25fr_1fr] lg:gap-0">
          <Reveal className="overflow-hidden lg:rounded-r-[1.5rem]">
            <Image
              src={CAREERS_PHOTOS.life.src}
              alt={CAREERS_PHOTOS.life.alt}
              width={CAREERS_PHOTOS.life.width}
              height={CAREERS_PHOTOS.life.height}
              sizes="(min-width: 1024px) 56vw, 100vw"
              className="aspect-[16/9] w-full object-cover transition-transform duration-700 ease-out hover:scale-[1.03] motion-reduce:transition-none motion-reduce:hover:scale-100 lg:aspect-[16/8]"
            />
          </Reveal>
          <Reveal className="container-page lg:max-w-none lg:px-0 lg:pl-16 lg:pr-[max(1.5rem,calc((100vw-72rem)/2))]">
            <h2 id="life-heading" className="text-[clamp(1.75rem,1.3rem+1.6vw,2.5rem)] font-bold leading-tight text-career-navy">
              Good work starts with <span className="text-career-orange">good people</span>
            </h2>
            <p className="mt-4 max-w-md text-[16px] leading-relaxed text-ink-600">
              A collaborative, inclusive and growth-focused culture where people, ideas and
              innovation thrive.
            </p>
            <ul className="mt-7 grid grid-cols-3 divide-x divide-line">
              {VALUES.map((value) => (
                <li key={value} className="px-3 text-center text-[13px] font-semibold leading-snug text-career-navy first:pl-0 last:pr-0">
                  <span aria-hidden="true" className="mx-auto mb-2 block h-1.5 w-6 rounded-full bg-career-orange" />
                  {value}
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </section>

      {/* 5. More than a job */}
      <section className="container-page pt-24" aria-labelledby="more-heading">
        <div className="grid gap-10 lg:grid-cols-[1fr_3fr] lg:gap-14">
          <Reveal>
            <h2 id="more-heading" className="text-[clamp(1.75rem,1.3rem+1.6vw,2.5rem)] font-bold leading-tight text-career-navy">
              More than a job
            </h2>
            <Rule />
            <p className="mt-4 text-[16px] leading-relaxed text-ink-600">
              A career at TechZoid comes with opportunities, support and recognition that help you
              grow, professionally and personally.
            </p>
          </Reveal>
          <ul className="grid gap-px overflow-hidden rounded-[1rem] bg-line sm:grid-cols-2 lg:grid-cols-4">
            {BENEFITS.map((benefit, index) => (
              <li key={benefit.title} className="bg-white">
                <Reveal delay={index * 90} className="h-full">
                  <div className="group h-full p-6 transition-colors duration-200 hover:bg-career-mist">
                    <span className="inline-block text-career-orange transition-transform duration-300 group-hover:-translate-y-0.5 motion-reduce:transition-none">
                      <Icon>{benefit.icon}</Icon>
                    </span>
                    <h3 className="mt-5 text-[17px] font-semibold text-career-navy">{benefit.title}</h3>
                    <p className="mt-2 text-[15px] leading-relaxed text-ink-600">{benefit.text}</p>
                  </div>
                </Reveal>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* 6. The live jobs list: the main part of the page */}
      <section id="jobs" className="container-page scroll-mt-40 pt-24" aria-labelledby="jobs-heading">
        <Reveal>
          <h2 id="jobs-heading" className="text-[clamp(1.75rem,1.3rem+1.6vw,2.5rem)] font-bold leading-tight text-career-navy">
            Find your next opportunity
          </h2>
          <Rule />
          <p className="mt-4 max-w-xl text-[16px] leading-relaxed text-ink-600">
            Only roles our HR team has published appear here, straight from the careers portal.
          </p>
        </Reveal>
        <div className="mt-10">
          {/* Streams in behind a placeholder of the same height, so the sections
              below do not move when the cards arrive. */}
          <Suspense fallback={<JobsSkeleton />}>
            <LiveJobs />
          </Suspense>
        </div>

        <div className="mt-16" id="hiring">
          <h3 className="text-[1.25rem] font-semibold text-career-navy">How hiring works</h3>
          {/* A real sequence, so a real ordered list: the numbers carry meaning. */}
          <ol className="mt-6 grid gap-5 lg:grid-cols-4 lg:gap-6">
            {STEPS.map((step, index) => (
              <li key={step} className="flex gap-4 lg:flex-col lg:gap-4">
                <span
                  aria-hidden="true"
                  className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-career-navy text-[16px] font-semibold text-white"
                >
                  {index + 1}
                </span>
                <p className="border-l-2 border-career-orange pl-4 text-[15px] leading-relaxed text-career-navy lg:flex-1">
                  {step}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* 7. Closing call to action */}
      <section className="container-page pt-24" aria-labelledby="closing-heading">
        <div className="relative isolate overflow-hidden rounded-[1.5rem] bg-career-navy-dark px-6 py-14 text-white sm:px-12 sm:py-20">
          <div
            aria-hidden="true"
            className="absolute -right-10 -top-10 -z-10 h-72 w-72 rotate-12 bg-career-blue/30 [clip-path:polygon(0_0,100%_0,100%_100%)]"
          />
          <div
            aria-hidden="true"
            className="absolute bottom-0 left-0 -z-10 h-24 w-80 bg-career-orange [clip-path:polygon(0_100%,100%_100%,0_25%)]"
          />
          <div className="mx-auto max-w-2xl text-center">
            <h2 id="closing-heading" className="text-[clamp(2rem,1.4rem+2.4vw,3.25rem)] font-bold leading-tight text-white">
              Your next chapter starts here
            </h2>
            <p className="mt-5 text-[17px] leading-relaxed text-white/80">
              Bring your ambition, curiosity and ideas. Let&rsquo;s build something meaningful
              together.
            </p>
            <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
              <CareerLink href="#jobs" variant="white" arrow className="w-full sm:w-auto">
                Explore open positions
              </CareerLink>
              <CareerLink href={PORTAL_URL} variant="ghostOnDark" className="w-full sm:w-auto">
                Open careers portal
              </CareerLink>
            </div>
            <p className="mt-8 text-[15px] leading-relaxed text-white/75">
              Don&rsquo;t see a role that fits? Send your resume to{" "}
              <a
                href={`mailto:${HR_EMAIL}`}
                className="font-semibold text-white underline underline-offset-4 hover:text-white/80"
              >
                {HR_EMAIL}
              </a>
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
