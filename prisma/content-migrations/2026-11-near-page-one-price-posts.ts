import type { ContentMigration } from "./types";

/**
 * Three price articles that rank just off the first page for the searches people type
 * ("autocad price in india", "zoho workplace price", "windows license cost"): each opens
 * with a direct answer and a price table, carries more of the questions people ask, and is
 * titled with its main keyword first.
 *
 * Prices are `{{price:<slug>}}` / `{{gst:<slug>}}` tokens the article resolves from the
 * catalogue when it renders, so the answer cannot go on quoting last quarter's figure. A
 * product with no price shows "price on request" in the answer and "Get today's price" in the
 * table: nothing is invented. The block is added once (recognised by its table), only to an
 * article that exists, and the existing text beneath it is left exactly as it is. A title is
 * changed only when it does not already start with the keyword, and a question is added
 * only when the article does not already ask it.
 */
// The block is recognised by its table header, which is visible content, rather than by a hidden marker.
const TABLE_HEADER = "| Plan | Term | Price (excl. GST) | What's included |";
const UPDATED = "November 2026";

type Spec = {
  slug: string;
  keyword: string;
  title: string;
  block: string;
  faqs: Array<{ question: string; answer: string }>;
};

const SPECS: Spec[] = [
  {
    slug: "autocad-subscription-price-in-india",
    keyword: "AutoCAD price in India",
    title: "AutoCAD Price in India 2026 – Subscription & Licence Cost",
    block: `**AutoCAD costs {{price:autocad}} per user per year in India** (1-year subscription, excluding GST; {{gst:autocad}} including 18% GST). AutoCAD LT, the 2D-only version, costs {{price:autocad-lt}} per user per year. AutoCAD is sold as a named-user subscription, not a one-time purchase. *Updated ${UPDATED}.*

| Plan | Term | Price (excl. GST) | What's included |
| --- | --- | --- | --- |
| AutoCAD | 1-year subscription, per user | {{price:autocad}} | 2D drafting, 3D modelling, all seven industry toolsets, web and mobile apps |
| AutoCAD LT | Annual, per user | {{price:autocad-lt}} | 2D drafting and documentation |
| AutoCAD, monthly or 3-year | Quoted on request | Get today's price | Same product, different term |

See the [AutoCAD subscription price and what it includes](/products/autocad), the [AutoCAD LT price](/products/autocad-lt), or [compare AutoCAD and AutoCAD LT](/blog/autocad-vs-autocad-lt). Prices are tentative and fixed by a written quotation.`,
    faqs: [
      { question: "What is the AutoCAD license price in India?", answer: "AutoCAD is {{price:autocad}} per user per year in India on the 1-year subscription, excluding GST, which is {{gst:autocad}} including 18% GST. The price is tentative and fixed by a written quotation." },
      { question: "Is AutoCAD a one-time purchase?", answer: "No. AutoCAD is sold as a named-user subscription, renewed each term, rather than as a one-time purchase. The price quoted here is for one year per user." },
      { question: "How much does AutoCAD cost per year in India?", answer: "{{price:autocad}} per user per year excluding GST for AutoCAD, and {{price:autocad-lt}} per user per year for AutoCAD LT." },
      { question: "What is the price of AutoCAD software with GST?", answer: "AutoCAD is {{gst:autocad}} per user per year including 18% GST. Every order is invoiced with GST, which GST-registered buyers can usually claim as input credit." },
      { question: "Is AutoCAD LT cheaper than AutoCAD?", answer: "Yes. AutoCAD LT is {{price:autocad-lt}} per user per year against {{price:autocad}} for AutoCAD, because it covers 2D drafting and documentation only; AutoCAD adds 3D modelling and the industry toolsets." },
      { question: "Which AutoCAD plan should a small firm buy?", answer: "If your drawings are 2D, AutoCAD LT is usually enough and costs less. If you need 3D modelling or an industry toolset such as Architecture or Mechanical, buy AutoCAD. Ask us for a quotation and we will confirm which fits." },
    ],
  },
  {
    slug: "zoho-pricing-in-india-how-it-works",
    keyword: "Zoho Workplace price in India",
    title: "Zoho Workplace Price in India 2026 – Plans, Costing & How Pricing Works",
    block: `**Zoho Workplace costs {{price:zoho-workplace}} per user per year in India** on the Standard plan (annual billing, excluding GST; {{gst:zoho-workplace}} including 18% GST). Zoho Mail on its own starts at {{price:zoho-mail}} per user per year. Zoho prices here are annual and per user. *Updated ${UPDATED}.*

| Plan | Term | Price (excl. GST) | What's included |
| --- | --- | --- | --- |
| Zoho Workplace Standard | Annual, per user | {{price:zoho-workplace}} | Business email with Zoho's office and collaboration apps |
| Zoho Mail (Lite) | Annual, per user | {{price:zoho-mail}} | Business email on your own domain |
| Zoho One | Annual, per employee | {{price:zoho-one}} | Zoho's suite of business applications |

See the [Zoho Workplace price and plans](/products/zoho-workplace) and the [Zoho Workplace page](/zoho-workplace). Prices are tentative and fixed by a written quotation.`,
    faqs: [
      { question: "How much does Zoho Workplace cost in India?", answer: "Zoho Workplace Standard is {{price:zoho-workplace}} per user per year in India with annual billing, excluding GST, which is {{gst:zoho-workplace}} including 18% GST. The price is tentative and fixed by a written quotation." },
      { question: "What is the Zoho costing for a small business?", answer: "Zoho prices here are per user per year. Business email alone is Zoho Mail from {{price:zoho-mail}} per user; Zoho Workplace Standard is {{price:zoho-workplace}} per user. Multiply by your user count and add 18% GST." },
      { question: "Is Zoho Workplace billed monthly or annually?", answer: "The Zoho prices in our catalogue are annual, per user. If you want a different billing term, ask for a quotation and we will confirm what is available." },
      { question: "Does the Zoho Workplace price include GST?", answer: "No. The price is excluding GST. With 18% GST Zoho Workplace Standard is {{gst:zoho-workplace}} per user per year, and every order is invoiced with GST." },
      { question: "Is Zoho Workplace cheaper than Microsoft 365?", answer: "On our catalogue prices, Zoho Workplace Standard is {{price:zoho-workplace}} per user per year and Microsoft 365 Business Standard is {{price:microsoft-365-business-standard}}. They include different things, so compare what each gives you as well as the price." },
      { question: "What is the difference between Zoho Mail and Zoho Workplace?", answer: "Zoho Mail is business email on your own domain, from {{price:zoho-mail}} per user per year. Zoho Workplace is {{price:zoho-workplace}} per user per year and adds Zoho's office and collaboration applications to the email." },
    ],
  },
  {
    slug: "windows-11-pro-upgrade-licence-price-in-india",
    keyword: "Windows licence cost in India",
    title: "Windows Licence Cost in India 2026 – Windows 11 Pro Upgrade Price",
    block: `**The Windows 11 Pro upgrade licence costs {{price:windows-11-pro-upgrade}} per device in India** (one-time, perpetual, excluding GST; {{gst:windows-11-pro-upgrade}} including 18% GST). It upgrades a device that already runs Windows 11 Home. A full Windows 11 Pro licence is quoted on request. *Updated ${UPDATED}.*

| Licence | Term | Price (excl. GST) | What's included |
| --- | --- | --- | --- |
| Windows 11 Pro upgrade (from Home) | One-time, per device | {{price:windows-11-pro-upgrade}} | Pro features on the existing installation: domain join, BitLocker, Remote Desktop host, Group Policy |
| Windows 11 Pro, full licence | One-time, per device | Get today's price | A new Windows 11 Pro licence |
| Windows 11 Enterprise E3 | Subscription, per user | Get today's price | Windows 11 Enterprise with enterprise security and management |

See the [Windows 11 Pro upgrade licence and its price](/products/windows-11-pro-upgrade). Prices are tentative and fixed by a written quotation.`,
    faqs: [
      { question: "What is the Windows license cost in India?", answer: "The Windows 11 Pro upgrade licence is {{price:windows-11-pro-upgrade}} per device, excluding GST, which is {{gst:windows-11-pro-upgrade}} including 18% GST. A full Windows 11 Pro licence is quoted on request." },
      { question: "Is Windows 11 Pro a one-time purchase?", answer: "The upgrade licence is a one-time, perpetual purchase, licensed per device. Windows 11 Enterprise, by contrast, is a per-user subscription." },
      { question: "What is the difference between the Windows 11 Pro upgrade and a full licence?", answer: "The upgrade, {{price:windows-11-pro-upgrade}} per device, moves a device that already has Windows 11 Home to Pro. A full Windows 11 Pro licence is for a device with no qualifying Windows licence, and is quoted on request." },
      { question: "Do I need Windows 11 Pro for a business?", answer: "Pro adds the features most businesses need: joining a domain, BitLocker device encryption, hosting Remote Desktop and Group Policy management. Windows 11 Home does not have them." },
      { question: "Is GST charged on a Windows licence?", answer: "Yes, 18% GST, so the Windows 11 Pro upgrade is {{gst:windows-11-pro-upgrade}} per device including GST. GST-registered buyers can usually claim it as input credit." },
      { question: "How much does Windows 11 Enterprise cost?", answer: "Windows 11 Enterprise is a per-user subscription, listed as Windows 11 Enterprise E3 and E5. We quote it on request, so ask for today's price." },
    ],
  },
];

