import type { MetadataRoute } from "next";
import { appUrl } from "@/lib/env";

/**
 * Crawl directives.
 *
 * Transactional, authenticated and administrative paths are disallowed, along
 * with the parameterised catalogue URLs that would otherwise generate an
 * unbounded set of near-duplicate pages.
 *
 * Rendered on request, for the same reason as the sitemap and with a sharper
 * consequence.
 *
 * Without this, Next prerenders robots.txt during the build — and the build
 * deliberately runs with no `.env`, because it must never need a database or a
 * configured environment to produce an image. `appUrl()` therefore returned its
 * development fallback, and every deployment served
 * `Sitemap: http://localhost:3000/sitemap.xml` to Google, permanently, however
 * carefully APP_URL was set afterwards.
 *
 * Nothing about the page was visibly wrong, which is what made it survive: the
 * sitemap itself was correct, because it is force-dynamic and reads APP_URL at
 * request time. Only the file pointing at it was stale.
 */
export const dynamic = "force-dynamic";

export default function robots(): MetadataRoute.Robots {
  const base = appUrl();

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin",
          "/admin/",
          "/account",
          "/account/",
          "/api/",
          "/enquiry",
          "/enquiry/",
          "/login",
          "/register",
          "/forgot-password",
          "/reset-password",
          "/track-order",
          "/search",
          // Faceted catalogue URLs: the canonical /products listing is the one
          // we want indexed, not every filter permutation.
          "/products?",
          "/*?q=",
          "/*?page=",
          "/*?brand=",
          "/*?category=",
          "/*?licence=",
          "/*?sort=",
        ],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
