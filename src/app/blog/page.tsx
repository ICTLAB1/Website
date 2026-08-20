import type { Metadata } from "next";
import Link from "next/link";

import { Breadcrumb } from "@/components/ui/breadcrumb";
import { EmptyState } from "@/components/ui/states";
import { getPostCategories, getPublishedPosts } from "@/lib/queries/content";
import { buildMetadata } from "@/lib/seo";
import { formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";

export const metadata: Metadata = buildMetadata({
  title: "Licensing & Procurement Blog",
  description:
    "Practical guidance on Microsoft, Adobe and Autodesk licensing, IT procurement, cloud cost, cybersecurity and software asset management.",
  path: "/blog",
});

type PageProps = { searchParams: Promise<{ category?: string }> };

export default async function BlogIndexPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const [categories, posts] = await Promise.all([
    getPostCategories(),
    getPublishedPosts({ category: params.category }),
  ]);

  return (
    <div className="container-page pb-16">
      <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "Blog" }]} />

      <header className="mb-10 max-w-3xl">
        <h1 className="text-3xl sm:text-4xl">Licensing and procurement</h1>
        <p className="mt-4 text-[16px] leading-relaxed text-ink-600">
          Practical explainers on the decisions that cost the most when they go wrong — written
          for people making the purchase rather than for a search engine.
        </p>
      </header>

      <div className="mb-8 scroll-x">
        <div className="flex min-w-max gap-1.5 pb-1">
          <Link
            href="/blog"
            className={cn(
              "rounded-[--radius-md] px-3 py-2 text-[13px]",
              !params.category ? "bg-navy-900 font-medium text-white" : "text-ink-600 hover:bg-surface-muted",
            )}
          >
            All
          </Link>
          {categories.map((category) => (
            <Link
              key={category.name}
              href={`/blog?category=${encodeURIComponent(category.name)}`}
              className={cn(
                "whitespace-nowrap rounded-[--radius-md] px-3 py-2 text-[13px]",
                params.category === category.name
                  ? "bg-navy-900 font-medium text-white"
                  : "text-ink-600 hover:bg-surface-muted",
              )}
            >
              {category.name}
              <span className="ml-1.5 text-ink-500">{category.count}</span>
            </Link>
          ))}
        </div>
      </div>

      {posts.length === 0 ? (
        <EmptyState
          title="No articles in this category"
          description="Try another category, or view all articles."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <article
              key={post.slug}
              className="flex flex-col rounded-[--radius-lg] border border-line bg-white p-5 transition-colors hover:border-navy-300"
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-accent-700">
                {post.category}
              </p>
              <h2 className="mt-2 text-[16px] font-semibold leading-snug text-navy-900">
                <Link href={`/blog/${post.slug}`} className="hover:text-accent-700">
                  {post.title}
                </Link>
              </h2>
              <p className="clamp-3 mt-2 flex-1 text-[13px] leading-relaxed text-ink-600">
                {post.excerpt}
              </p>
              <p className="mt-4 text-[12px] text-ink-500">
                {formatDate(post.publishedAt)} &middot; {post.readMinutes} min read
              </p>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
