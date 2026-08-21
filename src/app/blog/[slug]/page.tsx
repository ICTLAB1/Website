import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Breadcrumb } from "@/components/ui/breadcrumb";
import { ButtonLink } from "@/components/ui/button";
import { getPostBySlug, getRelatedPosts } from "@/lib/queries/content";
import { absoluteUrl, buildMetadata, JsonLd } from "@/lib/seo";
import { getSiteConfig } from "@/lib/site-config";
import { Markdown } from "@/components/markdown";
import { formatDate } from "@/lib/utils";

type PageProps = { params: Promise<{ slug: string }> };

/**
 * Rendered on request, never prerendered.
 *
 * The root layout renders the header, which reads the session cookie to decide
 * whether to show "Sign in" or the account menu — so no page in this
 * application can be static HTML, and this route used to claim otherwise. It
 * declared `generateStaticParams`, which marked it SSG, and Next then tried to
 * statically generate it on demand and failed on the cookie read.
 *
 * Nothing is lost by dropping it. Every database read behind this page goes
 * through the tag-based cache, so the work per request is a cache lookup, and
 * an edit in the admin panel invalidates it immediately — which is better than
 * a prerender that only refreshes on redeploy.
 */

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) {
    return buildMetadata({
      title: "Article not found",
      description: "This article is no longer available.",
      path: `/blog/${slug}`,
      noIndex: true,
    });
  }

  return buildMetadata({
    title: post.title,
    description: post.excerpt,
    path: `/blog/${post.slug}`,
    type: "article",
    publishedTime: post.publishedAt,
    modifiedTime: post.updatedAt,
    keywords: post.tags,
  });
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) notFound();

  const related = await getRelatedPosts(post.slug, post.category, 3);
  const config = getSiteConfig();

  return (
    <div className="container-page pb-16">
      <Breadcrumb
        items={[
          { label: "Home", href: "/" },
          { label: "Blog", href: "/blog" },
          { label: post.category, href: `/blog?category=${encodeURIComponent(post.category)}` },
          { label: post.title },
        ]}
      />

      <article className="mx-auto max-w-3xl">
        <header className="mb-10 border-b border-line pb-8">
          <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-accent-700">
            {post.category}
          </p>
          <h1 className="mt-3 text-3xl leading-tight sm:text-[2.4rem]">{post.title}</h1>
          <p className="mt-4 text-[17px] leading-relaxed text-ink-600">{post.excerpt}</p>
          <p className="mt-5 text-[13px] text-ink-500">
            <time dateTime={post.publishedAt?.toISOString()}>{formatDate(post.publishedAt)}</time>
            {" · "}
            {post.readMinutes} min read
            {post.author?.name ? ` · ${post.author.name}` : ""}
          </p>
        </header>

        <Markdown body={post.body} />

        {post.tags.length > 0 ? (
          <ul className="mt-10 flex flex-wrap gap-2 border-t border-line pt-6">
            {post.tags.map((tag) => (
              <li key={tag}>
                <Link
                  href={`/search?q=${encodeURIComponent(tag)}`}
                  className="inline-block rounded-[--radius-sm] bg-surface-sunken px-2.5 py-1 text-[12px] text-ink-600 hover:bg-graphite-100 hover:text-graphite-800"
                >
                  {tag}
                </Link>
              </li>
            ))}
          </ul>
        ) : null}

        <aside className="mt-10 rounded-[--radius-lg] bg-graphite-900 p-6 sm:p-8">
          <h2 className="text-[1.35rem] text-white">Need this applied to your organisation?</h2>
          <p className="mt-3 text-[14px] leading-relaxed text-graphite-200">
            We will review your actual licence position and renewal dates, and tell you what is
            recoverable and where you are exposed — before recommending anything new.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <ButtonLink href="/enquiry">Request a review</ButtonLink>
            <ButtonLink href="/services/software-asset-management" variant="onDark">
              Software asset management
            </ButtonLink>
          </div>
        </aside>
      </article>

      {related.length > 0 ? (
        <section className="mx-auto mt-14 max-w-5xl border-t border-line pt-10">
          <h2 className="mb-6 text-[1.25rem]">More articles</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {related.map((entry) => (
              <Link
                key={entry.slug}
                href={`/blog/${entry.slug}`}
                className="group flex flex-col rounded-[--radius-lg] border border-line bg-white p-5 transition-colors hover:border-graphite-300"
              >
                <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-accent-700">
                  {entry.category}
                </span>
                <span className="mt-2 text-[15px] font-semibold leading-snug text-graphite-900 group-hover:text-accent-700">
                  {entry.title}
                </span>
                <span className="clamp-2 mt-2 text-[13px] leading-relaxed text-ink-600">
                  {entry.excerpt}
                </span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Article",
          headline: post.title,
          description: post.excerpt,
          articleSection: post.category,
          keywords: post.tags.join(", "),
          url: absoluteUrl(`/blog/${post.slug}`),
          datePublished: post.publishedAt?.toISOString(),
          dateModified: post.updatedAt.toISOString(),
          author: { "@type": "Organization", name: config.entityName },
          publisher: {
            "@type": "Organization",
            name: config.entityName,
            url: config.url,
          },
          mainEntityOfPage: {
            "@type": "WebPage",
            "@id": absoluteUrl(`/blog/${post.slug}`),
          },
        }}
      />
    </div>
  );
}
