import type { MetadataRoute } from "next";
import { prisma } from "@/lib/db";
import { appUrl } from "@/lib/env";
import { getNavigationPaths } from "@/lib/queries/navigation";
import { getPublishedPageSlugs, getUnservedPageSlugs } from "@/lib/queries/pages";

/**
 * Sitemap.
 *
 * Only indexable pages appear. Account, admin, enquiry, search and
 * authentication routes are excluded because they carry a noindex directive -
 * listing them would ask crawlers to fetch pages we have told them to ignore.
 */

const EXCLUDED = new Set(["/search", "/enquiry", "/track-order"]);

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = appUrl();
  const now = new Date();

  const [products, brands, services, posts, cmsPages, navPaths, unservedPages] = await Promise.all([
    prisma.product.findMany({
      where: { status: "ACTIVE", deletedAt: null },
      select: { slug: true, updatedAt: true, featured: true },
    }),
    prisma.brand.findMany({
      where: { deletedAt: null },
      select: { slug: true, updatedAt: true },
    }),
    prisma.service.findMany({
      where: { published: true, deletedAt: null },
      select: { slug: true, updatedAt: true },
    }),
    prisma.blogPost.findMany({
      where: { status: "PUBLISHED", deletedAt: null },
      select: { slug: true, updatedAt: true, publishedAt: true },
    }),
    getPublishedPageSlugs(),
    getNavigationPaths(),
    getUnservedPageSlugs(),
  ]);

  /**
   * Keyed by URL so a page listed twice is published once.
   *
   * Most CMS pages are also linked from the navigation, so the two sources
   * overlap heavily. A sitemap that names the same page twice — and, for the
   * home page, once with a trailing slash and once without — asks a crawler to
   * treat one page as two. Later writers win on `lastModified` and
   * `changeFrequency`; `priority` keeps the highest claim from either source.
   */
  const bySitemapUrl = new Map<string, MetadataRoute.Sitemap[number]>();

  const add = (entry: MetadataRoute.Sitemap[number]) => {
    const existing = bySitemapUrl.get(entry.url);
    bySitemapUrl.set(entry.url, {
      ...entry,
      priority: Math.max(entry.priority ?? 0, existing?.priority ?? 0),
    });
  };

  /** One canonical form per page: absolute, no trailing slash except the root. */
  const canonical = (path: string) => `${base}${path === "/" || path === "" ? "" : path}`;

  // A menu link outlives the page it points at: unpublishing a page leaves the
  // navigation entry alone. Listing it here would advertise a 404.
  const unserved = new Set(unservedPages.map((slug) => `/${slug}`));

  for (const route of navPaths) {
    if (EXCLUDED.has(route) || unserved.has(route)) continue;
    add({
      url: canonical(route),
      lastModified: now,
      changeFrequency: route === "/" ? "daily" : "weekly",
      priority: route === "/" ? 1 : route === "/products" ? 0.9 : 0.7,
    });
  }

  // CMS pages carry a real `updatedAt`, so the sitemap can report when a page
  // actually changed instead of claiming every page changed on every build.
  // Written after the navigation so that date wins where both list a page.
  for (const page of cmsPages) {
    add({
      url: canonical(`/${page.slug}`),
      lastModified: page.updatedAt,
      changeFrequency: "monthly",
      // Vendor overview pages sit one level above their product pages.
      priority: page.slug === "" ? 1 : page.slug.includes("/") ? 0.7 : 0.8,
    });
  }

  for (const product of products) {
    add({
      url: `${base}/products/${product.slug}`,
      lastModified: product.updatedAt,
      changeFrequency: "weekly",
      priority: product.featured ? 0.8 : 0.7,
    });
  }

  for (const brand of brands) {
    add({
      url: `${base}/brands/${brand.slug}`,
      lastModified: brand.updatedAt,
      changeFrequency: "monthly",
      priority: 0.8,
    });
  }

  for (const service of services) {
    add({
      url: `${base}/services/${service.slug}`,
      lastModified: service.updatedAt,
      changeFrequency: "monthly",
      priority: 0.7,
    });
  }

  for (const post of posts) {
    add({
      url: `${base}/blog/${post.slug}`,
      lastModified: post.updatedAt,
      changeFrequency: "yearly",
      priority: 0.6,
    });
  }

  return [...bySitemapUrl.values()];
}
