import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Breadcrumb } from "@/components/ui/breadcrumb";
import { SectionHeader } from "@/components/ui/section-header";
import { FaqList } from "@/components/ui/accordion";
import { ButtonLink } from "@/components/ui/button";
import { ProductGrid } from "@/components/marketing/product-card";
import { prisma } from "@/lib/db";
import { getBrandBySlug, getBrandCategories, getServices } from "@/lib/queries/content";
import { productListSelect } from "@/lib/queries/catalogue";
import { absoluteUrl, buildMetadata, JsonLd } from "@/lib/seo";

type PageProps = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  const brands = await prisma.brand.findMany({
    where: { deletedAt: null },
    select: { slug: true },
  });
  return brands.map((brand) => ({ slug: brand.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const brand = await getBrandBySlug(slug);
  if (!brand) {
    return buildMetadata({
      title: "Vendor not found",
      description: "This vendor page is no longer available.",
      path: `/brands/${slug}`,
      noIndex: true,
    });
  }

  return buildMetadata({
    title: `${brand.name} Licensing & Solutions`,
    description: brand.summary,
    path: `/brands/${brand.slug}`,
    keywords: [brand.name, `${brand.name} licensing`, `buy ${brand.name}`],
  });
}

export default async function BrandPage({ params }: PageProps) {
  const { slug } = await params;
  const brand = await getBrandBySlug(slug);
  if (!brand) notFound();

  const [categories, featured, allServices] = await Promise.all([
    getBrandCategories(brand.id),
    prisma.product.findMany({
      where: { brandId: brand.id, status: "ACTIVE", deletedAt: null },
      select: productListSelect,
      orderBy: [{ featured: "desc" }, { popularity: "desc" }],
      take: 6,
    }),
    getServices(),
  ]);

  // Services that plausibly relate to this vendor's products, matched on the
  // technology list rather than a hand-maintained mapping.
  const relatedServices = allServices
    .filter((service) =>
      service.technologies.some((technology) =>
        technology.toLowerCase().includes(brand.name.toLowerCase().split(" ")[0] ?? ""),
      ),
    )
    .slice(0, 3);

  const services = relatedServices.length > 0 ? relatedServices : allServices.filter((s) => s.featured).slice(0, 3);

  return (
    <div className="pb-16">
      <div className="container-page">
        <Breadcrumb
          items={[
            { label: "Home", href: "/" },
            { label: "Brands", href: "/brands" },
            { label: brand.name },
          ]}
        />
      </div>

      <section className="border-y border-line bg-navy-900">
        <div className="container-page py-14 lg:py-16">
          <div className="max-w-3xl">
            <span
              aria-hidden="true"
              className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-[--radius-md] text-xl font-bold text-white"
              style={{ backgroundColor: brand.accentColor }}
            >
              {brand.name.charAt(0)}
            </span>
            <h1 className="text-3xl leading-tight text-white sm:text-[2.5rem]">
              {brand.name} licensing &amp; solutions
            </h1>
            {brand.tagline ? (
              <p className="mt-3 text-[15px] font-medium text-accent-300">{brand.tagline}</p>
            ) : null}
            <p className="mt-5 text-[16px] leading-relaxed text-navy-200">{brand.summary}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink href={`/products?brand=${brand.slug}`}>
                Browse {brand.name} products
              </ButtonLink>
              <ButtonLink href="/enquiry" variant="onDark">
                Request pricing
              </ButtonLink>
            </div>
          </div>
        </div>
      </section>

      <div className="container-page">
        <section className="py-14">
          <div className="prose-content max-w-3xl text-[15px]">
            {brand.description.split("\n\n").map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
          </div>
        </section>

        {categories.length > 0 ? (
          <section className="border-t border-line py-14">
            <SectionHeader
              title={`${brand.name} product categories`}
              description="Where this vendor's products sit in the catalogue."
              as="h2"
            />
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {categories.map((category) => (
                <li key={category.slug}>
                  <Link
                    href={`/products?brand=${brand.slug}&category=${category.slug}`}
                    className="group flex h-full flex-col rounded-[--radius-lg] border border-line bg-white p-5 transition-colors hover:border-navy-300"
                  >
                    <span className="text-[15px] font-semibold text-navy-900 group-hover:text-accent-700">
                      {category.name}
                    </span>
                    {category.summary ? (
                      <span className="mt-1.5 text-[13px] leading-relaxed text-ink-600">
                        {category.summary}
                      </span>
                    ) : null}
                    <span className="mt-4 text-[12px] font-medium text-ink-500">
                      {category.count} {category.count === 1 ? "product" : "products"}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {featured.length > 0 ? (
          <section className="border-t border-line py-14">
            <SectionHeader
              title={`Featured ${brand.name} products`}
              as="h2"
              action={
                <ButtonLink href={`/products?brand=${brand.slug}`} variant="outline" size="sm">
                  View all
                </ButtonLink>
              }
            />
            <ProductGrid products={featured} />
          </section>
        ) : null}

        <section className="border-t border-line py-14">
          <SectionHeader
            title="Enterprise solutions"
            description={`How ${brand.name} licensing is handled at organisational scale.`}
            as="h2"
          />
          <div className="grid gap-4 md:grid-cols-3">
            {[
              {
                title: "Volume and multi-year terms",
                body: `Where seat counts are stable, multi-year ${brand.name} terms usually cost less per year and protect against price increases. We model both before recommending either.`,
              },
              {
                title: "Consolidated renewals",
                body: "Renewal dates aligned onto a common anniversary where the publisher permits it, so administration happens once a year rather than continuously.",
              },
              {
                title: "Assignment and reclamation",
                body: "Seats reassigned as staff join and leave, so your licence count tracks your headcount in both directions rather than only upwards.",
              },
            ].map((item) => (
              <div key={item.title} className="rounded-[--radius-lg] border border-line bg-white p-5">
                <h3 className="text-[15px] font-semibold text-navy-900">{item.title}</h3>
                <p className="mt-2 text-[13px] leading-relaxed text-ink-600">{item.body}</p>
              </div>
            ))}
          </div>
        </section>

        {services.length > 0 ? (
          <section className="border-t border-line py-14">
            <SectionHeader title="Related services" as="h2" />
            <div className="grid gap-4 md:grid-cols-3">
              {services.map((service) => (
                <Link
                  key={service.slug}
                  href={`/services/${service.slug}`}
                  className="group flex flex-col rounded-[--radius-lg] border border-line bg-white p-5 transition-colors hover:border-navy-300"
                >
                  <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-accent-700">
                    {service.category}
                  </span>
                  <span className="mt-2 text-[15px] font-semibold text-navy-900 group-hover:text-accent-700">
                    {service.name}
                  </span>
                  <span className="clamp-3 mt-2 text-[13px] leading-relaxed text-ink-600">
                    {service.summary}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        {brand.faqs.length > 0 ? (
          <section id="faq" className="max-w-3xl scroll-mt-32 border-t border-line py-14">
            <SectionHeader title={`${brand.name} licensing questions`} as="h2" className="mb-6" />
            <FaqList items={brand.faqs.map((faq) => ({ question: faq.question, answer: faq.answer }))} />
          </section>
        ) : null}

        <section className="rounded-[--radius-lg] bg-navy-900 p-8 sm:p-10">
          <h2 className="text-[1.6rem] text-white">Get {brand.name} pricing</h2>
          <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-navy-200">
            Tell us the products and seat counts you need. We will return a written quotation
            with the licensing model that suits your situation — including where a different
            one would cost you less.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <ButtonLink href="/enquiry">Request enterprise pricing</ButtonLink>
            <ButtonLink href="/contact" variant="onDark">
              Speak to a specialist
            </ButtonLink>
          </div>
        </section>
      </div>

      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Brand",
          name: brand.name,
          description: brand.summary,
          url: absoluteUrl(`/brands/${brand.slug}`),
        }}
      />
    </div>
  );
}
