import Link from "next/link";

import { ButtonLink } from "@/components/ui/button";
import { Markdown } from "@/components/markdown";
import { Table, TableWrap, Td, Th, Tr } from "@/components/ui/table";
import type { ProductGuide } from "@/lib/content/guides";
import { effectivePriceMinor, formatMoney, gstAmountMinor } from "@/lib/money";
import { resolvePriceTokens } from "@/lib/price-tokens";

/**
 * The buying guide on a product page: price by term, what is included, who it is
 * for, how it compares, how the licence works, what it runs on, why TechZoid.
 *
 * Every figure here comes from the product's own variants. The catalogue holds
 * annual prices; a term it has no variant for says "Get today's price" and offers
 * the quotation, and the structured data on the page leaves the Offer out for it.
 */

type Variant = {
  termMonths: number | null;
  listPriceMinor: number;
  salePriceMinor: number | null;
  gstRatePercent: number;
};

const TERMS: Array<{ label: string; months: number }> = [
  { label: "Monthly", months: 1 },
  { label: "Annual (1 year)", months: 12 },
  { label: "3-year", months: 36 },
];

/** The price a term shows: its own variant, or for the annual row the only priced variant there is. */
function variantForTerm(variants: Variant[], months: number): Variant | null {
  const priced = variants.filter((variant) => effectivePriceMinor(variant.listPriceMinor, variant.salePriceMinor) > 0);
  const exact = priced.find((variant) => variant.termMonths === months);
  if (exact) return exact;
  // One priced variant with no stated term is the annual subscription.
  if (months === 12 && priced.length === 1 && priced[0]!.termMonths == null) return priced[0]!;
  return null;
}

