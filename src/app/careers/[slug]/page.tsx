import Link from "next/link";
import type { Metadata } from "next";

import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Markdown } from "@/components/markdown";
import { liveJobBySlug } from "@/lib/queries/careers";
import {
  EMPLOYMENT_TYPE_LABELS,
  EMPLOYMENT_TYPE_SCHEMA,
  WORK_ARRANGEMENT_LABELS,
  experienceLabel,
  locationLabel,
  payRange,
} from "@/lib/careers";
import { formatMoney } from "@/lib/money";
import { getSiteConfig } from "@/lib/site-config";
import { absoluteUrl, buildMetadata, JsonLd } from "@/lib/seo";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const job = await liveJobBySlug(slug);

  if (!job) {
    /*
     * A closed role is `noIndex`, not merely absent.
     *
     * The URL has been advertised and may be linked from elsewhere, so it
     * still resolves — but telling Google to keep indexing a vacancy that has
     * been filled is exactly what gets a site's job markup distrusted.
     */
    return buildMetadata({
      title: "This role is no longer open",
      description: "This vacancy has closed. See the roles that are currently open.",
      path: `/careers/${slug}`,
      noIndex: true,
    });
  }

  return buildMetadata({
    title: job.title,
    description: job.summary,
    path: `/careers/${job.slug}`,
    keywords: [job.title, "careers", "jobs", job.location ?? ""].filter(Boolean),
  });
}

/**
 * One open role.
 *
 * ## A closed role does not 404
 *
 * It renders a short page saying the vacancy has closed, with a link back to
 * what is open. A 404 on a URL that has been advertised — on a job board, in
 * an email, on somebody's saved tab — tells the candidate nothing and looks
 * like a broken site. The page is `noIndex`, so search engines drop it while
 * anybody holding the link still gets an answer.
 *
 * ## The structured data is the point of the page existing
 *
 * Google Jobs reads `JobPosting` and surfaces roles directly in results. It is
 * strict: a missing `datePosted`, `hiringOrganization` or `jobLocation` and the
 * posting is dropped without a message. Every required field here comes from
 * the record rather than being defaulted, and the optional ones are omitted
 * entirely when absent — an empty `baseSalary` is worse than none.
 */
