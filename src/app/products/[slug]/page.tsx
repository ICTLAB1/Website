import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Tabs } from "@/components/ui/tabs";
import { FaqList } from "@/components/ui/accordion";
import { SectionHeader } from "@/components/ui/section-header";
import { ButtonLink } from "@/components/ui/button";
import { ProductGrid } from "@/components/marketing/product-card";
import { VariantSelector } from "@/components/catalogue/variant-selector";
import { ProductPhoto } from "@/components/catalogue/product-photo";
import { SpecTable } from "@/components/catalogue/spec-table";
import { ConfigurationTable } from "@/components/catalogue/configuration-table";
import { HardwareQuotePanel } from "@/components/catalogue/hardware-quote-panel";
import { hardwareClassLabel, isHardware } from "@/lib/catalogue/hardware";
import { getProductBySlug, getRelatedProducts } from "@/lib/queries/catalogue";
import { effectivePriceMinor } from "@/lib/money";
import { absoluteUrl, buildMetadata, JsonLd } from "@/lib/seo";
import { getSiteConfig } from "@/lib/site-config";
import { getDisplayCurrency } from "@/lib/display-currency";

type PageProps = { params: Promise<{ slug: string }> };

/** Pre-renders the catalogue's route params; unknown slugs still resolve at request time. */
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
  const product = await getProductBySlug(slug);
  if (!product) {
    return buildMetadata({
      title: "Product not found",
      description: "This product is no longer listed in the catalogue.",
      path: `/products/${slug}`,
      noIndex: true,
    });
  }

  return buildMetadata({
    // Just the product name. It used to append "— {Brand} Licensing", which
    // repeated a word already inside almost every name ("Adobe Acrobat Pro for
    // Teams") and pushed the title past what a search result will show.
    //
    // Hardware gets one qualifier, because the name alone does not say what the
    // thing is: "HP EliteBook 840" means nothing to a search engine, and
    // "Commercial laptop" is what somebody typed into it.
    title: product.formFactor
      ? `${product.name} — ${hardwareClassLabel(product.formFactor)}`
      : product.name,
    description: product.shortDescription,
    path: `/products/${product.slug}`,
    keywords: [...product.keywords, product.brand.name, product.name],
  });
}

