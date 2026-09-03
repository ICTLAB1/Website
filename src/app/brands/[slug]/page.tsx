import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Breadcrumb } from "@/components/ui/breadcrumb";
import { SectionHeader } from "@/components/ui/section-header";
import { FaqList } from "@/components/ui/accordion";
import { ButtonLink } from "@/components/ui/button";
import { PartnerBadge, PartnerBadgeArtwork } from "@/components/marketing/partner-badge";
import { ProductGrid } from "@/components/marketing/product-card";
import { prisma } from "@/lib/db";
import {
  getBrandBySlug,
  getBrandCatalogueShape,
  getBrandCategories,
  getServices,
} from "@/lib/queries/content";
import { getBrandHardware } from "@/lib/queries/hardware";
import { FAMILY_LABELS } from "@/lib/catalogue/hardware";
import { getSiteConfig } from "@/lib/site-config";
import { productListSelect } from "@/lib/queries/catalogue";
import { absoluteUrl, buildMetadata, JsonLd } from "@/lib/seo";
import { metaDescription } from "@/lib/seo-description";
import { testimonialsForBrand } from "@/lib/queries/reviews";
import { Testimonials } from "@/components/reviews/testimonials";

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
  const brand = await getBrandBySlug(slug);
  if (!brand) {
    return buildMetadata({
      title: "Brand not found",
      description: "This brand page is no longer available.",
      path: `/brands/${slug}`,
      noIndex: true,
    });
  }

  /*
   * The title used to be "{Brand} Licensing & Solutions" on all forty of these
   * pages. Lenovo, Acer, Intel, AMD, Synology and Logitech do not license
   * anything to anybody — they make machines and parts — and a page title is a
   * claim like any other. This asks what is actually listed under the brand and
   * says that instead: "licensing" where there are licences, "hardware" where
   * there are machines, and neither where the catalogue is empty and the honest
   * offer is that we can source it.
   */
  const shape = await getBrandCatalogueShape(brand.id);
  const title =
    shape.licences > 0 && shape.hardware > 0
      ? `${brand.name} Licensing & Hardware`
      : shape.licences > 0
        ? `${brand.name} Licensing & Solutions`
        : shape.hardware > 0
          ? `${brand.name} Business Hardware`
          : `${brand.name} — Products & Procurement`;

  return buildMetadata({
    title,
    /*
     * A brand summary is a line under a heading — forty characters for Acer.
     * In a search result that is a third of the space, so where it is short
     * this adds a sentence about how the brand is bought here. Nothing in it is
     * specific to the brand beyond its name, and nothing claims a relationship
     * with the manufacturer: sourcing and quoting is what this business does,
     * and it is what the brands index page already says on their behalf.
     */
    description: metaDescription(
      brand.summary,
      shape.licences + shape.hardware > 0
        ? `Sourced and quoted by TechZoid, on one quotation and one purchase order with the rest of your estate.`
        : `Sourced and quoted by TechZoid on request, on the same terms as the rest of the catalogue.`,
      "Sourced and quoted by TechZoid alongside the rest of your software and hardware.",
    ),
    path: `/brands/${brand.slug}`,
    /*
     * Shape-aware too, and for the same reason as the title.
     *
     * "Lenovo licensing" was in the keywords of all forty of these pages after
     * the heading had already been fixed — the same claim, one tag lower down,
     * which is exactly where a corrected claim survives. A keyword is a
     * statement about what the page is for, and "Lenovo licensing" describes a
     * thing that does not exist.
     */
    keywords: [
      brand.name,
      ...(shape.licences > 0 ? [`${brand.name} licensing`] : []),
      ...(shape.hardware > 0 ? [`${brand.name} business hardware`] : []),
      `buy ${brand.name}`,
      `${brand.name} India`,
    ],
  });
}

