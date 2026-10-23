import type { MetadataRoute } from "next";
import { appUrl } from "@/lib/env";

/**
 * Crawl directives.
 *
 * Transactional, authenticated and administrative paths are disallowed. The
 * parameterised catalogue URLs are not, and the block below says why: they are
 * handled with `noindex`, which a `Disallow` would prevent a crawler from ever
 * reading.
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
           * The faceted catalogue URLs used to be disallowed here — "/products?",
           * "/*?brand=", "/*?category=", "/*?licence=", "/*?sort=", "/*?page=".
           * They are gone, and that is a correction rather than a relaxation.
           *
           * Those views already answer `noindex` from `generateMetadata`, and a
           * `Disallow` stops a crawler fetching the page at all — so it never
           * reads the `noindex` and never reads the canonical either. The two
           * directives do not reinforce each other; the robots rule disables the
           * meta rule it was meant to back up. A blocked URL that is linked from
           * somewhere can still be indexed, on anchor text alone, with no
           * content and no canonical to point anywhere better. That is the
           * outcome this list was written to prevent.
           *
           * It cost discovery as well. `/*?page=` made every page of the
           * catalogue after the first uncrawlable, and `/*?brand=` and
           * `/*?category=` matched any path, not just the catalogue — including
           * the filtered views the navigation itself links to. The product pages
           * survived on the sitemap; the internal links into them led nowhere.
           *
           * Indexation is decided per view in `generateMetadata`, which is the
           * one place that knows whether a view is a landing page or a
           * permutation: the three hardware families index, everything else
           * does not. `verify:seo` checks both halves of that.
           */
        ],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
