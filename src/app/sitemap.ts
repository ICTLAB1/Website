import type { MetadataRoute } from "next";
import { prisma } from "@/lib/db";
import { appUrl } from "@/lib/env";
import { getNavigationPaths } from "@/lib/queries/navigation";
import { getPublishedPageSlugs } from "@/lib/queries/pages";

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

  const [products, brands, services, posts, cmsPages, navPaths] = await Promise.all([
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
  ]);

  const entries: MetadataRoute.Sitemap = [];

  for (const route of navPaths) {
    if (EXCLUDED.has(route)) continue;
    entries.push({
      url: `${base}${route === "/" ? "" : route}`,
      lastModified: now,
      changeFrequency: route === "/" ? "daily" : "weekly",
      priority: route === "/" ? 1 : route === "/products" ? 0.9 : 0.7,
    });
  }

  // CMS pages now carry a real `updatedAt`, so the sitemap can report when a
  // page actually changed instead of claiming every page changed on every build.
  for (const page of cmsPages) {
    entries.push({
      url: `${base}/${page.slug}`,
      lastModified: page.updatedAt,
      changeFrequency: "monthly",
      // Vendor overview pages sit one level above their product pages.
      priority: page.slug.includes("/") ? 0.7 : 0.8,
    });
  }

  for (const product of products) {
    entries.push({
      url: `${base}/products/${product.slug}`,
      lastModified: product.updatedAt,
      changeFrequency: "weekly",
      priority: product.featured ? 0.8 : 0.7,
    });
  }

  for (const brand of brands) {
    entries.push({
      url: `${base}/brands/${brand.slug}`,
      lastModified: brand.updatedAt,
      changeFrequency: "monthly",
      priority: 0.8,
    });
  }

  for (const service of services) {
    entries.push({
      url: `${base}/services/${service.slug}`,
      lastModified: service.updatedAt,
      changeFrequency: "monthly",
      priority: 0.7,
    });
  }

  for (const post of posts) {
    entries.push({
      url: `${base}/blog/${post.slug}`,
      lastModified: post.updatedAt,
      changeFrequency: "yearly",
      priority: 0.6,
    });
  }

  return entries;
}
