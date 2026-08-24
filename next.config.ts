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
      { source: "/shop", destination: "/products", statusCode: 301 },
      { source: "/shop/:path*", destination: "/products", statusCode: 301 },
      { source: "/product/:slug", destination: "/products/:slug", statusCode: 301 },
      { source: "/category/:slug", destination: "/products", statusCode: 301 },
      { source: "/brand/:slug", destination: "/brands/:slug", statusCode: 301 },
      { source: "/cart", destination: "/enquiry", statusCode: 301 },
      { source: "/checkout", destination: "/enquiry", statusCode: 301 },
      { source: "/my-account", destination: "/account", statusCode: 301 },
      { source: "/index.php", destination: "/", statusCode: 301 },
      { source: "/index.html", destination: "/", statusCode: 301 },
      { source: "/home", destination: "/", statusCode: 301 },
      { source: "/contact-us", destination: "/contact", statusCode: 301 },
      { source: "/about-us", destination: "/about", statusCode: 301 },
      { source: "/privacy-policy", destination: "/privacy", statusCode: 301 },
      { source: "/terms-and-conditions", destination: "/terms", statusCode: 301 },

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
      /*
       * `statusCode: 301`, not `permanent: true`.
       *
       * `permanent` emits 308, which Google treats identically — but a
       * shopping feed, a link checker and a good deal of older tooling do not:
       * several follow 301 and stop at 308. These URLs exist to be followed by
       * exactly that kind of software, so they say 301.
       */
      { source: "/techzoid", destination: "/products", statusCode: 301 },
      { source: "/about-1", destination: "/about", statusCode: 301 },
      /*
       * `/careers` is deliberately *not* redirected.
       *
       * It was, briefly, and it is the exact hazard a permanent redirect
       * carries: a 301 is cached by browsers indefinitely, so had it shipped,
       * every visitor who followed it once would have been sent to /about
       * forever — including after the careers page existed, with no way to
       * reach them. The page now exists, and it answers this URL.
       */
      { source: "/corel-draw-software-services", destination: "/brands/corel", statusCode: 301 },
      {
        source: "/product-page/autocad-business-license",
        destination: "/products/autocad",
        statusCode: 301,
      },

      /*
       * ── The ones nobody had a list of ──────────────────────────────────
       *
       * There is now a list. It did not come from a Wix export — there still
       * isn't one — but from the backlink index: every URL on this domain that
       * another site currently links to. That is a better list than an export
       * would have been, because it is not "what the old site published", it is
       * "what the old site published that somebody else still points at".
       *
       * Sixty-five of the hundred and fourteen inbound links on this domain
       * were landing on a dead end or a generic listing. Fifty-one pointed at
       * `/product-page/*`, which the catch-all below swept to `/products`, and
       * eleven pointed at `/post/*`, which 404d outright.
       *
       * A catch-all redirect to a listing page is barely better than the 404 it
       * replaces. Google calls that pattern a soft 404 and treats a redirect
       * that lands somewhere unrelated as one — the link is followed, the value
       * is not passed, and a reader who clicked "Microsoft 365 Business
       * Standard" gets a page of two hundred other things. Every entry below
       * goes to the page about the thing that was linked.
       *
       * Where the catalogue has no equivalent — Autodesk Vault, 3ds Max,
       * AutoCAD LT, Microsoft 365 Apps for Business are all products this site
       * does not list — the destination is the nearest page that is honestly
       * about the subject, a brand or topic page, and never a different product.
       * Sending a link for AutoCAD LT to AutoCAD would be answering a question
       * nobody asked with a product that costs several times as much.
       *
       * Link counts are from the index reading on 23 August 2026 and are here
       * so the next person can tell a redirect that matters from one that does
       * not. Re-measure before removing any of them.
       */

      // ── Microsoft (30 links) ────────────────────────────────────────────
      {
        // 10 links
        source: "/product-page/microsoft-365-business-standard-annual-subscription",
        destination: "/products/microsoft-365-business-standard",
        statusCode: 301,
      },
      {
        // 10 links
        source: "/product-page/microsoft-365-business-basic-annual-subscription",
        destination: "/products/microsoft-365-business-basic",
        statusCode: 301,
      },
      {
        // 7 links
        source: "/product-page/m365-business-premium-annual-license",
        destination: "/products/microsoft-365-business-premium",
        statusCode: 301,
      },

      /*
       * ── The ones that rank rather than the ones that are linked ────────
       *
       * A second list, from the search index rather than the link index, and it
       * matters more than it looks. Every keyword this domain ranks for in
       * India — all seventeen of them — is held by a `/product-page/*` URL that
       * no longer exists. Google is still serving the Wix site. Whatever the
       * catch-all sends to `/products` is what it will eventually decide is a
       * soft 404, and those positions go with it.
       *
       * These three are the ranking URLs nobody links to, so the list above
       * missed them entirely. Positions and volumes are the India readings on
       * 23 August 2026.
       */
      {
        // Position 18 for "windows 11 pro for business", 260 a month, and this
        // one has an exact match.
        source: "/product-page/windows-11-pro-business-license",
        destination: "/products/windows-11-pro-upgrade",
        statusCode: 301,
      },

      // ── Autodesk (15 links) ─────────────────────────────────────────────
      {
        // 5 links
        source: "/product-page/autodesk-civil-3d-business-license",
        destination: "/products/autodesk-civil-3d",
        statusCode: 301,
      },
      {
        /*
         * Both AutoCAD LT URLs, and the only products in this list without a
         * page of their own that keep a redirect rather than a 410.
         *
         * `/autocad` states outright that AutoCAD LT was consolidated into the
         * main AutoCAD line. That is the answer to the question these URLs
         * ask, written on the page — which is what separates a replacement
         * from a brand page offered as a consolation. 2 inbound links.
         */
        source: "/product-page/autodesk-autocad-lt-1-year-subscription",
        destination: "/autocad",
        statusCode: 301,
      },
      {
        source: "/product-page/autocad-lt-business-license",
        destination: "/autocad",
        statusCode: 301,
      },
      {
        // 1 link
        source: "/product-page/autodesk-revit-business-license",
        destination: "/products/revit",
        statusCode: 301,
      },

      // ── Adobe (5 links) ─────────────────────────────────────────────────
      {
        // 4 links. The old slug ran the words together; same product.
        source: "/product-page/adobeacrobatprodc1yearsubscription",
        destination: "/products/adobe-acrobat-pro-teams",
        statusCode: 301,
      },
      {
        // 1 link
        source: "/product-page/adobe-creative-cloud-all-apps",
        destination: "/products/adobe-creative-cloud-all-apps-teams",
        statusCode: 301,
      },

      /*
       * There is no catch-all any more.
       *
       * `/product-page/:slug*` used to sweep whatever the list above missed to
       * `/products`. That is the soft-404 pattern in its purest form — a
       * listing page answering a question about one product — and it is what
       * put six URLs into a Merchant Center report while looking, from the
       * outside, like a working redirect.
       *
       * What the list above misses now reaches `proxy.ts` and is answered 410
       * Gone: the old catalogue is not sold here, and saying so once is worth
       * more than pointing every dead product at a page of two hundred others.
       */

      /*
       * ── Wix's blog, at `/post/<slug>` ──────────────────────────────────
       *
       * Eleven inbound links, every one of them a 404 until now: the pattern
       * was simply never redirected. `/blog-1/*` below was, which is the Wix
       * *listing* path — the individual posts live at `/post/*` and were
       * missed.
       *
       * The four with named destinations are the four anybody links to. None of
       * those articles was carried over, so each goes to the page on this site
       * that answers the same question rather than to a blog index that does
       * not mention it.
       */
      {
        // 6 links: "Why your business needs a Microsoft Office 365 license"
        source: "/post/why-your-business-needs-a-microsoft-office-365-license",
        destination: "/microsoft-365",
        statusCode: 301,
      },
      {
        // 4 links: "Where can I buy a subscription for professional office
        // software bundles in India"
        source:
          "/post/where-can-i-buy-a-subscription-for-professional-office-software-bundles-in-india",
        destination: "/microsoft-365",
        statusCode: 301,
      },
      {
        // 1 link: "Windows 11 in 2026 — still worth buying or already outdated"
        source: "/post/windows-11-in-2026-still-worth-buying-or-already-outdated",
        destination: "/products/windows-11-pro-upgrade",
        statusCode: 301,
      },
      {
        // 1 link: "Top 5 reasons businesses should upgrade to Windows 11 Pro"
        source: "/post/top-5-reasons-businesses-should-upgrade-to-windows-11-pro-in-2025",
        destination: "/products/windows-11-pro-upgrade",
        statusCode: 301,
      },

      /*
       * Wix's forum, which this site does not have. Three inbound links, all to
       * one discussion thread. The articles are the nearest thing to it.
       */
      { source: "/group/:path*", destination: "/blog", statusCode: 301 },

      /*
       * Wix's own reserved paths, which it published on every site and which
       * do not exist here.
       */
      { source: "/blog-1/:path*", destination: "/blog", statusCode: 301 },
      /*
       * `:slug` and not `:slug*`. A repeated parameter has to occupy its own
       * path segment — `/copy-of-:slug*` is rejected at build time with "Can
       * not repeat slug without a prefix and suffix", because the `copy-of-`
       * prefix leaves it nowhere to repeat into. These pages are always a
       * single segment anyway.
       */
      { source: "/copy-of-:slug", destination: "/", statusCode: 301 },
      { source: "/_partials/:path*", destination: "/", statusCode: 301 },
    ];
  },
};

export default nextConfig;
