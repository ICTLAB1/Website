import type { ContentMigration } from "./types";

/**
 * The three price articles: brought back in line with the catalogue, given five
 * FAQs each, and a link between the AutoCAD buying page and its price article.
 *
 * ## Why the AutoCAD and Business Basic bodies change
 *
 * Both described terms the catalogue no longer lists. The AutoCAD article gave
 * a monthly price, a 1-year price of ₹1,46,300 and a 3-year price; the product
 * page lists one term, the 1-year subscription at ₹1,41,250. The Business Basic
 * article gave a monthly plan the product page no longer carries. An FAQ that
 * repeated either would put a figure on the page that contradicts the product
 * beside it, so the sections that state a price are rewritten to the catalogue's
 * own figures (₹1,41,250 + 18% GST ₹25,425 = ₹1,66,675; ₹2,040 + about ₹367 =
 * ₹2,407) and the sections about terms the site does not list say so and point
 * to a quotation. Nothing else in either article is touched.
 *
 * Each rewrite applies only while the body still contains the stale figure it
 * replaces, so an article somebody has since edited in the admin panel is left
 * alone. The Windows 11 Pro upgrade article was already correct.
 *
 * ## The FAQs
 *
 * Stored as ordinary `Faq` rows under the topic `blog:<slug>`, which the blog
 * page reads and renders with FAQPage markup. Every answer states only what the
 * article or the catalogue already says: the prices, that GST is added and is
 * creditable, that a written quotation fixes a price, that a GST invoice is
 * issued. Rows are created only when the topic has none, so a second run — or an
 * edit made in the admin panel — is not duplicated or overwritten.
 */

type Qa = { question: string; answer: string };

const GST_INVOICE = (what: string): Qa => ({
  question: "Do you provide a GST invoice?",
  answer: `Yes. TechZoid supplies ${what} against your purchase order with a GST invoice, and the GST is fully creditable for a registered business.`,
});

const FAQS: Record<string, Qa[]> = {
  "autocad-subscription-price-in-india": [
    {
      question: "What is the AutoCAD price in India?",
      answer:
        "The AutoCAD annual subscription is ₹1,41,250 per user per year excluding GST, which is roughly ₹11,771 a month. The figure is tentative until a written quotation confirms it, and the quotation takes account of your quantity and licensing programme.",
    },
    {
      question: "Is GST included in the AutoCAD price?",
      answer:
        "No, the price is shown excluding GST. At the standard 18%, GST adds ₹25,425, so the annual subscription comes to ₹1,66,675 per user per year. GST is invoiced separately and is fully creditable for a registered business.",
    },
    {
      question: "What is the AutoCAD vs AutoCAD LT price?",
      answer:
        "AutoCAD LT has been consolidated into the main AutoCAD product line, so there is no separate LT price to compare, and the AutoCAD subscription includes the industry toolsets. If you hold an older LT entitlement, we confirm the current equivalent rather than assuming a like-for-like renewal.",
    },
    {
      question: "Can I pay for AutoCAD monthly?",
      answer:
        "Only the annual subscription, billed yearly, is listed at present. If you need a monthly or multi-year term, request a quotation and we will confirm what is available.",
    },
    GST_INVOICE("AutoCAD"),
  ],
  "windows-11-pro-upgrade-licence-price-in-india": [
    {
      question: "What is the Windows 11 Pro upgrade price in India?",
      answer:
        "The Windows 11 Pro upgrade licence is ₹15,887 per device excluding GST, about ₹18,747 including 18% GST. The figure is tentative until a written quotation confirms it.",
    },
    {
      question: "Is GST included in the Windows 11 Pro price?",
      answer:
        "No. The ₹15,887 excludes GST; at 18% the upgrade comes to about ₹18,747 per device. GST is invoiced separately and is fully creditable for a registered business.",
    },
    {
      question: "Is this an upgrade from Home or a new Windows 11 Pro licence?",
      answer:
        "It is an upgrade from the Windows 11 Home edition already installed on the device. A new Windows 11 Pro licence for a machine with no Windows installed is a different product with a different price, and is not what this licence covers.",
    },
    {
      question: "Is it a one-time purchase, and is it per user or per device?",
      answer:
        "It is a one-time, perpetual purchase, licensed per device rather than per user. It changes the edition in place, keeps the existing activation and needs no reinstall.",
    },
    GST_INVOICE("the Windows 11 Pro upgrade licence"),
  ],
  "microsoft-365-business-basic-price-in-india": [
    {
      question: "What is the Microsoft 365 Business Basic price in India?",
      answer:
        "Microsoft 365 Business Basic is ₹2,040 per user per year excluding GST on an annual commitment billed yearly, which works out to ₹170 a month. The figure is tentative until a written quotation confirms it.",
    },
    {
      question: "Is GST included in the Business Basic price?",
      answer:
        "No. The ₹2,040 excludes GST; at 18% the annual plan comes to about ₹2,407 per user per year. GST is invoiced separately and is fully creditable for a registered business.",
    },
    {
      question: "Can I pay for Business Basic monthly?",
      answer:
        "Only the annual commitment, billed yearly, is listed at present. If you need a monthly term, request a quotation and we will confirm what is available.",
    },
    {
      question: "How does Business Basic compare with Business Standard and Business Premium?",
      answer:
        "The Microsoft 365 Business Basic product page carries a feature comparison against Business Standard and Business Premium, so you can see what each edition adds before you choose.",
    },
    GST_INVOICE("Microsoft 365"),
  ],
};

