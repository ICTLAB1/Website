import Link from "next/link";

import { Breadcrumb } from "@/components/ui/breadcrumb";
import { FaqList } from "@/components/ui/accordion";
import { ButtonLink } from "@/components/ui/button";
import { QuickEnquiry } from "@/components/enquiry/quick-enquiry";
import { DIRECT_PURCHASE_ENABLED, isQuoteOnly } from "@/lib/catalogue/quote-only";
import { isDirectlyPurchasable } from "@/lib/catalogue/audience";
import { PLANS_UPDATED, type PlansPage } from "@/lib/content/plans";
import { prisma } from "@/lib/db";
import { effectivePriceMinor, formatMoney, gstAmountMinor } from "@/lib/money";
import { resolvePriceTokens } from "@/lib/price-tokens";
import { productListSelect, type ProductListItem } from "@/lib/queries/catalogue";
import { JsonLd, absoluteUrl } from "@/lib/seo";
import { formatDate } from "@/lib/utils";

/**
 * A plans-and-pricing page: each plan as a card with its price, what it includes and
 * how to buy it, in the groups a buyer chooses between.
 *
 * The price on a card is the cheapest public variant's, with the term that variant is
 * sold for; "what it includes" is the product's own feature list. Neither is typed here.
 */
type Card = ProductListItem & { features: string[] };

function termLabel(months: number | null): string {
  if (months == null) return "one-time";
  if (months === 1) return "per month";
  if (months === 12) return "per year";
  if (months % 12 === 0) return `for ${months / 12} years`;
  return `for ${months} months`;
}

