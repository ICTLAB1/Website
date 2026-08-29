import "server-only";
import { revalidateTag, updateTag } from "next/cache";

/**
 * Cache tags.
 *
 * Every cached read is tagged with the entities it depends on, and every write
 * invalidates the tags it touched. That replaces per-path `revalidatePath`
 * calls, which had to enumerate every page that happened to show a record and
 * were already incomplete: saving a product refreshed the catalogue but not the
 * homepage, the brand page, or the landing pages embedding it.
 *
 * With tags the dependency is declared where the data is read, so a new page
 * that reads tagged data is refreshed correctly without anyone remembering to
 * add a path to a mutation.
 */
export const tags = {
  /** Anything listing or filtering products, including facets and search. */
  catalogue: "catalogue",
  product: (slug: string) => `product:${slug}`,
  brand: (slug: string) => `brand:${slug}`,
  brands: "brands",
  category: (slug: string) => `category:${slug}`,
  categories: "categories",
  /** A CMS page and its blocks. */
  page: (slug: string) => `page:${slug}`,
  jobs: "jobs",
  pages: "pages",
  navigation: "navigation",
  banners: "banners",
  services: "services",
  service: (slug: string) => `service:${slug}`,
  posts: "posts",
  post: (slug: string) => `post:${slug}`,
  faqs: "faqs",
  /** Independently issued certifications shown on the homepage and about page. */
  certifications: "certifications",

  /**
   * Customer logos. Separate from `brands`, because the two answer different
   * questions and are governed by different permissions: a brand is a
   * publisher this business resells, a client is a customer who has agreed to
   * be named.
   */
  clientLogos: "client-logos",
  /**
   * Customer testimonials, which appear on the homepage, brand pages and
   * service pages — so one tag rather than per-page, since a single quote can
   * be shown in several of those at once.
   */
  testimonials: "testimonials",
  /**
   * Approved product reviews. Per product as well as globally: moderating one
   * review must refresh that product's page and the listing that shows its
   * star rating, without discarding every other product's cached reviews.
   */
  reviews: "reviews",
  productReviews: (slug: string) => `reviews:${slug}`,
  /**
   * The company's business identity: contact details, registered address,
   * statutory identifiers and the grievance officer. Its own tag because it is
   * read by the header and the footer, so by every page — invalidating it after
   * an edit refreshes the whole site at once.
   */
  settings: "settings",
} as const;

/**
 * Invalidates tags from inside a server action.
 *
 * Uses `updateTag`, which expires the entry and refreshes the current request,
 * so an administrator sees their own change immediately rather than being told
 * it saved while still looking at stale content.
 */
export function invalidate(...names: string[]): void {
  for (const name of new Set(names)) {
    updateTag(name);
  }
}

/**
 * Invalidates tags outside a server action — a webhook or scheduled job.
 * Eventual rather than read-your-writes.
 */
export function invalidateEventually(...names: string[]): void {
  for (const name of new Set(names)) {
    revalidateTag(name, "max");
  }
}
