import type { ContentMigration } from "./types";

/**
 * The last six records a full SEO audit found outside the bands.
 *
 * ## Three titles that truncate
 *
 * A search result shows about sixty characters, and the root layout appends
 * " | TechZoid" to every title — eleven of them — so a headline written
 * without that in mind overruns. These three were 71, 82 and 85 characters,
 * which is not a tight fit but a sentence cut off mid-clause: the Business
 * Premium one lost everything after "the security you may already be…", which
 * is the half that said anything.
 *
 * Shortened to fit with the suffix, keeping the terms somebody would actually
 * search for — "Microsoft 365 Business Premium", "Autodesk named-user
 * licensing" — and letting the meta description carry the angle, which is
 * what a description is for. The twenty other titles between 61 and 67
 * characters are left alone: they are a few characters over a soft, pixel-
 * based limit rather than visibly cut, and most are product names that cannot
 * lose a word without losing the model.
 *
 * ## Three descriptions nothing had ever written
 *
 * `3ds-max`, `visio-plan-2` and `onedrive-for-business-plan-2` have no
 * `seoDescription`, so their pages fall back to a description composed from
 * the product's one-line summary. That composition lands at 130–143
 * characters, under the 145 the catalogue's rewritten pages are held to, and
 * reads as a fragment rather than a sentence.
 *
 * Written from what the catalogue already records about each product and
 * nothing else. All three are quote-only — every variant is priced at zero,
 * which on this site means "quoted, not listed" — so none of these mentions a
 * price, a discount or a saving. They say what the product is, how it is
 * licensed, and that it is quoted in rupees, because those are the three
 * things the records actually support.
 */

type ProductEdit = { slug: string; to: string };

const PRODUCTS: ProductEdit[] = [
  {
    slug: "3ds-max",
    to: "Autodesk 3ds Max for 3D modelling, rendering and animation across visualisation, games and product design. Licensed per named user, quoted in INR.",
  },
  {
    slug: "visio-plan-2",
    to: "Microsoft Visio Plan 2, with both the desktop application and the web edition, licensed per user on an annual subscription and quoted in INR with GST.",
  },
  {
    slug: "onedrive-for-business-plan-2",
    to: "Microsoft OneDrive for Business Plan 2: cloud file storage with data loss prevention and eDiscovery, licensed per user and quoted in INR with GST.",
  },
];

type ArticleEdit = { slug: string; from: string; to: string };

const ARTICLES: ArticleEdit[] = [
  {
    slug: "autodesk-named-user-licensing-what-changed",
    from: "Autodesk named-user licensing: what changed and what it means for teams",
    to: "Autodesk named-user licensing: what changed",
  },
  {
    slug: "microsoft-365-business-premium-security-you-already-own",
    from: "Microsoft 365 Business Premium: the security you may already be paying for",
    to: "Microsoft 365 Business Premium security features",
  },
  {
    slug: "planning-a-cloud-migration-that-does-not-cost-more",
    from: "Planning a cloud migration that does not end up costing more",
    to: "Planning a cloud migration without cost overruns",
  },
];

export const seoAuditTailEnds: ContentMigration = {
  id: "2026-10-seo-audit-tail-ends",
  describe: "shorten three truncating article titles and write three missing product descriptions",

  async apply(prisma) {
    let changed = 0;
    let already = 0;
    let left = 0;
    let missing = 0;

    for (const edit of PRODUCTS) {
      const product = await prisma.product.findUnique({
        where: { slug: edit.slug },
        select: { id: true, seoDescription: true },
      });
      if (!product) {
        missing += 1;
        continue;
      }

      const current = product.seoDescription?.trim() ?? null;
      if (current === edit.to) {
        already += 1;
        continue;
      }
      /*
       * Only ever fills a blank. These three are here because nothing had
       * written a description for them; a description somebody has since
       * written is theirs, whatever its length.
       */
      if (current !== null) {
        left += 1;
        continue;
      }

      await prisma.product.update({ where: { id: product.id }, data: { seoDescription: edit.to } });
      changed += 1;
    }

    for (const edit of ARTICLES) {
      const post = await prisma.blogPost.findUnique({
        where: { slug: edit.slug },
        select: { id: true, title: true },
      });
      if (!post) {
        missing += 1;
        continue;
      }

      const current = post.title.trim();
      if (current === edit.to) {
        already += 1;
        continue;
      }
      if (current !== edit.from) {
        // Retitled by an administrator since — not this migration's to override.
        left += 1;
        continue;
      }

      await prisma.blogPost.update({ where: { id: post.id }, data: { title: edit.to } });
      changed += 1;
    }

    const parts = [`${changed} record(s) corrected`];
    if (already > 0) parts.push(`${already} already current`);
    if (left > 0) parts.push(`${left} edited since and left alone`);
    if (missing > 0) parts.push(`${missing} not found`);
    return parts.join(", ");
  },
};
