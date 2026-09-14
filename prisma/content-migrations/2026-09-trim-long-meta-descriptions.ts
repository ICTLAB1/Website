import type { ContentMigration } from "./types";

/**
 * Bring every over-long meta description back inside the search snippet.
 *
 * ## What was wrong
 *
 * An external SEO audit flagged a single page whose meta description was "too
 * long" at 151 characters. Crawling a production build to check the claim found
 * that 151 is fine — Google shows about 155 — but that 25 other pages were
 * genuinely over 160 and being cut mid-clause in the one piece of copy whose
 * whole job is to earn the click. Four CMS pages sat at 170–180; eleven
 * catalogue pages, thirteen landing pages and one article were no better.
 *
 * ## Why nothing caught it
 *
 * `scripts/verify/seo.mjs` failed a build only past 180 characters and merely
 * listed anything between 160 and 180. A warning nobody has to clear is a
 * warning that accumulates, and it accumulated for months. The ceiling is a
 * hard failure as of this change; the floor stays a warning, because a short
 * description can only be fixed by writing more and a hard failure there would
 * encourage padding. Nothing has to be invented to shorten one.
 *
 * ## What was cut
 *
 * Wording only, never substance. Clauses that repeated the page's own heading,
 * adverbs, and list items already visible on the page itself — `/aec-collection`
 * drops two of six named applications, `/revit` drops a pricing clause the page
 * makes at length, `/microsoft-office` loses "licences" and "alternative". No
 * description now claims anything its page does not.
 *
 * Products are addressed through `seoDescription`, which is the field whose job
 * this is. The imported HP records never had one, so their page fell back to a
 * `shortDescription` written for a product card — 169 to 179 characters, and
 * the reason most of the catalogue entries are here. Setting the field fixes
 * the snippet and leaves the card copy alone.
 */

type PageEdit = { slug: string; from: string; to: string };
type ProductEdit = { slug: string; from: string | null; to: string };

