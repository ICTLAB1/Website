import type { Metadata } from "next";

import { Breadcrumb } from "@/components/ui/breadcrumb";
import { SectionHeader } from "@/components/ui/section-header";
import { BrandCard } from "@/components/marketing/brand-card";
import { ButtonLink } from "@/components/ui/button";
import { getBrands } from "@/lib/queries/content";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Software Vendors & Brands We Supply",
  description:
    "Licensing and solutions across Microsoft, Adobe, Autodesk, Zoho, SketchUp, Corel, HPE and Dell Technologies — consolidated into a single procurement relationship.",
  path: "/brands",
});

export default async function BrandsPage() {
  const brands = await getBrands();

  return (
    <div className="container-page pb-16">
      <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "Brands" }]} />

      <header className="mb-10 max-w-3xl">
        <h1 className="text-3xl sm:text-4xl">Vendors we supply</h1>
        <p className="mt-4 text-[16px] leading-relaxed text-ink-600">
          Each vendor licenses its software differently, and those differences have real
          commercial consequences. These pages set out how each one works and where the
          decisions usually cost organisations money.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {brands.map((brand) => (
          <BrandCard key={brand.slug} brand={{ ...brand, productCount: brand._count.products }} />
        ))}
      </div>

      <section className="mt-16 rounded-[--radius-lg] border border-line bg-surface-muted p-6 sm:p-8">
        <SectionHeader
          title="Working with several of these at once?"
          description="Most organisations do. Consolidating them onto one quotation and one purchase order removes a substantial amount of administrative work from your finance team."
          className="mb-6"
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
