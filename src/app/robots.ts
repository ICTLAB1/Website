import type { MetadataRoute } from "next";
import { appUrl } from "@/lib/env";

/**
 * Crawl directives.
 *
 * Transactional, authenticated and administrative paths are disallowed, along
 * with the parameterised catalogue URLs that would otherwise generate an
 * unbounded set of near-duplicate pages.
 */
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
