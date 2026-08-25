import { ConsentBanner } from "@/components/analytics/consent-banner";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { Breadcrumb } from "@/components/ui/breadcrumb";
import { BlockRenderer } from "@/components/blocks";
import { DocumentDates } from "@/components/marketing/document-dates";
import { getPage } from "@/lib/queries/pages";
import { resolveBlocks } from "@/lib/blocks/resolve";
import { buildMetadata } from "@/lib/seo";

/**
 * Renders a CMS page at a fixed route.
 *
 * The catch-all `[...slug]` route handles everything the database knows about,
 * but a handful of paths — the home page especially — keep a dedicated route
 * file so they can be reasoned about, linked from `generateStaticParams`, and
 * given route-specific behaviour later. Both paths render through exactly the
 * same block pipeline, so there is one renderer, not two.
 */

/**
 * Metadata for a fixed route backed by a CMS page.
 *
 * When the page is missing, `CmsPage` renders a 404 — so the metadata says so
 * too, rather than describing a page the visitor will not see. Titles and
 * descriptions come from the record, which is what makes editing a page in the
 * admin panel update its SEO without a deploy.
 */
export async function cmsMetadata(slug: string, path: string): Promise<Metadata> {
  const page = await getPage(slug);

  if (!page) {
    return buildMetadata({
      title: "Page not found",
      description: "This page is no longer available.",
      path,
      noIndex: true,
    });
  }

  return buildMetadata({
    title: page.title,
    description: page.description,
    path,
    keywords: page.keywords,
  });
}

export async function CmsPage({ slug }: { slug: string }) {
  const page = await getPage(slug);

  // A fixed route whose page has been unpublished or deleted 404s rather than
  // rendering an empty shell.
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
      <BlockRenderer
        blocks={page.blocks}
        resolved={resolved}
        afterHero={<DocumentDates page={page} />}
      />

      {/*
        The consent control belongs on the cookie policy and nowhere else.

        Named here rather than made into a block type, because it is not
        content: an administrator cannot meaningfully choose to leave it off —
        a site that asks for consent has to offer a way to withdraw it, and a
        block that could be deleted from the page would make that promise
        removable by accident.

        The page still says everything about it in editable copy; this is only
        the pair of buttons that copy refers to.
      */}
      {slug === "cookie-policy" ? (
        <section className="container-page pb-14 lg:pb-18">
          <h2 className="mb-3 text-section">Your answer</h2>
          <ConsentBanner mode="manage" />
        </section>
      ) : null}
    </>
  );
}
