import Link from "next/link";
import type { Metadata } from "next";

import { ButtonLink } from "@/components/ui/button";
import { SectionHeader } from "@/components/ui/section-header";
import { SearchBox } from "@/components/layout/search-box";
import { ProductGrid } from "@/components/marketing/product-card";
import { BrandCard, BrandStrip } from "@/components/marketing/brand-card";
import { CategoryCard } from "@/components/marketing/category-card";
import { getFeaturedProducts, getPopularProducts } from "@/lib/queries/catalogue";
import { getBrands, getPublishedPosts, getServices } from "@/lib/queries/content";
import { buildMetadata } from "@/lib/seo";
import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = buildMetadata({
  title: "Enterprise Software Licensing, Cloud & IT Solutions",
  description:
    "Microsoft, Adobe, Autodesk, Zoho and enterprise technology solutions from one trusted procurement partner. Consolidated quotations, GST invoicing, deployment and licence management.",
  path: "/",
});

const PROCUREMENT_POINTS = [
  {
    title: "Multi-vendor sourcing",
    body: "One requirement covering Microsoft, Adobe, Autodesk, Zoho and infrastructure vendors, sourced together rather than chased separately.",
  },
  {
    title: "Consolidated quotation",
    body: "A single itemised quotation across every vendor, with each line priced individually so nothing is hidden inside a bundle.",
  },
  {
    title: "One purchase order",
    body: "Your finance team raises one PO and reconciles one GST invoice instead of five, whatever the quotation contains.",
  },
  {
    title: "Renewals managed",
    body: "Every renewal date tracked with a review window ahead of it, so no subscription renews at last year's count by default.",
  },
];

const WHY_POINTS = [
  {
    title: "Licensing advice before the sale",
    body: "We will tell you when a cheaper licensing model fits better, including when that means a smaller order. A recommendation you cannot trust is worth nothing.",
  },
  {
    title: "Written commercial terms",
    body: "Response commitments, support scope and delivery timelines are stated in the quotation, not described qualitatively and settled later.",
  },
  {
    title: "Deployment, not just delivery",
    body: "Migration, tenant configuration and user onboarding are available alongside the licences, so what you buy is actually adopted.",
  },
  {
    title: "GST-compliant invoicing",
    body: "Every invoice carries your GSTIN and registered legal name correctly, so input credit is not lost to a reconciliation mismatch.",
  },
];

const INDUSTRIES = [
  { name: "Architecture & Construction", href: "/solutions/architecture-construction", detail: "BIM, CAD and common data environments" },
  { name: "Manufacturing", href: "/solutions/manufacturing", detail: "Product design, CAM and simulation" },
  { name: "IT & Software", href: "/solutions/technology", detail: "Cloud platforms, developer tooling and security" },
  { name: "Financial Services", href: "/solutions/financial-services", detail: "Compliance, retention and identity controls" },
  { name: "Education", href: "/solutions/education", detail: "Academic licensing and campus deployment" },
  { name: "Media & Creative", href: "/solutions/design-engineering", detail: "Creative suites and post-production" },
];

const TRUST_BADGES = [
  { label: "100% Genuine", detail: "Original, authentic licences" },
  { label: "Authorised Partner", detail: "Direct vendor relationships" },
  { label: "Expert Support", detail: "Pre-sales and post-sales" },
  { label: "Competitive Pricing", detail: "Best value at volume" },
  { label: "Fast, Secure Delivery", detail: "Quick turnaround across India" },
  { label: "GST Invoicing", detail: "Fully compliant billing" },
];

/**
 * Certification status as represented by the operating company. Presented as
 * a plain statement of standing, not as reproductions of any vendor's
 * certification badge artwork.
 */
const PARTNER_CERTIFICATIONS = [
  { vendor: "Microsoft", status: "Solution Partner" },
  { vendor: "Adobe", status: "Certified Partner" },
  { vendor: "Autodesk", status: "Partner" },
  { vendor: "HP", status: "Partner" },
  { vendor: "Dell Technologies", status: "Authorised Partner" },
  { vendor: "Lenovo", status: "Authorised Partner" },
];

const GEM_FEATURES = [
  "GeM contracts",
  "CRAC support",
  "Timely delivery",
  "GST invoicing",
];

const GEM_SEGMENTS = [
  "Government departments",
  "Public sector undertakings",
  "Educational institutions",
  "Public sector organisations",
];

