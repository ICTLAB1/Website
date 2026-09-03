import type { Metadata } from "next";

import { Breadcrumb } from "@/components/ui/breadcrumb";
import { IndustryGridBlock } from "@/components/blocks/industry-grid";
import { publishedIndustries } from "@/lib/queries/industries";
import { buildMetadata } from "@/lib/seo";

/**
 * The sector index.
 *
 * Bespoke rather than a CMS page, because it reads a query parameter: `?industry=`
 * selects a sector, which is what makes the filter shareable and crawlable
 * rather than a class toggled in the browser. The catch-all CMS route
 * deliberately takes no search parameters, so a page that needs one gets its
 * own file — the same arrangement `/brands` and `/products` already use.
 */
export const metadata: Metadata = buildMetadata({
  title: "Industries We Serve",
  description:
    "Technology procurement and solutions for enterprises, institutions, government organisations and mission-critical environments across sixteen sectors.",
  path: "/industries",
});

export default async function IndustriesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const raw = params.industry;
  const selected = typeof raw === "string" ? raw : undefined;

  const industries = await publishedIndustries();

  return (
    <>
      <div className="container-page">
        <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "Industries" }]} />

        <header className="max-w-3xl">
          <h1 className="text-3xl sm:text-4xl">Industries we serve</h1>
          <p className="mt-4 text-[16px] leading-relaxed text-ink-600">
            Technology procurement and solutions for enterprises, institutions, government
            organisations and mission-critical environments. Each sector buys differently; these
            pages set out what that difference is and what we supply into it.
          </p>
        </header>
      </div>

      {/*
        Rendered with no heading of its own — the page already has an h1 saying
        the same thing, and a second copy of it as an h2 immediately below is
        the kind of duplication the SEO gate exists to catch.
      */}
      <IndustryGridBlock data={{ filterable: true, limit: 40 }} rows={industries} selected={selected} />
    </>
  );
}
