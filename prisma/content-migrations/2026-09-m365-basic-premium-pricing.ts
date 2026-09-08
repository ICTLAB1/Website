import type { ContentMigration } from "./types";

/**
 * Completes the Microsoft 365 pricing trio started by
 * `2026-09-pricing-articles` (which covered Business Standard). Basic and
 * Premium are written as their own articles rather than one combined page
 * because each has a genuinely different buying structure — Basic has no
 * annual-billed-monthly middle tier, and Premium has no true month-to-month
 * plan at all — and stating that plainly for each is more useful than a
 * single page that has to caveat both.
 */
const ARTICLES = [
  {
    slug: "microsoft-365-business-basic-price-in-india",
    title: "Microsoft 365 Business Basic price in India",
    excerpt:
      "Only two ways to buy this one, and the gap between them is wider than on Business Standard — worth knowing before you default to the flexible option.",
    category: "Microsoft Licensing",
    tags: ["microsoft 365", "pricing", "licensing", "csp"],
    readMinutes: 3,
    body: `Business Basic is priced two ways, not three — there is no annual-commitment-billed-monthly middle tier here the way Business Standard has one, so the choice is a plainer trade-off between flexibility and cost.

## The two ways to buy it

**Monthly commitment, billed monthly** — ₹540 per user per month, excluding GST. No commitment: add, remove or cancel at any billing cycle.

**Annual commitment, billed yearly** — ₹5,040 per user per year, excluding GST. One invoice, once a year, works out to ₹420 a month — about 22% cheaper than paying monthly, in exchange for a year's commitment with no mid-term exit.

## What GST adds

At 18%: the monthly plan comes to about ₹637 a month, the annual plan to about ₹5,947 a year. GST is invoiced separately and is fully creditable for a registered business.

## Which one to pick

Without a middle tier to soften the choice, this comes down more sharply than usual to how sure you are of the seat count for the next twelve months. A genuinely temporary or trial deployment belongs on the monthly plan even at the higher rate; anything you expect to keep running is worth the annual commitment's real, meaningful saving.

Full plan details and a feature comparison against Business Standard and Business Premium are on the [Microsoft 365 Business Basic product page](/products/microsoft-365-business-basic).`,
  },
  {
    slug: "microsoft-365-business-premium-price-in-india",
    title: "Microsoft 365 Business Premium price in India",
    excerpt:
      "Both ways to buy this one already commit you for a year — the choice is only about invoicing, and one option is a straightforward 10% cheaper.",
    category: "Microsoft Licensing",
    tags: ["microsoft 365", "pricing", "licensing", "csp"],
    readMinutes: 3,
    body: `Business Premium does not offer a true month-to-month plan the way Basic and Standard do — both ways to buy it commit you for a year. The only real choice is how you pay across that year, and one option is a straightforward saving over the other for the identical commitment.

## The two ways to buy it

**Annual commitment, billed monthly** — ₹1,900 per user per month, excluding GST, invoiced across twelve months. Over the year that comes to ₹22,800.

**Annual commitment, billed yearly** — ₹20,400 per user per year, excluding GST, one invoice. That is ₹2,400 cheaper than the billed-monthly total for the same twelve-month commitment — a saving with no flexibility trade-off attached, since both options already commit you for the year.

## What GST adds

At 18%: the monthly-billed option comes to about ₹2,242 a month, and the annual-billed option to about ₹24,072 a year. GST is invoiced separately and is fully creditable for a registered business.

## Which one to pick

Because both options carry the same annual commitment, this is a cash-flow question rather than a flexibility one. If paying ₹20,400 per user upfront is manageable, it is strictly the cheaper choice; the monthly-billed option exists for organisations that would rather spread the same commitment across twelve smaller invoices, not for anyone hoping to cancel early.

Full plan details and a feature comparison against Business Basic and Business Standard are on the [Microsoft 365 Business Premium product page](/products/microsoft-365-business-premium).`,
  },
];

export const m365BasicPremiumPricing: ContentMigration = {
  id: "2026-09-m365-basic-premium-pricing",
  describe: "publish the Microsoft 365 Business Basic and Business Premium pricing articles",

  async apply(prisma) {
    const published: string[] = [];

    for (const article of ARTICLES) {
      const existing = await prisma.blogPost.findUnique({
        where: { slug: article.slug },
        select: { id: true },
      });
      // Written once. An edit made since is somebody's, and a re-run of this
      // must not quietly replace it.
      if (existing) continue;

      await prisma.blogPost.create({
        data: {
          slug: article.slug,
          title: article.title,
          excerpt: article.excerpt,
          body: article.body,
          category: article.category,
          tags: article.tags,
          status: "PUBLISHED",
          readMinutes: article.readMinutes,
          publishedAt: new Date(),
        },
      });
      published.push(article.slug);
    }

    if (published.length === 0) return "both pricing articles are already present";
    return `published ${published.length} pricing article(s): ${published.join(", ")}`;
  },
};