export default async function JobPage({ params }: PageProps) {
  const { slug } = await params;
  const [job, config] = await Promise.all([liveJobBySlug(slug), getSiteConfig()]);

  if (!job) {
    return (
      <div className="container-page pb-16">
        <Breadcrumb
          items={[
            { label: "Home", href: "/" },
            { label: "Careers", href: "/careers" },
            { label: "Closed" },
          ]}
        />
        <div className="mx-auto max-w-xl py-16 text-center">
          <h1 className="text-2xl">This role is no longer open</h1>
          <p className="mt-4 text-[15px] leading-relaxed text-ink-600">
            The vacancy you followed has been filled or withdrawn. Everything currently open is on
            the careers page.
          </p>
          <div className="mt-8">
            <ButtonLink href="/careers">See open roles</ButtonLink>
          </div>
        </div>
      </div>
    );
  }

  const pay = payRange(job);
  const experience = experienceLabel(job);

  /*
   * `JobPosting`, built field by field.
   *
   * `validThrough` is only emitted where a closing date exists: Google treats
   * its absence as "open indefinitely", which is true of a role with no date,
   * and an invented one would take a live vacancy out of results early.
   */
  const jobSchema = {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: job.title,
    description: job.description,
    datePosted: job.postedOn.toISOString(),
    ...(job.closesOn ? { validThrough: job.closesOn.toISOString() } : {}),
    employmentType: EMPLOYMENT_TYPE_SCHEMA[job.employmentType],
    hiringOrganization: {
      "@type": "Organization",
      name: config.entityName,
      sameAs: config.url,
      logo: absoluteUrl("/logo.png"),
    },
    ...(job.location && config.hasAddress
      ? {
          jobLocation: {
            "@type": "Place",
            address: {
              "@type": "PostalAddress",
              addressLocality: job.location,
              addressRegion: config.address.state,
              addressCountry: config.address.country,
            },
          },
        }
      : {}),
    /*
     * Google's own vocabulary for a role that is not tied to an office. It
     * requires `jobLocationType` *and* `applicantLocationRequirements`, and
     * drops the posting if a remote role has neither.
     */
    ...(job.workArrangement === "REMOTE"
      ? {
          jobLocationType: "TELECOMMUTE",
          applicantLocationRequirements: {
            "@type": "Country",
            name: config.address.country,
          },
        }
      : {}),
    ...(pay
      ? {
          baseSalary: {
            "@type": "MonetaryAmount",
            currency: job.salaryCurrency,
            value: {
              "@type": "QuantitativeValue",
              // Rupees, not paise: schema.org expects the major unit, and a
              // figure a hundred times too large would be a remarkable offer.
              minValue: job.salaryMinMinor! / 100,
              ...(pay.max ? { maxValue: pay.max / 100 } : {}),
              unitText: pay.period === "month" ? "MONTH" : "YEAR",
            },
          },
        }
      : {}),
    ...(experience && job.experienceMinYears
      ? {
          experienceRequirements: {
            "@type": "OccupationalExperienceRequirements",
            monthsOfExperience: job.experienceMinYears * 12,
          },
        }
      : {}),
  };

  return (
    <div className="container-page pb-16">
      <JsonLd data={jobSchema} />

      <Breadcrumb
        items={[
          { label: "Home", href: "/" },
          { label: "Careers", href: "/careers" },
          { label: job.title },
        ]}
      />

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div>
          <header className="mb-8 max-w-3xl">
            <div className="flex flex-wrap items-center gap-3">
              <Badge tone="accent">{EMPLOYMENT_TYPE_LABELS[job.employmentType]}</Badge>
              <Badge tone="neutral">{WORK_ARRANGEMENT_LABELS[job.workArrangement]}</Badge>
              {job.team ? <span className="text-meta text-ink-500">{job.team}</span> : null}
            </div>
            <h1 className="mt-4 text-3xl sm:text-4xl">{job.title}</h1>
            <p className="mt-4 text-[16px] leading-relaxed text-ink-600">{job.summary}</p>
          </header>

          <div className="prose-content max-w-3xl text-[15px]">
            <Markdown body={job.description} />
          </div>

          <div className="mt-10 rounded-[--radius-lg] border border-accent-600/40 bg-accent-50 p-6">
            <h2 className="text-[15px] font-semibold text-graphite-900">How to apply</h2>
            <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-ink-700">
              Send your CV to the address below, with the role title in the subject line. We read
              everything that arrives and reply either way.
            </p>
            <div className="mt-4">
              <ButtonLink
                href={`mailto:${job.applyEmail}?subject=${encodeURIComponent(`Application: ${job.title}`)}`}
              >
                Apply for this role
              </ButtonLink>
            </div>
          </div>
        </div>

        <aside className="lg:sticky lg:top-32 lg:self-start">
          <div className="rounded-[--radius-lg] border border-line bg-white p-5">
            <h2 className="text-[15px] font-semibold text-graphite-900">At a glance</h2>
            <dl className="mt-4 space-y-3 text-[13px]">
              <div>
                <dt className="text-ink-500">Where</dt>
                <dd className="mt-0.5 text-graphite-900">{locationLabel(job)}</dd>
              </div>
              <div>
                <dt className="text-ink-500">Type</dt>
                <dd className="mt-0.5 text-graphite-900">
                  {EMPLOYMENT_TYPE_LABELS[job.employmentType]}
                </dd>
              </div>
              {experience ? (
                <div>
                  <dt className="text-ink-500">Experience</dt>
                  <dd className="mt-0.5 text-graphite-900">{experience}</dd>
                </div>
              ) : null}
              {pay ? (
                <div>
                  <dt className="text-ink-500">Pay</dt>
                  <dd className="mt-0.5 font-medium text-graphite-900">
                    {formatMoney(pay.min, job.salaryCurrency)}
                    {pay.max ? ` – ${formatMoney(pay.max, job.salaryCurrency)}` : "+"} per{" "}
                    {pay.period}
                  </dd>
                </div>
              ) : null}
              {job.closesOn ? (
                <div>
                  <dt className="text-ink-500">Applications close</dt>
                  <dd className="mt-0.5 text-graphite-900">
                    {job.closesOn.toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                      timeZone: "UTC",
                    })}
                  </dd>
                </div>
              ) : null}
            </dl>
          </div>

          <p className="mt-4 text-meta leading-relaxed text-ink-500">
            <Link href="/careers" className="text-accent-700 hover:underline">
              All open roles
            </Link>
          </p>
        </aside>
      </div>
    </div>
  );
}
