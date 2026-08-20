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
    ];
  },
};

export default nextConfig;