const PAGES: PageEdit[] = [
  {
    slug: "solutions",
    from: "Enterprise technology solutions organised by the outcome you are buying — modern workplace, cloud transformation, design and engineering, security and compliance — and by industry.",
    to: "Enterprise technology solutions organised by the outcome you are buying — modern workplace, cloud transformation, design and engineering, and security.",
  },
  {
    slug: "terms",
    from: "The terms on which TechZoid supplies software licences, cloud services and IT solutions, how quotations and orders are formed, and the terms on which this website is provided.",
    to: "The terms on which TechZoid supplies software licences, cloud services and IT solutions, how quotations and orders are formed, and how this site is provided.",
  },
  {
    slug: "privacy",
    from: "What personal data this website collects, why, who it is shared with, how long it is kept, and the rights you have over it under the Digital Personal Data Protection Act, 2023.",
    to: "What personal data this site collects, why, who it is shared with, how long it is kept, and your rights over it under the Digital Personal Data Protection Act.",
  },
  {
    slug: "cookie-policy",
    from: "Every cookie this website sets — two strictly necessary, and Google Analytics on the public pages — what each one does, and how to refuse the ones that are not necessary.",
    to: "Every cookie this website sets — two strictly necessary, and Google Analytics on the public pages — what each one does, and how to refuse those that are not.",
  },
  {
    slug: "aec-collection",
    from: "The Architecture, Engineering and Construction Collection: Revit, AutoCAD, Civil 3D, Navisworks, Infraworks and 3ds Max in one subscription, priced against buying separately.",
    to: "The Architecture, Engineering and Construction Collection: Revit, AutoCAD, Navisworks and 3ds Max in one subscription, priced against buying separately.",
  },
  {
    slug: "autocad",
    from: "AutoCAD subscriptions with all seven industry toolsets included: 2D drafting, 3D design, web and mobile access, and one- or three-year terms priced side by side.",
    to: "AutoCAD subscriptions with all seven industry toolsets: 2D drafting, 3D design, web and mobile access, and one- or three-year terms priced side by side.",
  },
  {
    slug: "autodesk",
    from: "AutoCAD, Revit, the AEC and Product Design collections, Maya, Fusion and Autodesk Construction Cloud, licensed per named user with collection pricing modelled honestly.",
    to: "AutoCAD, Revit, the AEC and Product Design collections and Autodesk Construction Cloud, licensed per named user with collection pricing modelled honestly.",
  },
  {
    slug: "autodesk-construction-cloud",
    from: "Autodesk Construction Cloud: common data environment, issue and RFI tracking, model coordination and field checklists, licensed per user across Docs, Build and BIM Collaborate.",
    to: "Autodesk Construction Cloud: common data environment, issue and RFI tracking, model coordination and field checklists, licensed per user across Docs and Build.",
  },
  {
    slug: "microsoft",
    from: "Microsoft 365, Office, Windows Server, SQL Server, Dynamics 365 and Azure licensing, supplied under the purchasing programme that suits how your organisation actually buys.",
    to: "Microsoft 365, Office, Windows Server, SQL Server, Dynamics 365 and Azure licensing, under the purchasing programme that suits how your organisation buys.",
  },
  {
    slug: "microsoft-licensing",
    from: "A practical comparison of Microsoft's purchasing programmes: Cloud Solution Provider, Enterprise Agreement and volume licensing, with the thresholds that actually decide it.",
    to: "Comparing Microsoft's purchasing programmes: Cloud Solution Provider, Enterprise Agreement and volume licensing, with the thresholds that actually decide it.",
  },
  {
    slug: "microsoft-office",
    from: "Microsoft Office licensing for business: perpetual Home & Business and Professional Plus licences, LTSC volume licensing, and the Microsoft 365 subscription alternative compared.",
    to: "Microsoft Office licensing for business: perpetual Home & Business and Professional Plus, LTSC volume licensing, and the Microsoft 365 subscription compared.",
  },
  {
    slug: "revit",
    from: "Revit subscriptions for architecture, structure and building services: BIM modelling, worksharing, automatic documentation and IFC exchange, with collection pricing compared.",
    to: "Revit subscriptions for architecture, structure and building services: BIM modelling, worksharing, automatic documentation and IFC exchange, per named user.",
  },
  {
    slug: "solutions/design-engineering",
    from: "CAD, BIM and creative tooling with the workstations sized against the software that will run on them, licensed as one estate across Autodesk, Adobe and SketchUp.",
    to: "CAD, BIM and creative tooling with workstations sized against the software that will run on them, licensed as one estate across Autodesk, Adobe and SketchUp.",
  },
  {
    slug: "solutions/financial-services",
    from: "Retention, eDiscovery, identity controls and endpoint posture for financial services organisations, licensed against the compliance obligation rather than a checklist.",
    to: "Retention, eDiscovery, identity controls and endpoint posture for financial services, licensed against the compliance obligation rather than a checklist.",
  },
  {
    slug: "sql-server",
    from: "SQL Server 2022 Standard and Enterprise licensing: per-core versus server-plus-CAL, the four-core minimum, virtualisation rules and when Enterprise is genuinely required.",
    to: "SQL Server 2022 Standard and Enterprise licensing: per-core versus server-plus-CAL, the four-core minimum, and when Enterprise is genuinely required.",
  },
  {
    slug: "windows-server",
    from: "Windows Server 2025 Standard and Datacenter licensing explained: core counting rules, the sixteen-core minimum, when Datacenter becomes cheaper, and how CALs are counted.",
    to: "Windows Server 2025 Standard and Datacenter licensing: core counting rules, the sixteen-core minimum, when Datacenter is cheaper, and how CALs are counted.",
  },
  {
    slug: "microsoft-csp",
    from: "How Microsoft's Cloud Solution Provider programme works: annual and monthly terms, mid-term seat changes, INR billing with GST, and how it compares to a volume agreement.",
    to: "How Microsoft's Cloud Solution Provider programme works: annual and monthly terms, mid-term seat changes, INR billing with GST, and how it compares to volume.",
  },
];

/**
 * `from: null` is an imported record that never had an SEO description, whose
 * page therefore fell back to a card-length `shortDescription`. Setting the
 * field is the whole fix; the card copy is left as it is.
 */
