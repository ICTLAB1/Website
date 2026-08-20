import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Breadcrumb } from "@/components/ui/breadcrumb";
import { ButtonLink } from "@/components/ui/button";
import { prisma } from "@/lib/db";
import { getPostBySlug, getRelatedPosts } from "@/lib/queries/content";
import { absoluteUrl, buildMetadata, JsonLd } from "@/lib/seo";
import { getSiteConfig } from "@/lib/site-config";
import { formatDate } from "@/lib/utils";

type PageProps = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  const posts = await prisma.blogPost.findMany({
    where: { status: "PUBLISHED", deletedAt: null },
    select: { slug: true },
  });
  return posts.map((post) => ({ slug: post.slug }));
}

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

/**
 * Minimal, deliberately restrictive Markdown rendering.
 *
 * Only headings, blockquotes, lists, bold and paragraphs are recognised, and
 * every piece of text is rendered as a React text node rather than as HTML —
 * so article content cannot inject markup, even though it is authored
 * internally.
 */
function renderBody(body: string) {
  const blocks = body.split("\n\n");

  return blocks.map((block, index) => {
    const trimmed = block.trim();
    if (!trimmed) return null;

    if (trimmed.startsWith("## ")) {
      return <h2 key={index}>{trimmed.slice(3)}</h2>;
    }
    if (trimmed.startsWith("### ")) {
      return <h3 key={index}>{trimmed.slice(4)}</h3>;
    }
    if (trimmed.startsWith("> ")) {
      return (
        <blockquote
          key={index}
          className="border-l-2 border-accent-600 pl-4 text-[15px] italic text-ink-600"
        >
          {trimmed
            .split("\n")
            .map((line) => line.replace(/^>\s?/, ""))
            .join(" ")}
        </blockquote>
      );
    }

    const lines = trimmed.split("\n");

    if (lines.every((line) => /^[-*]\s/.test(line))) {
      return (
        <ul key={index}>
          {lines.map((line, lineIndex) => (
            <li key={lineIndex}>{renderInline(line.replace(/^[-*]\s/, ""))}</li>
          ))}
        </ul>
      );
    }

    if (lines.every((line) => /^\d+\.\s/.test(line))) {
      return (
        <ol key={index}>
          {lines.map((line, lineIndex) => (
            <li key={lineIndex}>{renderInline(line.replace(/^\d+\.\s/, ""))}</li>
          ))}
        </ol>
      );
    }

    return <p key={index}>{renderInline(trimmed.replace(/\n/g, " "))}</p>;
  });
}

/** Handles **bold** only, as React nodes — never as raw HTML. */
function renderInline(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, index) =>
    part.startsWith("**") && part.endsWith("**") ? (
      <strong key={index}>{part.slice(2, -2)}</strong>
    ) : (
      <span key={index}>{part}</span>
    ),
  );
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

        <div className="prose-content text-[16px]">{renderBody(post.body)}</div>

        {post.tags.length > 0 ? (
          <ul className="mt-10 flex flex-wrap gap-2 border-t border-line pt-6">
            {post.tags.map((tag) => (
              <li key={tag}>
                <Link
                  href={`/search?q=${encodeURIComponent(tag)}`}
                  className="inline-block rounded-[--radius-sm] bg-surface-sunken px-2.5 py-1 text-[12px] text-ink-600 hover:bg-navy-100 hover:text-navy-800"
                >
                  {tag}
                </Link>
              </li>
            ))}
          </ul>
        ) : null}

        <aside className="mt-10 rounded-[--radius-lg] bg-navy-900 p-6 sm:p-8">
          <h2 className="text-[1.35rem] text-white">Need this applied to your organisation?</h2>
          <p className="mt-3 text-[14px] leading-relaxed text-navy-200">
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
                className="group flex flex-col rounded-[--radius-lg] border border-line bg-white p-5 transition-colors hover:border-navy-300"
              >
                <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-accent-700">
                  {entry.category}
                </span>
                <span className="mt-2 text-[15px] font-semibold leading-snug text-navy-900 group-hover:text-accent-700">
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
