import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Breadcrumb } from "@/components/ui/breadcrumb";
import { SectionHeader } from "@/components/ui/section-header";
import { FaqList } from "@/components/ui/accordion";
import { ButtonLink } from "@/components/ui/button";
import { getServiceBySlug, parseProcess } from "@/lib/queries/content";
import { absoluteUrl, buildMetadata, JsonLd } from "@/lib/seo";
import { getSiteConfig } from "@/lib/site-config";

type PageProps = { params: Promise<{ slug: string }> };

/**
 * Rendered on request, never prerendered.
 *
 * The root layout renders the header, which reads the session cookie to decide
 * whether to show "Sign in" or the account menu — so no page in this
 * application can be static HTML, and this route used to claim otherwise. It
 * declared `generateStaticParams`, which marked it SSG, and Next then tried to
 * statically generate it on demand and failed on the cookie read.
 *
 * Nothing is lost by dropping it. Every database read behind this page goes
 * through the tag-based cache, so the work per request is a cache lookup, and
 * an edit in the admin panel invalidates it immediately — which is better than
 * a prerender that only refreshes on redeploy.
 */

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const service = await getServiceBySlug(slug);
  if (!service) {
    return buildMetadata({
      title: "Service not found",
      description: "This service page is no longer available.",
      path: `/services/${slug}`,
      noIndex: true,
    });
  }

  return buildMetadata({
    title: service.heroHeadline,
    description: service.summary,
    path: `/services/${service.slug}`,
  });
}

export default async function ServicePage({ params }: PageProps) {
  const { slug } = await params;
  const service = await getServiceBySlug(slug);
  if (!service) notFound();

  const steps = parseProcess(service.process);
  const config = getSiteConfig();

  return (
    <div className="pb-16">
      <div className="container-page">
        <Breadcrumb
          items={[
            { label: "Home", href: "/" },
            { label: "Services", href: "/services" },
            { label: service.name },
          ]}
        />
      </div>

      {/* Hero */}
      <section className="border-y border-line bg-graphite-900">
        <div className="container-page py-14 lg:py-16">
          <div className="max-w-3xl">
            <p className="mb-3 text-[12px] font-semibold uppercase tracking-[0.12em] text-accent-300">
              {service.category}
            </p>
            <h1 className="text-3xl leading-tight text-white sm:text-[2.5rem]">
              {service.heroHeadline}
            </h1>
            <p className="mt-5 text-[16px] leading-relaxed text-graphite-200">{service.summary}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink href="/contact">Discuss this service</ButtonLink>
              <ButtonLink href="/enquiry" variant="onDark">
                Request a quotation
              </ButtonLink>
            </div>
          </div>
        </div>
      </section>

      <div className="container-page">
        {/* Problem and solution */}
        <section className="grid gap-10 border-b border-line py-14 lg:grid-cols-2 lg:gap-14">
          <div>
            <h2 className="text-[1.4rem]">The problem</h2>
            <div className="prose-content mt-4 text-[15px]">
              {service.problem.split("\n\n").map((paragraph, index) => (
                <p key={index}>{paragraph}</p>
              ))}
            </div>
          </div>
          <div>
            <h2 className="text-[1.4rem]">How we approach it</h2>
            <div className="prose-content mt-4 text-[15px]">
              {service.solution.split("\n\n").map((paragraph, index) => (
                <p key={index}>{paragraph}</p>
              ))}
            </div>
          </div>
        </section>

        {/* Benefits */}
        <section className="border-b border-line py-14">
          <SectionHeader title="What you get" as="h2" />
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {service.benefits.map((benefit) => (
              <li
                key={benefit}
                className="flex gap-3 rounded-[--radius-lg] border border-line bg-white p-5 text-[14px] leading-relaxed text-ink-700"
              >
                <span aria-hidden="true" className="mt-1 shrink-0 text-accent-700">
                  <svg width="16" height="16" viewBox="0 0 12 12" fill="currentColor">
                    <path d="M4.7 8.6 2.2 6.1l.9-.9 1.6 1.6 4-4 .9.9z" />
                  </svg>
                </span>
                {benefit}
              </li>
            ))}
          </ul>
        </section>

        {/* Process */}
        {steps.length > 0 ? (
          <section className="border-b border-line py-14">
            <SectionHeader
              title="How the engagement runs"
              description="The sequence, and why each stage comes where it does."
              as="h2"
            />
            <ol className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {steps.map((step) => (
                <li key={step.step} className="rounded-[--radius-lg] border border-line bg-white p-5">
                  <span
                    aria-hidden="true"
                    className="mb-3 inline-grid h-8 w-8 place-items-center rounded-[--radius-sm] bg-graphite-900 text-[13px] font-semibold text-white"
                  >
                    {step.step}
                  </span>
                  <h3 className="text-[15px] font-semibold text-graphite-900">{step.title}</h3>
                  <p className="mt-2 text-[13px] leading-relaxed text-ink-600">
                    {step.description}
                  </p>
                </li>
              ))}
            </ol>
          </section>
        ) : null}

        {/* Technology */}
        {service.technologies.length > 0 ? (
          <section className="border-b border-line py-14">
            <SectionHeader
              title="Technology we work with"
              description="Named so you can check the fit against your existing estate."
              as="h2"
            />
            <ul className="flex flex-wrap gap-2">
              {service.technologies.map((technology) => (
                <li
                  key={technology}
                  className="rounded-[--radius-md] border border-line bg-white px-3.5 py-2 text-[13px] font-medium text-ink-700"
                >
                  {technology}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {/* FAQ */}
        {service.faqs.length > 0 ? (
          <section id="faq" className="max-w-3xl scroll-mt-32 border-b border-line py-14">
            <SectionHeader title="Frequently asked questions" as="h2" className="mb-6" />
            <FaqList items={service.faqs.map((faq) => ({ question: faq.question, answer: faq.answer }))} />
          </section>
        ) : null}

        {/* CTA */}
        <section className="mt-14 rounded-[--radius-lg] bg-graphite-900 p-8 sm:p-10">
          <h2 className="text-[1.6rem] text-white">Talk to us about {service.name.toLowerCase()}</h2>
          <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-graphite-200">
            Tell us where you are now and what you are trying to reach. We will scope it
            honestly, including whether this is the engagement you actually need.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <ButtonLink href="/contact">Start a conversation</ButtonLink>
            {config.phone.sales ? (
              <a
                href={`tel:${config.phone.sales.replace(/\s/g, "")}`}
                className="inline-flex h-11 items-center justify-center rounded-[--radius-md] border border-white/30 px-5 text-sm font-medium text-white hover:bg-white/10"
              >
                {config.phone.sales}
              </a>
            ) : (
              <ButtonLink href="/enquiry" variant="onDark">
                Request a quotation
              </ButtonLink>
            )}
          </div>
        </section>
      </div>

      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Service",
          name: service.name,
          serviceType: service.category,
          description: service.summary,
          url: absoluteUrl(`/services/${service.slug}`),
          provider: { "@type": "Organization", name: config.entityName, url: config.url },
          areaServed: config.address.country,
        }}
      />
    </div>
  );
}
