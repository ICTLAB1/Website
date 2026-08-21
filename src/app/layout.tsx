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

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  metadataBase: new URL(appUrl()),
  title: {
    default: "Enterprise Software Licensing, Cloud & IT Solutions",
    template: "%s | Enterprise Technology Procurement",
  },
  description:
    "Microsoft, Adobe, Autodesk, Zoho and enterprise technology solutions from one trusted procurement partner. Consolidated quotations, GST invoicing and licence management.",
  applicationName: "Enterprise Technology Marketplace",
  formatDetection: { telephone: false, address: false, email: false },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#201c18",
  colorScheme: "light",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
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

        <JsonLd data={organizationSchema()} />
        <JsonLd data={websiteSchema()} />
      </body>
    </html>
  );
}
