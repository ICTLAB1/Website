import type { ContentMigration } from "./types";

/**
 * The three brand hubs, retitled for the searches they should answer.
 *
 * Measured on 10 November 2026 across nine India queries of the form
 * "microsoft 365 reseller india", "adobe reseller india" and "autodesk
 * reseller india": this site was in the top twenty for none of them, and every
 * page that was had "reseller" or "partner" and "India" in its title. The hubs
 * were titled for what they contain — "Plans & Business Subscriptions",
 * "Licensing for Teams & Enterprise" — which is accurate and is not what
 * anybody types.
 *
 * Titles and descriptions only. The headings, the copy and the URLs are
 * unchanged, so nothing here can split a ranking.
 *
 * What these deliberately do not say: "authorised", "certified", "Solutions
 * Partner" or any other tier. A designation is printed through the gate in
 * `src/lib/brand-partner.ts`, where it expires when its confirmation does; a
 * title typed here would outlive it. "Reseller" is a description of the trade,
 * not a rank within a programme.
 *
 * Each edit applies only where the title is still the one this replaces. A
 * title somebody has since rewritten in the admin panel is theirs.
 */

type Edit = {
  slug: string;
  from: string;
  title: string;
  description: string;
};

export const HUB_TITLE_EDITS: Edit[] = [
  {
    slug: "microsoft-365",
    from: "Microsoft 365 Plans & Business Subscriptions",
    title: "Microsoft 365 Reseller in India: Plans & Pricing",
    description:
      "Buy Microsoft 365 from a CSP reseller in India: Business and Enterprise plans compared, seat sizing, the 300-user cap, pricing in INR and GST invoicing.",
  },
  {
    slug: "adobe",
    from: "Adobe Licensing for Teams & Enterprise",
    title: "Adobe Reseller in India: Creative Cloud & Acrobat",
    description:
      "Adobe reseller in India for Creative Cloud, Acrobat and single-app licences for business: central administration, reassignable seats and GST invoicing.",
  },
  {
    slug: "autodesk",
    from: "Autodesk Licensing for Design & Engineering Teams",
    title: "Autodesk Reseller in India: AutoCAD, Revit & More",
    description:
      "Autodesk reseller in India for AutoCAD, Revit, the AEC and Product Design collections and Construction Cloud, licensed per named user with GST invoicing.",
  },
];

export const hubTitlesSayReseller: ContentMigration = {
  id: "2026-11-hub-titles-say-reseller",
  describe: "retitle the Microsoft 365, Adobe and Autodesk hubs for reseller searches",

  async apply(prisma) {
    let changed = 0;
    let already = 0;
    let left = 0;
    let missing = 0;

    for (const edit of HUB_TITLE_EDITS) {
      const page = await prisma.page.findUnique({
        where: { slug: edit.slug },
        select: { id: true, title: true },
      });
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

      await prisma.page.update({
        where: { id: page.id },
        data: { title: edit.title, description: edit.description },
      });
      changed += 1;
    }

    return `${changed} hub(s) retitled, ${already} already done, ${left} left as edited by hand, ${missing} not found.`;
  },
};