const norm = (text: string) => text.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

export const nearPageOnePricePosts: ContentMigration = {
  id: "2026-11-near-page-one-price-posts",
  describe: "price articles open with a direct answer and a price table, and carry more of the questions people ask",

  async apply(prisma) {
    const notes: string[] = [];
    for (const spec of SPECS) {
      const post = await prisma.blogPost.findUnique({ where: { slug: spec.slug }, select: { id: true, body: true, title: true } });
      if (!post) {
        notes.push(`/blog/${spec.slug} not found`);
        continue;
      }
      const data: { body?: string; title?: string; updatedAt: Date } = { updatedAt: new Date() };
      if (!post.body.includes(TABLE_HEADER)) data.body = `${spec.block}\n\n${post.body}`;
      if (!norm(post.title).startsWith(norm(spec.keyword).split(" ").slice(0, 2).join(" "))) data.title = spec.title;
      if (data.body || data.title) {
        await prisma.blogPost.update({ where: { id: post.id }, data });
        notes.push(`/blog/${spec.slug} updated`);
      }
      const topic = `blog:${spec.slug}`;
      const existing = await prisma.faq.findMany({ where: { topic }, select: { question: true, displayOrder: true } });
      const have = new Set(existing.map((row) => norm(row.question)));
      let order = existing.reduce((max, row) => Math.max(max, row.displayOrder), 0);
      const fresh = spec.faqs.filter((faq) => !have.has(norm(faq.question)));
      if (fresh.length > 0) {
        await prisma.faq.createMany({
          data: fresh.map((faq) => ({ ...faq, topic, displayOrder: (order += 10) })),
        });
        notes.push(`/blog/${spec.slug}: ${fresh.length} questions added`);
      }
    }
    return notes.join("; ") || "nothing to do";
  },
};
