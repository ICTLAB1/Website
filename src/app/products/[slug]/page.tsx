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
import { getProductBySlug, getRelatedProducts, getAllProductSlugs } from "@/lib/queries/catalogue";
import { effectivePriceMinor } from "@/lib/money";
import { absoluteUrl, buildMetadata, JsonLd } from "@/lib/seo";
import { getSiteConfig } from "@/lib/site-config";
import { prerenderParams } from "@/lib/queries/prerender";

type PageProps = { params: Promise<{ slug: string }> };

/** Pre-renders the catalogue's route params; unknown slugs still resolve at request time. */
export async function generateStaticParams() {
  return prerenderParams("products/[slug]", async () => {
    const products = await getAllProductSlugs();
    return products.map((product) => ({ slug: product.slug }));
  });
}

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
    title: `${product.name} — ${product.brand.name} Licensing`,
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
  const config = getSiteConfig();

  const defaultVariant = product.variants[0];
  const lowestPrice = product.variants
    .map((variant) => effectivePriceMinor(variant.listPriceMinor, variant.salePriceMinor))
    .filter((price) => price > 0)
    .sort((a, b) => a - b)[0];

  const parentCategory = product.category.parent;

  const productSchema = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.shortDescription,
    sku: defaultVariant?.sku,
    category: product.category.name,
    brand: { "@type": "Brand", name: product.brand.name },
    url: absoluteUrl(`/products/${product.slug}`),
    ...(lowestPrice
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
          <p className="mt-4 max-w-2xl text-[16px] leading-relaxed text-ink-600">
            {product.shortDescription}
          </p>

          {/* Visual identity without reproducing vendor artwork: the product's
              own initial on the vendor's accent colour. */}
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
                  label: "Features",
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
                {
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
                },
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
          <VariantSelector
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
            }))}
            productName={product.name}
            productSlug={product.slug}
            brandName={product.brand.name}
            purchaseMode={product.purchaseMode}
          />
        </aside>
      </div>

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
            description={`Other licensing in ${product.category.name} and from ${product.brand.name}.`}
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
