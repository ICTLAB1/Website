import type { ContentMigration } from "./types";

/**
 * Two long-tail pricing articles, for keywords real people are already
 * searching and this site was not yet answering.
 *
 * A competitor audit against two rival resellers found their organic traffic
 * came almost entirely from one-page-per-query-variant pricing content —
 * "windows 10 pro license key", "activation key for windows 10 home" — the
 * kind of specific, priced answer a bare product page does not read as. Those
 * two competitors sell individual OEM/retail activation keys, which is not
 * this business and not a model worth copying; the technique underneath it —
 * a dedicated page answering the exact price question someone typed — is.
 *
 * These two use real, current variant prices from the catalogue rather than
 * inventing numbers, and both cross-link to the product page they are about
 * so an interested reader has one click to the actual purchase path.
 */
const ARTICLES = [
  {
    slug: "microsoft-365-business-standard-price-in-india",
    title: "Microsoft 365 Business Standard price in India",
    excerpt:
      "Three ways to buy the same plan, and the commitment shape behind the headline number matters more than the number itself.",
    category: "Microsoft Licensing",
    tags: ["microsoft 365", "pricing", "licensing", "csp"],
    readMinutes: 4,
    body: `Microsoft 365 Business Standard is licensed three different ways, and each one answers a different buying pattern. The wrong one is not more expensive so much as mismatched to how your organisation actually pays for software.

## The three ways to buy it

**Monthly commitment, billed monthly** — ₹1,320 per user per month, excluding GST. No commitment beyond the month you are in: add or remove seats at any billing cycle. The higher per-seat price is the cost of that flexibility.

**Annual commitment, billed monthly** — ₹1,100 per user per month, excluding GST, spread across twelve monthly invoices. You commit to the year, but the cash flow looks the same as the monthly plan above — usually the middle ground worth checking first.

**Annual commitment, billed yearly** — ₹11,800 per user per year, excluding GST. One invoice, once a year, and the lowest per-seat cost of the three: over a year it comes to less than the annual-billed-monthly plan's ₹13,200 total. Worth it only if you are confident the seat count will not need to shrink mid-term, since an annual commitment does not refund unused months.

## What GST adds

All three figures above are before GST. At the standard 18% rate: the monthly plan comes to about ₹1,558 a month, the annual-billed-monthly plan to about ₹1,298 a month, and the annual-billed-yearly plan to about ₹13,924 a year. GST is invoiced separately and is fully creditable for a registered business, so the pre-GST figure is what actually belongs in a budget comparison, not the total.

## Choosing between the three

The commitment shape is the real decision, not the headline number — see [our comparison of CSP against an Enterprise Agreement](/blog/csp-vs-enterprise-agreement-which-microsoft-licensing-model) for how that works out past a few hundred seats. Below that, it comes down to how stable your headcount is: a team that added or lost people every quarter this year should stay on the monthly plan even at the higher per-seat rate, because the flexibility is worth more than the saving.

Full plan details, a feature comparison against Business Basic and Business Premium, and current availability are on the [Microsoft 365 Business Standard product page](/products/microsoft-365-business-standard).`,
  },
  {
    slug: "autocad-subscription-price-in-india",
    title: "AutoCAD subscription price in India",
    excerpt:
      "The per-month cost falls sharply the longer you commit. Here is what each term actually works out to, and which one to pick.",
    category: "Autodesk Licensing",
    tags: ["autodesk", "autocad", "pricing", "licensing"],
    readMinutes: 4,
    body: `AutoCAD is licensed by term length, and the per-month cost falls sharply the longer you commit — which makes the right answer almost entirely about how confident you are in still needing the seat next year.

## The three terms

**Monthly** — ₹19,300 per user per month, excluding GST. No commitment past the current month, and the most expensive per-month figure of the three by a wide margin. The right choice for a short, defined project rather than an ongoing seat.

**Annual (1-year)** — ₹1,46,300 per user per year, excluding GST, which works out to roughly ₹12,192 a month — well under half the pure monthly rate.

**3-year** — ₹4,38,900 per user for three years, excluding GST, or the same roughly ₹12,192 a month averaged out. It is priced level with the annual term rather than at a further discount, so a 3-year commitment buys price certainty against future increases rather than a lower running cost. Worth it if AutoCAD is a fixture in your workflow and you would simply re-buy the annual term three times regardless.

## What GST adds

Adding the standard 18%: the monthly term comes to about ₹22,774 a month, the annual term to about ₹1,72,634 a year, and the 3-year term to about ₹5,17,902 total. GST is invoiced separately and is fully creditable for a registered business.

## The actual decision

Almost nobody genuinely needs AutoCAD for exactly one month, which means the real choice is between the annual and 3-year terms — and it turns on one question: will AutoCAD's price still be what it is today in three years? Autodesk has raised subscription prices in most years since moving off perpetual licensing, so a 3-year term is, in effect, a price lock. Worth it for a seat you are certain you are keeping; an unforced bet against your own uncertainty for one you might not renew.

Full specification, the AutoCAD LT consolidation into this line, and current availability are on the [AutoCAD product page](/products/autocad).`,
  },
];

export const pricingArticles: ContentMigration = {
  id: "2026-09-pricing-articles",
  describe: "publish the Microsoft 365 Business Standard and AutoCAD pricing articles",

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
