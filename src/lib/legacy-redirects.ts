/**
 * Redirects for the previous (Wix) site's URLs that Search Console still
 * reports, 17 November 2026.
 *
 * Plain data with no imports, because `next.config.ts` loads it before the
 * application's path aliases exist — and so a test can read the same table the
 * server uses.
 *
 * ## The rule every entry has to pass
 *
 * A redirect is only worth having where the destination answers the question
 * the old URL asked. Google reads a redirect to an unrelated page as a soft
 * 404, which discards the signal and keeps crawling, so a plausible-looking
 * destination is worse than an honest 410: it spends the redirect and still
 * leaves the URL on the report. Each product below is therefore one of:
 *
 * - **the same product**, at its current address;
 * - **its successor**, where the old version is end-of-life and the page says
 *   so (Windows Server 2022 → 2025, BIM 360 → Autodesk Construction Cloud);
 * - **the page that contains it** (Defender for Business is part of Business
 *   Premium; a toolset is part of an AutoCAD subscription); or
 * - **the publisher's hub**, where this site sells that publisher but not that
 *   product. That is the weakest, and is used only where asked for.
 *
 * A retired product with none of those is not here, and is answered 410 by
 * `proxy.ts`.
 *
 * Every `/product-page/<slug>` entry is emitted twice, once under `/ar/`: the
 * abandoned Arabic tree repeated the product URLs, and generating both from one
 * table keeps them from drifting apart.
 */

export type LegacyRedirect = { source: string; destination: string; statusCode: 301 };

const MICROSOFT_HUB = "/brands/microsoft";
const AUTODESK_HUB = "/brands/autodesk";

/** `/product-page/<slug>` → current page. Slugs already ruled on in next.config.ts are not repeated. */
export const PRODUCT_PAGE_REDIRECTS: Record<string, string> = {
  // Same product.
  "microsoft-sql-server-2022-standard": "/products/sql-server-2022-standard",
  "microsoft-sql-server-2022-enterprise": "/products/sql-server-2022-enterprise",
  "inventor-business-license": "/products/autodesk-inventor",
  "microsoft365businesspremiumannuallicense": "/products/microsoft-365-business-premium",
  "m365-business-premium": "/products/microsoft-365-business-premium",

  // Successor: the old version is end of life.
  "windows-server-2022-datacenter-2-core-license": "/products/windows-server-2025-datacenter",
  "windowsserver2022standard16corelicense": "/products/windows-server-2025-standard",
  "microsoft-windows-server-2019-standard-x64-en-ipk-dsp-dvd-16core": "/products/windows-server-2025-standard",
  "microsoft-windows-10-professional-32bit-64bit-english-intl-for-1-pc-laptop-user": "/products/windows-11-pro-upgrade",
  "windows-10-11-pro-oem-key-stickers": "/products/windows-11-pro-upgrade",
  "ms-office-2021-pro-plus-box-pack-for-windows": "/products/microsoft-office-ltsc-professional-plus-2024",
  "microsoft-office-home-business-2021-one-time-purchase-for-1-pc-or-mac": "/products/microsoft-office-home-and-business-2024",
  "autodesk-bim-360-business-license": "/autodesk-construction-cloud",

  // The page that contains it.
  "autocadspecializedtoolset1yearsubscription": "/products/autocad",
  "microsoft-defender-for-business": "/microsoft-365/business-premium",
  "microsoft-teams-essentials": "/microsoft-365",
  "microsoft-sharepoint-online-plan-1": "/microsoft-365",
  "microsoft-sharepoint-online-plan-2": "/microsoft-365",

  // The publisher's hub: sold here as a publisher, not as this product.
  "autodesk-alias-business-license": AUTODESK_HUB,
  "microsoft-project-plan-1": MICROSOFT_HUB,
  "microsoft-project-plan-3": MICROSOFT_HUB,
  "microsoft-project-plan-5": MICROSOFT_HUB,
  "microsoft-visual-studio-professional": MICROSOFT_HUB,
  "microsoft-windows-10-home-english-intl-32-and-64-bits-on-usb-3-0-included-ful": MICROSOFT_HUB,
};

/** `/post/<slug>`: each goes to the article or page that answers the same question. */
export const POST_REDIRECTS: Record<string, string> = {
  "best-cybersecurity-tools-for-businesses-in-2026": "/solutions/security-compliance",
  "what-is-microsoft-defender-for-business-complete-guide-for-smb-security-2026":
    "/blog/microsoft-365-business-premium-security-you-already-own",
  "where-can-i-buy-a-discounted-annual-subscription-for-office-software-in-india": "/microsoft-365",
  "windows-10-vs-windows-11-should-businesses-upgrade-in-2026": "/products/windows-11-pro-upgrade",
  "why-buying-software-from-authorized-resellers-matters-in-2025":
    "/blog/how-to-buy-genuine-microsoft-licences-in-india",
  "windows-12-is-coming-should-you-buy-windows-11-in-2025": "/products/windows-11-pro-upgrade",
  "microsoft-365-vs-microsoft-office-what-s-the-difference":
    "/blog/microsoft-office-ltsc-2024-vs-microsoft-365",
  "windows-11-pro-vs-home-what-s-the-difference": "/products/windows-11-pro-upgrade",
  "why-civil-engineering-firms-need-autodesk-civil-3d-in-2026": "/solutions/architecture-construction",
  // A listicle with no article or page that answers it. The blog index is the
  // honest remainder, and was asked for by name.
  "top-productivity-software-by-leading-tech-companies": "/blog",
};

const permanent = (source: string, destination: string): LegacyRedirect => ({
  source,
  destination,
  statusCode: 301,
});

export const legacyRedirects: LegacyRedirect[] = [
  ...Object.entries(PRODUCT_PAGE_REDIRECTS).flatMap(([slug, destination]) => [
    permanent(`/product-page/${slug}`, destination),
    permanent(`/ar/product-page/${slug}`, destination),
  ]),
  ...Object.entries(POST_REDIRECTS).map(([slug, destination]) => permanent(`/post/${slug}`, destination)),

  // Wix's blog index pages. Every tag and category was a listing, and the blog
  // index is the listing that replaced them.
  permanent("/blog/tags/:slug", "/blog"),
  permanent("/blog/categories/:slug", "/blog"),

  // The services listing replaces every Wix service page; none of them was a
  // service this site carries under that name.
  permanent("/service-page/:slug", "/services"),

  permanent("/product-page", "/products"),
  permanent("/devopssolutions", "/services/cloud"),
  permanent("/roboticssolutions", "/solutions"),
  permanent("/trainingandprograms", "/services"),
  permanent("/book-online", "/contact"),
  permanent("/refund", "/refund-policy"),
];
