import type { ContentMigration } from "./types";

/**
 * The product-family landing pages, retitled so each says "Price in India" or
 * "Reseller in India".
 *
 * These pages were titled for what they contain ("Pricing & Licensing"), which
 * is accurate and is not what a buyer in India types: "adobe photoshop price in
 * india", "zoho crm price in india". The titles now carry the phrase; the
 * headings, copy and URLs are unchanged, so nothing here can split a ranking.
 *
 * Titles only, and each applies only where the title is still the one this
 * replaces — a title somebody has rewritten in the admin panel is theirs. The
 * layout appends " | TechZoid", so each title here is written to stay within
 * sixty characters once it has.
 *
 * What none of them say: "authorised", "certified" or any programme tier. That
 * is printed through the gate in `src/lib/brand-partner.ts`.
 */

type Edit = { slug: string; from: string; title: string };

export const LANDING_TITLE_EDITS: Edit[] = [
  { slug: "autocad", from: "AutoCAD Licensing & Pricing", title: "Buy AutoCAD Licence | AutoCAD Reseller in India" },
  { slug: "adobe-acrobat", from: "Adobe Acrobat Licensing for Business", title: "Adobe Acrobat Price in India — Business Licensing" },
  { slug: "adobe-creative-cloud", from: "Adobe Creative Cloud for Teams — Pricing & Licensing", title: "Adobe Creative Cloud Price in India — Teams" },
  { slug: "adobe-illustrator", from: "Adobe Illustrator for Teams — Pricing & Licensing", title: "Adobe Illustrator Price in India — For Teams" },
  { slug: "adobe-photoshop", from: "Adobe Photoshop for Teams — Pricing & Licensing", title: "Adobe Photoshop Price in India — For Teams" },
  { slug: "adobe-premiere-pro", from: "Adobe Premiere Pro for Teams — Pricing & Licensing", title: "Adobe Premiere Pro Price in India — For Teams" },
  { slug: "aec-collection", from: "Autodesk AEC Collection — Pricing & What Is Included", title: "Autodesk AEC Collection Price in India" },
  { slug: "autodesk-construction-cloud", from: "Autodesk Construction Cloud — Licensing & Modules", title: "Autodesk Construction Cloud Price in India" },
  { slug: "fusion-360", from: "Autodesk Fusion — Pricing & Licensing", title: "Autodesk Fusion Price in India — Buy Licence" },
  { slug: "microsoft-365/business-premium", from: "Microsoft 365 Business Premium — Pricing & Licensing", title: "Microsoft 365 Business Premium Price in India" },
  { slug: "microsoft-365/business-standard", from: "Microsoft 365 Business Standard — Pricing & Licensing", title: "Microsoft 365 Business Standard Price in India" },
  { slug: "zoho", from: "Zoho Licensing & Implementation", title: "Zoho Reseller in India — Licensing & Setup" },
  { slug: "zoho-books", from: "Zoho Books — GST Accounting Software Pricing", title: "Zoho Books Price in India — GST Accounting" },
  { slug: "zoho-crm", from: "Zoho CRM — Pricing, Editions & Implementation", title: "Zoho CRM Price in India — Editions & Setup" },
  { slug: "zoho-desk", from: "Zoho Desk — Support Ticketing Pricing & Setup", title: "Zoho Desk Price in India — Helpdesk Software" },
  { slug: "zoho-mail", from: "Zoho Mail — Business Email Hosting Pricing", title: "Zoho Mail Price in India — Business Email" },
  { slug: "zoho-workplace", from: "Zoho Workplace — Email & Collaboration Pricing", title: "Zoho Workplace Price in India — Email & Apps" },
];

export const landingTitlesSayIndia: ContentMigration = {
  id: "2026-11-landing-titles-say-india",
  describe: "retitle the product-family landing pages for 'price in India' and 'reseller in India' searches",

  async apply(prisma) {
    let changed = 0;
    let already = 0;
    let left = 0;
    let missing = 0;

    for (const edit of LANDING_TITLE_EDITS) {
      const page = await prisma.page.findUnique({ where: { slug: edit.slug }, select: { id: true, title: true } });
      if (!page) {
        missing += 1;
        continue;
      }
      if (page.title === edit.title) {
        already += 1;
        continue;
      }
      if (page.title !== edit.from) {
        left += 1;
        continue;
      }
      await prisma.page.update({ where: { id: page.id }, data: { title: edit.title } });
      changed += 1;
    }

    return `${changed} page(s) retitled, ${already} already done, ${left} left as edited by hand, ${missing} not found.`;
  },
};