function PlanCard({ product }: { product: Card }) {
  const quoteOnly = isQuoteOnly(product);
  const priced = product.variants
    .map((variant) => ({ variant, price: effectivePriceMinor(variant.listPriceMinor, variant.salePriceMinor) }))
    .filter((entry) => entry.price > 0)
    .sort((a, b) => a.price - b.price);
  const best = quoteOnly ? undefined : priced[0];
  const gst = best ? gstAmountMinor(best.price, best.variant.gstRatePercent) : 0;
  const canBuy =
    DIRECT_PURCHASE_ENABLED &&
    best != null &&
    product.purchaseMode !== "ENQUIRY" &&
    isDirectlyPurchasable(best.variant.audience);

  return (
    <li className="flex flex-col rounded-(--radius-lg) border border-line bg-white p-6">
      <h3 className="text-[1.2rem] font-bold text-graphite-900">{product.name}</h3>
      <p className="mt-2 min-h-[3.5rem] text-[14px] leading-relaxed text-ink-600">{product.shortDescription}</p>

      <div className="mt-4 border-t border-line pt-4">
        {best ? (
          <>
            <p>
              <span className="text-[1.9rem] font-bold text-graphite-900">{formatMoney(best.price)}</span>
              <span className="ml-1.5 text-[14px] text-ink-600">per user {termLabel(best.variant.termMonths)}</span>
            </p>
            <p className="text-meta text-ink-500">
              excl. GST · {formatMoney(best.price + gst)} incl. {best.variant.gstRatePercent}% GST
            </p>
          </>
        ) : (
          <p>
            <span className="text-[1.3rem] font-bold text-graphite-900">Get today&apos;s price</span>
            <span className="block text-meta text-ink-500">Quoted on a written quotation</span>
          </p>
        )}
      </div>

      <div className="mt-4 flex flex-col gap-2">
        {canBuy ? (
          <ButtonLink href={`/buy?sku=${encodeURIComponent(best!.variant.sku)}`}>Buy now</ButtonLink>
        ) : (
          <ButtonLink href="/enquiry">Get a quote</ButtonLink>
        )}
        <ButtonLink href={`/products/${product.slug}`} variant="outline">
          View details
        </ButtonLink>
      </div>

      {product.features.length > 0 ? (
        <ul className="mt-5 space-y-2 border-t border-line pt-4 text-[14px] leading-snug text-ink-700">
          {product.features.slice(0, 6).map((feature) => (
            <li key={feature} className="flex gap-2">
              <span aria-hidden="true" className="mt-0.5 text-accent-700">✓</span>
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </li>
  );
}

export async function PlansPricingPage({ page }: { page: PlansPage }) {
  const slugs = page.groups.flatMap((group) => group.slugs);
  const rows = await prisma.product.findMany({
    where: { slug: { in: slugs }, status: "ACTIVE", deletedAt: null },
    select: { ...productListSelect, features: true },
  });
  const bySlug = new Map(rows.map((row) => [row.slug, row as Card]));

  const faqAnswers = await resolvePriceTokens(page.faqs.map((faq) => faq.answer));
  const faqs = page.faqs.map((faq, index) => ({ ...faq, answer: faqAnswers[index]! }));
  const url = absoluteUrl(`/${page.slug}`);
  const shown = slugs.map((slug) => bySlug.get(slug)).filter((product): product is Card => Boolean(product));

  return (
    <div className="container-page pb-16">
      <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "Products", href: "/products" }, { label: page.breadcrumb }]} />

      <header className="max-w-3xl">
        <h1 className="text-3xl leading-tight sm:text-[2.4rem]">{page.h1}</h1>
        <p className="mt-3 text-meta text-ink-500">
          Last updated <time dateTime={PLANS_UPDATED}>{formatDate(new Date(PLANS_UPDATED))}</time>
        </p>
        <p className="mt-5 text-[17px] leading-relaxed text-ink-700">{page.intro}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <ButtonLink href="/enquiry">Get a quotation</ButtonLink>
          <ButtonLink href={page.related[0]?.href ?? "/products"} variant="outline">
            {page.related[0]?.label ?? "All products"}
          </ButtonLink>
        </div>
      </header>

      {page.groups.map((group) => {
        const cards = group.slugs.map((slug) => bySlug.get(slug)).filter((product): product is Card => Boolean(product));
        if (cards.length === 0) return null;
        return (
          <section key={group.heading} className="mt-14" aria-labelledby={`group-${group.slugs[0]}`}>
            <h2 id={`group-${group.slugs[0]}`} className="text-[1.7rem] font-bold text-graphite-900">
              {group.heading}
            </h2>
            <p className="mt-1 max-w-3xl text-[15px] text-ink-600">{group.blurb}</p>
            <ul className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {cards.map((product) => (
                <PlanCard key={product.slug} product={product} />
              ))}
            </ul>
          </section>
        );
      })}

      <section className="mt-16 max-w-4xl" aria-labelledby="which-plan">
        <h2 id="which-plan" className="text-[1.7rem] font-bold text-graphite-900">
          Which one is right for you
        </h2>
        <dl className="mt-5 grid gap-4 sm:grid-cols-3">
          {page.choose.map((item) => (
            <div key={item.heading} className="rounded-(--radius-lg) border border-line bg-surface-muted p-5">
              <dt className="text-[15px] font-semibold text-graphite-900">{item.heading}</dt>
              <dd className="mt-2 text-[14px] leading-relaxed text-ink-600">{item.body}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-4 text-[14px] text-ink-600">
          Prices are tentative, exclude GST, and are confirmed on a written quotation that takes account of your quantity and
          licensing programme.
        </p>
      </section>

      <section id="faq" className="mt-16 max-w-3xl scroll-mt-32">
        <h2 className="mb-6 text-[1.7rem] font-bold text-graphite-900">Frequently asked questions</h2>
        <FaqList url={url} items={faqs.map((faq) => ({ question: faq.question, answer: faq.answer }))} />
      </section>

      <section className="mt-14 max-w-3xl">
        <h2 className="text-[1.3rem] font-bold text-graphite-900">Keep reading</h2>
        <ul className="prose-content mt-3 text-[16px]">
          {page.related.map((link) => (
            <li key={link.href}>
              <Link href={link.href}>{link.label}</Link>
            </li>
          ))}
        </ul>
      </section>

      <QuickEnquiry contained={false} subject={page.h1} source="category_page" heading="Get a quotation" />

      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "ItemList",
          name: page.h1,
          itemListElement: shown.map((product, index) => ({
            "@type": "ListItem",
            position: index + 1,
            url: absoluteUrl(`/products/${product.slug}`),
            name: product.name,
          })),
        }}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "WebPage",
          name: page.h1,
          url,
          dateModified: PLANS_UPDATED,
        }}
      />
    </div>
  );
}
