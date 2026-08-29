import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Breadcrumb } from "@/components/ui/breadcrumb";
import { ButtonLink } from "@/components/ui/button";
import { SectionHeader } from "@/components/ui/section-header";
import { Markdown } from "@/components/markdown";
import { Reveal } from "@/components/motion/reveal";
import { BrandCard } from "@/components/marketing/brand-card";
import { CategoryCard } from "@/components/marketing/category-card";
import { glyph } from "@/lib/glyphs";
import { prisma } from "@/lib/db";
import { industryBySlug, industrySlugs, publishedIndustries } from "@/lib/queries/industries";
import { buildMetadata } from "@/lib/seo";

/**
 * One sector.
 *
 * The page is assembled from the sector's row and the rows it points at —
 * brands, services and catalogue categories by slug — rather than from copy
 * written per page. That is what keeps sixteen pages from being sixteen
 * near-identical documents: each one links to a different part of a catalogue
 * that is already there, and a brand withdrawn or a service unpublished
 * disappears from every sector page that named it without anybody editing
 * sixteen files.
 *
 * Anything that no longer resolves is dropped rather than rendered as a hole.
 */

export const revalidate = 3600;

export async function generateStaticParams() {
  return (await industrySlugs()).map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const industry = await industryBySlug(slug);

  if (!industry) {
    return buildMetadata({
      title: "Sector not found",
      description: "This page is no longer available.",
      path: `/industries/${slug}`,
      noIndex: true,
    });
  }

  return buildMetadata({
    /*
     * Absolute, so the root layout does not append the trading name a second
     * time. With the suffix written here every one of the sixteen lands under
     * 60 characters and survives a search result whole; composed through the
     * template, "Architecture, Engineering & Construction IT & Software
     * Procurement | TechZoid" arrives at 76 and truncated mid-phrase.
     *
     * Distinct by construction, since the sector's own name leads.
     */
    title: `${industry.name} | TechZoid`,
    absoluteTitle: true,
    description: industry.summary,
    path: `/industries/${slug}`,
  });
}

