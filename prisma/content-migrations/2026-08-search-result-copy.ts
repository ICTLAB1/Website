import type { ContentMigration } from "./types";

/**
 * Titles and descriptions written for the search result rather than the page.
 *
 * Search Console, 24 May – 23 Aug: these pages were shown thousands of times
 * and almost never clicked. `/products/autodesk-civil-3d` had 1,972 impressions
 * at position 9.0 and no clicks at all, under a title reading "Autodesk Civil
 * 3D | TechZoid" — which tells somebody searching "civil 3d license" nothing
 * about why this result rather than Autodesk's own store.
 *
 * ## What is claimed, and why only this much
 *
 * A supplied draft of this copy carried three things that are not this
 * company's to say, and they are worth naming because the next round will be
 * tempted by them again:
 *
 * - **"Authorised reseller"** on the Autodesk and Corel pages. No designation
 *   is on file for either brand — `Brand.partnerLabel` is null, unconfirmed and
 *   unpublished — and `publicPartnerLabel` exists precisely so the site cannot
 *   state one by accident. A meta description is not a loophole in that rule.
 *   Microsoft and Adobe do have confirmed public designations; nothing below
 *   needed one.
 * - **"Quote in one working day", "same-day activation", "delivery within 24
 *   hours".** No turnaround is committed anywhere on this site. The only
 *   one-business-day language belongs to managed-service definitions, for
 *   clients who have signed one. Promising it to a stranger in a search result
 *   is a commitment operations has not made.
 * - **"1 and 3-year terms" for Civil 3D.** The catalogue holds one Civil 3D
 *   variant, at twelve months. The draft described a three-year option that
 *   does not exist.
 *
 * What is left is what the pages already say and the business already does:
 * the licence terms actually in the catalogue, pricing in INR, a GST invoice,
 * and the country. Every product sentence below restates that product's own
 * `shortDescription` — "the industry-specific toolsets included", "2 GB of
 * OneDrive storage", "available perpetually or by subscription" are the page's
 * words, not new claims made in a description nobody proof-reads.
 *
 * ## Only where nothing has been written
 *
 * Each row is applied only if that product still has no override. Somebody
 * else's wording is somebody's decision.
 */
type Rewrite = { slug: string; title: string; description: string };

const PRODUCTS: Rewrite[] = [
  {
    // 1,972 impressions, position 9.0, no clicks.
    slug: "autodesk-civil-3d",
    title: "Autodesk Civil 3D Licence Price in India | TechZoid",
    description:
      "Civil 3D for infrastructure design and documentation, licensed per named user for Indian businesses. Annual subscription priced in INR, with a GST invoice.",
  },
  {
    // 438 impressions, position 10.3, no clicks.
    slug: "revit",
    title: "Autodesk Revit Licence Price India | Named-User Subscription",
    description:
      "Revit building information modelling, licensed per named user for teams in India. Annual and three-year terms, priced in INR on a quotation with GST invoicing.",
  },
  {
    // 275 impressions, position 10.7, one click.
    slug: "visio-plan-1",
    title: "Microsoft Visio Plan 1 Price India | Per-User Licensing",
    description:
      "Visio Plan 1 for Indian businesses: browser-based diagramming with 2 GB of OneDrive storage, licensed per user. Quoted in INR with a GST invoice.",
  },
  {
    // Also the paid landing page, so this lifts Quality Score alongside CTR.
    slug: "autocad",
    title: "AutoCAD Licence Price in India | Genuine Autodesk Subscription",
    description:
      "AutoCAD for Indian businesses with the industry-specific toolsets included, licensed per named user. Monthly, annual and three-year terms, in INR with a GST invoice.",
  },
  {
    // "coreldraw lifetime license" is the best non-brand query this domain
    // has, and the catalogue genuinely holds a perpetual licence — so the
    // word in the query is also the word for the thing.
    slug: "coreldraw-graphics-suite",
    title: "CorelDRAW Graphics Suite Lifetime Licence India | TechZoid",
    description:
      "CorelDRAW Graphics Suite in India, as a perpetual lifetime licence or an annual subscription. Vector illustration, page layout and photo editing, with a GST invoice.",
  },
];

/** `/microsoft-365` ranks for two generic queries and is titled for neither. */
const PAGE = {
  slug: "microsoft-365",
  // No "| TechZoid": a Page title is completed by the root layout's
  // `%s | TechZoid` template, and writing it here would print it twice.
  title: "Cloud Productivity Software for Business India",
  description:
    "Compare Microsoft 365 Business and Enterprise plans for Indian teams. Seat sizing, the 300-user cap, CSP pricing in INR and GST invoicing explained.",
};

/**
 * The article written for the retired post, retitled for the query that
 * carried it: "digital license", 688 impressions at position 7.7.
 *
 * The excerpt is what the article covers and stops there. A supplied draft
 * promised GST input credit and transferability under Indian law; the article
 * discusses neither, and a description that oversells its page earns the click
 * and loses the reader.
 */
const ARTICLE = {
  slug: "what-is-a-digital-licence",
  title: "What is a digital software licence? A buyer's guide",
  excerpt:
    "What you actually buy when software arrives as an entitlement rather than a disc: perpetual against subscription, and how to spot a grey-market key.",
};

export const searchResultCopy: ContentMigration = {
  id: "2026-08-search-result-copy",
  describe: "titles and descriptions for the pages that rank and are not clicked",

  async apply(prisma) {
    let written = 0;
    const skipped: string[] = [];

    for (const row of PRODUCTS) {
      const product = await prisma.product.findUnique({
        where: { slug: row.slug },
        select: { id: true, seoTitle: true, seoDescription: true },
      });
      if (!product) {
        skipped.push(`${row.slug} (no such product)`);
        continue;
      }
      if (product.seoTitle?.trim() || product.seoDescription?.trim()) {
        skipped.push(`${row.slug} (already written)`);
        continue;
      }
      await prisma.product.update({
        where: { id: product.id },
        data: { seoTitle: row.title, seoDescription: row.description },
      });
      written += 1;
    }

    const page = await prisma.page.findUnique({
      where: { slug: PAGE.slug },
      select: { id: true, title: true },
    });
    if (page && page.title === "Microsoft 365 Plans, Pricing & Licensing") {
      await prisma.page.update({
        where: { id: page.id },
        data: { title: PAGE.title, description: PAGE.description },
      });
      written += 1;
    } else if (page) {
      skipped.push(`${PAGE.slug} (title is "${page.title}", left alone)`);
    }

    const article = await prisma.blogPost.findUnique({
      where: { slug: ARTICLE.slug },
      select: { id: true, title: true },
    });
    if (article && article.title === "What is a digital licence?") {
      await prisma.blogPost.update({
        where: { id: article.id },
        data: { title: ARTICLE.title, excerpt: ARTICLE.excerpt },
      });
      written += 1;
    } else if (article) {
      skipped.push(`${ARTICLE.slug} (retitled since, left alone)`);
    }

    const note = skipped.length > 0 ? `; skipped ${skipped.join(", ")}` : "";
    return `${written} search-result title(s) and description(s) written${note}`;
  },
};
