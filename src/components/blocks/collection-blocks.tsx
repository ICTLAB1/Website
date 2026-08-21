import Link from "next/link";
import { ProductGrid } from "@/components/marketing/product-card";
import { BrandCard, BrandStrip } from "@/components/marketing/brand-card";
import { CategoryCard } from "@/components/marketing/category-card";
import { Reveal } from "@/components/motion/reveal";
import { EmptyState } from "@/components/ui/states";
import { BlockHeading, BlockSection } from "@/components/blocks/primitives";
import { ButtonLink } from "@/components/ui/button";
import { SectionHeader } from "@/components/ui/section-header";
import type { BlockData } from "@/lib/blocks/schemas";
import type { ProductListItem } from "@/lib/queries/catalogue";
import { formatDate } from "@/lib/utils";

/**
 * Blocks that render live database rows.
 *
 * The payload holds only a reference — slugs, or "featured" — so what appears
 * here is always the current catalogue rather than a copy taken when the page
 * was written.
 */

export function ProductGridBlock({
  data,
  products,
  tone,
}: {
  data: BlockData<"PRODUCT_GRID">;
  products: ProductListItem[];
  tone?: "plain" | "muted";
}) {
  return (
    <BlockSection tone={tone}>
      {data.action ? (
        <SectionHeader
          eyebrow={data.eyebrow}
          title={data.heading ?? "Related products"}
          description={data.description}
          action={
            <ButtonLink href={data.action.href} variant="outline" size="sm">
              {data.action.label}
            </ButtonLink>
          }
        />
      ) : (
        <BlockHeading eyebrow={data.eyebrow} heading={data.heading} description={data.description} />
      )}
      {products.length === 0 ? (
        // A referenced product may have been archived since the page was
        // written. Say so plainly rather than rendering an empty grid.
        <EmptyState
          title="No products to show"
          description="The products referenced by this section are not currently available."
        />
      ) : (
        <ProductGrid products={products} />
      )}
    </BlockSection>
  );
}

type BrandRow = {
  slug: string;
  name: string;
  tagline: string | null;
  accentColor: string;
  _count: { products: number };
};
type CategoryRow = {
  slug: string;
  name: string;
  summary: string | null;
  icon: string | null;
  _count: { products: number };
};
type ServiceRow = { slug: string; name: string; summary: string; category: string };
type PostCategoryRow = { name: string; count: number };
type PostRow = {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  readMinutes: number;
  publishedAt: Date | null;
};

export function CollectionGridBlock({
  data,
  rows,
  tone,
}: {
  data: BlockData<"COLLECTION_GRID">;
  rows: unknown[];
  tone?: "plain" | "muted";
}) {
  if (rows.length === 0) return null;

  // A vendor strip's heading is a caption for the logos beneath it, not a
  // section title, so it is set small and centred rather than as a display
  // heading — the same treatment the page used before the content moved into
  // the CMS.
  const caption = data.kind === "brands" && data.layout === "strip" && !data.action;

  return (
    <BlockSection tone={tone}>
      {caption ? (
        data.heading ? (
          <p className="mb-6 text-center text-[12px] font-semibold uppercase tracking-[0.14em] text-ink-500">
            {data.heading}
          </p>
        ) : null
      ) : data.action ? (
        <SectionHeader
          eyebrow={data.eyebrow}
          title={data.heading ?? ""}
          description={data.description}
          action={
            <ButtonLink href={data.action.href} variant="outline" size="sm">
              {data.action.label}
            </ButtonLink>
          }
        />
      ) : (
        <BlockHeading eyebrow={data.eyebrow} heading={data.heading} description={data.description} />
      )}

      {data.kind === "postCategories" ? (
        <Reveal as="ul" className="flex flex-wrap gap-2">
          {(rows as PostCategoryRow[]).map((category) => (
            <li key={category.name}>
              <Link
                href={`/blog?category=${encodeURIComponent(category.name)}`}
                className="lift inline-flex items-center gap-2 rounded-[--radius-md] border border-line bg-white px-4 py-2.5 text-[13px] font-medium text-ink-700 hover:border-graphite-300 hover:text-graphite-900"
              >
                {category.name}
                <span className="text-ink-500">{category.count}</span>
              </Link>
            </li>
          ))}
        </Reveal>
      ) : data.kind === "brands" && data.layout === "strip" ? (
        <Reveal>
          <BrandStrip brands={rows as BrandRow[]} />
        </Reveal>
      ) : data.kind === "brands" ? (
        <Reveal className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {(rows as BrandRow[]).map((brand) => (
            <BrandCard key={brand.slug} brand={{ ...brand, productCount: brand._count.products }} />
          ))}
        </Reveal>
      ) : data.kind === "categories" ? (
        <Reveal className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {(rows as CategoryRow[]).map((category) => (
            <CategoryCard
              key={category.slug}
              category={{ ...category, count: category._count.products }}
            />
          ))}
        </Reveal>
      ) : data.kind === "services" ? (
        <Reveal className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(rows as ServiceRow[]).map((service) => (
            <Link
              key={service.slug}
              href={`/services/${service.slug}`}
              className="lift group flex flex-col rounded-[--radius-lg] border border-line bg-white p-5 hover:border-graphite-300"
            >
              <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-accent-700">
                {service.category}
              </span>
              <span className="mt-2 text-[15px] font-semibold text-graphite-900 group-hover:text-accent-700">
                {service.name}
              </span>
              <span className="clamp-3 mt-2 text-[13px] leading-relaxed text-ink-600">
                {service.summary}
              </span>
              <span className="mt-4 text-[13px] font-medium text-accent-700">Read more &rarr;</span>
            </Link>
          ))}
        </Reveal>
      ) : (
        <Reveal className="grid gap-4 md:grid-cols-3">
          {(rows as PostRow[]).map((post) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="lift group flex flex-col rounded-[--radius-lg] border border-line bg-white p-5 hover:border-graphite-300"
            >
              <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-accent-700">
                {post.category}
              </span>
              <h3 className="mt-2 text-[15px] font-semibold leading-snug text-graphite-900 group-hover:text-accent-700">
                {post.title}
              </h3>
              <p className="clamp-3 mt-2 text-[13px] leading-relaxed text-ink-600">{post.excerpt}</p>
              <span className="mt-4 text-[12px] text-ink-500">
                {formatDate(post.publishedAt)} &middot; {post.readMinutes} min read
              </span>
            </Link>
          ))}
        </Reveal>
      )}
    </BlockSection>
  );
}
