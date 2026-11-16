import type { MetadataRoute } from "next";
import { appUrl } from "@/lib/env";
import { FACET_DISALLOW } from "@/lib/crawl-rules";

/**
 * Crawl directives.
 *
 * Transactional, authenticated and administrative paths are disallowed, and so
 * are the combinatorial filter URLs of the catalogue (see `FACET_DISALLOW`).
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
          /*
           * The faceted catalogue URLs: blocked, but only the combinatorial
           * ones. See `FACET_DISALLOW` for the rules and, more usefully, for why
           * an earlier version of this file that removed them was wrong.
           *
           * Short version: `noindex` keeps a page out of the index but not out
           * of the crawl, and the crawl is the cost. Without these, Search
           * Console found ~257,000 filter permutations in three weeks.
           * Indexation of what is *not* blocked is still decided per view in
           * `generateMetadata`.
           */
          ...FACET_DISALLOW,
        ],
      },
    ],
    // No `host`: Google ignores the directive, and it is a Yandex-only extension
    // this site has no use for.
    sitemap: `${base}/sitemap.xml`,
  };
}