export default async function IndustryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const industry = await industryBySlug(slug);
  if (!industry) notFound();

  /*
   * Everything the page links to, in one round trip each, filtered to what is
   * still live. `in` does not preserve order, so each list is put back into the
   * order the sector named — that order is an editorial decision.
   */
  const [brands, services, categories, siblings] = await Promise.all([
    industry.brandSlugs.length > 0
      ? prisma.brand.findMany({
          where: { slug: { in: industry.brandSlugs }, deletedAt: null },
          select: {
            slug: true,
            name: true,
            tagline: true,
            accentColor: true,
            logoUrl: true,
            _count: { select: { products: { where: { status: "ACTIVE", deletedAt: null } } } },
          },
        })
      : [],
    industry.serviceSlugs.length > 0
      ? prisma.service.findMany({
          where: { slug: { in: industry.serviceSlugs }, published: true, deletedAt: null },
          select: { slug: true, name: true, summary: true, category: true },
        })
      : [],
    industry.categorySlugs.length > 0
      ? prisma.category.findMany({
          where: { slug: { in: industry.categorySlugs }, deletedAt: null },
          select: {
            slug: true,
            name: true,
            summary: true,
            icon: true,
            _count: { select: { products: { where: { status: "ACTIVE", deletedAt: null } } } },
          },
        })
      : [],
    publishedIndustries(),
  ]);

  const inOrder = <T extends { slug: string }>(slugs: string[], rows: T[]) =>
    slugs.map((wanted) => rows.find((row) => row.slug === wanted)).filter((row): row is T => row !== undefined);

  const brandRows = inOrder(industry.brandSlugs, brands);
  const serviceRows = inOrder(industry.serviceSlugs, services);
  const categoryRows = inOrder(industry.categorySlugs, categories);
  const others = siblings.filter((row) => row.slug !== industry.slug).slice(0, 6);

  return (
    <>
      <div className="container-page">
        <Breadcrumb
          items={[
            { label: "Home", href: "/" },
            { label: "Industries", href: "/industries" },
            { label: industry.name },
          ]}
        />

        <header className="flex max-w-3xl flex-col gap-4">
          <span
            aria-hidden="true"
            className="inline-flex h-12 w-12 items-center justify-center rounded-[--radius-md] bg-accent-50 text-accent-700"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d={glyph(industry.icon)} />
            </svg>
          </span>
          <h1 className="text-3xl sm:text-4xl">{industry.name}</h1>
          <p className="text-[16px] leading-relaxed text-ink-600">{industry.summary}</p>
          <div className="flex flex-wrap gap-3">
            <ButtonLink href="/enquiry">Tell us what you need</ButtonLink>
            <ButtonLink href="/contact" variant="outline">
              Talk to us
            </ButtonLink>
          </div>
        </header>
      </div>

      {industry.description ? (
        <section className="container-page pt-10">
          <div className="max-w-3xl">
            <h2 className="text-section">How this sector buys</h2>
            <Markdown body={industry.description} className="prose-content mt-3 text-body" />
          </div>
        </section>
      ) : null}

      {industry.solutions.length > 0 ? (
        <section className="container-page pt-12">
          <SectionHeader
            title="What we supply"
            description="Licensing, hardware and services quoted together on one document, against one purchase order."
            className="mb-5"
            as="h2"
          />
          <Reveal as="ul" className="flex flex-wrap gap-2">
            {industry.solutions.map((solution) => (
              <li
                key={solution}
                className="rounded-[--radius-md] border border-line bg-white px-3.5 py-2 text-meta font-medium text-ink-700"
              >
                {solution}
              </li>
            ))}
          </Reveal>
        </section>
      ) : null}

      {categoryRows.length > 0 ? (
        <section className="container-page pt-14">
          <SectionHeader
            title="Where to start in the catalogue"
            description="The parts of the catalogue this sector draws on most."
            className="mb-5"
            as="h2"
          />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {categoryRows.map((category, index) => (
              <Reveal key={category.slug} delay={Math.min(index * 45, 180)}>
                <CategoryCard
                  category={{ ...category, count: category._count.products || undefined }}
                />
              </Reveal>
            ))}
          </div>
        </section>
      ) : null}

      {brandRows.length > 0 ? (
        <section className="container-page pt-14">
          <SectionHeader
            title="Technology brands for this sector"
            description="Publishers and manufacturers we source and licence. One relationship covers all of them."
            className="mb-5"
            as="h2"
          />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {brandRows.map((brand, index) => (
              <Reveal key={brand.slug} delay={Math.min(index * 45, 180)}>
                <BrandCard brand={{ ...brand, productCount: brand._count.products || undefined }} />
              </Reveal>
            ))}
          </div>
        </section>
      ) : null}

      {serviceRows.length > 0 ? (
        <section className="container-page pt-14">
          <SectionHeader
            title="Services that go with it"
            description="Delivery and lifecycle work, quoted alongside the licences rather than after them."
            className="mb-5"
            as="h2"
          />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {serviceRows.map((service, index) => (
              <Reveal key={service.slug} delay={Math.min(index * 45, 180)}>
                <Link
                  href={`/services/${service.slug}`}
                  className="lift flex h-full flex-col rounded-[--radius-lg] border border-line bg-white p-5 hover:border-graphite-300"
                >
                  <span className="text-label font-semibold uppercase tracking-wide text-accent-700">
                    {service.category}
                  </span>
                  <span className="mt-2 text-body font-semibold text-graphite-900">
                    {service.name}
                  </span>
                  <span className="clamp-2 mt-1.5 text-meta leading-relaxed text-ink-600">
                    {service.summary}
                  </span>
                </Link>
              </Reveal>
            ))}
          </div>
        </section>
      ) : null}

      <section className="container-page pt-14">
        <div className="rounded-[--radius-lg] border border-line bg-surface-muted p-6 sm:p-8">
          <h2 className="text-section">How the purchase runs</h2>
          <p className="mt-3 max-w-3xl text-body leading-relaxed text-ink-600">
            Tell us the requirement and we quote it — licensing, hardware and services on one
            document, priced to your configuration and quantity. You raise one purchase order, we
            fulfil against it, and the entitlements and renewal dates stay on your account so the
            next cycle starts from a record rather than from a search of somebody&rsquo;s inbox.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <ButtonLink href="/enquiry">Build an enquiry</ButtonLink>
            <ButtonLink href="/enterprise" variant="outline">
              Enterprise procurement
            </ButtonLink>
          </div>
        </div>
      </section>

      {others.length > 0 ? (
        <section className="container-page py-14">
          <SectionHeader title="Other sectors" className="mb-5" as="h2" />
          <ul className="flex flex-wrap gap-x-3 gap-y-2">
            {others.map((other) => (
              <li key={other.slug}>
                <Link
                  href={`/industries/${other.slug}`}
                  className="block rounded-[--radius-md] border border-line bg-white px-3 py-1.5 text-meta text-ink-700 transition-colors hover:border-graphite-400 hover:text-graphite-900"
                >
                  {other.name}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </>
  );
}
