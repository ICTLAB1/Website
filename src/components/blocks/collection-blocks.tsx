import Link from "next/link";
import { ProductGrid } from "@/components/marketing/product-card";
import { BrandCard, BrandStrip } from "@/components/marketing/brand-card";
import { LogoBelt, type BeltItem } from "@/components/marketing/logo-belt";
import { safeBrandLogo } from "@/lib/brand-logo";
import { safeClientLogo } from "@/lib/client-logo";
import { CategoryCard } from "@/components/marketing/category-card";
import { Reveal } from "@/components/motion/reveal";
import { EmptyState } from "@/components/ui/states";
import { BlockHeading, BlockSection } from "@/components/blocks/primitives";
import { ButtonLink } from "@/components/ui/button";
import { SectionHeader } from "@/components/ui/section-header";
import { certificationLogo } from "@/lib/certification-logo";
import { effectivePriceMinor, formatTerm } from "@/lib/money";
import { showPrice, statesTaxSeparately } from "@/lib/price-display";
import { getDisplayCurrency } from "@/lib/display-currency";
import { isHardware } from "@/lib/catalogue/hardware";
import type { BlockData } from "@/lib/blocks/schemas";
import type { ProductListItem } from "@/lib/queries/catalogue";
import { formatDate } from "@/lib/utils";

/**
 * Blocks that render live database rows.
 *
 * The payload holds only a reference — slugs, or "featured" — so what appears
 * here is always the current catalogue rather than a copy taken when the page
 * was written.
 */

export function ProductGridBlock({
  data,
  products,
  tone,
}: {
  data: BlockData<"PRODUCT_GRID">;
  products: ProductListItem[];
  tone?: "plain" | "muted";
}) {
  return (
    <BlockSection tone={tone}>
      {data.action ? (
        <SectionHeader
          eyebrow={data.eyebrow}
          title={data.heading ?? "Related products"}
          description={data.description}
          action={
            <ButtonLink href={data.action.href} variant="outline" size="sm">
              {data.action.label}
            </ButtonLink>
          }
        />
      ) : (
        <BlockHeading eyebrow={data.eyebrow} heading={data.heading} description={data.description} />
      )}
      {products.length === 0 ? (
        // A referenced product may have been archived since the page was
        // written. Say so plainly rather than rendering an empty grid.
        <EmptyState
          title="No products to show"
          description="The products referenced by this section are not currently available."
        />
      ) : (
        <ProductGrid products={products} />
      )}
    </BlockSection>
  );
}

/**
 * Two or three products side by side, priced, with nothing to click but a link.
 *
 * ## Why this is not a product grid
 *
 * A grid is a buying surface. Every card on it carries an Add to Enquiry
 * button, and a card whose variant has a sale price renders a discount badge
 * with the list price struck through. Put a competitor in one — which the Zoho
 * Workplace page did, to argue that Zoho costs less — and the competitor gets
 * the only promotional badge on the page. The layout ends up arguing against
 * the copy.
 *
 * So: no purchase action, no badge, no strike-through. A reader can follow a
 * name to its own page and buy it there if that is what they want, which is the
 * honest amount of friction for something named as the alternative.
 *
 * ## The figures
 *
 * Read from the catalogue at render time, never typed into the page. A number
 * written into content is wrong the day a price list is imported, and this site
 * imports several thousand rows at a time.
 *
 * It is the *effective* price on both sides — what a buyer would actually pay,
 * sale included. Comparing your own selling price against a competitor's list
 * price while quietly selling that competitor cheaper is a comparison that
 * flatters itself, and the badge being gone is not a licence to quote the
 * higher number.
 *
 * The quote-only rule is the grid's, unchanged: hardware, an absent variant, a
 * zero price and an enquiry-only product all decline to show a figure. This is
 * the one place a price could otherwise escape the catalogue's own rules by
 * being rendered somewhere new.
 */