export function GuidePriceBlock({ variants, productName }: { variants: Variant[]; productName: string }) {
  return (
    <section
      aria-labelledby="guide-price"
      className="mt-6 max-w-2xl rounded-(--radius-lg) border border-line bg-white p-5"
    >
      <h2 id="guide-price" className="text-[1.1rem] font-semibold text-graphite-900">
        {productName} price in India
      </h2>
      <p className="mt-1 text-meta text-ink-600">Per user, excluding 18% GST, with the GST-inclusive figure beside it.</p>
      <div className="mt-4 divide-y divide-line">
        {TERMS.map((term) => {
          const variant = variantForTerm(variants, term.months);
          if (!variant) {
            return (
              <div key={term.label} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <span className="font-medium text-graphite-900">{term.label}</span>
                <ButtonLink href="/enquiry" variant="outline" size="sm">
                  Get today&apos;s price
                </ButtonLink>
              </div>
            );
          }
          const exGst = effectivePriceMinor(variant.listPriceMinor, variant.salePriceMinor);
          const gst = gstAmountMinor(exGst, variant.gstRatePercent);
          return (
            <div key={term.label} className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 py-3">
              <span className="font-medium text-graphite-900">{term.label}</span>
              <span className="text-right">
                <span className="text-[1.25rem] font-bold text-graphite-900">{formatMoney(exGst)}</span>
                <span className="ml-1 text-meta text-ink-600">excl. GST</span>
                <span className="block text-meta text-ink-600">
                  {formatMoney(exGst + gst)} incl. {variant.gstRatePercent}% GST
                </span>
              </span>
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-label leading-relaxed text-ink-500">
        Prices are tentative and confirmed on a written quotation, which takes account of your quantity and licensing
        programme.
      </p>
    </section>
  );
}

/** Resolves every price token in a guide, once, so the page and its FAQ markup say the same thing. */
export async function resolveProductGuide(guide: ProductGuide): Promise<ProductGuide> {
  const texts = [
    guide.intro,
    guide.included,
    guide.whoFor,
    guide.vs.intro,
    guide.vs.verdict,
    guide.licensing,
    guide.sysreq,
    ...guide.vs.rows.flatMap((row) => [row.thisProduct, row.alternative]),
    ...guide.faqs.map((faq) => faq.answer),
  ];
  const out = await resolvePriceTokens(texts);
  let i = 0;
  const next = () => out[i++]!;
  const resolved = {
    ...guide,
    intro: next(),
    included: next(),
    whoFor: next(),
    vs: { ...guide.vs, intro: next(), verdict: next(), rows: guide.vs.rows },
    licensing: next(),
    sysreq: next(),
  };
  const rows = guide.vs.rows.map((row) => ({ ...row, thisProduct: next(), alternative: next() }));
  const faqs = guide.faqs.map((faq) => ({ ...faq, answer: next() }));
  return { ...resolved, vs: { ...resolved.vs, rows }, faqs };
}

const H2 = "mt-12 text-[1.6rem] font-bold text-graphite-900";

export function ProductGuideIntro({ guide }: { guide: ProductGuide }) {
  return <Markdown body={guide.intro} className="prose-content mt-6 max-w-2xl text-[16px]" />;
}

export function ProductGuideSections({
  guide,
  productName,
  resellerLine,
  certifications,
  offices,
  categoryLink,
  related,
}: {
  guide: ProductGuide;
  productName: string;
  /** "Autodesk reseller", or the confirmed designation where the brand record carries one. */
  resellerLine: string;
  certifications: string[];
  offices: string[];
  categoryLink: { href: string; label: string } | null;
  related: Array<{ slug: string; name: string }>;
}) {
  return (
    <div className="mt-4 max-w-3xl">
      <h2 className={H2}>What&apos;s included</h2>
      <Markdown body={guide.included} className="prose-content mt-4 text-[16px]" />

      <h2 className={H2}>Who {guide.displayName} is for</h2>
      <Markdown body={guide.whoFor} className="prose-content mt-4 text-[16px]" />

      <h2 className={H2}>
        {guide.displayName} vs {guide.vs.alternative}
      </h2>
      <Markdown body={guide.vs.intro} className="prose-content mt-4 text-[16px]" />
      <TableWrap className="mt-5">
        <Table>
          <thead>
            <tr>
              <Th>&nbsp;</Th>
              <Th>{guide.displayName}</Th>
              <Th>{guide.vs.alternative}</Th>
            </tr>
          </thead>
          <tbody>
            {guide.vs.rows.map((row) => (
              <Tr key={row.label}>
                <Th scope="row" className="normal-case tracking-normal text-[13px] font-semibold text-graphite-900">{row.label}</Th>
                <Td>{row.thisProduct}</Td>
                <Td>{row.alternative}</Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      </TableWrap>
      <Markdown body={guide.vs.verdict} className="prose-content mt-5 text-[16px]" />

      <h2 className={H2}>Single-user, multi-user and Flex</h2>
      <Markdown body={guide.licensing} className="prose-content mt-4 text-[16px]" />

      <h2 className={H2}>System requirements</h2>
      <Markdown body={guide.sysreq} className="prose-content mt-4 text-[16px]" />

      <h2 className={H2}>Why buy {productName} from TechZoid</h2>
      <ul className="prose-content mt-4 text-[16px]">
        <li>{resellerLine}</li>
        <li>A GST invoice on every order, with the input credit claimable</li>
        {certifications.length > 0 ? <li>{certifications.join(", ")} certified</li> : null}
        <li>Help with activation and with assigning and reassigning seats</li>
        {offices.length > 0 ? <li>Offices in {offices.join(" and ")}</li> : null}
        <li>Orders raised against your purchase order, on a written quotation</li>
      </ul>

      <h2 className={H2}>Keep reading</h2>
      <ul className="prose-content mt-4 text-[16px]">
        <li>
          <Link href="/blog/autocad-subscription-price-in-india">AutoCAD price in India</Link>, and how the annual term is
          priced
        </li>
        <li>
          <Link href="/autodesk">All Autodesk licensing</Link>
        </li>
        {categoryLink ? (
          <li>
            <Link href={categoryLink.href}>{categoryLink.label}: compare every product</Link>
          </li>
        ) : null}
        {related.map((item) => (
          <li key={item.slug}>
            <Link href={`/products/${item.slug}`}>{item.name}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
