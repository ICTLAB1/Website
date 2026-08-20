import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Breadcrumb } from "@/components/ui/breadcrumb";
import { SectionHeader } from "@/components/ui/section-header";
import { FaqList } from "@/components/ui/accordion";
import { ButtonLink } from "@/components/ui/button";
import { ProductGrid } from "@/components/marketing/product-card";
import { prisma } from "@/lib/db";
import { productListSelect, type ProductListItem } from "@/lib/queries/catalogue";
import { getFaqsByTopic } from "@/lib/queries/content";
import { allLandingSlugs, getLandingPage } from "@/content/landing";
import { buildMetadata } from "@/lib/seo";

/**
 * Vendor and solution landing pages.
 *
 * A single catch-all route renders every entry in the landing registry. Static
 * routes always take precedence over this one in Next.js, and `dynamicParams`
 * is disabled, so a path that is neither a real route nor a registered landing
 * page returns a genuine 404 rather than an empty page.
 */

export const dynamicParams = false;

type PageProps = { params: Promise<{ slug: string[] }> };

export async function generateStaticParams() {
  return allLandingSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const page = getLandingPage(slug);
  if (!page) {
    return buildMetadata({
      title: "Page not found",
      description: "This page is no longer available.",
      path: `/${slug.join("/")}`,
      noIndex: true,
    });
  }

  return buildMetadata({
    title: page.title,
    description: page.description,
    path: `/${page.slug}`,
    keywords: page.keywords,
  });
}

