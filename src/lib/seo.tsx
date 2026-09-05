import type { Metadata } from "next";
import { appUrl } from "@/lib/env";
import { getSiteConfig, getSiteIdentity } from "@/lib/site-config";

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

/**
 * The card a link to this site unfurls into.
 *
 * ## Why this file exists at all
 *
 * There was no image, and `twitter:card` was already declared as
 * `summary_large_image` — a card type that requires one. So every share of
 * every page was asking for a large-image card and supplying nothing, which is
 * worse than the small card it would otherwise have got.
 *
 * ## Why it is not the logo on its own
 *
 * A lockup is 3:1 and every platform crops to roughly 1.91:1, so the bare logo
 * arrives as a thin strip floating in padding. The card places the supplied
 * lockup in a composition that fills the frame instead.
 *
 * It is a PNG for a second reason: **SVG is not accepted for `og:image` by
 * Facebook, LinkedIn or X**. They fetch the URL and give up.
 *
 * ## One card, not one per page
 *
 * A per-page image would be better and is not free: it needs either a designed
 * asset per route or a runtime renderer, and a wrong-but-present image is not
 * an improvement on a right-but-generic one. The title and description in the
 * card's text come from the page itself, which is where the per-page
 * information actually lives.
 */
const SOCIAL_CARD = {
  path: "/og/techzoid-card.png",
  width: 1200,
  height: 630,
  type: "image/png",
  /*
   * Describes the card, not the company. This is read aloud by a screen reader
   * on platforms that surface it, and "TechZoid Technologies logo" would be
   * wrong — the card is a titled banner, and the logo is one part of it.
   */
  alt: "TechZoid — enterprise software licensing, cloud and IT solutions",
} as const;

export function buildMetadata(input: {
  title: string;
  /**
   * Use the title exactly as given, without the site-wide `%s | TechZoid`
   * suffix the root layout appends.
   *
   * For a title somebody wrote for the search result. The suffix is right when
   * a page supplies its own name and the layout completes it; it is wrong when
   * the whole string has been composed to fit sixty-two characters, because
   * appending eleven more either pushes it past the cut or repeats a trading
   * name the author already placed.
   */
  absoluteTitle?: boolean;
  description: string;
  path: string;
  type?: "website" | "article";
  publishedTime?: Date | string | null;
  modifiedTime?: Date | string | null;
  /**
   * Keep this page out of the index.
   *
   * Two different reasons, and they want different directives:
   *
   * - `true` — the page is **private or transactional**. Checkout, sign-in, an
   *   account screen. Nothing on it should be indexed and nothing linked from
   *   it should be crawled on its account, so it gets `noindex, nofollow`.
   * - `"thin"` — the page is **public and legitimate but not worth an index
   *   entry**. A brand page with no products behind it is the case this exists
   *   for: it is a real page a link may land on, it just should not compete in
   *   search. It gets `noindex, follow`, because `nofollow` on a page that
   *   carries the whole site navigation throws away crawl paths for no reason.
   *
   * Getting this backwards is quiet rather than loud, which is why it is two
   * named cases instead of a second boolean nobody would remember to set.
   */
  noIndex?: boolean | "thin";
  keywords?: string[];
}): Metadata {
  // Synchronous on purpose: `buildMetadata` is called at module scope by
  // `export const metadata` in 46 route files, where nothing can be awaited.
  // It needs only the site name, which is why the name stayed in the
  // environment when the contact details moved into the database.
  const config = getSiteIdentity();
  const url = absoluteUrl(input.path);
  const siteName = config.tradingName;

  return {
    title: input.absoluteTitle ? { absolute: input.title } : input.title,
    description: input.description,
    ...(input.keywords?.length ? { keywords: input.keywords } : {}),
    alternates: { canonical: url },
    // See `noIndex` above: `true` is a private page and takes nofollow with it;
    // "thin" is a public page that simply should not be in the index, and keeps
    // follow so its outbound links still count.
    robots: input.noIndex
      ? { index: false, follow: input.noIndex === "thin", nocache: true }
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
      // Absolute. `metadataBase` would resolve a relative path, but a share
      // scraper is not a browser and several fetch the raw attribute.
      images: [
        {
          url: absoluteUrl(SOCIAL_CARD.path),
          width: SOCIAL_CARD.width,
          height: SOCIAL_CARD.height,
          type: SOCIAL_CARD.type,
          alt: SOCIAL_CARD.alt,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: input.title,
      description: input.description,
      images: [{ url: absoluteUrl(SOCIAL_CARD.path), alt: SOCIAL_CARD.alt }],
    },
  };
}

/**
 * Serialises structured data for embedding in a script element.
 *
 * `<` is escaped to \u003c so that a "</script>" appearing inside any string
 * value cannot terminate the element and inject markup. Every JSON-LD block in
 * the application goes through this function - none serialise inline.
 */
export function jsonLdHtml(data: Record<string, unknown>): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

/** Renders a JSON-LD block. Content is serialised, never interpolated as HTML. */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdHtml(data) }} />
  );
}

/**
 * The logo Google reads, as a raster.
 *
 * A 900 px reduction of the supplied master, not a separate drawing, so this
 * and the lockup in the header cannot diverge into different marks. It shares
 * the path with the quotation letterhead, which looks for exactly this name —
 * see `lib/pdf/assets.ts`.
 */