const AUTOCAD_STALE = "**Monthly** — ₹19,300";
const AUTOCAD_BODY = `AutoCAD is sold as a named-user subscription, and for a seat you expect to keep, the annual term is the whole decision.

## The price today

**Annual (1-year)** — ₹1,41,250 per user per year, excluding GST, which works out to roughly ₹11,771 a month. The subscription includes the industry toolsets, so there is no separate AutoCAD LT line to price against it.

Monthly and multi-year terms are not listed on the product page at present. If you need one, a short project for instance, ask for a quotation and we will confirm what is available: a written quotation is what fixes the price.

## What GST adds

Adding the standard 18% (₹25,425), the annual term comes to ₹1,66,675 per user per year. GST is invoiced separately and is fully creditable for a registered business.

## The actual decision

Almost nobody needs AutoCAD for exactly one month, so the real question is whether you will still need the seat in twelve months. If you will, the annual subscription is the straightforward purchase.

## Where to go next

Ready to buy? See how to [buy an AutoCAD licence](/autocad) through TechZoid, or read the full specification and current availability on the [AutoCAD product page](/products/autocad). Working in architecture or building design, [Autodesk Revit](/products/revit) and the [AEC Collection](/aec-collection) are the usual next step. To get a written quotation, [send an enquiry](/enquiry).`;
const AUTOCAD_EXCERPT =
  "What AutoCAD costs in India today: the annual subscription price per user, what GST adds, and how to get a quotation for any other term.";

const BASIC_STALE = "**Monthly commitment, billed monthly** — ₹204";
const BASIC_BODY = `Business Basic is sold on an annual commitment, billed yearly, so the question is less which plan to buy than whether it is the right edition for your users.

## The price today

**Annual commitment, billed yearly** — ₹2,040 per user per year, excluding GST. One invoice, once a year, which works out to ₹170 a month.

Other billing terms are not listed on the product page at present. If you need one, ask for a quotation and we will confirm what is available.

## What GST adds

At 18%, the annual plan comes to about ₹2,407 per user per year. GST is invoiced separately and is fully creditable for a registered business.

Full plan details and a feature comparison against Business Standard and Business Premium are on the [Microsoft 365 Business Basic product page](/products/microsoft-365-business-basic).`;
const BASIC_EXCERPT =
  "What Microsoft 365 Business Basic costs in India today: the annual price per user, what GST adds, and where to get a quotation for other terms.";

const AUTOCAD_PAGE_LINK =
  "\n\nFor the figures behind this, see the [AutoCAD price in India](/blog/autocad-subscription-price-in-india) article.";

export const blogPriceFaqs: ContentMigration = {
  id: "2026-11-blog-price-faqs",
  describe: "five FAQs on each price article, the AutoCAD and Business Basic figures brought to the catalogue, and the AutoCAD page linked to its price article",

  async apply(prisma) {
    const notes: string[] = [];
    const now = new Date();

    for (const [slug, items] of Object.entries(FAQS)) {
      const post = await prisma.blogPost.findUnique({
        where: { slug },
        select: { id: true, body: true, excerpt: true },
      });
      if (!post) {
        notes.push(`${slug}: not found`);
        continue;
      }

      const data: { body?: string; excerpt?: string; updatedAt?: Date } = {};
      if (slug.startsWith("autocad") && post.body.includes(AUTOCAD_STALE)) {
        data.body = AUTOCAD_BODY;
        data.excerpt = AUTOCAD_EXCERPT;
      }
      if (slug.startsWith("microsoft-365-business-basic") && post.body.includes(BASIC_STALE)) {
        data.body = BASIC_BODY;
        data.excerpt = BASIC_EXCERPT;
      }

      const topic = `blog:${slug}`;
      const existing = await prisma.faq.count({ where: { topic } });
      if (existing === 0) {
        await prisma.faq.createMany({
          data: items.map((item, index) => ({
            question: item.question,
            answer: item.answer,
            topic,
            displayOrder: (index + 1) * 10,
          })),
        });
        notes.push(`${slug}: ${items.length} FAQs added`);
        // The article changed — a visible "last updated" date should say so.
        data.updatedAt = now;
      }

      if (Object.keys(data).length > 0) {
        await prisma.blogPost.update({ where: { id: post.id }, data });
        if (data.body) notes.push(`${slug}: body brought to the catalogue`);
      }
    }

    // /autocad → its price article, once.
    const block = await prisma.pageSection.findFirst({
      where: { page: { slug: "autocad" }, type: "RICH_TEXT" },
      orderBy: { displayOrder: "asc" },
      select: { id: true, data: true },
    });
    const sections = await prisma.pageSection.findMany({
      where: { page: { slug: "autocad" }, type: "RICH_TEXT" },
      orderBy: { displayOrder: "asc" },
      select: { id: true, data: true },
    });
    const target = sections.find((s) => (s.data as { heading?: string }).heading === "One year or three") ?? block;
    if (target) {
      const data = target.data as { markdown?: string };
      if (data.markdown && !data.markdown.includes("/blog/autocad-subscription-price-in-india")) {
        await prisma.pageSection.update({
          where: { id: target.id },
          data: { data: { ...(target.data as object), markdown: data.markdown + AUTOCAD_PAGE_LINK } },
        });
        notes.push("/autocad: linked to the price article");
      }
    }

    return notes.length > 0 ? notes.join("; ") : "nothing to do";
  },
};