export default async function BrandPage({ params }: PageProps) {
  const { slug } = await params;
  const brand = await getBrandBySlug(slug);
  if (!brand) notFound();

  const [categories, featured, allServices, hardware, config, shape, quotes] = await Promise.all([
    getBrandCategories(brand.id),
    prisma.product.findMany({
      where: { brandId: brand.id, status: "ACTIVE", deletedAt: null },
      select: productListSelect,
      orderBy: [{ featured: "desc" }, { popularity: "desc" }],
      take: 6,
    }),
    getServices(),
    getBrandHardware(brand.slug),
    getSiteConfig(),
    getBrandCatalogueShape(brand.id),
    testimonialsForBrand(brand.slug),
  ]);

  /*
   * The heading, and the same reasoning as the page title above.
   *
   * "Lenovo licensing & solutions" was the visible H1 on this page, in white on
   * charcoal, forty times over. Lenovo licenses nothing; nor do Acer, Intel,
   * AMD, Synology or Logitech. Derived from the rows in the catalogue rather
   * than from `BrandSegment`, which groups brands the way a buyer looks for
   * them and says nothing about what they sell — the mistake the comment
   * further down records.
   */
  const heading =
    shape.licences > 0 && shape.hardware > 0
      ? `${brand.name} licensing & hardware`
      : shape.licences > 0
        ? `${brand.name} licensing & solutions`
        : shape.hardware > 0
          ? `${brand.name} business hardware`
          : `${brand.name} products & procurement`;

  // Services that plausibly relate to this brand's products, matched on the
  // technology list rather than a hand-maintained mapping.
  const relatedServices = allServices
    .filter((service) =>
      service.technologies.some((technology) =>
        technology.toLowerCase().includes(brand.name.toLowerCase().split(" ")[0] ?? ""),
      ),
    )
    .slice(0, 3);

  const services = relatedServices.length > 0 ? relatedServices : allServices.filter((s) => s.featured).slice(0, 3);

  /*
   * Whether there is anything on this page to browse.
   *
   * Both lists, not a count column: `featured` is the software catalogue and
   * `hardware` is the models, and a brand can have one without the other. HP
   * has hardware and no software listings; Zoho is the reverse. Asking the two
   * arrays that are already loaded is also the only reading that cannot
   * disagree with what the page goes on to render.
   */
  const hasCatalogue = featured.length > 0 || hardware.length > 0;

  /*
   * The copy below deliberately names no category of goods.
   *
   * The obvious version said "licensing" or "hardware" depending on the brand's
   * segment, and it was wrong on the first brand it was tested against: VMware
   * sits under enterprise infrastructure, which also holds Dell and Synology,
   * so it announced "VMware hardware". Segment groups brands the way a buyer
   * looks for them; it is not a statement about what they manufacture, and
   * nothing in the schema is.
   *
   * Rather than add a column, or an exception list that will be wrong again the
   * next time a brand is added, the sentence simply does not make the claim.
   * "Get a quote for VMware" is true of software and hardware alike.
   */

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

      <section className="border-y border-line bg-graphite-900">
        <div className="container-page py-14 lg:py-16">
          <div className="max-w-3xl">
            <span
              aria-hidden="true"
              className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-[--radius-md] text-xl font-bold text-white"
              style={{ backgroundColor: brand.accentColor }}
            >
              {brand.name.charAt(0)}
            </span>
            <h1 className="text-3xl leading-tight text-white sm:text-[2.5rem]">{heading}</h1>
            {brand.tagline ? (
              <p className="mt-3 text-[15px] font-medium text-accent-300">{brand.tagline}</p>
            ) : null}
            <PartnerBadge brand={brand} tone="dark" className="mt-4" />

            {/*
              The issued badge beneath the words, on white.
              
              These are supplied by the publisher on a light ground and their
              programmes require them to be shown that way; the tile is what
              lets one sit on a dark hero without being altered.
            */}
            <PartnerBadgeArtwork
              brand={brand}
              height="h-11"
              className="mt-4 rounded-[--radius-md] bg-white px-3 py-2"
            />
            <p className="mt-5 text-[16px] leading-relaxed text-graphite-200">{brand.summary}</p>

            {/*
              "Browse products" only where there are products to browse.

              This button used to be unconditional, and for the thirty brands
              with no published catalogue it sent a buyer to a listing with
              nothing in it. A dead-end click is worse than no button: it reads
              as a broken site rather than as what it actually is — a supplier
              this business can source from and has not published a price list
              for. Those brands lead with the quote instead, which is the real
              next step for them anyway.
            */}
            <div className="mt-8 flex flex-wrap gap-3">
              {hasCatalogue ? (
                <>
                  <ButtonLink href={`/products?brand=${brand.slug}`}>
                    Browse {brand.name} products
                  </ButtonLink>
                  <ButtonLink href="/enquiry" variant="onDark">
                    Request pricing
                  </ButtonLink>
                </>
              ) : (
                <ButtonLink href={`/enquiry?brand=${brand.slug}`}>
                  Get a quote for {brand.name}
                </ButtonLink>
              )}
            </div>

            {hasCatalogue ? null : (
              <p className="mt-4 max-w-xl text-[14px] leading-relaxed text-graphite-300">
                There is no published catalogue for {brand.name} yet. Tell us what you need and we
                will quote it — {brand.name} is sourced and supplied on the same terms as
                everything else here.
              </p>
            )}
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

        {/*
          The manufacturer's commercial range, grouped the way it is chosen.
          Somebody arriving at Lenovo knows they want a ThinkPad and needs to
          see which ones there are; an alphabetical run of forty models across
          three families is a list, not a catalogue.

          Rendered only where the brand has hardware, so nothing appears on
          Microsoft or Adobe — and nothing appears on HP either until real
          models are imported.
        */}
        {hardware.length > 0 ? (
          <section className="border-t border-line py-14">
            <SectionHeader
              title={`${brand.name} business and commercial computers`}
              description={`${brand.name} commercial models supplied by ${config.entityName}. Quoted to your configuration and quantity — hardware is not listed at a price.`}
              as="h2"
              action={
                <ButtonLink href={`/hardware?brand=${brand.slug}`} variant="outline" size="sm">
                  All {brand.name} hardware
                </ButtonLink>
              }
            />
            <div className="space-y-12">
              {hardware.map((family) => (
                <div key={family.family}>
                  <h3 className="text-subsection font-semibold text-graphite-900">
                    {FAMILY_LABELS[family.family]}
                  </h3>
                  <div className="mt-6 space-y-10">
                    {family.series.map((series) => (
                      <div key={series.name}>
                        <h4 className="mb-4 text-label font-semibold uppercase tracking-[0.1em] text-ink-500">
                          {series.name}
                        </h4>
                        <ProductGrid products={series.items} />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-10 rounded-[--radius-lg] border border-line bg-surface-muted p-6">
              <h3 className="text-[1.125rem]">Request a {brand.name} quote</h3>
              <p className="mt-2 max-w-2xl text-meta leading-relaxed text-ink-600">
                Volume requirements, standard-build configurations and staged delivery are handled
                on one quotation, alongside any licensing that goes on the devices.
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <ButtonLink href="/enquiry">Request enterprise quote</ButtonLink>
                <ButtonLink href="/contact" variant="outline">
                  Talk to a specialist
                </ButtonLink>
              </div>
            </div>
          </section>
        ) : null}

        {categories.length > 0 ? (
          <section className="border-t border-line py-14">
            <SectionHeader
              title={`${brand.name} product categories`}
              description="Where this brand's products sit in the catalogue."
              as="h2"
            />
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {categories.map((category) => (
                <li key={category.slug}>
                  <Link
                    href={`/products?brand=${brand.slug}&category=${category.slug}`}
                    className="group flex h-full flex-col rounded-[--radius-lg] border border-line bg-white p-5 transition-colors hover:border-graphite-300"
                  >
                    <span className="text-[15px] font-semibold text-graphite-900 group-hover:text-accent-700">
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
            /* Fourth instance. "Procurement" is true for a licence and a laptop alike. */
            description={`How ${brand.name} procurement is handled at organisational scale.`}
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
                <h3 className="text-[15px] font-semibold text-graphite-900">{item.title}</h3>
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
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        {quotes.length > 0 ? (
          <section className="border-t border-line py-14">
            <Testimonials
              items={quotes}
              heading={`What customers say about ${brand.name} through us`}
              description="Published with their permission."
            />
          </section>
        ) : null}

        {brand.faqs.length > 0 ? (
          <section id="faq" className="max-w-3xl scroll-mt-32 border-t border-line py-14">
            {/*
              Third instance of the same wrong claim, found after the title and
              the heading had both been fixed. "Lenovo licensing questions" is
              about a thing that does not exist, and a corrected claim survives
              in exactly this kind of place — a heading nobody thinks of as a
              claim. Neutral wording, so it cannot be wrong for any brand.
            */}
            <SectionHeader title={`${brand.name} questions`} as="h2" className="mb-6" />
            <FaqList items={brand.faqs.map((faq) => ({ question: faq.question, answer: faq.answer }))} />
          </section>
        ) : null}

        <section className="rounded-[--radius-lg] bg-graphite-900 p-8 sm:p-10">
          <h2 className="text-[1.6rem] text-white">Get {brand.name} pricing</h2>
          <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-graphite-200">
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

      {/*
       * The same six products the "Featured" section above already shows —
       * never the full catalogue. ItemList is meant for a small, curated set;
       * asserting it over every product a brand carries would be a listing
       * page's job, not this one's, and this page does not fetch that list.
       */}
      {featured.length > 0 ? (
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@type": "ItemList",
            name: `Featured ${brand.name} products`,
            itemListElement: featured.map((product, index) => ({
              "@type": "ListItem",
              position: index + 1,
              url: absoluteUrl(`/products/${product.slug}`),
              name: product.name,
            })),
          }}
        />
      ) : null}
    </div>
  );
}
