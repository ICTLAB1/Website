import type { Metadata } from "next";

import { Breadcrumb } from "@/components/ui/breadcrumb";
import { ButtonLink } from "@/components/ui/button";
import { CatalogueListing } from "@/components/catalogue/catalogue-listing";
import { parseCatalogueParams, type RawSearchParams } from "@/lib/catalogue-params";
import { buildMetadata } from "@/lib/seo";

type PageProps = { searchParams: Promise<RawSearchParams> };

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const params = await searchParams;
  const query = Array.isArray(params.q) ? params.q[0] : params.q;
  const hasFilters = Object.keys(params).some((key) => key !== "page" && params[key]);

  /*
   * "Licensing from Every Major Brand" was the claim here, and it is not one
   * this page can support: it lists forty brands, which is not every major
   * brand, and there is no list anywhere that says which brands those would be.
   * The named brands below are the ones actually in the catalogue, so the
   * description makes the specific claim and the title stops making the
   * unbounded one. It is nine characters shorter as a side effect.
   */
  const title = query
    ? `Search results for “${query}”`
    : "Software Catalogue — Licensing and Renewals";

  return buildMetadata({
    title,
    description:
      "Enterprise software licensing from Microsoft, Adobe, Autodesk, Zoho, SketchUp, Corel, HPE and Dell. Filter by category, brand, licence type and price.",
    path: "/products",
    // Filtered permutations are near-duplicates of the base listing, so only
    // the canonical /products view is offered for indexing.
    noIndex: hasFilters,
  });
}

export default async function ProductsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const filters = parseCatalogueParams(params);

  return (
    <div className="container-page pb-16">
      <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "Products" }]} />

      <header className="mb-8 max-w-3xl">
        <h1 className="text-3xl sm:text-4xl">
          {filters.q ? `Results for “${filters.q}”` : "Software catalogue"}
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-ink-600">
          Licensing across Microsoft, Adobe, Autodesk, Zoho, SketchUp, Corel and enterprise
          infrastructure. Every price shown excludes GST and is confirmed on a written
          quotation before any order is placed.
        </p>
      </header>

      <CatalogueListing params={params} filters={filters} basePath="/products" />

      <div className="mt-14 rounded-[--radius-lg] border border-line bg-surface-muted p-6 sm:p-8">
        <h2 className="text-[1.25rem]">Cannot find what you need?</h2>
        <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-ink-600">
          This catalogue lists our most-requested licensing. We source considerably more than is
          listed here, including hardware configurations and publisher products that are only
          ever quoted. Tell us the requirement and we will price it.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <ButtonLink href="/enquiry">Request enterprise pricing</ButtonLink>
          <ButtonLink href="/contact" variant="outline">
            Talk to a specialist
          </ButtonLink>
          <ButtonLink href="/hardware" variant="outline">
            Business laptops &amp; desktops
          </ButtonLink>
        </div>
      </div>
    </div>
  );
}