const ORGANISATION_LOGO = "/logo.png";

export async function organizationSchema() {
  const config = await getSiteConfig();
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: config.entityName,
    alternateName: config.tradingName,
    url: config.url,
    logo: absoluteUrl(ORGANISATION_LOGO),
    /*
     * The GSTIN, which is what `taxID` means for an Indian business.
     *
     * Worth publishing: a buyer's finance team checks it before raising a
     * purchase order, and a registration number that is machine-readable is
     * one they do not have to retype off a PDF. Omitted entirely rather than
     * emitted empty when it is not configured — an empty `taxID` is a claim to
     * have one and to have lost it.
     */
    ...(config.gstin ? { taxID: config.gstin } : {}),
    /*
     * `sameAs`: the profiles this organisation also appears on.
     *
     * This is the property Google uses to decide that a LinkedIn page, a GeM
     * seller profile and this domain are one business rather than three — which
     * is what makes a mention somewhere else count towards this site at all.
     * There is a field for it on the settings screen and it ships empty,
     * because not one social or directory URL exists anywhere in this
     * repository and a guessed one would assert, in the block search engines
     * trust most, that somebody else's page belongs to this company.
     *
     * Omitted entirely when nothing is configured. An empty `sameAs` array is
     * not "we have no profiles" to a parser — it is a malformed claim to have
     * some, and Google's validator says so.
     */
    ...(config.profileUrls.length > 0 ? { sameAs: config.profileUrls } : {}),
    description:
      "Enterprise software licensing, cloud and IT solutions across Microsoft, Adobe, Autodesk, Zoho and enterprise infrastructure manufacturers.",
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
    /*
     * A second office, as a `location` rather than a second `address`.
     *
     * `address` is the organisation's own registered address and there is one
     * of those — the Indian entity's, which is what the GSTIN above belongs to.
     * A branch is a place the organisation operates from, which is what
     * `location` means, and keeping them apart is what stops a parser reading
     * an overseas office as the registered seat of an Indian company.
     *
     * Unparsed, deliberately. The address is one free-text field an
     * administrator types, and splitting it into `addressLocality`,
     * `addressRegion` and `addressCountry` would mean guessing which comma is
     * the city — a guess that is wrong the first time somebody enters an
     * address in a format this code did not anticipate. `streetAddress` alone
     * is valid, and it says only what is actually known.
     */
    ...(config.secondaryEntity
      ? {
          location: [
            {
              "@type": "Place",
              name: config.secondaryEntity.name,
              address: {
                "@type": "PostalAddress",
                streetAddress: config.secondaryEntity.address.replace(/\s*\n\s*/g, ", "),
              },
              ...(config.secondaryEntity.phone
                ? { telephone: config.secondaryEntity.phone }
                : {}),
            },
          ],
        }
      : {}),
  };
}

/**
 * The registered office, as a place search can surface for a "near me" or
 * city-qualified query — an IT reseller or software licensing partner in a
 * named city or locality — which `organizationSchema` above cannot do on its
 * own: `PostalAddress` nested under `Organization.address` identifies *whose*
 * address it is, but only a `LocalBusiness` (or a subtype of it) is what
 * Google's local ranking and Maps panel actually look for.
 *
 * Gated on `config.hasAddress`, the same condition the contact page itself
 * uses to decide whether to render an office card at all — this schema never
 * states more than what a visitor to that page can already read, and emits
 * nothing on a deployment that has not configured an address.
 */
export async function localBusinessSchema() {
  const config = await getSiteConfig();
  if (!config.hasAddress) return null;

  return {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: config.tradingName,
    alternateName: config.entityName !== config.tradingName ? config.entityName : undefined,
    url: config.url,
    image: absoluteUrl(ORGANISATION_LOGO),
    logo: absoluteUrl(ORGANISATION_LOGO),
    address: {
      "@type": "PostalAddress",
      streetAddress: [config.address.line1, config.address.line2].filter(Boolean).join(", "),
      addressLocality: config.address.city,
      addressRegion: config.address.state,
      postalCode: config.address.postcode,
      addressCountry: config.address.country,
    },
    ...(config.phone.sales ? { telephone: config.phone.sales } : {}),
    ...(config.email.sales ? { email: config.email.sales } : {}),
    // Same reasoning as `organizationSchema`'s `sameAs`: only ever the
    // profiles an administrator has actually entered, never inferred.
    ...(config.profileUrls.length > 0 ? { sameAs: config.profileUrls } : {}),
    ...(config.gstin ? { taxID: config.gstin } : {}),
    /*
     * `priceRange` and structured `openingHoursSpecification` are deliberately
     * absent. Both are real schema.org properties Google's LocalBusiness
     * validator checks for, and both would have to be invented here — there is
     * no stored price band (this is a B2B quote-and-licence business, not a
     * storefront with a menu) and `supportHours` is free text an administrator
     * writes for humans, not a parsed day/time table. A fabricated value in
     * either field is worse than an absent one: it is a specific, checkable
     * claim with nothing behind it.
     */
  };
}

export async function websiteSchema() {
  const config = await getSiteConfig();
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
