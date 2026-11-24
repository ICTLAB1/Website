import Link from "next/link";

import { ButtonLink } from "@/components/ui/button";
import { Markdown } from "@/components/markdown";
import type { BrandGuide } from "@/lib/content/guides";

/**
 * The written part of a brand hub: what the brand is known for, the product lines
 * TechZoid quotes, how to choose, how it is bought in India, and why buy it here.
 *
 * It states no price and no partner status. Where the catalogue has no listing for
 * the brand it says so and offers the quotation; "authorised" never appears here,
 * because that wording is gated per publisher elsewhere.
 */

const H2 = "mt-12 text-[1.6rem] font-bold text-graphite-900";

export function BrandGuideSections({
  guide,
  certifications,
  offices,
  hasCatalogue,
  brandSlug,
}: {
  guide: BrandGuide;
  certifications: string[];
  offices: string[];
  hasCatalogue: boolean;
  brandSlug: string;
}) {
  return (
    <div className="max-w-3xl pb-4">
      <h2 className="mt-12 text-[1.6rem] font-bold text-graphite-900">About {guide.displayName} for Indian businesses</h2>
      <Markdown body={guide.intro} className="prose-content mt-4 text-[16px]" />

      <h2 className={H2}>{guide.displayName} product lines we quote</h2>
      <ul className="mt-4 divide-y divide-line rounded-(--radius-lg) border border-line bg-white">
        {guide.lines.map((line) => (
          <li key={line.name} className="p-4">
            <p className="text-[15px] font-semibold text-graphite-900">{line.name}</p>
            <p className="mt-1 text-[14px] leading-relaxed text-ink-600">{line.use}</p>
          </li>
        ))}
      </ul>

      {hasCatalogue ? null : (
        <div className="mt-6 rounded-(--radius-lg) border border-line bg-surface-muted p-5">
          <h3 className="text-[1.05rem] font-semibold text-graphite-900">Get today&apos;s price</h3>
          <p className="mt-1 text-[14px] leading-relaxed text-ink-600">
            {guide.displayName} is quoted on request rather than listed with a price. Send us the product, quantity and
            term and we return a written quotation with a GST invoice.
          </p>
          <ButtonLink href={`/enquiry?brand=${brandSlug}`} className="mt-4">
            Get a quote for {guide.displayName}
          </ButtonLink>
        </div>
      )}

      <h2 className={H2}>How to choose {guide.displayName} products</h2>
      <Markdown body={guide.choose} className="prose-content mt-4 text-[16px]" />

      <h2 className={H2}>How {guide.displayName} is bought in India</h2>
      <Markdown body={guide.buying} className="prose-content mt-4 text-[16px]" />

      <h2 className={H2}>Why buy {guide.displayName} from TechZoid</h2>
      <ul className="prose-content mt-4 text-[16px]">
        <li>{guide.displayName} reseller: we quote and supply it alongside the rest of your software and hardware</li>
        <li>A GST invoice on every order, with the input credit usually claimable by GST-registered buyers</li>
        {certifications.length > 0 ? <li>{certifications.join(", ")} certified</li> : null}
        <li>Deployment and activation support through our managed IT services</li>
        {offices.length > 0 ? <li>Offices in {offices.join(" and ")}</li> : null}
        <li>One written quotation and one purchase order across brands</li>
      </ul>

      {guide.related.length > 0 ? (
        <>
          <h2 className={H2}>Keep reading</h2>
          <ul className="prose-content mt-4 text-[16px]">
            {guide.related.map((link) => (
              <li key={link.href}>
                <Link href={link.href}>{link.label}</Link>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </div>
  );
}
