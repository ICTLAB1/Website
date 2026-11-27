import Link from "next/link";

import { prisma } from "@/lib/db";
import { tags } from "@/lib/cache";
import { cached } from "@/lib/queries/cached";

/**
 * "Related guides" on the pages people land on to buy.
 *
 * The articles that answer the questions around a purchase (what it costs, how
 * it is licensed, how to buy it properly) were reachable from the blog index and
 * from each other, and from few of the pages a buyer actually reads. A guide with
 * no links from a product or hub page is a guide search engines find but treat as
 * unimportant. This puts an explicit, hand-chosen list on each of those pages.
 *
 * Chosen by hand, not by keyword match, because a regular expression on the
 * address links "microsoft" to every Microsoft article whether or not it helps
 * the reader. Only published articles are shown; a slug that is not (yet)
 * published simply does not appear.
 */
const GUIDES: Record<string, string[]> = {
  "/autocad": [
    "autocad-subscription-price-in-india",
    "autocad-subscription-versus-the-alternatives",
    "autocad-vs-autocad-lt",
    "autodesk-flex-versus-named-user-subscriptions",
    "preparing-for-a-software-licence-audit",
    "how-government-departments-procure-genuine-software",
  ],
  "/revit": [
    "revit-vs-autocad",
    "autodesk-aec-collection-explained",
    "autodesk-flex-versus-named-user-subscriptions",
    "best-cad-software-india",
    "preparing-for-a-software-licence-audit",
  ],
  "/microsoft-365": [
    "microsoft-365-business-basic-vs-standard-vs-premium",
    "microsoft-365-business-standard-vs-business-premium",
    "microsoft-365-licensing-guide-for-indian-businesses",
    "microsoft-office-ltsc-2024-vs-microsoft-365",
    "how-to-buy-genuine-microsoft-licences-in-india",
    "preparing-for-a-software-licence-audit",
  ],
  "/microsoft-office-ltsc": [
    "microsoft-office-ltsc-2024-vs-microsoft-365",
    "how-to-buy-genuine-microsoft-licences-in-india",
    "preparing-for-a-software-licence-audit",
    "how-government-departments-procure-genuine-software",
    "windows-server-2025-licensing-explained",
  ],
  "/price-list": [
    "how-to-buy-genuine-microsoft-licences-in-india",
    "how-government-departments-procure-genuine-software",
    "microsoft-office-ltsc-2024-vs-microsoft-365",
    "windows-server-2025-licensing-explained",
    "preparing-for-a-software-licence-audit",
    "adobe-creative-cloud-price-in-india",
    "common-software-licensing-mistakes",
  ],
};

Object.assign(GUIDES, {
  "/cad-software": ["best-cad-software-india", "autocad-subscription-price-in-india", "autocad-vs-autocad-lt", "autodesk-flex-versus-named-user-subscriptions"],
  "/bim-software": ["best-cad-software-india", "revit-vs-autocad", "autodesk-aec-collection-explained"],
  "/microsoft-licensing": ["what-is-a-digital-licence", "how-to-buy-genuine-microsoft-licences-in-india", "common-software-licensing-mistakes", "preparing-for-a-software-licence-audit", "windows-server-2025-licensing-explained"],
  "/enterprise": ["how-government-departments-procure-genuine-software", "how-to-buy-genuine-microsoft-licences-in-india", "preparing-for-a-software-licence-audit", "what-is-a-digital-licence", "common-software-licensing-mistakes"],
  "/windows-server": ["windows-server-2025-licensing-explained", "windows-server-2025-core-licence-price-in-india", "preparing-for-a-software-licence-audit", "how-government-departments-procure-genuine-software"],
  "/microsoft-365-business-plans-and-pricing": ["microsoft-365-business-basic-price-in-india", "microsoft-365-business-standard-price-in-india", "microsoft-365-business-premium-price-in-india", "microsoft-365-business-basic-vs-standard-vs-premium"],
  "/services/cloud": ["top-10-cloud-computing-services-india", "planning-a-cloud-migration-that-does-not-cost-more"],
  "/services/azure": ["top-10-cloud-computing-services-india", "planning-a-cloud-migration-that-does-not-cost-more"],
  "/services/aws": ["top-10-cloud-computing-services-india", "planning-a-cloud-migration-that-does-not-cost-more"],
  "/services/email-migration": ["secure-business-email-providers-india", "microsoft-365-versus-google-workspace-for-indian-smes"],
  "/products/microsoft-365-business-basic": ["microsoft-365-business-basic-price-in-india", "microsoft-365-business-basic-vs-standard-vs-premium"],
  "/products/microsoft-365-business-standard": ["microsoft-365-business-standard-price-in-india", "microsoft-365-business-basic-vs-standard-vs-premium", "microsoft-office-ltsc-2024-vs-microsoft-365"],
  "/products/microsoft-365-business-premium": ["microsoft-365-business-premium-price-in-india", "microsoft-365-business-standard-vs-business-premium"],
  "/products/microsoft-365-copilot": ["microsoft-365-copilot-licensing-in-india"],
  "/products/microsoft-365-business-standard-with-copilot": ["microsoft-365-copilot-licensing-in-india"],
  "/products/microsoft-365-business-premium-with-copilot": ["microsoft-365-copilot-licensing-in-india"],
  "/products/windows-server-2025-standard": ["windows-server-2025-core-licence-price-in-india", "windows-server-2025-licensing-explained"],
  "/products/windows-server-2025-datacenter": ["windows-server-2025-core-licence-price-in-india", "windows-server-2025-licensing-explained"],
});
GUIDES["/autocad"]!.push("best-cad-software-india");
GUIDES["/microsoft-365"]!.push("microsoft-365-business-standard-price-in-india", "what-is-microsoft-365-plans-apps-price-india");
GUIDES["/price-list"]!.push("what-is-a-digital-licence");

