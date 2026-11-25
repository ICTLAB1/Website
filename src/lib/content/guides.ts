import { BRAND_GUIDE_DATA } from "./brand-guides.generated";
import { PLANS_ROUTES } from "./plans";
import { CATEGORY_GUIDE_DATA } from "./category-guides.generated";
import { PRODUCT_GUIDE_DATA } from "./product-guides.generated";

/**
 * Long-form buying guides, written as data.
 *
 * The words live in `content/seo/*.json` and are turned into the two generated
 * modules by `scripts/build-seo-content.mjs`. Prices never appear in them: copy
 * carries `{{price:<slug>}}` tokens that `lib/price-tokens` resolves from the
 * catalogue when a page renders, so a guide cannot quote a stale figure.
 */

export type Faq = { question: string; answer: string };

export type ProductGuide = {
  slug: string;
  displayName: string;
  intro: string;
  included: string;
  whoFor: string;
  vs: {
    alternative: string;
    alternativeSlug: string | null;
    intro: string;
    rows: Array<{ label: string; thisProduct: string; alternative: string }>;
    verdict: string;
  };
  /** The H2 above `licensing`; the Autodesk wording is the default. */
  licensingHeading?: string;
  /** The name used in the page title and H1 where it differs from `displayName`. */
  seoName?: string;
  /** A complete page title, used as written where the standard pattern would not give the title wanted. */
  seoTitle?: string;
  licensing: string;
  sysreq: string;
  faqs: Faq[];
  related: string[];
};

export type CategoryGuide = {
  slug: string;
  h1: string;
  title: string;
  description: string;
  intro: string;
  sections: Array<{ heading: string; markdown: string }>;
  products: Array<{ slug: string; use: string; whoFor: string }>;
  faqs: Faq[];
  related: Array<{ href: string; label: string }>;
  /** Brand hubs the page links to, for categories where TechZoid quotes rather than lists. */
  brands?: string[];
};

export type BrandGuide = {
  slug: string;
  displayName: string;
  description: string;
  intro: string;
  lines: Array<{ name: string; use: string }>;
  choose: string;
  buying: string;
  faqs: Faq[];
  related: Array<{ href: string; label: string }>;
};

export const PRODUCT_GUIDES: Record<string, ProductGuide> = PRODUCT_GUIDE_DATA;
export const BRAND_GUIDES: Record<string, BrandGuide> = BRAND_GUIDE_DATA;
export const CATEGORY_GUIDES: Record<string, CategoryGuide> = CATEGORY_GUIDE_DATA;

/** The date the guides were last revised, shown on them and used as their sitemap lastmod. */
export const GUIDES_UPDATED = "2026-11-24";

/** The buying-guide page a product belongs to, if any. */
export function categoryPageFor(productSlug: string): { href: string; label: string } | null {
  for (const guide of Object.values(CATEGORY_GUIDES)) {
    if (guide.products.some((entry) => entry.slug === productSlug)) {
      return { href: `/${guide.slug}`, label: guide.h1.split(":")[0] ?? guide.slug };
    }
  }
  return null;
}

/** Every route the guides add, for the sitemap. */
export const GUIDE_ROUTES = [...Object.keys(CATEGORY_GUIDES).map((slug) => `/${slug}`), ...PLANS_ROUTES, "/price-list", "/ae", "/ae/microsoft-365", "/ae/autodesk", "/ae/adobe"];
