import { NextResponse } from "next/server";

import { COMPANY_DESCRIPTION, absoluteUrl } from "@/lib/seo";
import { getSiteConfig } from "@/lib/site-config";

/**
 * `llms.txt` — a short, human-and-machine-readable map of the site for an AI
 * assistant or an LLM-driven search crawler, per the convention at
 * llmstxt.org. Not a replacement for `sitemap.xml`: that enumerates every
 * indexable URL for a conventional crawler, this is a hand-picked path
 * through the handful of pages that actually explain the business, for a
 * reader with no patience for the other few hundred.
 *
 * Rendered on request, for the same reason `robots.ts` and `sitemap.ts` are:
 * `appUrl()` and the business identity both come from the database and the
 * environment, and a build has neither.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  const config = await getSiteConfig();

  const sections: Array<{ heading: string; links: Array<{ title: string; path: string }> }> = [
    {
      heading: "Company",
      links: [
        { title: "About TechZoid", path: "/about" },
        { title: "Contact sales", path: "/contact" },
        { title: "Support centre", path: "/support" },
        { title: "Careers", path: "/careers" },
      ],
    },
    {
      heading: "Catalogue",
      links: [
        { title: "Software and hardware catalogue", path: "/products" },
        { title: "Technology brands supplied", path: "/brands" },
        { title: "Enterprise IT hardware", path: "/hardware" },
      ],
    },
    {
      heading: "By industry and use case",
      links: [
        { title: "Industries served", path: "/industries" },
        { title: "Enterprise procurement", path: "/enterprise" },
        { title: "Solutions by use case", path: "/solutions" },
        { title: "IT services", path: "/services" },
      ],
    },
    {
      heading: "Resources",
      links: [
        { title: "Licensing and procurement articles", path: "/blog" },
        { title: "Resource centre", path: "/resources" },
      ],
    },
  ];

  const lines = [
    `# ${config.tradingName}`,
    "",
    `> ${COMPANY_DESCRIPTION}`,
    "",
    ...sections.flatMap((section) => [
      `## ${section.heading}`,
      ...section.links.map((link) => `- [${link.title}](${absoluteUrl(link.path)})`),
      "",
    ]),
  ];

  return new NextResponse(lines.join("\n").trimEnd() + "\n", {
    headers: { "Content-Type": "text/markdown; charset=utf-8" },
  });
}
