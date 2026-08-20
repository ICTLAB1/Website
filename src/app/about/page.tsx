import type { Metadata } from "next";
import Link from "next/link";

import { Breadcrumb } from "@/components/ui/breadcrumb";
import { SectionHeader } from "@/components/ui/section-header";
import { ButtonLink } from "@/components/ui/button";
import { BrandStrip } from "@/components/marketing/brand-card";
import { getBrands } from "@/lib/queries/content";
import { buildMetadata } from "@/lib/seo";
import { getSiteConfig, getUnconfiguredIdentityKeys } from "@/lib/site-config";

export const metadata: Metadata = buildMetadata({
  title: "About Us",
  description:
    "An enterprise technology procurement partner consolidating software licensing, cloud and IT solutions from multiple vendors into a single commercial relationship.",
  path: "/about",
});

const PRINCIPLES = [
  {
    title: "Advice before the sale",
    body: "We will tell you when a cheaper licensing model fits better, including when that means a smaller order. A recommendation you cannot trust is worth nothing, and a customer who discovers they were over-sold does not come back.",
  },
  {
    title: "Written commitments",
    body: "Response times, support scope, delivery timelines and licensing terms are stated in the quotation rather than described qualitatively and settled later. A commitment that is not written down is not a commitment.",
  },
  {
    title: "No invented urgency",
    body: "We do not run countdown timers, fabricate discounts or manufacture deadlines. Where a genuine publisher promotion applies, we will say what it is and when it ends.",
  },
  {
    title: "Deployment, not just delivery",
    body: "Software that is bought but not adopted returns nothing. Migration, configuration and onboarding are available alongside the licences because that is what makes them worth owning.",
  },
];

export default async function AboutPage() {
  const [brands] = await Promise.all([getBrands()]);
  const config = getSiteConfig();
  const missing = getUnconfiguredIdentityKeys();

  return (
    <div className="pb-16">
      <div className="container-page">
        <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "About" }]} />
      </div>

      <section className="border-y border-line bg-navy-900">
        <div className="container-page py-14 lg:py-16">
          <div className="max-w-3xl">
            <h1 className="text-3xl leading-tight text-white sm:text-[2.5rem]">
              One procurement relationship for a multi-vendor technology stack
            </h1>
            <p className="mt-5 text-[16px] leading-relaxed text-navy-200">
              We supply enterprise software licensing, cloud services and IT solutions across
              Microsoft, Adobe, Autodesk, Zoho and enterprise infrastructure vendors — and the
              deployment, licence management and support that make them work.
            </p>
          </div>
        </div>
      </section>

      <div className="container-page">
        <section className="py-14">
          <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
            <div>
              <SectionHeader title="What we do" as="h2" className="mb-6" />
              <div className="prose-content text-[15px]">
                <p>
                  A single technology refresh can involve four publishers, two hardware vendors
                  and a services engagement. Handled directly, that is seven vendor
                  relationships, seven quotation formats and seven sets of invoices for one
                  project.
                </p>
                <p>
                  We consolidate that. One requirement produces one itemised quotation, one
                  purchase order and one GST invoice — without losing visibility of what each
                  line costs.
                </p>
                <p>
                  Alongside procurement we deliver the work that determines whether the
                  software is actually used: tenant design and migration, device management,
                  cloud governance, security posture work and ongoing licence administration.
                </p>
              </div>
            </div>

            <div>
              <SectionHeader title="How we work" as="h2" className="mb-6" />
              <ul className="space-y-5">
                {PRINCIPLES.map((principle) => (
                  <li key={principle.title} className="rounded-[--radius-lg] border border-line bg-white p-5">
                    <h3 className="text-[15px] font-semibold text-navy-900">{principle.title}</h3>
                    <p className="mt-2 text-[13px] leading-relaxed text-ink-600">
                      {principle.body}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section className="border-t border-line py-14">
          <SectionHeader
            title="Vendors we supply"
            description="Licensing and solutions across the vendors most organisations already use."
            as="h2"
            action={
              <ButtonLink href="/brands" variant="outline" size="sm">
                All vendors
              </ButtonLink>
            }
          />
          <BrandStrip brands={brands} />
        </section>

        <section className="border-t border-line py-14">
          <SectionHeader title="Company information" as="h2" className="mb-6" />

          {missing.length > 0 ? (
            <div className="mb-6 max-w-3xl rounded-[--radius-lg] border border-warning-600/40 bg-warning-50 p-5">
              <p className="text-[13px] leading-relaxed text-ink-700">
                <strong className="font-semibold text-warning-700">
                  Content requiring review before launch.
                </strong>{" "}
                Company registration and contact details are supplied through configuration and
                have not been set for this deployment. Nothing on this page substitutes invented
                company information — unset values are simply omitted.
              </p>
            </div>
          ) : null}

          <dl className="grid max-w-3xl gap-x-8 gap-y-4 sm:grid-cols-2">
            {[
              ["Trading name", config.tradingName],
              ["Registered legal name", config.legalName],
              ["Registered address", config.formattedAddress],
              ["GSTIN", config.gstin],
              ["CIN", config.cin],
              ["Sales", config.email.sales],
              ["Support", config.email.support],
              ["Telephone", config.phone.sales],
              ["Support hours", config.supportHours],
            ]
              .filter(([, value]) => Boolean(value))
              .map(([label, value]) => (
                <div key={label as string}>
                  <dt className="text-[12px] uppercase tracking-wide text-ink-500">{label}</dt>
                  <dd className="mt-1 break-words text-[14px] text-ink-800">{value}</dd>
                </div>
              ))}
          </dl>

          <p className="mt-8 max-w-3xl text-[13px] leading-relaxed text-ink-500">
            Third-party product names and trademarks referenced across this site are the
            property of their respective owners and are used descriptively to identify the
            software supplied. Nothing here implies endorsement by, or affiliation with, those
            vendors beyond a commercial reselling relationship.
          </p>
        </section>

        <section className="rounded-[--radius-lg] bg-navy-900 p-8 sm:p-10">
          <h2 className="text-[1.6rem] text-white">Start with a requirement</h2>
          <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-navy-200">
            You do not need a finished product list. Tell us what you are trying to achieve and
            we will come back with the options, priced, and a plain recommendation.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <ButtonLink href="/enquiry" size="lg">
              Get Enterprise Quote
            </ButtonLink>
            <Link
              href="/contact"
              className="inline-flex h-12 items-center justify-center rounded-[--radius-md] border border-white/30 px-6 text-[15px] font-medium text-white hover:bg-white/10"
            >
              Contact us
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
