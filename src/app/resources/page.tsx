import type { Metadata } from "next";
import Link from "next/link";

import { Breadcrumb } from "@/components/ui/breadcrumb";
import { SectionHeader } from "@/components/ui/section-header";
import { ButtonLink } from "@/components/ui/button";
import { getPostCategories, getPublishedPosts } from "@/lib/queries/content";
import { buildMetadata } from "@/lib/seo";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = buildMetadata({
  title: "Resource Centre",
  description:
    "Licensing guides, procurement explainers and vendor comparisons covering Microsoft, Adobe, Autodesk, cloud cost, cybersecurity and software asset management.",
  path: "/resources",
});

const GUIDES = [
  {
    title: "Microsoft licensing guide",
    body: "CSP, Enterprise Agreement and volume licensing compared, with the thresholds that actually decide it.",
    href: "/microsoft-licensing",
  },
  {
    title: "Microsoft 365 plan comparison",
    body: "Business and Enterprise plans, the 300-seat cap, and why a mixed estate is usually cheaper.",
    href: "/microsoft-365",
  },
  {
    title: "Windows Server core licensing",
    body: "Core counting rules, the sixteen-core minimum, CAL requirements and when Datacenter becomes cheaper.",
    href: "/windows-server",
  },
  {
    title: "SQL Server licensing",
    body: "Per-core versus server-plus-CAL, virtualisation rules and when Enterprise edition is genuinely required.",
    href: "/sql-server",
  },
  {
    title: "Autodesk named-user licensing",
    body: "What the move away from network licences changed, and which old habits now cost money.",
    href: "/autodesk",
  },
  {
    title: "Adobe Teams vs Enterprise",
    body: "When federated identity and enterprise-owned storage justify the step up from Teams licensing.",
    href: "/adobe",
  },
];

export default async function ResourcesPage() {
  const [posts, categories] = await Promise.all([
    getPublishedPosts({ limit: 6 }),
    getPostCategories(),
  ]);

  return (
    <div className="container-page pb-16">
      <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "Resources" }]} />

      <header className="mb-12 max-w-3xl">
        <h1 className="text-3xl sm:text-4xl">Resource centre</h1>
        <p className="mt-4 text-[16px] leading-relaxed text-ink-600">
          Licensing and procurement guidance written for people making the purchase. Where a
          decision has a cheaper answer than the one usually sold, these pages say so.
        </p>
      </header>

      <section className="mb-16">
        <SectionHeader title="Licensing guides" as="h2" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {GUIDES.map((guide) => (
            <Link
              key={guide.href}
              href={guide.href}
              className="group flex h-full flex-col rounded-[--radius-lg] border border-line bg-white p-5 transition-colors hover:border-graphite-300"
            >
              <h3 className="text-[15px] font-semibold text-graphite-900 group-hover:text-accent-700">
                {guide.title}
              </h3>
              <p className="mt-2 flex-1 text-[13px] leading-relaxed text-ink-600">{guide.body}</p>
              <span className="mt-4 text-[13px] font-medium text-accent-700">Read guide &rarr;</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="mb-16">
        <SectionHeader
          title="Latest articles"
          as="h2"
          action={
            <ButtonLink href="/blog" variant="outline" size="sm">
              All articles
            </ButtonLink>
          }
        />
        <div className="grid gap-4 md:grid-cols-3">
          {posts.map((post) => (
            <article
              key={post.slug}
              className="flex flex-col rounded-[--radius-lg] border border-line bg-white p-5 transition-colors hover:border-graphite-300"
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-accent-700">
                {post.category}
              </p>
              <h3 className="mt-2 text-[15px] font-semibold leading-snug text-graphite-900">
                <Link href={`/blog/${post.slug}`} className="hover:text-accent-700">
                  {post.title}
                </Link>
              </h3>
              <p className="clamp-3 mt-2 flex-1 text-[13px] leading-relaxed text-ink-600">
                {post.excerpt}
              </p>
              <p className="mt-4 text-[12px] text-ink-500">
                {formatDate(post.publishedAt)} &middot; {post.readMinutes} min read
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="mb-16">
        <SectionHeader title="Browse by topic" as="h2" />
        <ul className="flex flex-wrap gap-2">
          {categories.map((category) => (
            <li key={category.name}>
              <Link
                href={`/blog?category=${encodeURIComponent(category.name)}`}
                className="inline-flex items-center gap-2 rounded-[--radius-md] border border-line bg-white px-4 py-2.5 text-[13px] font-medium text-ink-700 hover:border-graphite-300 hover:text-graphite-900"
              >
                {category.name}
                <span className="text-ink-500">{category.count}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-[--radius-lg] border border-line bg-surface-muted p-6 sm:p-8">
        <h2 className="text-[1.35rem]">Want this applied to your estate?</h2>
        <p className="mt-3 max-w-2xl text-[14px] leading-relaxed text-ink-600">
          A licence position review establishes what you own, what is deployed and what is
          actually used — which is where the recoverable cost and the compliance gaps both show
          up.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <ButtonLink href="/services/software-asset-management">Software asset management</ButtonLink>
          <ButtonLink href="/enquiry" variant="outline">
            Request a review
          </ButtonLink>
        </div>
      </section>
    </div>
  );
}
