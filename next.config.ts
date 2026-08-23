import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // Never ship source maps of server code, and do not advertise the framework.
  productionBrowserSourceMaps: false,
  poweredByHeader: false,

  // A build must not succeed with type errors. Linting runs as its own step
  // (`npm run lint`) because Next 16 no longer runs ESLint during the build.
  typescript: { ignoreBuildErrors: false },

  images: {
    formats: ["image/avif", "image/webp"],
    // No remote image hosts are configured: all imagery is local or inline SVG,
    // which removes an SSRF surface from the image optimiser.
    remotePatterns: [],
  },

  experimental: {
    // Keeps large server-only dependencies out of the client graph.
    optimizePackageImports: ["@prisma/client"],

    /*
     * Server Actions accept 1 MB by default, and product photographs are
     * uploaded through one.
     *
     * Without this, `MAX_PHOTO_BYTES` was a limit the code stated and could not
     * enforce: a 1.5 MB photograph — an ordinary size for one — was rejected by
     * the framework before the action ran, so the person uploading it got an
     * opaque failure instead of the message explaining what to do. A stated
     * limit that is not the real limit is worse than a lower one.
     *
     * Set above `MAX_PHOTO_BYTES` (2 MB) with room for multipart framing and
     * the other fields in the form, not generously above it. This applies to
     * every Server Action, so it is a ceiling on what any of them can be handed
     * — the individual limits that matter are still enforced per action, and a
     * brand logo is still refused past 512 KB.
     */
    serverActions: { bodySizeLimit: "3mb" },
  },

  async headers() {
    return [
      {
        // Baseline headers for every response, including static assets that the
        // proxy matcher deliberately skips. The proxy adds the CSP and HSTS
        // for document requests.
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
      {
        // API responses are never cacheable by a shared cache.
        source: "/api/:path*",
        headers: [
          { key: "Cache-Control", value: "no-store, max-age=0" },
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
        ],
      },
    ];
  },

  async redirects() {
    return [
      // Legacy-style URLs are redirected to their clean equivalents rather than
      // being left to 404, so any existing inbound links keep working.
      { source: "/shop", destination: "/products", permanent: true },
      { source: "/shop/:path*", destination: "/products", permanent: true },
      { source: "/product/:slug", destination: "/products/:slug", permanent: true },
      { source: "/category/:slug", destination: "/products", permanent: true },
      { source: "/brand/:slug", destination: "/brands/:slug", permanent: true },
      { source: "/cart", destination: "/enquiry", permanent: true },
      { source: "/checkout", destination: "/enquiry", permanent: true },
      { source: "/my-account", destination: "/account", permanent: true },
      { source: "/index.php", destination: "/", permanent: true },
      { source: "/index.html", destination: "/", permanent: true },
      { source: "/home", destination: "/", permanent: true },
      { source: "/contact-us", destination: "/contact", permanent: true },
      { source: "/about-us", destination: "/about", permanent: true },
      { source: "/privacy-policy", destination: "/privacy", permanent: true },
      { source: "/terms-and-conditions", destination: "/terms", permanent: true },

      /*
       * ── URLs from the Wix site this one replaces ────────────────────────
       *
       * These are indexed, and the pages behind them carry contact details
       * that are no longer correct — an old number and an old address on a
       * techzoidgroup.com mailbox. Left to 404 they would keep that
       * information in front of anyone who found them, and lose whatever
       * ranking they hold. A 301 moves both.
       *
       * Each of these points at the closest live equivalent, verified to
       * return 200. Where there is no equivalent — a product page for a
       * licence that is now quoted rather than listed — the brand page is the
       * honest destination: it answers the question the searcher had.
       */
      { source: "/techzoid", destination: "/products", permanent: true },
      { source: "/about-1", destination: "/about", permanent: true },
      /*
       * `/careers` is the one here I would argue about.
       *
       * A 301 is cached by browsers indefinitely, so if this business ever
       * publishes a careers page, every visitor who followed this redirect
       * once will keep being sent to /about and there is no way to reach them.
       * A 307 costs a little ranking transfer and stays reversible. It is
       * permanent because that is what was asked for — say the word and it
       * becomes temporary.
       */
      { source: "/careers", destination: "/about", permanent: true },
      { source: "/corel-draw-software-services", destination: "/brands/corel", permanent: true },
      {
        source: "/product-page/autocad-business-license",
        destination: "/products/autocad",
        permanent: true,
      },
      {
        source: "/product-page/buycoreldrawgraphicssuite2025lifetimelicense",
        destination: "/brands/corel",
        permanent: true,
      },
      {
        source: "/product-page/microsoft-sharepoint-online-plan-2",
        destination: "/brands/microsoft",
        permanent: true,
      },
      {
        source: "/product-page/microsoft-windows-10-pro-64-bit-system-builder-oem",
        destination: "/brands/microsoft",
        permanent: true,
      },

      /*
       * ── The ones nobody has a list of ──────────────────────────────────
       *
       * There is no Wix export, no archived sitemap and nothing in this
       * repository's history recording what the old site published, so the
       * seven above are the ones somebody happened to notice. The rest are
       * still indexed and still 404.
       *
       * A catch-all is a blunt instrument and is the right one here. Sending
       * an unknown `/product-page/*` to the catalogue is not a great answer,
       * but it is a live page in the right section rather than a dead end, and
       * Google treats a 301 to a relevant page far better than a 404.
       *
       * Ordered last on purpose: Next matches redirects top to bottom, so the
       * specific slugs above win and only what they miss falls through here.
       */
      { source: "/product-page/:slug*", destination: "/products", permanent: true },

      /*
       * Wix's own reserved paths, which it published on every site and which
       * do not exist here.
       */
      { source: "/blog-1/:path*", destination: "/blog", permanent: true },
      /*
       * `:slug` and not `:slug*`. A repeated parameter has to occupy its own
       * path segment — `/copy-of-:slug*` is rejected at build time with "Can
       * not repeat slug without a prefix and suffix", because the `copy-of-`
       * prefix leaves it nowhere to repeat into. These pages are always a
       * single segment anyway.
       */
      { source: "/copy-of-:slug", destination: "/", permanent: true },
      { source: "/_partials/:path*", destination: "/", permanent: true },
    ];
  },
};

export default nextConfig;
