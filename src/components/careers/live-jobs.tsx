import { ButtonLink } from "@/components/ui/button";
import { JobsList } from "@/components/careers/jobs-list";
import { Skeleton } from "@/components/ui/skeleton";
import { getCareers, type Careers } from "@/lib/queries/hr-feed";
import { PORTAL_URL } from "@/lib/hr-feed";

export const HR_EMAIL = "hr.preeti@techzoidtechnologies.com";

/**
 * What the jobs section says for each state the feed can be in.
 *
 * Split from the fetching so each of the three can be rendered and tested with
 * a value in hand, without a network.
 */
export function JobsSection({ careers }: { careers: Careers }) {
  if (careers.state === "jobs") {
    return <JobsList jobs={careers.jobs} departments={careers.departments} />;
  }

  if (careers.state === "empty") {
    return (
      <div className="rounded-[--radius-lg] border border-dashed border-line-strong bg-surface-muted p-6 sm:p-8">
        <p className="text-[16px] leading-relaxed text-graphite-900">
          No openings right now. Send your resume to{" "}
          <a
            href={`mailto:${HR_EMAIL}`}
            className="font-medium text-accent-700 underline underline-offset-2 hover:text-accent-800"
          >
            {HR_EMAIL}
          </a>{" "}
          and we&rsquo;ll keep it on file.
        </p>
      </div>
    );
  }

  // The feed could not be reached. Never a technical message: the visitor wanted
  // jobs, and the portal has them.
  return (
    <div className="rounded-[--radius-lg] border border-line bg-surface-muted p-6 sm:p-8">
      <p className="max-w-2xl text-[16px] leading-relaxed text-graphite-900">
        See current openings on our careers portal.
      </p>
      <div className="mt-5">
        <ButtonLink href={PORTAL_URL} className="w-full sm:w-auto">
          Open careers portal
        </ButtonLink>
      </div>
    </div>
  );
}

export async function LiveJobs() {
  return <JobsSection careers={await getCareers()} />;
}

/**
 * Holds the space the cards will take, so the page below does not jump when
 * they arrive. Two cards tall, which is what the list usually is.
 */
export function JobsSkeleton() {
  return (
    <div aria-busy="true">
      <p className="sr-only" role="status">
        Loading open positions
      </p>
      <div className="space-y-4">
        {[0, 1].map((key) => (
          <div key={key} className="rounded-[--radius-lg] border border-line bg-white p-5 sm:p-6">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="mt-3 h-6 w-2/3" />
            <div className="mt-4 flex flex-wrap gap-2">
              <Skeleton className="h-7 w-32 rounded-full" />
              <Skeleton className="h-7 w-24 rounded-full" />
              <Skeleton className="h-7 w-20 rounded-full" />
            </div>
            <Skeleton className="mt-5 h-11 w-full sm:w-36" />
          </div>
        ))}
      </div>
    </div>
  );
}