/**
 * "Read next" under an article: the guides that answer the question after this
 * one. Chosen by hand for the posts that otherwise end a reader's path.
 */
export const BLOG_SEE_ALSO: Record<string, string[]> = {
  "best-cad-software-india": ["autocad-vs-autocad-lt", "revit-vs-autocad"],
  "autocad-vs-autocad-lt": ["best-cad-software-india", "autocad-subscription-price-in-india"],
  "revit-vs-autocad": ["best-cad-software-india", "autodesk-aec-collection-explained"],
  "how-to-buy-genuine-microsoft-licences-in-india": ["what-is-a-digital-licence", "preparing-for-a-software-licence-audit"],
  "microsoft-365-business-basic-vs-standard-vs-premium": ["what-is-microsoft-365-plans-apps-price-india", "microsoft-365-business-standard-vs-business-premium"],
  "microsoft-365-licensing-guide-for-indian-businesses": ["what-is-microsoft-365-plans-apps-price-india", "microsoft-365-copilot-licensing-in-india"],
  "common-software-licensing-mistakes": ["preparing-for-a-software-licence-audit", "how-to-buy-genuine-microsoft-licences-in-india", "what-is-a-digital-licence"],
  "microsoft-365-business-basic-price-in-india": ["microsoft-365-business-standard-price-in-india", "microsoft-365-business-basic-vs-standard-vs-premium"],
  "microsoft-365-business-standard-price-in-india": ["microsoft-365-business-premium-price-in-india", "microsoft-365-business-basic-vs-standard-vs-premium"],
  "microsoft-365-business-premium-price-in-india": ["microsoft-365-business-standard-vs-business-premium", "microsoft-365-business-standard-price-in-india"],
  "microsoft-365-business-standard-vs-business-premium": ["microsoft-365-business-premium-price-in-india", "microsoft-365-copilot-licensing-in-india"],
  "microsoft-365-copilot-licensing-in-india": ["microsoft-365-licensing-guide-for-indian-businesses", "microsoft-365-business-standard-vs-business-premium"],
  "microsoft-365-versus-google-workspace-for-indian-smes": ["secure-business-email-providers-india", "microsoft-365-business-basic-vs-standard-vs-premium"],
  "planning-a-cloud-migration-that-does-not-cost-more": ["top-10-cloud-computing-services-india", "common-software-licensing-mistakes"],
  "secure-business-email-providers-india": ["microsoft-365-versus-google-workspace-for-indian-smes", "microsoft-365-business-basic-vs-standard-vs-premium", "top-firewall-brands-india-fortinet-sophos-sonicwall-cisco"],
  "top-10-cloud-computing-services-india": ["planning-a-cloud-migration-that-does-not-cost-more", "secure-business-email-providers-india", "top-firewall-brands-india-fortinet-sophos-sonicwall-cisco"],
  "top-firewall-brands-india-fortinet-sophos-sonicwall-cisco": ["secure-business-email-providers-india", "top-10-cloud-computing-services-india"],
  "what-is-a-digital-licence": ["how-to-buy-genuine-microsoft-licences-in-india", "common-software-licensing-mistakes"],
  "what-is-microsoft-365-plans-apps-price-india": ["microsoft-365-business-basic-vs-standard-vs-premium", "microsoft-365-licensing-guide-for-indian-businesses"],
  "windows-server-2025-core-licence-price-in-india": ["windows-server-2025-licensing-explained", "preparing-for-a-software-licence-audit"],
};

const load = cached(
  async (slugs: string[]) => {
    const rows = await prisma.blogPost.findMany({
      where: { slug: { in: slugs }, status: "PUBLISHED", deletedAt: null },
      select: { slug: true, title: true },
    });
    return slugs.flatMap((slug) => rows.filter((row) => row.slug === slug));
  },
  ["related-guides-v1"],
  [tags.posts],
);

export function hasRelatedGuides(path: string): boolean {
  return path in GUIDES;
}

export async function RelatedGuides({ path, slugs: given, heading = "Related guides", inline = false }: { path?: string; slugs?: string[]; heading?: string; inline?: boolean }) {
  const slugs = given ?? (path ? GUIDES[path] : undefined);
  if (!slugs) return null;
  const posts = await load(slugs);
  if (posts.length === 0) return null;
  const list = (
    <>
      <h2 id="related-guides" className="text-[1.5rem] font-bold text-career-navy">
        {heading}
      </h2>
      <ul className="mt-4 grid gap-x-8 gap-y-2 md:grid-cols-2">
        {posts.map((post) => (
          <li key={post.slug}>
            <Link href={`/blog/${post.slug}`} className="inline-block py-1 text-[15px] text-accent-700 underline underline-offset-2 hover:text-accent-800">
              {post.title}
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
  // Inline: inside a page that already has its own container (a product page, an article).
  if (inline) {
    return (
      <section aria-labelledby="related-guides" className="mt-12 border-t border-line pt-8">
        {list}
      </section>
    );
  }
  return (
    <section aria-labelledby="related-guides" className="border-t border-line bg-white py-12">
      <div className="container-page">{list}</div>
    </section>
  );
}