export default async function ProductDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const related = await getRelatedProducts(
    product.id,
    product.categoryId,
    product.brandId,
    4,
  );
  const config = await getSiteConfig();

  const defaultVariant = product.variants[0];
  const lowestPrice = product.variants
    .map((variant) => effectivePriceMinor(variant.listPriceMinor, variant.salePriceMinor))
    .filter((price) => price > 0)
    .sort((a, b) => a - b)[0];

  const parentCategory = product.category.parent;
  const hardware = isHardware(product);

  const productSchema = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.shortDescription,
    sku: defaultVariant?.sku,
    category: product.category.name,
    brand: { "@type": "Brand", name: product.brand.name },
    url: absoluteUrl(`/products/${product.slug}`),
    /*
     * No offer on hardware, deliberately.
     *
     * Hardware is quoted, never listed at a price, so there is no figure to
     * put in an offer — and a price-bearing structured-data block is exactly
     * the thing a search engine surfaces as a number beside the result. The
     * `lowestPrice` test below would already fall through, since these rows
     * carry no price; naming the case keeps somebody from "fixing" that later
     * by defaulting it to zero, which reads as free.
     */
    ...(lowestPrice && !hardware
      ? {
          offers: {
            "@type": "AggregateOffer",
            priceCurrency: defaultVariant?.currency ?? "INR",
            lowPrice: (lowestPrice / 100).toFixed(2),
            offerCount: product.variants.filter((variant) => variant.listPriceMinor > 0).length,
            availability:
              product.availability === "IN_STOCK"
                ? "https://schema.org/InStock"
                : product.availability === "DISCONTINUED"
                  ? "https://schema.org/Discontinued"
                  : "https://schema.org/PreOrder",
            seller: { "@type": "Organization", name: config.entityName },
          },
        }
      : {}),
  };

  return (
    <div className="container-page pb-16">
      <Breadcrumb
        items={[
          { label: "Home", href: "/" },
          { label: "Products", href: "/products" },
          ...(parentCategory
            ? [{ label: parentCategory.name, href: `/products?category=${parentCategory.slug}` }]
            : []),
          { label: product.category.name, href: `/products?category=${product.category.slug}` },
          { label: product.name },
        ]}
      />

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_24rem] lg:gap-12">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/brands/${product.brand.slug}`}
              className="text-[13px] font-semibold uppercase tracking-wide text-accent-700 hover:underline"
            >
              {product.brand.name}
            </Link>
            <StatusBadge status={product.availability} />
            {product.featured ? <Badge tone="brand">Featured</Badge> : null}
          </div>

          <h1 className="mt-3 text-3xl leading-tight sm:text-[2.35rem]">{product.name}</h1>

          {hardware ? (
            <p className="mt-2 text-lead font-medium text-ink-600">
              {hardwareClassLabel(product.formFactor!)}
              {product.series ? ` · ${product.series} series` : ""}
            </p>
          ) : null}

          <p className="mt-4 max-w-2xl text-[16px] leading-relaxed text-ink-600">
            {product.shortDescription}
          </p>

          {/*
            Who sells what to whom, in one sentence, on every hardware page.
            It is the sentence the whole catalogue can be misread without: a
            page listing HP products under this company's name reads to a
            careless eye as a claim about HP. Naming the manufacturer as the
            manufacturer and this company as the supplier settles it before the
            specifications start.
          */}
          {hardware ? (
            <p className="mt-4 max-w-2xl rounded-[--radius-md] border border-line bg-surface-muted px-4 py-3 text-meta leading-relaxed text-ink-600">
              A {hardwareClassLabel(product.formFactor!).toLowerCase()} from{" "}
              <span className="font-medium text-graphite-900">{product.brand.name}</span>, supplied
              by {config.entityName}.
            </p>
          ) : null}

          {hardware ? (
            <div className="mt-8 rounded-[--radius-lg] border border-line p-6">
              <ProductPhoto
                src={product.imageUrl}
                alt={product.name}
                ratio="16/10"
                sizes="(min-width: 1024px) 46rem, 92vw"
                priority
              />
            </div>
          ) : (
            /* Visual identity without reproducing brand artwork: the product's
               own initial on the brand's accent colour. */
            <div
              className="mt-8 flex aspect-[16/7] items-center justify-center rounded-[--radius-lg] border border-line"
              style={{ backgroundColor: `${product.brand.accentColor}0d` }}
              role="img"
              aria-label={`${product.brand.name} ${product.name}`}
            >
              <div className="text-center">
                <span
                  aria-hidden="true"
                  className="mx-auto grid h-16 w-16 place-items-center rounded-[--radius-md] text-2xl font-bold text-white"
                  style={{ backgroundColor: product.brand.accentColor }}
                >
                  {product.brand.name.charAt(0)}
                </span>
                <p className="mt-4 text-[15px] font-semibold text-graphite-900">{product.name}</p>
                <p className="mt-1 text-[13px] text-ink-500">{product.brand.name}</p>
              </div>
            </div>
          )}

          <div className="mt-10">
            <Tabs
              items={[
                {
                  id: "overview",
                  label: "Overview",
                  content: (
                    <div className="prose-content max-w-3xl text-[15px]">
                      {product.description.split("\n\n").map((paragraph, index) => (
                        <p key={index}>{paragraph}</p>
                      ))}
                    </div>
                  ),
                },
                {
                  id: "features",
                  // The same list under the heading a hardware buyer is
                  // looking for. Security, manageability and durability are
                  // what separates a commercial range from a consumer one, and
                  // "Features" buries them.
                  label: hardware ? "Business features" : "Features",
                  content: (
                    <ul className="grid max-w-3xl gap-3 sm:grid-cols-2">
                      {product.features.map((feature) => (
                        <li key={feature} className="flex gap-2.5 text-[14px] leading-relaxed text-ink-700">
                          <span aria-hidden="true" className="mt-1.5 shrink-0 text-accent-700">
                            <svg width="14" height="14" viewBox="0 0 12 12" fill="currentColor">
                              <path d="M4.7 8.6 2.2 6.1l.9-.9 1.6 1.6 4-4 .9.9z" />
                            </svg>
                          </span>
                          {feature}
                        </li>
                      ))}
                    </ul>
                  ),
                },
                /*
                 * Specifications where a licence tab would be. Hardware has no
                 * licence terms, seats or renewal, and showing an empty
                 * "Licensing" tab on a laptop is the sort of detail that tells
                 * a buyer the catalogue was bolted together.
                 */
                ...(hardware
                  ? [
                      {
                        id: "configurations",
                        label: `Configurations (${product.variants.length})`,
                        content: (
                          <ConfigurationTable
                            configurations={product.variants}
                            productName={product.name}
                            productSlug={product.slug}
                            brandName={product.brand.name}
                          />
                        ),
                      },
                      {
                        id: "specifications",
                        label: "Specifications",
                        content: <SpecTable specs={product.specs} />,
                      },
                    ]
                  : []),
                ...(hardware ? [] : [{
                  id: "licensing",
                  label: "Licensing",
                  content: (
                    <div className="max-w-3xl space-y-6">
                      {product.licensingNotes ? (
                        <div className="prose-content text-[15px]">
                          {product.licensingNotes.split("\n\n").map((paragraph, index) => (
                            <p key={index}>{paragraph}</p>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[15px] text-ink-600">
                          Licensing terms for this product are confirmed in writing on the
                          quotation.
                        </p>
                      )}
                      <div className="rounded-[--radius-lg] border border-line bg-surface-muted p-5">
                        <h3 className="text-[14px] font-semibold text-graphite-900">
                          Available licence options
                        </h3>
                        <ul className="mt-3 space-y-2.5">
                          {product.variants.map((variant) => (
                            <li key={variant.sku} className="flex flex-wrap items-baseline gap-x-3 text-[13px]">
                              <span className="font-mono text-[12px] text-ink-500">{variant.sku}</span>
                              <span className="text-ink-700">{variant.name}</span>
                              <span className="text-ink-500">
                                {variant.seats > 1 ? `${variant.seats} seats per unit` : "1 seat per unit"}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ),
                }]),
                {
                  id: "compatibility",
                  label: "Compatibility",
                  content: (
                    <ul className="max-w-3xl space-y-2.5">
                      {product.compatibility.map((entry) => (
                        <li key={entry} className="flex gap-2.5 text-[14px] leading-relaxed text-ink-700">
                          <span aria-hidden="true" className="mt-1.5 shrink-0 text-ink-500">
                            <svg width="6" height="6" viewBox="0 0 6 6" fill="currentColor">
                              <circle cx="3" cy="3" r="3" />
                            </svg>
                          </span>
                          {entry}
                        </li>
                      ))}
                    </ul>
                  ),
                },
                {
                  id: "delivery",
                  label: "Delivery & support",
                  content: (
                    <div className="grid max-w-3xl gap-5 sm:grid-cols-2">
                      <div className="rounded-[--radius-lg] border border-line p-5">
                        <h3 className="text-[14px] font-semibold text-graphite-900">
                          Delivery &amp; provisioning
                        </h3>
                        <p className="mt-2 text-[14px] leading-relaxed text-ink-600">
                          {product.deliveryNotes ??
                            "Delivery timelines are confirmed on the quotation."}
                        </p>
                      </div>
                      <div className="rounded-[--radius-lg] border border-line p-5">
                        <h3 className="text-[14px] font-semibold text-graphite-900">Support</h3>
                        <p className="mt-2 text-[14px] leading-relaxed text-ink-600">
                          {product.supportNotes ??
                            "Procurement support is included. Deployment and managed support are available separately."}
                        </p>
                        {config.email.support ? (
                          <a
                            href={`mailto:${config.email.support}`}
                            className="mt-3 inline-block text-[13px] font-medium text-accent-700 hover:underline"
                          >
                            {config.email.support}
                          </a>
                        ) : null}
                      </div>
                    </div>
                  ),
                },
              ]}
            />
          </div>
        </div>

        <aside className="min-w-0 lg:sticky lg:top-32 lg:self-start">
          {hardware ? (
            <HardwareQuotePanel
              /*
               * The manufacturer's number or nothing — never the SKU.
               *
               * `sku` is this site's key, and for a build the source names no
               * number for it is a generated string like
               * `dell-poweredge-r770-c1`. Falling back to it printed that under
               * the heading "Part number", which is the site inventing a
               * manufacturer's identifier. The panel omits the row instead.
               */
              partNumber={product.partNumber ?? defaultVariant?.partNumber ?? null}
              productName={product.name}
              productSlug={product.slug}
              brandName={product.brand.name}
              supplierName={config.entityName}
            />
          ) : (
          <VariantSelector
            display={await getDisplayCurrency()}
            variants={product.variants.map((variant) => ({
              id: variant.id,
              sku: variant.sku,
              name: variant.name,
              licenceType: variant.licenceType,
              termMonths: variant.termMonths,
              seats: variant.seats,
              currency: variant.currency,
              listPriceMinor: variant.listPriceMinor,
              salePriceMinor: variant.salePriceMinor,
              gstRatePercent: variant.gstRatePercent,
              audience: variant.audience,
            }))}
            productName={product.name}
            productSlug={product.slug}
            brandName={product.brand.name}
            purchaseMode={product.purchaseMode}
          />
          )}
        </aside>
      </div>

      {/*
        The cross-sell, and the reason this catalogue is worth having.
        A buyer specifying laptops needs the licensing that goes on them, and
        this is the one moment they are thinking about it. One enquiry, one
        quotation, one purchase order is the proposition — this is where it
        stops being a slogan on the homepage and becomes a link.
      */}
      {hardware ? (
        <section className="mt-16 rounded-[--radius-lg] border border-line bg-surface-muted p-6 sm:p-8">
          <SectionHeader
            title="Complete the deployment"
            description="Devices rarely arrive alone. Licensing, security and deployment can go on the same quotation as the hardware, which means one purchase order and one invoice rather than four."
            as="h2"
            className="mb-6"
          />
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { href: "/brands/microsoft", label: "Microsoft 365 and Windows" },
              { href: "/brands/adobe", label: "Adobe Acrobat and Creative Cloud" },
              { href: "/solutions/security-compliance", label: "Endpoint security" },
              { href: "/services", label: "Deployment and support" },
            ].map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="flex h-full items-center rounded-[--radius-md] border border-line bg-white px-4 py-3 text-meta font-medium text-graphite-900 lift hover:border-graphite-300 hover:text-accent-700"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {product.faqs.length > 0 ? (
        <section id="faq" className="mt-16 max-w-3xl scroll-mt-32">
          <SectionHeader title="Frequently asked questions" as="h2" className="mb-6" />
          <FaqList items={product.faqs.map((faq) => ({ question: faq.question, answer: faq.answer }))} />
        </section>
      ) : null}

      {related.length > 0 ? (
        <section className="mt-16">
          <SectionHeader
            title="Related products"
            description={
              hardware
                ? `Other ${product.category.name.toLowerCase()} and ${product.brand.name} models.`
                : `Other licensing in ${product.category.name} and from ${product.brand.name}.`
            }
            as="h2"
            action={
              <ButtonLink href={`/products?category=${product.category.slug}`} variant="outline" size="sm">
                View category
              </ButtonLink>
            }
          />
          <ProductGrid products={related} />
        </section>
      ) : null}

      <JsonLd data={productSchema} />
    </div>
  );
}
