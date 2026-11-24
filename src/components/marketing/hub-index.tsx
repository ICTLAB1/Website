import Link from "next/link";

import { prisma } from "@/lib/db";
import { tags } from "@/lib/cache";
import { cached } from "@/lib/queries/cached";

/**
 * The hub pages' index of everything under them: every product page, and the
 * articles that are about the same thing.
 *
 * A hub page that links only a handful of its products leaves the rest reachable
 * only through search and the catalogue. This lists them all, from the catalogue
 * as it stands — so a product added tomorrow is linked tomorrow with nothing to
 * edit — and the articles whose address names the subject.
 *
 * Only the three hubs below get one; every other page renders nothing here.
 */
type Hub = {
  heading: string;
  brands: string[];
  /** Which of the brand's products belong to this hub. Omitted: all of them. */
  product?: RegExp;
  /** Which published articles belong to it, matched on the article's address. */
  article: RegExp;
};

const HUBS: Record<string, Hub> = {
  "microsoft-365": {
    heading: "Microsoft 365",
    brands: ["microsoft"],
    product: /365/i,
    article: /microsoft-365|office-365|office|m365|windows-11|microsoft/i,
  },
  "adobe-licensing": {
    heading: "Adobe",
    brands: ["adobe"],
    article: /adobe|creative-cloud|acrobat|photoshop|illustrator|premiere/i,
  },
  "autodesk-licensing": {
    heading: "Autodesk",
    brands: ["autodesk"],
    article: /autodesk|autocad|revit|aec|fusion|civil-3d|inventor/i,
  },
};

const loadProducts = cached(
  async (brands: string[]) =>
    prisma.product.findMany({
      where: { status: "ACTIVE", deletedAt: null, brand: { slug: { in: brands } } },
      orderBy: { name: "asc" },
      select: { slug: true, name: true },
    }),
  ["hub-index-products"],
  [tags.catalogue],
);

const loadArticles = cached(
  async () =>
    prisma.blogPost.findMany({
      where: { status: "PUBLISHED", deletedAt: null },
      orderBy: { publishedAt: "desc" },
      select: { slug: true, title: true },
    }),
  ["hub-index-articles"],
  [tags.posts],
);

export function hasHubIndex(slug: string): boolean {
  return slug in HUBS;
}

export async function HubIndex({ slug }: { slug: string }) {
  const hub = HUBS[slug];
  if (!hub) return null;

  const [products, articles] = await Promise.all([loadProducts(hub.brands), loadArticles()]);
  const shown = hub.product ? products.filter((product) => hub.product!.test(`${product.slug} ${product.name}`)) : products;
  const related = articles.filter((post) => hub.article.test(post.slug)).slice(0, 12);
  if (shown.length === 0 && related.length === 0) return null;

  return (
    <section aria-labelledby="hub-index" className="border-t border-line bg-white py-12">
      <div className="container-page grid gap-10 lg:grid-cols-2">
        {shown.length > 0 ? (
          <div>
            <h2 id="hub-index" className="text-[1.5rem] font-bold text-career-navy">
              All {hub.heading} products
            </h2>
            <ul className="mt-4 grid gap-x-6 gap-y-2 sm:grid-cols-2">
              {shown.map((product) => (
                <li key={product.slug}>
                  <Link
                    href={`/products/${product.slug}`}
                    className="inline-block py-1 text-[15px] text-accent-700 underline underline-offset-2 hover:text-accent-800"
                  >
                    {product.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {related.length > 0 ? (
          <div>
            <h2 className="text-[1.5rem] font-bold text-career-navy">Related reading</h2>
            <ul className="mt-4 space-y-2">
              {related.map((post) => (
                <li key={post.slug}>
                  <Link
                    href={`/blog/${post.slug}`}
                    className="inline-block py-1 text-[15px] text-accent-700 underline underline-offset-2 hover:text-accent-800"
                  >
                    {post.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </section>
  );
}
