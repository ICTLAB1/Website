/**
 * Marketing landing pages.
 *
 * These are commercial pages rather than catalogue entries, so their copy lives
 * in this typed registry and is rendered by one route. Product data shown on
 * them is still read live from the database by slug, so prices and availability
 * can never drift out of step with the catalogue.
 */

export type LandingSection = {
  heading: string;
  body?: string[];
  bullets?: string[];
  /** Renders as a comparison grid rather than prose. */
  cards?: Array<{ title: string; body: string }>;
};

export type LandingPlan = {
  name: string;
  summary: string;
  points: string[];
  /** Links to the live catalogue entry when one exists. */
  productSlug?: string;
};

export type LandingPage = {
  /** URL path without the leading slash, e.g. "microsoft-365/business-standard". */
  slug: string;
  title: string;
  description: string;
  keywords?: string[];
  breadcrumb: Array<{ label: string; href?: string }>;
  hero: {
    eyebrow?: string;
    headline: string;
    subheadline: string;
    primaryCta?: { label: string; href: string };
    secondaryCta?: { label: string; href: string };
  };
  intro?: string[];
  sections?: LandingSection[];
  plans?: { heading: string; description?: string; items: LandingPlan[] };
  /** Product slugs pulled live from the catalogue and rendered as cards. */
  productSlugs?: string[];
  productsHeading?: string;
  /** Pulls FAQs stored against this brand. */
  brandSlug?: string;
  /** Pulls FAQs stored against this topic. */
  faqTopic?: string;
  faqs?: Array<{ question: string; answer: string }>;
  related?: Array<{ label: string; href: string; description?: string }>;
  cta?: { heading: string; body: string };
};
