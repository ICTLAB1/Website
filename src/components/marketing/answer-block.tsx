import Link from "next/link";

import { Markdown } from "@/components/markdown";
import { answerFor } from "@/lib/content/answers";
import { publicVariantWhere } from "@/lib/catalogue/audience";
import { prisma } from "@/lib/db";
import { effectivePriceMinor } from "@/lib/money";
import { JsonLd, absoluteUrl } from "@/lib/seo";
import { currentPartnerBadges } from "@/components/layout/accreditation-strip";
import { resolvePriceTokens } from "@/lib/price-tokens";

/**
 * A plain answer at the top of a page, then short question headings with direct answers.
 *
 * The shape a search engine or an AI assistant quotes from: what the thing is, what it
 * costs in India, who it is for, and who is selling it. The reseller wording is never
 * written here — it is the brand's current published partner designation where the site
 * holds one, and "<Brand> reseller" where it does not.
 */
const NAMES = { autodesk: "Autodesk", microsoft: "Microsoft", zoho: "Zoho" } as const;

export async function AnswerBlock({ path, inline = false }: { path: string; inline?: boolean }) {
  const entry = answerFor(path);
  if (!entry) return null;

  let reseller = "a reseller";
  if (entry.brand !== "multi") {
    const name = NAMES[entry.brand];
    const badge = (await currentPartnerBadges()).find((candidate) => candidate.slug === entry.brand);
    const phrase = badge ? `${badge.name} ${badge.label}` : `${name} reseller`;
    reseller = `${/^[aeiou]/i.test(phrase) ? "an" : "a"} ${phrase}`;
  }

  const texts = [entry.answer, ...entry.qas.map((qa) => qa.a)].map((text) => text.replace("{reseller}", reseller));
  const resolved = await resolvePriceTokens(texts);
  const guide = entry.guide
    ? await prisma.blogPost.findFirst({
        where: { slug: entry.guide.slug, status: "PUBLISHED", deletedAt: null },
        select: { slug: true },
      })
    : null;

  // A landing page about one product states its price, so it carries the product's markup too.
  let schema: Record<string, unknown> | null = null;
  if (entry.schemaProduct) {
    const product = await prisma.product.findUnique({
      where: { slug: entry.schemaProduct },
      select: {
        name: true,
        availability: true,
        brand: { select: { name: true } },
        variants: { where: publicVariantWhere, select: { listPriceMinor: true, salePriceMinor: true } },
      },
    });
    const prices = (product?.variants ?? [])
      .map((variant) => effectivePriceMinor(variant.listPriceMinor, variant.salePriceMinor))
      .filter((price) => price > 0)
      .sort((a, b) => a - b);
    if (product && prices.length > 0) {
      schema = {
        "@context": "https://schema.org",
        "@type": "Product",
        name: product.name,
        description: resolved[0],
        brand: { "@type": "Brand", name: product.brand.name },
        url: absoluteUrl(path),
        offers: {
          "@type": "AggregateOffer",
          priceCurrency: "INR",
          lowPrice: (prices[0]! / 100).toFixed(2),
          highPrice: (prices[prices.length - 1]! / 100).toFixed(2),
          offerCount: prices.length,
          availability: product.availability === "IN_STOCK" ? "https://schema.org/InStock" : "https://schema.org/PreOrder",
          url: absoluteUrl(`/products/${entry.schemaProduct}`),
        },
      };
    }
  }

  return (
    <>
    {schema ? <JsonLd data={schema} /> : null}
    <section aria-label="Quick answer" className={inline ? "mt-6 max-w-3xl rounded-(--radius-lg) border border-line bg-surface-muted p-5" : "border-b border-line bg-white py-8"}>
      <div className={inline ? "" : "container-page max-w-4xl"}>
        <p className="text-label font-semibold uppercase tracking-[0.12em] text-accent-700">Quick answer</p>
        <p className="mt-2 text-[17px] leading-relaxed text-graphite-900">{resolved[0]}</p>
        {entry.guide && guide ? (
          <p className="mt-2 text-[15px]">
            <Link href={`/blog/${guide.slug}`} className="font-medium text-accent-700 underline underline-offset-2">
              {entry.guide.label}
            </Link>
          </p>
        ) : null}
        <div className="mt-6 space-y-5">
          {entry.qas.map((qa, index) => (
            <div key={qa.q}>
              <h2 className="text-[1.25rem] font-bold text-graphite-900">{qa.q}</h2>
              <Markdown body={resolved[index + 1]!} className="prose-content mt-1 text-[16px]" />
            </div>
          ))}
        </div>
      </div>
    </section>
    </>
  );
}