/**
 * Organisations supplied through GeM and direct tender engagements, as
 * represented by the operating company. Shown as plain wordmarks rather than
 * reproduced official emblems - the same restraint the vendor strip already
 * applies to trademarked logos - and described as organisations supplied to,
 * not as an implied ongoing partnership or an endorsement by the named body.
 */
const SUPPLIED_ORGANISATIONS = [
  "BSNL",
  "Delhi Police",
  "ONGC",
  "NBCC",
  "North Delhi Municipal Corporation",
  "Indian Army",
  "Border Roads Organisation",
  "DRDO",
  "Hindustan Aeronautics Limited",
];

export default async function HomePage() {
  const [brands, featured, popular, services, posts, stats] = await Promise.all([
    getBrands(),
    getFeaturedProducts(6),
    getPopularProducts(6),
    getServices(),
    getPublishedPosts({ limit: 3 }),
    Promise.all([
      prisma.product.count({ where: { status: "ACTIVE", deletedAt: null } }),
      prisma.productVariant.count({ where: { deletedAt: null } }),
      prisma.brand.count({ where: { deletedAt: null } }),
    ]),
  ]);

  const [productCount, skuCount, brandCount] = stats;

  const featuredCategories = await prisma.category.findMany({
    where: { featured: true, deletedAt: null },
    orderBy: { displayOrder: "asc" },
    take: 8,
    select: {
      slug: true,
      name: true,
      summary: true,
      icon: true,
      _count: { select: { products: { where: { status: "ACTIVE", deletedAt: null } } } },
    },
  });

  const featuredServices = services.filter((service) => service.featured).slice(0, 6);

  return (
    <>
      {/* ------------------------------------------------------------- Hero */}
      <section className="border-b border-graphite-800 bg-graphite-900">
        <div className="container-page py-16 lg:py-24">
          <div className="max-w-3xl">
            <p className="mb-4 inline-flex items-center gap-2 rounded-[--radius-sm] border border-graphite-700 bg-graphite-800 px-3 py-1 text-[12px] font-medium text-graphite-200">
              <span className="h-1.5 w-1.5 rounded-full bg-accent-400" aria-hidden="true" />
              Multiple technology vendors. One procurement partner.
            </p>
            <h1 className="text-[2.15rem] leading-[1.12] text-white sm:text-5xl lg:text-[3.4rem]">
              Enterprise Software Licensing, Cloud &amp; IT Solutions
            </h1>
            <p className="mt-5 max-w-2xl text-[16px] leading-relaxed text-graphite-200 lg:text-[17px]">
              Microsoft, Adobe, Autodesk, Zoho and enterprise technology solutions from one
              trusted procurement partner — with the licensing advice, deployment support and
              renewal management that make them worth owning.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink href="/enquiry" size="lg">
                Get Enterprise Quote
              </ButtonLink>
              <ButtonLink href="/products" size="lg" variant="onDark">
                Browse Software
              </ButtonLink>
            </div>

            <div className="mt-10 max-w-2xl">
              <SearchBox
                size="lg"
                label="Search products and solutions"
                placeholder="What software or solution are you looking for?"
              />
              <p className="mt-3 text-[13px] text-graphite-300">
                Popular:{" "}
                {["Microsoft 365", "Acrobat Pro", "AutoCAD", "Zoho CRM", "Windows Server"].map(
                  (term, index) => (
                    <span key={term}>
                      {index > 0 ? <span className="text-graphite-600"> · </span> : null}
                      <Link
                        href={`/search?q=${encodeURIComponent(term)}`}
                        className="text-graphite-200 underline-offset-2 hover:text-white hover:underline"
                      >
                        {term}
                      </Link>
                    </span>
                  ),
                )}
              </p>
            </div>
          </div>

          <dl className="mt-14 grid max-w-3xl grid-cols-2 gap-x-6 gap-y-6 border-t border-graphite-800 pt-8 sm:grid-cols-4">
            {[
              { label: "Products listed", value: `${productCount}` },
              { label: "Licensable SKUs", value: `${skuCount}` },
              { label: "Vendors supplied", value: `${brandCount}` },
              { label: "Purchase order", value: "One" },
            ].map((item) => (
              <div key={item.label}>
                <dt className="text-[12px] uppercase tracking-wide text-graphite-400">{item.label}</dt>
                <dd className="mt-1 text-2xl font-semibold text-white">{item.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* --------------------------------------------------------- Vendors */}
      <section className="border-b border-line bg-surface-muted py-10">
        <div className="container-page">
          <p className="mb-6 text-center text-[12px] font-semibold uppercase tracking-[0.14em] text-ink-500">
            Licensing and solutions across
          </p>
          <BrandStrip brands={brands} />
        </div>
      </section>

      {/* ---------------------------------------------------- Trust badges */}
      <section className="border-b border-line py-8">
        <div className="container-page">
          <ul className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-3 lg:grid-cols-6">
            {TRUST_BADGES.map((badge) => (
              <li key={badge.label} className="flex items-start gap-2.5">
                <span
                  aria-hidden="true"
                  className="mt-0.5 inline-grid h-5 w-5 shrink-0 place-items-center rounded-full bg-accent-50 text-accent-700"
                >
                  <svg width="11" height="11" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M8.2 13.6 4.6 10l1.3-1.3 2.3 2.3 5.9-5.9L15.4 6z" />
                  </svg>
                </span>
                <span>
                  <span className="block text-[13px] font-semibold text-graphite-900">
                    {badge.label}
                  </span>
                  <span className="block text-[12px] text-ink-500">{badge.detail}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ------------------------------------------------------ Categories */}
      <section className="container-page py-16 lg:py-20">
        <SectionHeader
          eyebrow="Catalogue"
          title="Featured software categories"
          description="Browse by what the software does rather than who publishes it — most procurement decisions start with a capability, not a vendor."
          action={
            <ButtonLink href="/products" variant="outline" size="sm">
              View full catalogue
            </ButtonLink>
          }
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {featuredCategories.map((category) => (
            <CategoryCard
              key={category.slug}
              category={{ ...category, count: category._count.products }}
            />
          ))}
        </div>
      </section>

      {/* --------------------------------------------------------- Popular */}
      <section className="border-y border-line bg-surface-muted py-16 lg:py-20">
        <div className="container-page">
          <SectionHeader
            eyebrow="Most requested"
            title="Popular products"
            description="The licences most often included in the quotations we prepare."
            action={
              <ButtonLink href="/products?sort=popular" variant="outline" size="sm">
                See all popular
              </ButtonLink>
            }
          />
          <ProductGrid products={popular} />
        </div>
      </section>

      {/* ---------------------------------------------------- Procurement */}
      <section className="container-page py-16 lg:py-20">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
          <div>
            <SectionHeader
              eyebrow="Enterprise procurement"
              title="One procurement partner for your technology stack"
              description="A single technology refresh can involve four publishers, two hardware vendors and a services engagement. Handled directly, that is seven vendor relationships for one project."
              className="mb-8"
            />
            <p className="text-[15px] leading-relaxed text-ink-600">
              We consolidate the sourcing so one requirement produces one quotation, one
              purchase order and one GST invoice — without losing visibility of what each
              line costs.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink href="/enterprise">Talk to an Enterprise Specialist</ButtonLink>
              <ButtonLink href="/services/it-procurement" variant="outline">
                How procurement works
              </ButtonLink>
            </div>
          </div>

          <ul className="grid gap-4 sm:grid-cols-2">
            {PROCUREMENT_POINTS.map((point) => (
              <li key={point.title} className="rounded-[--radius-lg] border border-line bg-white p-5">
                <h3 className="text-[14px] font-semibold text-graphite-900">{point.title}</h3>
                <p className="mt-2 text-[13px] leading-relaxed text-ink-600">{point.body}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ---------------------------------------------------------- Featured */}
      <section className="border-y border-line bg-surface-muted py-16 lg:py-20">
        <div className="container-page">
          <SectionHeader
            eyebrow="Selected licensing"
            title="Featured products"
            description="Widely-deployed licences with the licensing detail set out in full on each product page."
            action={
              <ButtonLink href="/products" variant="outline" size="sm">
                Browse all products
              </ButtonLink>
            }
          />
          <ProductGrid products={featured} />
        </div>
      </section>

      {/* --------------------------------------------------------- Services */}
      <section className="container-page py-16 lg:py-20">
        <SectionHeader
          eyebrow="Managed services"
          title="Beyond the licence"
          description="Software delivers nothing until it is deployed, adopted and kept running. These are the engagements that get it there."
          action={
            <ButtonLink href="/services" variant="outline" size="sm">
              All services
            </ButtonLink>
          }
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {featuredServices.map((service) => (
            <Link
              key={service.slug}
              href={`/services/${service.slug}`}
              className="group flex flex-col rounded-[--radius-lg] border border-line bg-white p-5 transition-colors hover:border-graphite-300"
            >
              <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-accent-700">
                {service.category}
              </span>
              <span className="mt-2 text-[15px] font-semibold text-graphite-900 group-hover:text-accent-700">
                {service.name}
              </span>
              <span className="clamp-3 mt-2 text-[13px] leading-relaxed text-ink-600">
                {service.summary}
              </span>
              <span className="mt-4 text-[13px] font-medium text-accent-700">
                Read more &rarr;
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* -------------------------------------------------------- Why us */}
      <section className="border-y border-line bg-surface-muted py-16 lg:py-20">
        <div className="container-page">
          <SectionHeader
            eyebrow="Why work with us"
            title="What you can expect"
            description="Stated plainly, so you can hold us to it."
            align="center"
          />
          <div className="grid gap-4 sm:grid-cols-2">
            {WHY_POINTS.map((point, index) => (
              <div key={point.title} className="rounded-[--radius-lg] border border-line bg-white p-6">
                <span
                  aria-hidden="true"
                  className="mb-3 inline-grid h-7 w-7 place-items-center rounded-[--radius-sm] bg-graphite-900 text-[12px] font-semibold text-white"
                >
                  {index + 1}
                </span>
                <h3 className="text-[15px] font-semibold text-graphite-900">{point.title}</h3>
                <p className="mt-2 text-[14px] leading-relaxed text-ink-600">{point.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------ Industries */}
      <section className="container-page py-16 lg:py-20">
        <SectionHeader
          eyebrow="Industries"
          title="Sector-specific technology requirements"
          description="Licensing decisions look different depending on what the software is being used for."
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {INDUSTRIES.map((industry) => (
            <Link
              key={industry.href}
              href={industry.href}
              className="group flex items-start justify-between gap-4 rounded-[--radius-lg] border border-line bg-white p-5 transition-colors hover:border-graphite-300"
            >
              <span>
                <span className="block text-[15px] font-semibold text-graphite-900 group-hover:text-accent-700">
                  {industry.name}
                </span>
                <span className="mt-1 block text-[13px] text-ink-600">{industry.detail}</span>
              </span>
              <span aria-hidden="true" className="mt-1 shrink-0 text-ink-300 group-hover:text-accent-700">
                &rarr;
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* ------------------------------------------------------------ GeM */}
      <section className="border-y border-line bg-surface-muted py-16 lg:py-20">
        <div className="container-page">
          <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
            <div>
              <SectionHeader
                eyebrow="Government e-Marketplace"
                title="Registered GeM seller"
                description="An experienced seller on the Government e-Marketplace, supplying software and IT solutions through public procurement channels."
                className="mb-6"
              />
              <p className="text-[15px] leading-relaxed text-ink-600">We support:</p>
              <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-[14px] text-ink-700">
                {GEM_SEGMENTS.map((segment) => (
                  <li key={segment} className="flex items-center gap-2">
                    <span aria-hidden="true" className="h-1 w-1 shrink-0 rounded-full bg-accent-600" />
                    {segment}
                  </li>
                ))}
              </ul>
            </div>

            <ul className="grid grid-cols-2 gap-4">
              {GEM_FEATURES.map((feature) => (
                <li
                  key={feature}
                  className="rounded-[--radius-lg] border border-line bg-white p-5 text-center"
                >
                  <span className="text-[14px] font-semibold text-graphite-900">{feature}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------- Supplied to */}
      <section className="container-page py-16 lg:py-20">
        <SectionHeader
          eyebrow="Public sector and defence"
          title="Organisations we have supplied technology to"
          description="Including government departments, defence establishments and public sector undertakings, supplied through GeM and direct tender engagements."
        />
        <ul className="flex flex-wrap gap-x-3 gap-y-3">
          {SUPPLIED_ORGANISATIONS.map((name) => (
            <li
              key={name}
              className="rounded-[--radius-md] border border-line bg-white px-4 py-2.5 text-[13px] font-medium text-ink-700"
            >
              {name}
            </li>
          ))}
        </ul>
        <p className="mt-6 text-[13px] text-ink-500">
          500+ organisations supplied across India.
        </p>
      </section>

      {/* ----------------------------------------------------------- Proof */}
      <section className="border-y border-line bg-surface-muted py-16 lg:py-20">
        <div className="container-page">
          <SectionHeader
            eyebrow="How we work"
            title="What a first engagement looks like"
            description="No case studies invented for a website. This is the actual sequence."
            align="center"
          />
          <ol className="grid gap-4 md:grid-cols-4">
            {[
              { title: "Tell us the requirement", body: "In whatever detail you have — a product list, a seat count, or just the problem you are solving." },
              { title: "We source and advise", body: "Across vendors, including the alternative you did not ask about if it fits better." },
              { title: "One quotation", body: "Itemised by line, with the GST position and delivery timeline stated in writing." },
              { title: "Delivery and support", body: "Provisioning, deployment where in scope, and a renewal calendar from day one." },
            ].map((step, index) => (
              <li key={step.title} className="rounded-[--radius-lg] border border-line bg-white p-5">
                <span className="text-[12px] font-semibold uppercase tracking-wide text-accent-700">
                  Step {index + 1}
                </span>
                <h3 className="mt-2 text-[15px] font-semibold text-graphite-900">{step.title}</h3>
                <p className="mt-2 text-[13px] leading-relaxed text-ink-600">{step.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* -------------------------------------------------------- Vendors */}
      <section className="container-page py-16 lg:py-20">
        <SectionHeader
          eyebrow="Vendors"
          title="Licensing across the vendors you already use"
          action={
            <ButtonLink href="/brands" variant="outline" size="sm">
              All vendors
            </ButtonLink>
          }
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {brands.map((brand) => (
            <BrandCard
              key={brand.slug}
              brand={{ ...brand, productCount: brand._count.products }}
            />
          ))}
        </div>

        <ul className="mt-10 grid gap-3 border-t border-line pt-10 sm:grid-cols-2 lg:grid-cols-3">
          {PARTNER_CERTIFICATIONS.map((partner) => (
            <li
              key={partner.vendor}
              className="flex items-center justify-between gap-3 rounded-[--radius-md] border border-line bg-white px-4 py-3 text-[13px]"
            >
              <span className="font-medium text-graphite-900">{partner.vendor}</span>
              <span className="text-ink-500">{partner.status}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* ------------------------------------------------------- Resources */}
      {posts.length > 0 ? (
        <section className="border-y border-line bg-surface-muted py-16 lg:py-20">
          <div className="container-page">
            <SectionHeader
              eyebrow="Resources"
              title="Licensing and procurement guidance"
              description="Practical explainers on the decisions that cost the most when they go wrong."
              action={
                <ButtonLink href="/resources" variant="outline" size="sm">
                  Resource centre
                </ButtonLink>
              }
            />
            <div className="grid gap-4 md:grid-cols-3">
              {posts.map((post) => (
                <Link
                  key={post.slug}
                  href={`/blog/${post.slug}`}
                  className="group flex flex-col rounded-[--radius-lg] border border-line bg-white p-5 transition-colors hover:border-graphite-300"
                >
                  <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-accent-700">
                    {post.category}
                  </span>
                  <h3 className="mt-2 text-[15px] font-semibold leading-snug text-graphite-900 group-hover:text-accent-700">
                    {post.title}
                  </h3>
                  <p className="clamp-3 mt-2 text-[13px] leading-relaxed text-ink-600">
                    {post.excerpt}
                  </p>
                  <span className="mt-4 text-[12px] text-ink-500">
                    {formatDate(post.publishedAt)} &middot; {post.readMinutes} min read
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* ------------------------------------------------------------- CTA */}
      <section className="bg-graphite-900">
        <div className="container-page py-16 lg:py-20">
          <div className="flex flex-col items-start gap-8 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <h2 className="text-[1.75rem] leading-tight text-white sm:text-[2rem]">
                Ready to consolidate your technology procurement?
              </h2>
              <p className="mt-4 text-[15px] leading-relaxed text-graphite-200">
                Send us the requirement — a product list, a seat count, or just the problem you
                are trying to solve. We will come back with a consolidated quotation and a plain
                recommendation, including where a cheaper option would serve you better.
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-3">
              <ButtonLink href="/enquiry" size="lg">
                Get Enterprise Quote
              </ButtonLink>
              <ButtonLink href="/contact" size="lg" variant="onDark">
                Contact sales
              </ButtonLink>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