export async function PriceComparisonBlock({
  data,
  products,
  tone,
}: {
  data: BlockData<"PRICE_COMPARISON">;
  products: ProductListItem[];
  tone?: "plain" | "muted";
}) {
  const display = await getDisplayCurrency();

  return (
    <BlockSection tone={tone}>
      <BlockHeading eyebrow={data.eyebrow} heading={data.heading} description={data.description} />

      {products.length < 2 ? (
        /*
         * One column is not a comparison. A named product may have been
         * archived since the page was written, and half a comparison makes a
         * claim the author did not — so the section says nothing instead.
         */
        <EmptyState
          title="Nothing to compare"
          description="The products referenced by this section are not currently available."
        />
      ) : (
        <>
          <Reveal className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((product) => {
              const variant = product.variants[0];
              const price = variant
                ? effectivePriceMinor(variant.listPriceMinor, variant.salePriceMinor)
                : 0;
              const quoteOnly =
                isHardware(product) ||
                !variant ||
                price <= 0 ||
                product.purchaseMode === "ENQUIRY";
              const ours = product.slug === data.ourSlug;

              return (
                <div
                  key={product.id}
                  className={
                    ours
                      ? "flex flex-col rounded-[--radius-lg] border-2 border-accent-600 bg-white p-5"
                      : "flex flex-col rounded-[--radius-lg] border border-line bg-white p-5"
                  }
                >
                  <p className="text-label uppercase tracking-[0.12em] text-ink-500">
                    {product.brand.name}
                  </p>
                  <h3 className="mt-1 text-body font-semibold text-graphite-900">{product.name}</h3>

                  <div className="mt-4">
                    {quoteOnly ? (
                      <p className="text-lead font-semibold text-graphite-900">On enquiry</p>
                    ) : (
                      <>
                        <p className="text-lead font-semibold text-graphite-900">
                          {showPrice(price, variant.gstRatePercent, display)}
                        </p>
                        <p className="mt-1 text-label text-ink-500">
                          {formatTerm(variant.termMonths)}
                          {statesTaxSeparately(display)
                            ? `, excl. GST (${variant.gstRatePercent}%)`
                            : ""}
                        </p>
                      </>
                    )}
                  </div>

                  {/*
                    A link, not a button. The alternative is named to be
                    understood, not sold from here — and the subject of the
                    comparison has its own grid above this one to be bought from.
                  */}
                  <Link
                    href={`/products/${product.slug}`}
                    className="underline-grow mt-auto pt-4 text-meta font-medium text-accent-700"
                  >
                    View details
                  </Link>
                </div>
              );
            })}
          </Reveal>

          {data.note ? <p className="mt-4 text-meta text-ink-500">{data.note}</p> : null}
        </>
      )}
    </BlockSection>
  );
}

type BrandRow = {
  slug: string;
  name: string;
  tagline: string | null;
  accentColor: string;
  logoUrl: string | null;
  _count: { products: number };
};
/**
 * What the marquee's resolver selects — narrower than `BrandRow`, and its own
 * type rather than a `Pick` of it, because it is a different query. A belt
 * needs a name, a mark and somewhere to go; asking for a tagline and a product
 * count it will not print would be reading columns to throw them away.
 */
type BeltBrandRow = {
  slug: string;
  name: string;
  accentColor: string;
  logoUrl: string | null;
};

/** What `publishedClientLogos` returns, of which the belt uses three fields. */
type ClientLogoRow = {
  name: string;
  logoUrl: string | null;
  website: string | null;
  sector: string | null;
};

type CategoryRow = {
  slug: string;
  name: string;
  summary: string | null;
  icon: string | null;
  _count: { products: number };
};
type ServiceRow = { slug: string; name: string; summary: string; category: string };
type PostCategoryRow = { name: string; count: number };
type CertificationRow = {
  standard: string;
  title: string;
  reference: string;
  issuer: string;
  verifyUrl: string | null;
  scope: string | null;
  issuedAt: Date;
  expiresAt: Date | null;
};

/**
 * A certification, stated so it can be checked.
 *
 * The certificate number, the body that issued it and the verification address
 * are all on the card. A badge saying "ISO 27001 certified" with nothing behind
 * it is a claim; this is the same claim with the means to disprove it, which is
 * the only version worth making to a procurement officer.
 *
 * The expiry is shown for the same reason. A certificate is a statement about a
 * period, and a reader who cannot see the period has to assume it is current —
 * which is exactly the assumption that goes wrong.
 */
