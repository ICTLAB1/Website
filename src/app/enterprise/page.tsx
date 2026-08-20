import type { Metadata } from "next";
import Link from "next/link";

import { Breadcrumb } from "@/components/ui/breadcrumb";
import { SectionHeader } from "@/components/ui/section-header";
import { FaqList } from "@/components/ui/accordion";
import { ButtonLink } from "@/components/ui/button";
import { getBrands, getFaqsByTopic } from "@/lib/queries/content";
import { BrandStrip } from "@/components/marketing/brand-card";
import { buildMetadata } from "@/lib/seo";
import { getSiteConfig } from "@/lib/site-config";

export const metadata: Metadata = buildMetadata({
  title: "Enterprise Technology Procurement",
  description:
    "One procurement partner for your technology stack. Multi-vendor sourcing, consolidated quotations, a single purchase order, GST invoicing, licence management, renewals and deployment.",
  path: "/enterprise",
});

const CAPABILITIES = [
  {
    title: "Multi-vendor procurement",
    body: "Microsoft, Adobe, Autodesk, Zoho, SketchUp, Corel and enterprise infrastructure sourced together. One requirement in, one set of options out — including the alternative you did not ask about, where it fits better.",
  },
  {
    title: "Consolidated quotations",
    body: "Every line itemised and priced individually on a single document, so consolidation never costs you visibility of what each component costs.",
  },
  {
    title: "Single purchase order",
    body: "Your finance team raises one PO covering the whole quotation rather than one per vendor, regardless of how many publishers it spans.",
  },
  {
    title: "GST invoicing",
    body: "One compliant tax invoice with your GSTIN and registered legal name recorded correctly, so input credit is not lost to a reconciliation mismatch.",
  },
  {
    title: "Licence management",
    body: "Seat assignment and reclamation handled as staff join and leave, with a consolidated position across publishers rather than one portal per vendor.",
  },
  {
    title: "Renewal management",
    body: "Every renewal date tracked with a review window ahead of it. Nothing renews at last year's count because nobody looked in time.",
  },
  {
    title: "Deployment",
    body: "Tenant configuration, migration, device enrolment and user onboarding available alongside the licences, so what you buy is actually adopted.",
  },
  {
    title: "Technical support",
    body: "A service desk with response commitments stated in writing in the agreement, and an escalation path to specialists for the issues that need one.",
  },
];

const SUITED_TO = [
  "Organisations buying from three or more software publishers",
  "Finance teams reconciling invoices across multiple vendors and currencies",
  "IT teams without the capacity to track renewal dates across portals",
  "Companies scaling headcount where seat counts change every quarter",
  "Businesses that need GST-compliant invoicing on every technology purchase",
  "Teams that have discovered a licence shortfall and want it corrected quietly",
];

