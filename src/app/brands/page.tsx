import type { Metadata } from "next";
import Link from "next/link";
import type { BrandSegment } from "@prisma/client";

import { Breadcrumb } from "@/components/ui/breadcrumb";
import { SectionHeader } from "@/components/ui/section-header";
import { BrandCard } from "@/components/marketing/brand-card";
import { ButtonLink } from "@/components/ui/button";
import { getBrands } from "@/lib/queries/content";
import { buildMetadata } from "@/lib/seo";
import { SEGMENT_DESCRIPTIONS, SEGMENT_LABELS, SEGMENT_ORDER } from "@/lib/brand-segments";

/*
 * The title says "supply", not "authorised to resell".
 *
 * It used to say the latter, written when this page listed eight brands. It now
 * lists forty, added so buyers can see the breadth of what can go on one
 * quotation — and several publishers tie the words "authorised reseller" to a
 * specific programme enrolment. A page title is a claim like any other, and
 * this one would be making it forty times over on the strength of a list.
 *
 * Narrow it per brand where the enrolment is real; do not widen it here.
 */
export const metadata: Metadata = buildMetadata({
  title: "Technology Brands We Supply",
  description:
    "Licensing and solutions across Microsoft, Adobe, Autodesk, Zoho, SketchUp, Corel, HPE and Dell Technologies — consolidated into a single procurement relationship.",
  path: "/brands",
});

type BrandRow = Awaited<ReturnType<typeof getBrands>>[number];

/**
 * Brands with a live catalogue, grouped; and brands we can source, listed.
 *
 * The split exists because thirty-one of these cards used to read "0 products",
 * which reads as an unfinished website rather than as what it actually is —
 * a supplier this business can source from but has not published a catalogue
 * for. Saying that plainly is both more honest and more useful: a buyer looking
 * for Fortinet learns they can ask, instead of concluding we do not carry it.
 */
export default async function BrandsPage() {
  const brands = await getBrands();

  const withCatalogue = brands.filter((brand) => brand._count.products > 0);
  const onRequest = brands
    .filter((brand) => brand._count.products === 0)
    .sort((a, b) => a.name.localeCompare(b.name));

  const bySegment = new Map<BrandSegment | "OTHER", BrandRow[]>();
  for (const brand of withCatalogue) {
    const key = brand.segment ?? "OTHER";
    bySegment.set(key, [...(bySegment.get(key) ?? []), brand]);
  }

  // Declared order first, then anything not yet classified — visible rather
  // than hidden, so an unclassified brand is a prompt rather than a silence.
  const groups: Array<{ key: BrandSegment | "OTHER"; label: string; description: string | null }> = [
    ...SEGMENT_ORDER.filter((segment) => bySegment.has(segment)).map((segment) => ({
      key: segment as BrandSegment | "OTHER",
      label: SEGMENT_LABELS[segment],
      description: SEGMENT_DESCRIPTIONS[segment],
    })),
    ...(bySegment.has("OTHER")
      ? [{ key: "OTHER" as const, label: "Other brands", description: null }]
      : []),
  ];

  return (
    <div className="container-page pb-16">
      <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "Brands" }]} />

      <header className="mb-10 max-w-3xl">
        <h1 className="text-3xl sm:text-4xl">Technology brands we supply</h1>
        <p className="mt-4 text-[16px] leading-relaxed text-ink-600">
          Each publisher licenses its software differently, and those differences have real
          commercial consequences. These pages set out how each one works and where the
          decisions usually cost organisations money.
        </p>
      </header>

      {groups.map((group) => (
        <section key={group.key} className="mb-12">
          <SectionHeader
            title={group.label}
            description={group.description ?? undefined}
            className="mb-5"
            as="h2"
          />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {(bySegment.get(group.key) ?? []).map((brand) => (
              <BrandCard
                key={brand.slug}
                brand={{ ...brand, productCount: brand._count.products }}
              />
            ))}
          </div>
        </section>
      ))}

      {onRequest.length > 0 ? (
        <section className="mb-12">
          <SectionHeader
            title="Available on request"
            description="We can source and licence these on the same terms as anything above. There is no public catalogue for them yet, so tell us what you need and we will quote it."
            className="mb-5"
            as="h2"
          />

          {/*
            Named rather than carded — but linked.

            A card promises a page with a catalogue on it, and these pages have
            the brand's own description and no products; a list is the honest
            shape for "ask us", and it puts thirty suppliers in front of a
            reader in the space four cards would take.

            The links are not decoration. These were plain text for a few
            hours, and it orphaned fifteen brand pages: still in the sitemap,
            still submitted to Google, and reachable from nowhere on the site.
            A page a crawler can only find through the sitemap is a page with
            no internal signal of importance at all — and a reader who wants
            Fortinet has to guess the URL. Every page in the sitemap needs a
            path to it from a page a person can reach.
          */}
          <ul className="flex flex-wrap gap-x-3 gap-y-2">
            {onRequest.map((brand) => (
              <li key={brand.slug}>
                <Link
                  href={`/brands/${brand.slug}`}
                  className="block rounded-[--radius-md] border border-line bg-white px-3 py-1.5 text-meta text-ink-700 transition-colors hover:border-graphite-400 hover:text-graphite-900"
                >
                  {brand.name}
                </Link>
              </li>
            ))}
          </ul>

          <div className="mt-6">
            <ButtonLink href="/enquiry" variant="outline">
              Ask about a brand
            </ButtonLink>
          </div>
        </section>
      ) : null}

      <section className="mt-16 rounded-[--radius-lg] border border-line bg-surface-muted p-6 sm:p-8">
        <SectionHeader
          title="Working with several of these at once?"
          description="Most organisations do. Consolidating them onto one quotation and one purchase order removes a substantial amount of administrative work from your finance team."
          className="mb-6"
          as="h2"
        />
        <div className="flex flex-wrap gap-3">
          <ButtonLink href="/enterprise">Enterprise procurement</ButtonLink>
          <ButtonLink href="/enquiry" variant="outline">
            Build an enquiry
          </ButtonLink>
        </div>
      </section>
    </div>
  );
}
