import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Breadcrumb } from "@/components/ui/breadcrumb";
import { BlockRenderer } from "@/components/blocks";
import { getPage, getPublishedPageSlugs } from "@/lib/queries/pages";
import { resolveBlocks } from "@/lib/blocks/resolve";
import { buildMetadata } from "@/lib/seo";
import { prerenderParams } from "@/lib/queries/prerender";

/**
 * CMS pages.
 *
 * One catch-all route renders every page in the database. Static routes always
 * take precedence in Next.js, so this only ever sees paths nothing else claimed.
 *
 * `dynamicParams` is deliberately left at its default of true. It used to be
 * false, which meant the set of valid paths was fixed at build time — so a page
 * created in the admin panel returned 404 until the next deploy, which is
 * exactly the failure a database-driven site exists to avoid. Known pages are
 * still prerendered by `generateStaticParams`; a page created afterwards
 * renders on demand and is then cached under its own tag until an edit
 * invalidates it.
 *
 * An unknown path now costs one indexed lookup on `Page.slug` before it can
 * 404. That is the price of admin-created pages existing at all, and it is
 * bounded.
 */

type PageProps = { params: Promise<{ slug: string[] }> };

export async function generateStaticParams() {
  return prerenderParams("[...slug]", async () => {
    const pages = await getPublishedPageSlugs();
    return pages.map((page) => ({ slug: page.slug.split("/") }));
  });
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const page = await getPage(slug.join("/"));

  if (!page) {
    return buildMetadata({
      title: "Page not found",
      description: "This page is no longer available.",
      path: `/${slug.join("/")}`,
      noIndex: true,
    });
  }

  return buildMetadata({
    title: page.title,
    description: page.description,
    path: `/${page.slug}`,
    keywords: page.keywords,
  });
}

export default async function CmsPageRoute({ params }: PageProps) {
  const { slug } = await params;

  // Draft and soft-deleted pages are excluded by the query, so an unpublished
  // page is indistinguishable from one that never existed.
  const page = await getPage(slug.join("/"));
  if (!page) notFound();

  const resolved = await resolveBlocks(page.blocks, {
    brandSlug: page.brandSlug,
    faqTopic: page.faqTopic,
  });

  return (
    <>
      {page.breadcrumb.length > 0 ? (
        <div className="container-page">
          <Breadcrumb items={page.breadcrumb} />
        </div>
      ) : null}

      <BlockRenderer blocks={page.blocks} resolved={resolved} />
    </>
  );
}