export default async function LandingRoute({ params }: PageProps) {
  const { slug } = await params;
  const page = getLandingPage(slug);
  if (!page) notFound();

  // Products are read live from the catalogue rather than duplicated into the
  // content registry, so prices and availability can never drift.
  const products: ProductListItem[] = page.productSlugs?.length
    ? await prisma.product
        .findMany({
          where: { slug: { in: page.productSlugs }, status: "ACTIVE", deletedAt: null },
          select: productListSelect,
        })
        .then((rows) =>
          // Preserve the order given in the registry.
          page.productSlugs!
            .map((productSlug) => rows.find((row) => row.slug === productSlug))
            .filter((row): row is ProductListItem => row !== undefined),
        )
    : [];

  const [brandFaqs, topicFaqs] = await Promise.all([
    page.brandSlug
      ? prisma.faq.findMany({
          where: { brand: { slug: page.brandSlug } },
          orderBy: { displayOrder: "asc" },
          select: { question: true, answer: true },
        })
      : Promise.resolve([]),
    page.faqTopic ? getFaqsByTopic(page.faqTopic) : Promise.resolve([]),
  ]);

  const faqs = [...(page.faqs ?? []), ...topicFaqs, ...brandFaqs];

  return (
    <div className="pb-16">
      <div className="container-page">
        <Breadcrumb items={page.breadcrumb} />
      </div>

      {/* Hero */}
      <section className="border-y border-line bg-navy-900">
        <div className="container-page py-14 lg:py-18">
          <div className="max-w-3xl">
            {page.hero.eyebrow ? (
              <p className="mb-3 text-[12px] font-semibold uppercase tracking-[0.12em] text-accent-300">
                {page.hero.eyebrow}
              </p>
            ) : null}
            <h1 className="text-3xl leading-[1.15] text-white sm:text-[2.6rem]">
              {page.hero.headline}
            </h1>
            <p className="mt-5 text-[16px] leading-relaxed text-navy-200 lg:text-[17px]">
              {page.hero.subheadline}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              {page.hero.primaryCta ? (
                <ButtonLink href={page.hero.primaryCta.href} size="lg">
                  {page.hero.primaryCta.label}
                </ButtonLink>
              ) : null}
              {page.hero.secondaryCta ? (
                <ButtonLink href={page.hero.secondaryCta.href} size="lg" variant="onDark">
                  {page.hero.secondaryCta.label}
                </ButtonLink>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <div className="container-page">
        {page.intro?.length ? (
          <section className="py-12 lg:py-14">
            <div className="prose-content max-w-3xl text-[16px]">
              {page.intro.map((paragraph, index) => (
                <p key={index}>{paragraph}</p>
              ))}
            </div>
          </section>
        ) : null}

        {page.sections?.map((section, index) => (
          <section key={section.heading} className={index === 0 && !page.intro?.length ? "py-12" : "border-t border-line py-12 lg:py-14"}>
            <SectionHeader title={section.heading} as="h2" className="mb-6" />

            {section.body?.length ? (
              <div className="prose-content mb-6 max-w-3xl text-[15px]">
                {section.body.map((paragraph, paragraphIndex) => (
                  <p key={paragraphIndex}>{paragraph}</p>
                ))}
              </div>
            ) : null}

            {section.cards?.length ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {section.cards.map((card) => (
                  <div key={card.title} className="rounded-[--radius-lg] border border-line bg-white p-5">
                    <h3 className="text-[15px] font-semibold text-navy-900">{card.title}</h3>
                    <p className="mt-2 text-[13px] leading-relaxed text-ink-600">{card.body}</p>
                  </div>
                ))}
              </div>
            ) : null}

            {section.bullets?.length ? (
              <ul className="grid max-w-4xl gap-3 sm:grid-cols-2">
                {section.bullets.map((bullet) => (
                  <li key={bullet} className="flex gap-3 text-[14px] leading-relaxed text-ink-700">
                    <span aria-hidden="true" className="mt-1 shrink-0 text-accent-700">
                      <svg width="15" height="15" viewBox="0 0 12 12" fill="currentColor">
                        <path d="M4.7 8.6 2.2 6.1l.9-.9 1.6 1.6 4-4 .9.9z" />
                      </svg>
                    </span>
                    {bullet}
                  </li>
                ))}
              </ul>
            ) : null}
          </section>
        ))}

        {page.plans ? (
          <section id="plans" className="scroll-mt-32 border-t border-line py-12 lg:py-14">
            <SectionHeader
              title={page.plans.heading}
              description={page.plans.description}
              as="h2"
            />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {page.plans.items.map((plan) => (
                <div key={plan.name} className="flex flex-col rounded-[--radius-lg] border border-line bg-white p-5">
                  <h3 className="text-[16px] font-semibold text-navy-900">{plan.name}</h3>
                  <p className="mt-2 text-[13px] leading-relaxed text-ink-600">{plan.summary}</p>
                  <ul className="mt-4 flex-1 space-y-2">
                    {plan.points.map((point) => (
                      <li key={point} className="flex gap-2 text-[13px] leading-snug text-ink-700">
                        <span aria-hidden="true" className="mt-1 shrink-0 text-accent-700">
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                            <path d="M4.7 8.6 2.2 6.1l.9-.9 1.6 1.6 4-4 .9.9z" />
                          </svg>
                        </span>
                        {point}
                      </li>
                    ))}
                  </ul>
                  {plan.productSlug ? (
                    <Link
                      href={`/products/${plan.productSlug}`}
                      className="mt-5 inline-flex h-10 items-center justify-center rounded-[--radius-md] border border-line-strong text-[13px] font-medium text-navy-900 hover:border-navy-400 hover:bg-navy-50"
                    >
                      View pricing
                    </Link>
                  ) : null}
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {products.length > 0 ? (
          <section className="border-t border-line py-12 lg:py-14">
            <SectionHeader
              title={page.productsHeading ?? "Related products"}
              as="h2"
              action={
                <ButtonLink href="/products" variant="outline" size="sm">
                  Full catalogue
                </ButtonLink>
              }
            />
            <ProductGrid products={products} />
          </section>
        ) : null}

        {faqs.length > 0 ? (
          <section id="faq" className="max-w-3xl scroll-mt-32 border-t border-line py-12 lg:py-14">
            <SectionHeader title="Frequently asked questions" as="h2" className="mb-6" />
            <FaqList items={faqs} />
          </section>
        ) : null}

        {page.related?.length ? (
          <section className="border-t border-line py-12">
            <SectionHeader title="Related pages" as="h2" className="mb-6" />
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {page.related.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="group flex h-full items-start justify-between gap-3 rounded-[--radius-lg] border border-line bg-white p-4 transition-colors hover:border-navy-300"
                  >
                    <span>
                      <span className="block text-[14px] font-medium text-navy-900 group-hover:text-accent-700">
                        {link.label}
                      </span>
                      {link.description ? (
                        <span className="mt-0.5 block text-[12px] text-ink-500">
                          {link.description}
                        </span>
                      ) : null}
                    </span>
                    <span aria-hidden="true" className="mt-0.5 text-ink-300 group-hover:text-accent-700">
                      &rarr;
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {page.cta ? (
          <section className="mt-4 rounded-[--radius-lg] bg-navy-900 p-8 sm:p-10">
            <h2 className="text-[1.65rem] text-white">{page.cta.heading}</h2>
            <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-navy-200">
              {page.cta.body}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <ButtonLink href="/enquiry" size="lg">
                Get Enterprise Quote
              </ButtonLink>
              <ButtonLink href="/contact" size="lg" variant="onDark">
                Talk to a specialist
              </ButtonLink>
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}