function CertificationCard({ certification }: { certification: CertificationRow }) {
  const seal = certificationLogo(certification.standard);

  return (
    <div className="flex h-full flex-col rounded-[--radius-lg] border border-line bg-white p-5">
      {/*
        The seal above the title, not instead of it and not beside it.

        This card carried a badge once and went back to type, because the
        artwork then was a framed wordmark that competed with every other card
        on the page and said less than the two lines it replaced. The
        certified-company seals that replaced it are round, unframed and read
        at a glance as a mark rather than as a second heading, so they are back
        — on their own line, because a seal set beside the title takes fifty
        points off the line and "Information Security Management System" then
        wraps in one card and not the others, leaving three cards whose rows no
        longer line up.
      */}
      {seal ? (
        /* Square artwork on a white card, so the dimensions are stated and
           the browser reserves the space before the file arrives. */
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={seal}
          alt=""
          aria-hidden="true"
          className="mb-3 h-11 w-11 object-contain"
          width={420}
          height={420}
          loading="lazy"
          decoding="async"
        />
      ) : null}
      <p className="text-label font-semibold uppercase tracking-[0.1em] text-accent-700">
        {certification.title}
      </p>
      <p className="mt-1.5 text-lead font-semibold leading-tight text-graphite-900">
        {certification.standard}
      </p>

      {certification.scope ? (
        <p className="clamp-3 mt-3 text-meta leading-relaxed text-ink-600">
          {certification.scope}
        </p>
      ) : null}

      <dl className="mt-4 space-y-1 border-t border-line pt-3 text-label text-ink-600">
        <div className="flex gap-2">
          <dt className="text-ink-500">Certificate</dt>
          <dd className="font-mono text-graphite-900">{certification.reference}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="text-ink-500">Issued by</dt>
          <dd className="text-graphite-900">{certification.issuer}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="text-ink-500">Valid</dt>
          <dd className="text-graphite-900">
            {formatDate(certification.issuedAt)}
            {certification.expiresAt ? ` – ${formatDate(certification.expiresAt)}` : ""}
          </dd>
        </div>
      </dl>

      {certification.verifyUrl ? (
        <p className="mt-auto pt-3">
          <a
            href={
              certification.verifyUrl.startsWith("http")
                ? certification.verifyUrl
                : `https://${certification.verifyUrl}`
            }
            target="_blank"
            rel="noreferrer noopener"
            className="text-label font-medium text-accent-700 underline underline-offset-2 hover:text-accent-800"
          >
            Verify this certificate
          </a>
        </p>
      ) : null}
    </div>
  );
}
type PostRow = {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  readMinutes: number;
  publishedAt: Date | null;
};

/**
 * The moving brand belt.
 *
 * Laid out by hand rather than through `BlockSection` because the belt has to
 * reach both edges of the window: a marquee inside a centred container has
 * visible ends, and a strip with visible ends is a list that happens to move.
 * The heading above it still sits in the page container, so it lines up with
 * every other section's heading.
 */
export function LogoMarqueeBlock({
  data,
  rows,
  tone,
}: {
  data: BlockData<"LOGO_MARQUEE">;
  rows: unknown[];
  tone?: "plain" | "muted";
}) {
  /*
   * Two sources, two directories, two rules — normalised here so the belt
   * itself takes one shape and holds no policy.
   *
   * A brand with no artwork falls back to its lettered wordmark, which is what
   * it does everywhere else on the site. A customer does not: `/clients/`
   * artwork is the only thing that may stand for a customer, and a row without
   * it never leaves `publishedClientLogos` in the first place. The filter here
   * is the second of the two, not the first.
   */
  const items: BeltItem[] =
    data.source === "clients"
      ? (rows as ClientLogoRow[])
          .map((client) => ({
            key: client.name,
            name: client.name,
            logo: safeClientLogo(client.logoUrl),
            // Not linked. A customer's mark on a supplier's page is evidence of
            // the relationship, not an advertisement for the customer, and an
            // off-site link out of a marquee is a strange thing to offer.
            href: null,
            accentColor: "#201c18",
          }))
          .filter((item) => item.logo !== null)
      : (rows as BeltBrandRow[]).map((brand) => ({
          key: brand.slug,
          name: brand.name,
          logo: safeBrandLogo(brand.logoUrl),
          href: `/brands/${brand.slug}`,
          accentColor: brand.accentColor,
        }));

  /*
   * Nothing to show, nothing rendered — not an empty band with a heading over
   * it. Every source can legitimately come back empty: no brand has artwork on
   * file yet, every slug in a manual list has since been deleted, or — the
   * common one — customer logos have been added but none has a confirmed
   * permission and a publish yet. A heading reading "Customers we work with"
   * above a blank strip is worse than the section's absence.
   */
  if (items.length === 0) return null;

  const caption = Boolean(data.heading) && !data.eyebrow && !data.description && !data.action;

  return (
    <section
      className={tone === "muted" ? "border-y border-line bg-surface-muted" : undefined}
    >
      <div className="py-12 lg:py-16">
        {caption ? (
          <p className="container-page mb-6 text-center text-label font-semibold uppercase tracking-[0.14em] text-ink-500">
            {data.heading}
          </p>
        ) : data.eyebrow || data.heading || data.description ? (
          <div className="container-page">
            {data.action ? (
              <SectionHeader
                eyebrow={data.eyebrow}
                title={data.heading ?? ""}
                description={data.description}
                action={
                  <ButtonLink href={data.action.href} variant="outline" size="sm">
                    {data.action.label}
                  </ButtonLink>
                }
              />
            ) : (
              <BlockHeading
                eyebrow={data.eyebrow}
                heading={data.heading}
                description={data.description}
              />
            )}
          </div>
        ) : null}

        <Reveal>
          <LogoBelt items={items} speed={data.speed} reverse={data.reverse} />
        </Reveal>
      </div>
    </section>
  );
}