const PRODUCTS: ProductEdit[] = [
  {
    slug: "autocad",
    from: "AutoCAD for Indian businesses with the industry-specific toolsets included, licensed per named user. Monthly, annual and three-year terms, in INR with a GST invoice.",
    to: "AutoCAD for Indian businesses with the industry-specific toolsets included, licensed per named user. Monthly, annual and three-year terms, in INR with GST.",
  },
  {
    slug: "coreldraw-graphics-suite",
    from: "CorelDRAW Graphics Suite in India, as a perpetual lifetime licence or an annual subscription. Vector illustration, page layout and photo editing, with a GST invoice.",
    to: "CorelDRAW Graphics Suite in India, as a perpetual lifetime licence or an annual subscription. Vector illustration, page layout and photo editing, with GST.",
  },
  {
    slug: "hp-pro-small-form-factor-280-g9",
    from: null,
    to: "The HP Pro Small Form Factor 280 G9, an HP commercial desktop supplied for business, government and education procurement in a small form factor chassis.",
  },
  {
    slug: "hp-prodesk-2-small-form-factor-g1i",
    from: null,
    to: "The HP ProDesk 2 Small Form Factor G1i, an HP commercial desktop supplied for business, government and education procurement in a small form factor chassis.",
  },
  {
    slug: "hp-pro-400-g9-small-form-factor",
    from: null,
    to: "The HP Pro 400 G9 Small Form Factor, an HP commercial desktop supplied for business, government and education procurement in a small form factor chassis.",
  },
  {
    slug: "hp-pro-400-g7-small-form-factor",
    from: null,
    to: "The HP Pro 400 G7 Small Form Factor, an HP commercial desktop supplied for business, government and education procurement in a small form factor chassis.",
  },
  {
    slug: "hp-z1-g1i-tower-workstation",
    from: null,
    to: "An entry tower workstation on Intel Core Ultra 5 and Ultra 7 with integrated graphics, supplied with FreeDOS or Windows 11 Pro and three years onsite warranty.",
  },
  {
    slug: "hp-z2-g9-tower-workstation",
    from: null,
    to: "A mid-range tower workstation on the 14th-generation Intel Core i7-14700, with integrated graphics or an NVIDIA T1000, and three to five years onsite warranty.",
  },
  {
    slug: "hp-z2-g1i-tower-workstation",
    from: null,
    to: "HP's mid-range tower workstation on Intel Core Ultra 7 and Ultra 9, with graphics from integrated to NVIDIA RTX Pro, and three to five years of onsite warranty.",
  },
  {
    slug: "hp-z4-g5-tower-workstation",
    from: null,
    to: "A single-socket Xeon W workstation with ECC memory and professional NVIDIA graphics, for simulation, rendering and data work. Four years onsite on most builds.",
  },
  {
    slug: "hp-z8-fury-g5-tower-workstation",
    from: null,
    to: "HP's highest-specified workstation: Xeon W-3500 processors, up to 512 GB of ECC memory and NVIDIA RTX Pro Blackwell graphics. Five years of onsite warranty.",
  },
];

const ARTICLE = {
  slug: "microsoft-365-business-premium-security-you-already-own",
  from: "Most organisations on Business Premium use a fraction of its security capability. That unused portion is often the cheapest security improvement available to them.",
  to: "Most organisations on Business Premium use a fraction of its security capability. That unused portion is often the cheapest security improvement available.",
};

export const trimLongMetaDescriptions: ContentMigration = {
  id: "2026-09-trim-long-meta-descriptions",
  describe: "trim every meta description over 160 characters so it stops truncating in a search result",

  async apply(prisma) {
    let changed = 0;
    let already = 0;
    let left = 0;
    let missing = 0;

    for (const edit of PAGES) {
      const page = await prisma.page.findUnique({
        where: { slug: edit.slug },
        select: { id: true, description: true },
      });
      if (!page) {
        missing += 1;
        continue;
      }

      const current = page.description?.trim() ?? "";
      if (current === edit.to) {
        already += 1;
        continue;
      }
      if (current !== edit.from) {
        // Reworded by an administrator since — their sentence, not this
        // migration's to overwrite, however long it is.
        left += 1;
        continue;
      }

      await prisma.page.update({ where: { id: page.id }, data: { description: edit.to } });
      changed += 1;
    }

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
      if (current !== edit.from) {
        left += 1;
        continue;
      }

      await prisma.product.update({ where: { id: product.id }, data: { seoDescription: edit.to } });
      changed += 1;
    }

    const article = await prisma.blogPost.findUnique({
      where: { slug: ARTICLE.slug },
      select: { id: true, excerpt: true },
    });
    if (!article) missing += 1;
    else if (article.excerpt.trim() === ARTICLE.to) already += 1;
    else if (article.excerpt.trim() !== ARTICLE.from) left += 1;
    else {
      await prisma.blogPost.update({ where: { id: article.id }, data: { excerpt: ARTICLE.to } });
      changed += 1;
    }

    const parts = [`${changed} description(s) trimmed`];
    if (already > 0) parts.push(`${already} already current`);
    if (left > 0) parts.push(`${left} edited since and left alone`);
    if (missing > 0) parts.push(`${missing} not found`);
    return parts.join(", ");
  },
};
