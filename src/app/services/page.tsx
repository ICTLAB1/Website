import type { Metadata } from "next";
import Link from "next/link";

import { Breadcrumb } from "@/components/ui/breadcrumb";
import { SectionHeader } from "@/components/ui/section-header";
import { ButtonLink } from "@/components/ui/button";
import { getServices } from "@/lib/queries/content";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Managed IT Services, Cloud & Deployment",
  description:
    "Microsoft 365 deployment, cloud migration, cybersecurity, email migration, endpoint management, backup and disaster recovery, helpdesk and software asset management.",
  path: "/services",
});

export default async function ServicesPage() {
  const services = await getServices();

  const grouped = services.reduce<Record<string, typeof services>>((accumulator, service) => {
    const bucket = accumulator[service.category] ?? [];
    bucket.push(service);
    accumulator[service.category] = bucket;
    return accumulator;
  }, {});

  return (
    <div className="pb-16">
      <div className="container-page">
        <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "Services" }]} />
      </div>

      <section className="border-y border-line bg-graphite-900">
        <div className="container-page py-14 lg:py-16">
          <div className="max-w-3xl">
            <h1 className="text-3xl leading-tight text-white sm:text-[2.5rem]">
              Services that make the licensing worth owning
            </h1>
            <p className="mt-5 text-[16px] leading-relaxed text-graphite-200">
              Software delivers nothing until it is deployed, adopted and kept running. These
              engagements cover the work between a purchase order and a system your
              organisation actually relies on.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink href="/contact">Discuss a requirement</ButtonLink>
              <ButtonLink href="/enterprise" variant="onDark">
                Enterprise procurement
              </ButtonLink>
            </div>
          </div>
        </div>
      </section>

      <div className="container-page py-14">
        {Object.entries(grouped).map(([category, entries]) => (
          <section key={category} className="mb-14 last:mb-0">
            <SectionHeader title={category} as="h2" className="mb-6" />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {entries.map((service) => (
                <Link
                  key={service.slug}
                  href={`/services/${service.slug}`}
                  className="group flex h-full flex-col rounded-[--radius-lg] border border-line bg-white p-5 transition-colors hover:border-graphite-300"
                >
                  <h3 className="text-[15px] font-semibold text-graphite-900 group-hover:text-accent-700">
                    {service.name}
                  </h3>
                  <p className="mt-2 flex-1 text-[13px] leading-relaxed text-ink-600">
                    {service.summary}
                  </p>
                  <span className="mt-4 text-[13px] font-medium text-accent-700">
                    Read more &rarr;
                  </span>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