export function CollectionGridBlock({
  data,
  rows,
  tone,
}: {
  data: BlockData<"COLLECTION_GRID">;
  rows: unknown[];
  tone?: "plain" | "muted";
}) {
  if (rows.length === 0) return null;

  // A brand strip's heading is a caption for the logos beneath it, not a
  // section title, so it is set small and centred rather than as a display
  // heading — the same treatment the page used before the content moved into
  // the CMS.
  const caption = data.kind === "brands" && data.layout === "strip" && !data.action;

  return (
    <BlockSection tone={tone}>
      {caption ? (
        data.heading ? (
          <p className="mb-6 text-center text-label font-semibold uppercase tracking-[0.14em] text-ink-500">
            {data.heading}
          </p>
        ) : null
      ) : data.action ? (
        <SectionHeader
          eyebrow={data.eyebrow}
          title={data.heading ?? ""}
          description={data.description}
          action={
            <ButtonLink href={data.action.href} variant="outline" size="sm">
              {data.action.label}
            </ButtonLink>
          }
        />
      ) : (
        <BlockHeading eyebrow={data.eyebrow} heading={data.heading} description={data.description} />
      )}

      {data.kind === "postCategories" ? (
        <Reveal as="ul" className="flex flex-wrap gap-2">
          {(rows as PostCategoryRow[]).map((category) => (
            <li key={category.name}>
              <Link
                href={`/blog?category=${encodeURIComponent(category.name)}`}
                className="lift inline-flex items-center gap-2 rounded-[--radius-md] border border-line bg-white px-4 py-2.5 text-meta font-medium text-ink-700 hover:border-graphite-300 hover:text-graphite-900"
              >
                {category.name}
                <span className="text-ink-500">{category.count}</span>
              </Link>
            </li>
          ))}
        </Reveal>
      ) : data.kind === "certifications" ? (
        <Reveal className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(rows as CertificationRow[]).map((certification) => (
            <CertificationCard key={certification.reference} certification={certification} />
          ))}
        </Reveal>
      ) : data.kind === "brands" && data.layout === "strip" ? (
        <Reveal>
          <BrandStrip brands={rows as BrandRow[]} />
        </Reveal>
      ) : data.kind === "brands" ? (
        <Reveal className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {(rows as BrandRow[]).map((brand) => (
            /*
             * The count only where there is one worth printing.
             *
             * "0 products" on a brand card says the site is unfinished. What it
             * actually means is that this business can source the brand and has
             * not published a price list for it — which the brand's own page now
             * says properly. Passing `undefined` drops the line rather than
             * printing a zero, and the card still leads somewhere useful.
             */
            <BrandCard
              key={brand.slug}
              brand={{
                ...brand,
                productCount: brand._count.products > 0 ? brand._count.products : undefined,
              }}
            />
          ))}
        </Reveal>
      ) : data.kind === "categories" ? (
        <Reveal className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {(rows as CategoryRow[]).map((category) => (
            <CategoryCard
              key={category.slug}
              category={{ ...category, count: category._count.products }}
            />
          ))}
        </Reveal>
      ) : data.kind === "services" ? (
        <Reveal className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(rows as ServiceRow[]).map((service) => (
            <Link
              key={service.slug}
              href={`/services/${service.slug}`}
              className="lift group flex flex-col rounded-[--radius-lg] border border-line bg-white p-5 hover:border-graphite-300"
            >
              <span className="text-label font-semibold uppercase tracking-[0.1em] text-accent-700">
                {service.category}
              </span>
              <span className="mt-2 text-body font-semibold text-graphite-900 group-hover:text-accent-700">
                {service.name}
              </span>
              <span className="clamp-3 mt-2 text-meta leading-relaxed text-ink-600">
                {service.summary}
              </span>
              <span className="mt-4 text-meta font-medium text-accent-700">Read more &rarr;</span>
            </Link>
          ))}
        </Reveal>
      ) : (
        <Reveal className="grid gap-4 md:grid-cols-3">
          {(rows as PostRow[]).map((post) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="lift group flex flex-col rounded-[--radius-lg] border border-line bg-white p-5 hover:border-graphite-300"
            >
              <span className="text-label font-semibold uppercase tracking-[0.1em] text-accent-700">
                {post.category}
              </span>
              <h3 className="mt-2 text-body font-semibold leading-snug text-graphite-900 group-hover:text-accent-700">
                {post.title}
              </h3>
              <p className="clamp-3 mt-2 text-meta leading-relaxed text-ink-600">{post.excerpt}</p>
              <span className="mt-4 text-label text-ink-500">
                {formatDate(post.publishedAt)} &middot; {post.readMinutes} min read
              </span>
            </Link>
          ))}
        </Reveal>
      )}
    </BlockSection>
  );
}
