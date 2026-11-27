import { RelatedGuides } from "@/components/marketing/related-guides";
import type { Metadata } from "next";
import Link from "next/link";

import { AnswerBlock } from "@/components/marketing/answer-block";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Table, TableWrap, Td, Th, Tr } from "@/components/ui/table";
import { prisma } from "@/lib/db";
import { publicVariantWhere } from "@/lib/catalogue/audience";
import { GUIDES_UPDATED } from "@/lib/content/guides";
import { effectivePriceMinor, formatMoney } from "@/lib/money";
import { buildMetadata } from "@/lib/seo";
import { formatDate } from "@/lib/utils";

const PRICE_GUIDES = [
  { slug: "autocad-subscription-price-in-india", label: "AutoCAD price in India" },
  { slug: "zoho-pricing-in-india-how-it-works", label: "Zoho pricing in India: how it works" },
  { slug: "windows-11-pro-upgrade-licence-price-in-india", label: "Windows licence cost in India" },
];

export const metadata: Metadata = buildMetadata({
  title: "Software Price List India — Microsoft, Adobe, Autodesk and More",
  description:
    "Every product TechZoid supplies with its annual price in rupees, excluding GST, grouped by brand. Where there is no listed price you can ask for today's price.",
  path: "/price-list",
});

/**
 * One page that links every product with its price, grouped by brand.
 *
 * Prices are the catalogue's own — the lowest priced public variant, as a listing
 * shows "from" — and a product with none says so and links to the quotation.
 * Nothing is typed here, so the list cannot go out of date.
 */
export default async function PriceListPage() {
  const products = await prisma.product.findMany({
    where: { status: "ACTIVE", deletedAt: null },
    orderBy: [{ brand: { name: "asc" } }, { name: "asc" }],
    select: {
      slug: true,
      name: true,
      shortDescription: true,
      formFactor: true,
      brand: { select: { slug: true, name: true } },
      variants: { where: publicVariantWhere, select: { listPriceMinor: true, salePriceMinor: true, gstRatePercent: true } },
    },
  });

  // The price articles, linked from here when they are published.
  const guideRows = await prisma.blogPost.findMany({
    where: { slug: { in: PRICE_GUIDES.map((guide) => guide.slug) }, status: "PUBLISHED", deletedAt: null },
    select: { slug: true },
  });
  const guides = PRICE_GUIDES.filter((guide) => guideRows.some((row) => row.slug === guide.slug));

  const groups = new Map<string, { name: string; items: typeof products }>();
  for (const product of products) {
    const group = groups.get(product.brand.slug) ?? { name: product.brand.name, items: [] };
    group.items.push(product);
    groups.set(product.brand.slug, group);
  }
  const ordered = [...groups.entries()].sort((a, b) => a[1].name.localeCompare(b[1].name));

  return (
    <>
    <div className="container-page pb-16">
      <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "Price list" }]} />
      <header className="max-w-3xl">
        <h1 className="text-3xl leading-tight sm:text-[2.4rem]">Software price list for India</h1>
        <p className="mt-3 text-[16px] leading-relaxed text-ink-600">
          Every product we supply, with its annual price per user in rupees, excluding 18% GST. Prices are tentative and
          confirmed on a written quotation. Where a product has no listed price, ask for today&apos;s price. The{" "}
          <Link href="/cad-software" className="text-accent-700 underline underline-offset-2">
            CAD
          </Link>
          ,{" "}
          <Link href="/bim-software" className="text-accent-700 underline underline-offset-2">
            BIM
          </Link>
          ,{" "}
          <Link href="/pdf-software" className="text-accent-700 underline underline-offset-2">
            PDF
          </Link>{" "}
          and{" "}
          <Link href="/video-editing-software" className="text-accent-700 underline underline-offset-2">
            video editing
          </Link>{" "}
          guides compare products side by side.
        </p>
        <p className="mt-2 text-meta text-ink-500">
          Last updated <time dateTime={GUIDES_UPDATED}>{formatDate(new Date(GUIDES_UPDATED))}</time>
        </p>
        <nav aria-label="Brands on this page" className="mt-5 flex flex-wrap gap-2">
          {ordered.map(([slug, group]) => (
            <a
              key={slug}
              href={`#${slug}`}
              className="inline-flex min-h-11 items-center rounded-(--radius-md) border border-line px-3 text-meta font-medium text-graphite-900 hover:border-graphite-400"
            >
              {group.name} ({group.items.length})
            </a>
          ))}
        </nav>
      </header>
      <AnswerBlock path="/price-list" inline />

      {guides.length > 0 ? (
        <nav aria-label="Price guides" className="mt-6 max-w-3xl">
          <h2 className="text-[1.25rem] font-bold text-graphite-900">Price guides</h2>
          <ul className="prose-content mt-2 text-[16px]">
            {guides.map((guide) => (
              <li key={guide.slug}>
                <Link href={`/blog/${guide.slug}`}>{guide.label}</Link>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}

      {ordered.map(([slug, group]) => (
        <section key={slug} id={slug} className="mt-12 scroll-mt-32">
          <h2 className="text-[1.5rem] font-bold text-graphite-900">
            <Link href={`/brands/${slug}`} className="hover:underline">
              {group.name}
            </Link>
          </h2>
          <TableWrap className="mt-4">
            <Table className="min-w-[34rem]">
              <thead>
                <tr>
                  <Th>Product</Th>
                  <Th className="text-right">Price (excl. GST)</Th>
                </tr>
              </thead>
              <tbody>
                {group.items.map((product) => {
                  const prices = product.variants
                    .map((variant) => effectivePriceMinor(variant.listPriceMinor, variant.salePriceMinor))
                    .filter((price) => price > 0)
                    .sort((a, b) => a - b);
                  return (
                    <Tr key={product.slug}>
                      <Th scope="row" className="normal-case tracking-normal text-[14px] font-medium">
                        <Link href={`/products/${product.slug}`} className="text-accent-700 underline underline-offset-2">
                          {product.name}
                        </Link>
                      </Th>
                      <Td className="text-right">
                        {prices.length > 0 ? (
                          <span className="font-semibold text-graphite-900">
                            {prices.length > 1 && prices[0] !== prices[prices.length - 1] ? "from " : ""}
                            {formatMoney(prices[0]!)}
                          </span>
                        ) : (
                          <Link href={`/products/${product.slug}`} className="text-accent-700 underline underline-offset-2">
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
      ))}
    </div>
    <RelatedGuides path="/price-list" />
    </>
  );
}
