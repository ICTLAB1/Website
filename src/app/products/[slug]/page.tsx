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
import { RepresentativeImageNotice } from "@/components/catalogue/representative-image-notice";
import { SpecTable } from "@/components/catalogue/spec-table";
import { ConfigurationTable } from "@/components/catalogue/configuration-table";
import { HardwareQuotePanel } from "@/components/catalogue/hardware-quote-panel";
import { hardwareClassLabel, hardwareTitle, isHardware } from "@/lib/catalogue/hardware";
import { isQuoteOnly } from "@/lib/catalogue/quote-only";
import { resolveProductPhoto } from "@/lib/representative-image";
import { getProductBySlug, getRelatedProducts } from "@/lib/queries/catalogue";
import { effectivePriceMinor } from "@/lib/money";
import { absoluteUrl, buildMetadata, JsonLd } from "@/lib/seo";
import { metaDescription } from "@/lib/seo-description";
import { productRating, productReviews } from "@/lib/queries/reviews";
import { mayPublishAggregateRating, MAX_RATING, MIN_RATING } from "@/lib/reviews";
import { ReviewList } from "@/components/reviews/review-list";
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

  const seoTitle = product.seoTitle?.trim();

  return buildMetadata({
    // An authored title is the whole string; the layout's `%s | TechZoid`
    // template must not append to something already composed to fit.
    absoluteTitle: Boolean(seoTitle),
    // Just the product name. It used to append "— {Brand} Licensing", which
    // repeated a word already inside almost every name ("Adobe Acrobat Pro for
    // Teams") and pushed the title past what a search result will show.
    //
    // Hardware gets one qualifier, because the name alone does not say what the
    // thing is: "HP EliteBook 840" means nothing to a search engine, and
    // "Commercial laptop" is what somebody typed into it.
    //
    // Unless the name has already said it. "HP Z8 Fury G5 Tower Workstation —
    // Desktop workstation" and "HP ProOne 440 G9 All-in-One — Commercial
    // all-in-one" repeat the noun back at the reader inside sixty characters of
    // a search result, which is the one place there is no room to.
    /*
     * The override first, where somebody has written one.
     *
     * A name is what the product is called and belongs in the heading and on
     * the card. A title is what a search result shows, and the two are not the
     * same job: "Autodesk Civil 3D" tells a person searching "civil 3d licence
     * price" nothing about why this result rather than the next one. Null on
     * almost every row, which keeps the derived title below.
     */
    title: seoTitle
      ? seoTitle
      : product.formFactor
        ? hardwareTitle(product.name, product.formFactor)
        : product.name,
    /*
     * A short description reads well under a heading and badly in a search
     * result, where a third of a line looks like a page with nothing on it.
     * Where the record's own sentence is under seventy characters this adds a
     * second one about how the business sells — the same on every page, stated
     * across the site already, and never anything specific to the product that
     * the record does not itself say.
     */
    description: product.seoDescription?.trim()
      ? product.seoDescription.trim()
      : metaDescription(
      product.shortDescription,
      `Supplied by TechZoid on a single quotation with GST invoicing, alongside your other ${product.brand.name} purchasing.`,
      "Supplied by TechZoid on a single quotation, with GST invoicing and one purchase order across brands.",
      "Quoted by TechZoid with GST invoicing, on one purchase order with the rest of your software.",
      // Short enough to fit behind a long description. Without it the three
      // above are all too long for a base in the nineties, and the page keeps
      // a stub — which is how `adobe-acrobat-standard-teams` sat at 68
      // characters while a rule designed to lengthen it ran on every request.
      `Quoted by TechZoid with GST invoicing on one purchase order.`,
    ),
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
  const [reviews, rating] = await Promise.all([
    productReviews(product.slug),
    productRating(product.slug),
  ]);

  const defaultVariant = product.variants[0];
  const pricedVariants = product.variants.filter((variant) => variant.listPriceMinor > 0);
  const variantPrices = product.variants
    .map((variant) => effectivePriceMinor(variant.listPriceMinor, variant.salePriceMinor))
    .filter((price) => price > 0)
    .sort((a, b) => a - b);
  const lowestPrice = variantPrices[0];
  const highestPrice = variantPrices[variantPrices.length - 1];

  /**
   * What a figure in the structured data actually means.
   *
   * Every human-facing surface on this site states the basis of a price: the
   * product page says "Tentative price, excluding GST — subject to
   * confirmation" and names the commitment and the term beside each SKU, the
   * catalogue cards say "+ GST (18%) · per seat", and the price filter is
   * labelled "Price (excl. GST)". The structured data said none of it. It
   * emitted a bare number, which a search engine is entitled to read as the
   * price a buyer pays — 18% under the real one, for an unstated quantity,
   * over an unstated term.
   *
   * `UnitPriceSpecification` is the property for exactly this, and every value
   * here is read off the variant rather than assumed: `valueAddedTaxIncluded`
   * from the fact that `gstRatePercent` is applied on top, the reference
   * quantity from `seats`, the billing period from `termMonths`. A perpetual
   * licence has no `termMonths` and gets no billing period, rather than a
   * default that would describe it as a subscription.
   */
  const priceSpecification = (variant: {
    currency: string;
    listPriceMinor: number;
    salePriceMinor: number | null;
    seats: number;
    termMonths: number | null;
  }) => ({
    "@type": "UnitPriceSpecification",
    price: (effectivePriceMinor(variant.listPriceMinor, variant.salePriceMinor) / 100).toFixed(2),
    priceCurrency: variant.currency,
    // GST is added on the invoice, never included in a listed figure.
    valueAddedTaxIncluded: false,
    referenceQuantity: {
      "@type": "QuantitativeValue",
      value: variant.seats,
      // C62: "one", the UN/CEFACT code for a dimensionless count.
      unitCode: "C62",
      unitText: variant.seats === 1 ? "user" : "users",
    },
    ...(variant.termMonths ? { billingDuration: `P${variant.termMonths}M` } : {}),
  });

  /*
   * The one `Availability` this product has, in schema.org's vocabulary.
   *
   * There is no per-variant stock state in the catalogue — `availability`
   * lives on `Product`, not `ProductVariant` — so every nested offer below
   * states the same value the parent `AggregateOffer` already did rather than
   * inventing a distinction the data does not draw.
   */
  const schemaAvailability =
    product.availability === "IN_STOCK"
      ? "https://schema.org/InStock"
      : product.availability === "DISCONTINUED"
        ? "https://schema.org/Discontinued"
        : "https://schema.org/PreOrder";

  const parentCategory = product.category.parent;
  const hardware = isHardware(product);

  /*
   * The product's own FAQs, or the brand's as a fallback — never both.
   *
   * Mixing them would put an answer about the programme beside an answer about
   * this model under one heading, and a reader cannot tell which is which. The
   * heading below names the brand when these are the brand's.
   */
  const faqs = product.faqs.length > 0 ? product.faqs : product.brand.faqs;

  /*
   * Asked of the same resolver the picture uses, so the notice appears exactly
   * when the illustration does. Deriving it a second way here — "no imageUrl",
   * say — is how a page ends up with a caveat over a real photograph, or worse,
   * an illustration with nothing said about it.
   */
  const photo = resolveProductPhoto(product);
  const showsRepresentativeImage = photo.representative;

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
     * The photograph, and only a photograph.
     *
     * `image` is a required property of Google's Product type — without it the
     * page gets no product rich result at all, so no picture, no price and no
     * availability beside the result. Which makes it tempting to put the
     * category illustration here, and that is exactly what must not happen:
     * `image` in this block asserts "this is a picture of this product", which
     * is the claim the representative-image disclaimer three lines up exists
     * to deny. Saying it to a customer and unsaying it to a crawler is worse
     * than saying nothing.
     *
     * So a real photograph is declared and an illustration is not, and the
     * rich result arrives when the photograph does.
     */
    /*
     * Hardware only, now that software carries an application icon.
     *
     * Setting `imageUrl` on the Adobe products made this declare the icon as
     * the product's image, and `verify:seo` caught what that meant: the page
     * announced a photograph to a search engine and showed none, because the
     * photo frame is drawn for hardware. The surfaces disagreed.
     *
     * Rendering the icon fixes half of it and not the right half. `image` on
     * a Product means a picture of the product, and Google wants one large
     * enough to put beside a result — these marks are 18 to 40 pixels square,
     * cut from a screenshot. Declaring one is a poor rich result at best and a
     * rejected one at worst, and it is not what the property is for. The icon
     * is shown to a reader, who can see what it is, and withheld from the
     * markup, which cannot.
     */
    ...(photo.src && !photo.representative && hardware ? { image: absoluteUrl(photo.src) } : {}),
    /*
     * The manufacturer's own part number, where the catalogue holds one.
     *
     * `mpn` is one of the global identifiers Google accepts in place of a GTIN,
     * and it is the only one this business can ever legitimately supply: a GTIN
     * is assigned by GS1 to the manufacturer, not to a reseller, and a licence
     * for downloadable software has none at all.
     *
     * `partNumber` is the manufacturer's, taken from their line card — never
     * TechZoid's internal SKU, which is `ProductVariant.sku` and deliberately
     * not published here. Absent where no part number is recorded, because an
     * invented identifier is worse than a missing one: Google matches products
     * across merchants on it, and a wrong value attaches this listing to
     * somebody else's product.
     */
    ...(product.partNumber?.trim() ? { mpn: product.partNumber.trim() } : {}),
    /*
     * `manufacturer`, for hardware only.
     *
     * On a workstation the brand and the manufacturer are the same company and
     * saying so is useful. On a software licence they are not reliably the
     * same thing — the publisher licenses it, somebody else may distribute it —
     * and asserting one would be stating something this catalogue does not
     * actually record.
     */
    ...(hardware ? { manufacturer: { "@type": "Organization", name: product.brand.name } } : {}),
    /*
     * An offer wherever there is a price, and `isQuoteOnly` is the one question
     * asked.
     *
     * This used to exclude hardware by name, on the reasoning that hardware is
     * quoted and never listed at a price. That stopped being true when the
     * business asked for a price on every listing: the exclusion would have
     * left a hardware page showing a figure to a shopper and none to a search
     * engine, which is the surfaces disagreeing with each other — the thing
     * the rest of this block exists to prevent.
     *
     * `lowestPrice` and `isQuoteOnly` together already say everything the
     * excluded term said: no price, no offer. Nothing here may default a
     * missing price to zero, which reads as free.
     */
    /*
     * The offer matches what the page itself shows: a price on a software
     * product with one, none on hardware or an enquiry-only row. Structured
     * data is the one surface nobody thinks to check by eye, so it is asked
     * the same `isQuoteOnly` question as the visible price rather than a
     * separate rule that could quietly disagree with it.
     */
    ...(lowestPrice && !isQuoteOnly(product)
      ? {
          offers: {
            "@type": "AggregateOffer",
            priceCurrency: defaultVariant?.currency ?? "INR",
            lowPrice: (lowestPrice / 100).toFixed(2),
            /*
             * `highPrice` as well, where the variants differ.
             *
             * Without it an aggregate of three commitments — ₹1,100 billed
             * monthly, ₹11,800 billed yearly — presents as the single figure
             * ₹1,100, which is the cheapest line on the page read as the price
             * of the product. A range is what the page shows and a range is
             * what this is; omitted where every variant costs the same, since
             * `lowPrice` alone already says it.
             */
            ...(highestPrice && highestPrice !== lowestPrice
              ? { highPrice: (highestPrice / 100).toFixed(2) }
              : {}),
            // The basis the range is quoted on, stated once for the aggregate.
            valueAddedTaxIncluded: false,
            offerCount: pricedVariants.length,
            availability: schemaAvailability,
            seller: { "@type": "Organization", name: config.entityName },
            /*
             * Every priced variant, named by its own SKU.
             *
             * `AggregateOffer.offers` is the schema.org property for exactly
             * this — the individual Offers an aggregate summarises — and until
             * now nothing populated it, so a licence with three terms (say,
             * monthly, annual and triennial) surfaced as one undifferentiated
             * price range with no way for a crawler to tell the SKUs apart.
             * `product.variants` here is already the publicly-visible set
             * (`publicVariantWhere`, applied in the query this page reads),
             * so nothing gated behind a quote or an eligibility check reaches
             * this block.
             */
            offers: pricedVariants.map((variant) => ({
              "@type": "Offer",
              sku: variant.sku,
              name: variant.name,
              price: (
                effectivePriceMinor(variant.listPriceMinor, variant.salePriceMinor) / 100
              ).toFixed(2),
              priceCurrency: variant.currency,
              availability: schemaAvailability,
              /*
               * The same figure again, with its basis attached. `price` stays
               * because Google reads it; the specification is what says the
               * number excludes GST, covers this many users, and runs for this
               * long — which is what the page says beside the SKU and what the
               * markup used to leave out.
               */
              priceSpecification: priceSpecification(variant),
            })),
          },
        }
      : {}),
    /*
     * `aggregateRating`, and only when there is something to aggregate.
     *
     * Review markup is the most abused structured data on the web, and search
     * engines police it in proportion: stars on a page with no visible reviews,
     * or reviews a business wrote about itself, cost a domain its rich results
     * and sometimes more than that. Three things have to hold before this is
     * emitted, and all three are enforced rather than assumed —
     *
     *   the reviews are APPROVED, which `productRating` requires;
     *   each one traces to an order placed by the account that wrote it, which
     *     `submitReview` establishes and the schema's non-null `orderId` keeps;
     *   they are rendered on this page, immediately below, so a reader can
     *     check the number against the reviews it came from.
     *
     * `mayPublishAggregateRating` is the gate. It says no on zero reviews,
     * which is the case this exists for: an empty `aggregateRating` with a
     * `ratingValue` of 0 is a product advertised to Google as universally
     * disliked.
     */
    ...(mayPublishAggregateRating(rating) && rating.average !== null
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: rating.average,
            reviewCount: rating.count,
            bestRating: MAX_RATING,
            worstRating: MIN_RATING,
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
            {/*
              Stock language is for things that have stock.

              "In Stock" on an annual AutoCAD subscription says the licence is
              sitting on a shelf, which is not a thing a licence does — and on a
              site selling to procurement officers it reads as a delivery
              promise nobody made. The colour is unchanged, because the meaning
              is unchanged: it is available. Only the noun was wrong.
            */}
            <StatusBadge
              status={product.availability}
              label={
                product.availability === "IN_STOCK" && !hardware
                  ? "Available to order"
                  : undefined
              }
            />
            {product.featured ? <Badge tone="brand">Featured</Badge> : null}
          </div>

          {/*
            The application mark beside the name, for a licence.
            
            Hardware has a photograph further down the page; software had
            nothing at all, so a product page opened with a line of text where
            the publisher's own catalogue opens with a recognisable icon. It is
            decorative here in the strict sense — the name is right beside it
            and says the same thing — so it carries an empty alt and is not
            announced twice.
          */}
          <div className="mt-3 flex items-start gap-3">
            {!hardware && product.imageUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={product.imageUrl}
                alt=""
                className="mt-1.5 h-8 w-8 shrink-0 rounded-md object-contain sm:mt-2"
                loading="eager"
                decoding="async"
              />
            ) : null}
            <h1 className="text-3xl leading-tight sm:text-[2.35rem]">{product.name}</h1>
          </div>

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
                formFactor={product.formFactor}
                alt={product.name}
                ratio="16/10"
                sizes="(min-width: 1024px) 46rem, 92vw"
                priority
              />
              {/*
                Directly under the picture it qualifies, not at the foot of the
                page. This is the surface a buyer builds their expectation of
                the goods from, and a caveat they have to go looking for is a
                caveat they were not given.
              */}
              {showsRepresentativeImage ? (
                <RepresentativeImageNotice className="mt-4 border-t border-line pt-4" />
              ) : null}
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
                              {/* The publisher's number, or nothing — see variant-selector.tsx. */}
                              {variant.partNumber ? (
                                <span className="font-mono text-[12px] text-ink-500">
                                  {variant.partNumber}
                                </span>
                              ) : null}
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
              /*
               * The lowest recorded configuration price, or null. `lowestPrice`
               * is already computed above for the structured data, so the panel
               * and the markup cannot show different figures.
               */
              fromPriceMinor={isQuoteOnly(product) ? null : (lowestPrice ?? null)}
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
              partNumber: variant.partNumber,
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

      {/*
        The product's own answers, or the brand's where it has none.
        
        Most of the catalogue had no FAQ section at all, while the brand behind
        it had answers already written and published on the brand page. Those
        are about the thing the buyer is here to buy, so showing them is reuse
        rather than invention.

        The heading says which it is. A brand-level answer is true of the
        programme and not necessarily of this one model, and a reader who
        cannot tell the difference has been misled by the layout — so when the
        answers belong to the brand the heading names the brand, and the
        product's own answers are never mixed in with them.
      */}
      {faqs.length > 0 ? (
        <section id="faq" className="mt-16 max-w-3xl scroll-mt-32">
          <SectionHeader
            title={
              product.faqs.length > 0
                ? "Frequently asked questions"
                : `Frequently asked questions about ${product.brand.name} licensing`
            }
            as="h2"
            className="mb-6"
          />
          <FaqList items={faqs.map((faq) => ({ question: faq.question, answer: faq.answer }))} />
        </section>
      ) : null}

      {/*
        Above related products, below the FAQs. A reader who has got this far
        is deciding, and what other buyers said belongs in that decision rather
        than after the invitation to go and look at something else.
      */}
      <ReviewList reviews={reviews} summary={rating} />

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