export default async function EnterprisePage() {
  const [brands, faqs] = await Promise.all([getBrands(), getFaqsByTopic("enterprise")]);
  const config = getSiteConfig();

  return (
    <div className="pb-16">
      <div className="container-page">
        <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "Enterprise" }]} />
      </div>

      <section className="border-y border-line bg-navy-900">
        <div className="container-page py-16 lg:py-20">
          <div className="max-w-3xl">
            <p className="mb-4 inline-flex items-center gap-2 rounded-[--radius-sm] border border-navy-700 bg-navy-800 px-3 py-1 text-[12px] font-medium text-navy-200">
              Enterprise procurement
            </p>
            <h1 className="text-3xl leading-[1.15] text-white sm:text-[2.75rem]">
              One Procurement Partner for Your Technology Stack
            </h1>
            <p className="mt-5 text-[16px] leading-relaxed text-navy-200 lg:text-[17px]">
              A single technology refresh can involve four publishers, two hardware vendors and
              a services engagement. Handled directly, that is seven vendor relationships,
              seven quotation formats, seven purchase orders and seven sets of invoices — for
              one project.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink href="/enquiry" size="lg">
                Talk to an Enterprise Specialist
              </ButtonLink>
              <ButtonLink href="/contact" size="lg" variant="onDark">
                Contact sales
              </ButtonLink>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-line bg-surface-muted py-10">
        <div className="container-page">
          <p className="mb-6 text-center text-[12px] font-semibold uppercase tracking-[0.14em] text-ink-500">
            Consolidating vendors including
          </p>
          <BrandStrip brands={brands} />
        </div>
      </section>

      <div className="container-page">
        <section className="py-14 lg:py-16">
          <SectionHeader
            eyebrow="What is included"
            title="Everything between the requirement and the running system"
            description="Procurement is the entry point, not the whole engagement."
          />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {CAPABILITIES.map((capability) => (
              <div
                key={capability.title}
                className="rounded-[--radius-lg] border border-line bg-white p-5"
              >
                <h3 className="text-[14px] font-semibold text-navy-900">{capability.title}</h3>
                <p className="mt-2 text-[13px] leading-relaxed text-ink-600">{capability.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="border-t border-line py-14">
          <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
            <div>
              <SectionHeader
                title="Who this suits"
                description="Consolidation pays for itself where vendor count and administrative overhead have grown faster than the IT team."
                as="h2"
                className="mb-6"
              />
              <ul className="space-y-3">
                {SUITED_TO.map((item) => (
                  <li key={item} className="flex gap-3 text-[14px] leading-relaxed text-ink-700">
                    <span aria-hidden="true" className="mt-1 shrink-0 text-accent-700">
                      <svg width="16" height="16" viewBox="0 0 12 12" fill="currentColor">
                        <path d="M4.7 8.6 2.2 6.1l.9-.9 1.6 1.6 4-4 .9.9z" />
                      </svg>
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-[--radius-lg] border border-line bg-surface-muted p-6 sm:p-8">
              <h2 className="text-[1.35rem]">How an engagement starts</h2>
              <ol className="mt-6 space-y-5">
                {[
                  { title: "Send the requirement", body: "A product list, a seat count, a renewal date, or just the problem. Whatever detail you have is enough to begin." },
                  { title: "We review and source", body: "Across the relevant publishers, with a note on where a different licensing model would cost you less." },
                  { title: "You receive one quotation", body: "Itemised by line, with the GST position, delivery timeline and licensing terms stated in writing." },
                  { title: "One purchase order", body: "Covering the whole quotation. Provisioning begins on confirmation and you have one contact for status." },
                ].map((step, index) => (
                  <li key={step.title} className="flex gap-4">
                    <span
                      aria-hidden="true"
                      className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-navy-900 text-[12px] font-semibold text-white"
                    >
                      {index + 1}
                    </span>
                    <span>
                      <span className="block text-[14px] font-semibold text-navy-900">
                        {step.title}
                      </span>
                      <span className="mt-1 block text-[13px] leading-relaxed text-ink-600">
                        {step.body}
                      </span>
                    </span>
                  </li>
                ))}
              </ol>
              <div className="mt-7 flex flex-wrap gap-3">
                <ButtonLink href="/enquiry">Build an enquiry</ButtonLink>
                <Link
                  href="/services/it-procurement"
                  className="inline-flex h-11 items-center text-sm font-medium text-accent-700 hover:underline"
                >
                  Read about procurement &rarr;
                </Link>
              </div>
            </div>
          </div>
        </section>

        {faqs.length > 0 ? (
          <section className="max-w-3xl border-t border-line py-14">
            <SectionHeader title="Enterprise procurement questions" as="h2" className="mb-6" />
            <FaqList items={faqs} />
          </section>
        ) : null}

        <section className="rounded-[--radius-lg] bg-navy-900 p-8 sm:p-10">
          <h2 className="text-[1.7rem] text-white">Talk to an Enterprise Specialist</h2>
          <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-navy-200">
            Send the requirement and we will come back with a consolidated quotation and a
            plain recommendation. If a smaller order serves you better, we will say so.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <ButtonLink href="/enquiry" size="lg">
              Request enterprise quote
            </ButtonLink>
            {config.email.enterprise ?? config.email.sales ? (
              <a
                href={`mailto:${config.email.enterprise ?? config.email.sales}`}
                className="inline-flex h-12 items-center justify-center rounded-[--radius-md] border border-white/30 px-6 text-[15px] font-medium text-white hover:bg-white/10"
              >
                {config.email.enterprise ?? config.email.sales}
              </a>
            ) : (
              <ButtonLink href="/contact" size="lg" variant="onDark">
                Contact us
              </ButtonLink>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
