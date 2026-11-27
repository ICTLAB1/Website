import { RelatedGuides } from "@/components/marketing/related-guides";
import Link from "next/link";

import { prisma } from "@/lib/db";
import { AnswerBlock } from "@/components/marketing/answer-block";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { FaqList } from "@/components/ui/accordion";
import { Markdown } from "@/components/markdown";
import { ProductGrid } from "@/components/marketing/product-card";
import { QuickEnquiry } from "@/components/enquiry/quick-enquiry";
import { Table, TableWrap, Td, Th, Tr } from "@/components/ui/table";
import { JsonLd, absoluteUrl } from "@/lib/seo";
import { GUIDES_UPDATED, type CategoryGuide } from "@/lib/content/guides";
import { effectivePriceMinor, formatMoney } from "@/lib/money";
import { getProductsBySlugs } from "@/lib/queries/catalogue";
import { resolvePriceTokens } from "@/lib/price-tokens";
import { formatDate } from "@/lib/utils";

/**
 * A buying-guide page for a category of software: what it is, how to choose, every
 * product we sell in it with its price from the catalogue, and the questions
 * buyers ask. The price in the table and in the grid comes from the product's own
 * variants, never from the copy.
 */
export async function CategoryGuidePage({ guide }: { guide: CategoryGuide }) {
  const products = await getProductsBySlugs(guide.products.map((entry) => entry.slug));
  const bySlug = new Map(products.map((product) => [product.slug, product]));

  const texts = [guide.intro, ...guide.sections.map((section) => section.markdown), ...guide.faqs.map((faq) => faq.answer)];
  const resolved = await resolvePriceTokens(texts);
  const intro = resolved[0]!;
  const sections = guide.sections.map((section, index) => ({ ...section, markdown: resolved[index + 1]! }));
  const faqs = guide.faqs.map((faq, index) => ({ ...faq, answer: resolved[1 + guide.sections.length + index]! }));

  const brandRows = guide.brands && guide.brands.length > 0
    ? await prisma.brand.findMany({
        where: { slug: { in: guide.brands }, deletedAt: null },
        select: { slug: true, name: true, summary: true },
      })
    : [];
  const brandCards = (guide.brands ?? []).flatMap((slug) => brandRows.filter((row) => row.slug === slug));

  const url = absoluteUrl(`/${guide.slug}`);
  const itemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: guide.h1,
    itemListElement: products.map((product, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: absoluteUrl(`/products/${product.slug}`),
      name: product.name,
    })),
  };

  return (
    <div className="container-page pb-16">
      <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "Products", href: "/products" }, { label: guide.h1.split(":")[0] ?? guide.h1 }]} />

      <header className="max-w-3xl">
        <h1 className="text-3xl leading-tight sm:text-[2.4rem]">{guide.h1}</h1>
        <p className="mt-3 text-meta text-ink-500">
          Last updated <time dateTime={GUIDES_UPDATED}>{formatDate(new Date(GUIDES_UPDATED))}</time>
        </p>
        <Markdown body={intro} className="prose-content mt-5 text-[17px]" />
      </header>

      <AnswerBlock path={`/${guide.slug}`} inline />

      {guide.products.length > 0 ? (
      <section aria-labelledby="compare" className="mt-12">
        <h2 id="compare" className="text-[1.6rem] font-bold text-graphite-900">
          Compare the products
        </h2>
        <p className="mt-2 max-w-3xl text-[15px] text-ink-600">
          {guide.products.some((entry) => {
            const product = bySlug.get(entry.slug);
            return product ? product.variants.some((variant) => effectivePriceMinor(variant.listPriceMinor, variant.salePriceMinor) > 0) : false;
          })
            ? "Prices exclude 18% GST. Prices are tentative and confirmed on a written quotation."
            : "Hardware is quoted to your configuration and quantity, with a GST invoice. Ask for today's price on a written quotation."}
        </p>
        <TableWrap className="mt-5">
          <Table className="min-w-[44rem]">
            <thead>
              <tr>
                <Th>Product</Th>
                <Th>Used for</Th>
                <Th>Who it is for</Th>
                <Th className="text-right">Price (excl. GST)</Th>
              </tr>
            </thead>
            <tbody>
              {guide.products.map((entry) => {
                const product = bySlug.get(entry.slug);
                if (!product) return null;
                const prices = product.variants
                  .map((variant) => effectivePriceMinor(variant.listPriceMinor, variant.salePriceMinor))
                  .filter((price) => price > 0)
                  .sort((a, b) => a - b);
                return (
                  <Tr key={entry.slug}>
                    <Th scope="row" className="normal-case tracking-normal text-[14px] font-medium">
                      <Link href={`/products/${product.slug}`} className="text-accent-700 underline underline-offset-2">
                        {product.name}
                      </Link>
                    </Th>
                    <Td>{entry.use}</Td>
                    <Td>{entry.whoFor}</Td>
                    <Td className="text-right">
                      {prices.length > 0 ? (
                        <span className="font-semibold text-graphite-900">
                          {prices.length > 1 ? "from " : ""}
                          {formatMoney(prices[0]!)}
                        </span>
                      ) : (
                        <Link href="/enquiry" className="text-accent-700 underline underline-offset-2">
                          Get today&apos;s price
                        </Link>
                      )}
                    </Td>
                  </Tr>
                );
              })}
            </tbody>
          </Table>
        </TableWrap>
      </section>
      ) : null}

      <div className="mt-6 max-w-3xl">
        {sections.map((section) => (
          <section key={section.heading}>
            <h2 className="mt-12 text-[1.6rem] font-bold text-graphite-900">{section.heading}</h2>
            <Markdown body={section.markdown} className="prose-content mt-4 text-[16px]" />
          </section>
        ))}
      </div>

      {products.length > 0 ? (
        <section className="mt-16" aria-labelledby="products-grid">
          <h2 id="products-grid" className="mb-6 text-[1.6rem] font-bold text-graphite-900">
            Buy {guide.h1.split(":")[0]?.replace(/ in India$/i, "")} from TechZoid
          </h2>
          <ProductGrid products={products} />
        </section>
      ) : null}

      {brandCards.length > 0 ? (
        <section className="mt-16" aria-labelledby="brands-we-quote">
          <h2 id="brands-we-quote" className="text-[1.6rem] font-bold text-graphite-900">
            Brands we quote
          </h2>
          <p className="mt-2 max-w-3xl text-[15px] text-ink-600">
            {products.length > 0
              ? "More brands are quoted on request, on the same purchase order."
              : "These brands are quoted on request rather than listed with prices. Tell us what you need and we return a written quotation with a GST invoice."}
          </p>
          <ul className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {brandCards.map((brand) => (
              <li key={brand.slug}>
                <Link
                  href={`/brands/${brand.slug}`}
                  className="flex h-full flex-col rounded-(--radius-lg) border border-line bg-white p-5 transition-colors hover:border-graphite-300"
                >
                  <span className="text-[15px] font-semibold text-graphite-900">{brand.name} reseller in India</span>
                  <span className="mt-1.5 text-[13px] leading-relaxed text-ink-600">{brand.summary}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section id="faq" className="mt-16 max-w-3xl scroll-mt-32">
        <h2 className="mb-6 text-[1.6rem] font-bold text-graphite-900">Frequently asked questions</h2>
        <FaqList url={url} items={faqs} />
      </section>

      {guide.related.length > 0 ? (
        <section className="mt-14 max-w-3xl">
          <h2 className="text-[1.3rem] font-bold text-graphite-900">Keep reading</h2>
          <ul className="prose-content mt-3 text-[16px]">
            {guide.related.map((link) => (
              <li key={link.href}>
                <Link href={link.href}>{link.label}</Link>
              </li>
            ))}
            <li>
              <Link href="/price-list">Full price list</Link>
            </li>
          </ul>
        </section>
      ) : null}

      <QuickEnquiry contained={false} subject={guide.h1} source="category_page" heading="Get a quotation" />

      <RelatedGuides inline path={`/${guide.slug}`} />
      {products.length > 0 ? <JsonLd data={itemList} /> : null}
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: guide.h1,
          url,
          dateModified: GUIDES_UPDATED,
          mainEntity: { "@type": "ItemList", numberOfItems: products.length },
        }}
      />
    </div>
  );
}
