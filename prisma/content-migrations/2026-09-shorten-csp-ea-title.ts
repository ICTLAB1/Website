import type { ContentMigration } from "./types";

/**
 * "CSP or Enterprise Agreement: choosing a Microsoft licensing model" was 68
 * characters on its own — under Google's ~70-character cutoff by itself, but
 * the root layout appends " | TechZoid" to every page title, and the combined
 * 76 characters is the one title on the site an SEO crawl flagged as long
 * enough to get truncated in a search result. Shortened to 55 characters, 66
 * with the suffix, without dropping either branded term (CSP, Enterprise
 * Agreement) the article is actually about.
 */
const FROM_TITLE = "CSP or Enterprise Agreement: choosing a Microsoft licensing model";
const TO_TITLE = "CSP or Enterprise Agreement: which licensing model fits";

export const shortenCspEaTitle: ContentMigration = {
  id: "2026-09-shorten-csp-ea-title",
  describe: "shorten the CSP-vs-Enterprise-Agreement article title so it survives the ' | TechZoid' suffix",

  async apply(prisma) {
    const post = await prisma.blogPost.findUnique({
      where: { slug: "csp-vs-enterprise-agreement-which-microsoft-licensing-model" },
      select: { id: true, title: true },
    });
    if (!post) return "no matching blog post in this database";

    if (post.title === TO_TITLE) return "already current";
    if (post.title !== FROM_TITLE) {
      // An administrator has retitled this article since — not this
      // migration's to override.
      return "edited since and left alone";
    }

    await prisma.blogPost.update({ where: { id: post.id }, data: { title: TO_TITLE } });

    return "shortened the CSP-vs-Enterprise-Agreement article title";
  },
};
