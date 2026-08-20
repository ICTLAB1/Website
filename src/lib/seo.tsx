import type { Metadata } from "next";
import { appUrl } from "@/lib/env";
import { getSiteConfig } from "@/lib/site-config";

/**
 * Metadata helpers.
 *
 * Every page gets an absolute canonical URL, a distinct title and description,
 * and matching Open Graph / Twitter data built from one source.
 */

export function absoluteUrl(path: string): string {
  const base = appUrl();
  if (!path || path === "/") return base;
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

export function buildMetadata(input: {
  title: string;
  description: string;
  path: string;
  type?: "website" | "article";
  publishedTime?: Date | string | null;
  modifiedTime?: Date | string | null;
  noIndex?: boolean;
  keywords?: string[];
}): Metadata {
  const config = getSiteConfig();
  const url = absoluteUrl(input.path);
  const siteName = config.tradingName;

  return {
    title: input.title,
    description: input.description,
    ...(input.keywords?.length ? { keywords: input.keywords } : {}),
    alternates: { canonical: url },
    // noIndex covers transactional and account pages, which must never be
    // indexed even though they are reachable.
    robots: input.noIndex
      ? { index: false, follow: false, nocache: true }
      : {
          index: true,
          follow: true,
          googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
        },
    openGraph: {
      type: input.type ?? "website",
      title: input.title,
      description: input.description,
      url,
      siteName,
      locale: "en_IN",
      ...(input.publishedTime ? { publishedTime: new Date(input.publishedTime).toISOString() } : {}),
      ...(input.modifiedTime ? { modifiedTime: new Date(input.modifiedTime).toISOString() } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: input.title,
      description: input.description,
    },
  };
}

/** Renders a JSON-LD block. Content is serialised, never interpolated as HTML. */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      // JSON.stringify output is escaped below so a "</script>" inside any
      // string value cannot break out of the element.
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}

export function organizationSchema() {
  const config = getSiteConfig();
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: config.entityName,
    alternateName: config.tradingName,
    url: config.url,
    description:
      "Enterprise software licensing, cloud and IT solutions across Microsoft, Adobe, Autodesk, Zoho and enterprise infrastructure vendors.",
    ...(config.email.sales || config.phone.sales
      ? {
          contactPoint: [
            {
              "@type": "ContactPoint",
              contactType: "sales",
              ...(config.email.sales ? { email: config.email.sales } : {}),
              ...(config.phone.sales ? { telephone: config.phone.sales } : {}),
              areaServed: config.address.country,
              availableLanguage: ["en"],
            },
          ],
        }
      : {}),
    ...(config.hasAddress
      ? {
          address: {
            "@type": "PostalAddress",
            streetAddress: [config.address.line1, config.address.line2].filter(Boolean).join(", "),
            addressLocality: config.address.city,
            addressRegion: config.address.state,
            postalCode: config.address.postcode,
            addressCountry: config.address.country,
          },
        }
      : {}),
  };
}

export function websiteSchema() {
  const config = getSiteConfig();
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: config.tradingName,
    url: config.url,
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${config.url}/search?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}
