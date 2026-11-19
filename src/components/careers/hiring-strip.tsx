import Link from "next/link";
import { Suspense } from "react";

import { ButtonLink } from "@/components/ui/button";
import { getCareers, type Careers } from "@/lib/queries/hr-feed";
import { moreRoles } from "@/lib/hr-feed";

/**
 * "We're hiring", above the footer on the home page, only while there is
 * something to say.
 *
 * With no open jobs, or with the feed unreachable, this renders nothing at all
 * — no heading, no empty band, no gap. A strip that said "we're hiring" over a
 * list that could not be loaded would be worse than none.
 */
export function HiringStripView({ careers }: { careers: Careers }) {
  if (careers.state !== "jobs") return null;
  const { jobs } = careers;
  const first = jobs[0];
  if (!first) return null;

  return (
    <section aria-label="We're hiring" className="border-t border-line bg-surface-muted">
      <div className="container-page flex flex-col gap-4 py-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-[15px] font-semibold text-graphite-900">
            We&rsquo;re hiring: {first.title}
            {moreRoles(jobs.length)}
          </p>
          <ul className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-meta">
            {jobs.slice(0, 3).map((job) => (
              <li key={job.id}>
                <Link href={job.url} className="text-accent-700 underline underline-offset-2 hover:text-accent-800">
                  {job.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <ButtonLink href="/careers" className="w-full sm:w-auto">
          See openings
        </ButtonLink>
      </div>
    </section>
  );
}

async function HiringStripLoaded() {
  return <HiringStripView careers={await getCareers()} />;
}

/**
 * Behind Suspense with no fallback: the home page streams without waiting for
 * the feed, and nothing is reserved for a strip that may not appear.
 */
export function HiringStrip() {
  return (
    <Suspense fallback={null}>
      <HiringStripLoaded />
    </Suspense>
  );
}
