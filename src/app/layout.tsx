import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import Link from "next/link";
import "./globals.css";

import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { BasketProvider } from "@/components/enquiry/basket-provider";
import { ToastProvider } from "@/components/ui/toast";
import { JsonLd, organizationSchema, websiteSchema } from "@/lib/seo";
import { appUrl } from "@/lib/env";
import { getSiteIdentity } from "@/lib/site-config";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  metadataBase: new URL(appUrl()),
  title: {
    default: "Enterprise Software Licensing, Cloud & IT Solutions",
    /*
     * The suffix is the trading name, not a description of the business.
     *
     * It used to be "| Enterprise Technology Procurement" — thirty-six
     * characters appended to every title on the site, before the page had said
     * anything of its own. Search results cut a title off at roughly sixty, so
     * on a product page that suffix was consuming most of the budget and often
     * being truncated itself. The trading name is what a searcher recognises
     * and is what belongs there.
     */
    template: `%s | ${getSiteIdentity().tradingName}`,
  },
  description:
    "Microsoft, Adobe, Autodesk, Zoho and enterprise technology solutions from one trusted procurement partner. Consolidated quotations, GST invoicing and licence management.",
  applicationName: "Enterprise Technology Marketplace",
  formatDetection: { telephone: false, address: false, email: false },
  robots: { index: true, follow: true },
};

/**
 * Nothing under this layout can be static, so say so rather than let Next
 * discover it by accident.
 *
 * `<Header />` reads the session cookie to decide between "Sign in" and the
 * account menu. That has always made every page dynamic — but the way Next
 * *learned* it was by attempting a prerender and catching the cookie access,
 * which only works if nothing throws a real error first.
 *
 * Something did. This layout awaits `organizationSchema()`, which reads the
 * company's address and contact details, and those moved into the database.
 * During a Docker build there is no database, so Prisma threw a connection
 * error before the header could throw the dynamic-usage signal — and Next
 * reported a genuine prerender failure on /about instead of marking the route
 * dynamic. The build exited 1.
 *
 * Declaring it removes the guesswork permanently: no route is probed, so no
 * build-time query can fail, and adding another database read to a layout
 * cannot resurrect this. It costs nothing, because every one of these routes
 * was already being rendered on demand.
 */
export const dynamic = "force-dynamic";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#201c18",
  colorScheme: "light",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IN" className={inter.variable}>
      <body className="flex min-h-dvh flex-col bg-white antialiased">
        {/* First tab stop on every page. */}
        <Link
          href="#main-content"
          className="sr-only-focusable absolute left-4 top-4 z-[100] rounded-[--radius-md] bg-graphite-900 px-4 py-2 text-sm font-medium text-white"
        >
          Skip to main content
        </Link>

        <ToastProvider>
          <BasketProvider>
            <Header />
            <main id="main-content" className="flex-1">
              {children}
            </main>
            <Footer />
          </BasketProvider>
        </ToastProvider>

        <JsonLd data={await organizationSchema()} />
        <JsonLd data={await websiteSchema()} />
      </body>
    </html>
  );
}
