import type { Metadata } from "next";

import { CmsPage } from "@/lib/cms-route";
import { getPage } from "@/lib/queries/pages";
import { buildMetadata } from "@/lib/seo";

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

/**
 * Rendered on request, never prerendered.
 *
 * The root layout renders the header, which reads the session cookie to decide
 * whether to show "Sign in" or the account menu — so no page in this
 * application can be static HTML, and this route used to claim otherwise. It
 * declared `generateStaticParams`, which marked it SSG, and Next then tried to
 * statically generate it on demand and failed on the cookie read.
 *
 * Nothing is lost by dropping it. Every database read behind this page goes
 * through the tag-based cache, so the work per request is a cache lookup, and
 * an edit in the admin panel invalidates it immediately — which is better than
 * a prerender that only refreshes on redeploy.
 */

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

  // Renders through the shared `CmsPage`, which the fixed routes also use. This
  // route used to hold its own copy of the same JSX, and the two drifted the
  // moment one of them gained anything — the legal documents' effective dates
  // reached the fixed routes and not this one, which is where those pages are
  // actually served from. `getPage` is request-cached, so delegating costs
  // nothing.
  //
  // Draft and soft-deleted pages are excluded by the query, so an unpublished
  // page is indistinguishable from one that never existed.
  return <CmsPage slug={slug.join("/")} />;
}
