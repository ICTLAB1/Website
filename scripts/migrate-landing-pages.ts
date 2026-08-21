/**
 * Moves the last four compiled pages — the home page, /enterprise, /about and
 * /resources — into the CMS.
 *
 * These four were left behind by the earlier migration because, unlike the
 * forty landing pages, they were not built from a content array: most of their
 * prose was written directly in JSX. Everything each page rendered is
 * transcribed below, block by block, in the order it appeared.
 *
 * Two things deliberately do not move:
 *
 *  - business identity (legal name, registered address, GSTIN, the sales
 *    address) stays in server configuration and is read at render time by the
 *    COMPANY_INFO block and by CTA_BANNER's `showContactEmail` flag;
 *  - live figures (product, SKU and vendor counts, the catalogue, services,
 *    articles and vendor lists) stay as references, so the page reports the
 *    database rather than a number someone typed.
 *
 * Idempotent: each page is deleted and rewritten, so re-running it is safe.
 *
 * Note that this writes to the database out of band, which the running app's
 * cache will not notice. Restart `next dev`, or edit any block through the
 * admin panel, before comparing rendered output.
 *
 *   npx tsx scripts/migrate-landing-pages.ts
 */

import { PrismaClient, type PageSectionType, type Prisma } from "@prisma/client";
import { BLOCK_SCHEMAS, isBlockType } from "../src/lib/blocks/schemas";

const prisma = new PrismaClient();

type Block = { type: PageSectionType; data: Record<string, unknown> };

type PageSpec = {
  slug: string;
  title: string;
  description: string;
  keywords: string[];
  breadcrumb: Array<{ label: string; href?: string }>;
  faqTopic?: string;
  blocks: Block[];
};

const block = (type: PageSectionType, data: Record<string, unknown>): Block => ({ type, data });

/* ------------------------------------------------------------------ home */

const HOME: PageSpec = {
  slug: "",
  title: "Enterprise Software Licensing, Cloud & IT Solutions",
  description:
    "Microsoft, Adobe, Autodesk, Zoho and enterprise technology solutions from one trusted procurement partner. Consolidated quotations, GST invoicing, deployment and licence management.",
  keywords: [
    "enterprise software licensing",
    "software procurement",
    "Microsoft licensing",
    "IT solutions India",
  ],
  breadcrumb: [],
  blocks: [
    block("HERO", {
      eyebrow: "Multiple technology vendors. One procurement partner.",
      headline: "Enterprise Software Licensing, Cloud & IT Solutions",
      subheadline:
        "Microsoft, Adobe, Autodesk, Zoho and enterprise technology solutions from one trusted procurement partner — with the licensing advice, deployment support and renewal management that make them worth owning.",
      primaryCta: { label: "Get Enterprise Quote", href: "/enquiry" },
      secondaryCta: { label: "Browse Software", href: "/products" },
      showSearch: true,
      searchTerms: ["Microsoft 365", "Acrobat Pro", "AutoCAD", "Zoho CRM", "Windows Server"],
      stats: [
        { label: "Products listed", source: "productCount" },
        { label: "Licensable SKUs", source: "skuCount" },
        { label: "Vendors supplied", source: "brandCount" },
        { label: "Purchase order", source: "literal", value: "One" },
      ],
      tone: "dark",
    }),

    block("COLLECTION_GRID", {
      heading: "Licensing and solutions across",
      kind: "brands",
      layout: "strip",
      limit: 24,
    }),

    block("ICON_POINTS", {
      items: [
        { label: "100% Genuine", detail: "Original, authentic licences" },
        { label: "Authorised Partner", detail: "Direct vendor relationships" },
        { label: "Expert Support", detail: "Pre-sales and post-sales" },
        { label: "Competitive Pricing", detail: "Best value at volume" },
        { label: "Fast, Secure Delivery", detail: "Quick turnaround across India" },
        { label: "GST Invoicing", detail: "Fully compliant billing" },
      ],
    }),

    block("COLLECTION_GRID", {
      eyebrow: "Catalogue",
      heading: "Featured software categories",
      description:
        "Browse by what the software does rather than who publishes it — most procurement decisions start with a capability, not a vendor.",
      kind: "categories",
      limit: 8,
      action: { label: "View full catalogue", href: "/products" },
    }),

    block("PRODUCT_GRID", {
      eyebrow: "Most requested",
      heading: "Popular products",
      description: "The licences most often included in the quotations we prepare.",
      source: "popular",
      limit: 6,
      action: { label: "See all popular", href: "/products?sort=popular" },
    }),

    block("SPLIT_PANEL", {
      eyebrow: "Enterprise procurement",
      heading: "One procurement partner for your technology stack",
      description:
        "A single technology refresh can involve four publishers, two hardware vendors and a services engagement. Handled directly, that is seven vendor relationships for one project.",
      bulletsIntro:
        "We consolidate the sourcing so one requirement produces one quotation, one purchase order and one GST invoice — without losing visibility of what each line costs.",
    }),

    block("LINK_LIST", {
      layout: "inline",
      items: [
        { label: "Talk to an Enterprise Specialist", href: "/enterprise" },
        { label: "How procurement works", href: "/services/it-procurement" },
      ],
    }),

    block("CARDS", {
      columns: 2,
      items: [
        {
          title: "Multi-vendor sourcing",
          body: "One requirement covering Microsoft, Adobe, Autodesk, Zoho and infrastructure vendors, sourced together rather than chased separately.",
        },
        {
          title: "Consolidated quotation",
          body: "A single itemised quotation across every vendor, with each line priced individually so nothing is hidden inside a bundle.",
        },
        {
          title: "One purchase order",
          body: "Your finance team raises one PO and reconciles one GST invoice instead of five, whatever the quotation contains.",
        },
        {
          title: "Renewals managed",
          body: "Every renewal date tracked with a review window ahead of it, so no subscription renews at last year's count by default.",
        },
      ],
    }),

    block("PRODUCT_GRID", {
      eyebrow: "Selected licensing",
      heading: "Featured products",
      description:
        "Widely-deployed licences with the licensing detail set out in full on each product page.",
      source: "featured",
      limit: 6,
      action: { label: "Browse all products", href: "/products" },
    }),

    block("COLLECTION_GRID", {
      eyebrow: "Managed services",
      heading: "Beyond the licence",
      description:
        "Software delivers nothing until it is deployed, adopted and kept running. These are the engagements that get it there.",
      kind: "services",
      limit: 6,
      action: { label: "All services", href: "/services" },
    }),

    block("CARDS", {
      eyebrow: "Why work with us",
      heading: "What you can expect",
      description: "Stated plainly, so you can hold us to it.",
      numbered: true,
      columns: 2,
      items: [
        {
          title: "Licensing advice before the sale",
          body: "We will tell you when a cheaper licensing model fits better, including when that means a smaller order. A recommendation you cannot trust is worth nothing.",
        },
        {
          title: "Written commercial terms",
          body: "Response commitments, support scope and delivery timelines are stated in the quotation, not described qualitatively and settled later.",
        },
        {
          title: "Deployment, not just delivery",
          body: "Migration, tenant configuration and user onboarding are available alongside the licences, so what you buy is actually adopted.",
        },
        {
          title: "GST-compliant invoicing",
          body: "Every invoice carries your GSTIN and registered legal name correctly, so input credit is not lost to a reconciliation mismatch.",
        },
      ],
    }),

    block("LINK_LIST", {
      eyebrow: "Industries",
      heading: "Sector-specific technology requirements",
      description:
        "Licensing decisions look different depending on what the software is being used for.",
      layout: "cards",
      items: [
        {
          label: "Architecture & Construction",
          href: "/solutions/architecture-construction",
          description: "BIM, CAD and common data environments",
        },
        {
          label: "Manufacturing",
          href: "/solutions/manufacturing",
          description: "Product design, CAM and simulation",
        },
        {
          label: "IT & Software",
          href: "/solutions/technology",
          description: "Cloud platforms, developer tooling and security",
        },
        {
          label: "Financial Services",
          href: "/solutions/financial-services",
          description: "Compliance, retention and identity controls",
        },
        {
          label: "Education",
          href: "/solutions/education",
          description: "Academic licensing and campus deployment",
        },
        {
          label: "Media & Creative",
          href: "/solutions/design-engineering",
          description: "Creative suites and post-production",
        },
      ],
    }),

    block("SPLIT_PANEL", {
      eyebrow: "Government e-Marketplace",
      heading: "Registered GeM seller",
      description:
        "An experienced seller on the Government e-Marketplace, supplying software and IT solutions through public procurement channels.",
      bulletsIntro: "We support:",
      bullets: [
        "Government departments",
        "Public sector undertakings",
        "Educational institutions",
        "Public sector organisations",
      ],
      tiles: ["GeM contracts", "CRAC support", "Timely delivery", "GST invoicing"],
    }),

    // Named as organisations supplied to, and rendered as plain wordmarks —
    // no official emblem is reproduced and no endorsement is implied.
    block("CHIP_LIST", {
      eyebrow: "Public sector and defence",
      heading: "Organisations we have supplied technology to",
      description:
        "Including government departments, defence establishments and public sector undertakings, supplied through GeM and direct tender engagements.",
      items: [
        "BSNL",
        "Delhi Police",
        "ONGC",
        "NBCC",
        "North Delhi Municipal Corporation",
        "Indian Army",
        "Border Roads Organisation",
        "DRDO",
        "Hindustan Aeronautics Limited",
      ],
      footnote: "500+ organisations supplied across India.",
    }),

    block("CARDS", {
      eyebrow: "How we work",
      heading: "What a first engagement looks like",
      description: "No case studies invented for a website. This is the actual sequence.",
      numbered: true,
      numberLabel: "Step",
      columns: 4,
      items: [
        {
          title: "Tell us the requirement",
          body: "In whatever detail you have — a product list, a seat count, or just the problem you are solving.",
        },
        {
          title: "We source and advise",
          body: "Across vendors, including the alternative you did not ask about if it fits better.",
        },
        {
          title: "One quotation",
          body: "Itemised by line, with the GST position and delivery timeline stated in writing.",
        },
        {
          title: "Delivery and support",
          body: "Provisioning, deployment where in scope, and a renewal calendar from day one.",
        },
      ],
    }),

    block("COLLECTION_GRID", {
      eyebrow: "Vendors",
      heading: "Licensing across the vendors you already use",
      kind: "brands",
      layout: "grid",
      limit: 24,
      action: { label: "All vendors", href: "/brands" },
    }),

    // Certification standing as represented by the operating company, stated
    // in words rather than by reproducing any vendor's badge artwork.
    block("KEY_VALUE_LIST", {
      items: [
        { key: "Microsoft", value: "Solution Partner" },
        { key: "Adobe", value: "Certified Partner" },
        { key: "Autodesk", value: "Partner" },
        { key: "HP", value: "Partner" },
        { key: "Dell Technologies", value: "Authorised Partner" },
        { key: "Lenovo", value: "Authorised Partner" },
      ],
    }),

    block("COLLECTION_GRID", {
      eyebrow: "Resources",
      heading: "Licensing and procurement guidance",
      description: "Practical explainers on the decisions that cost the most when they go wrong.",
      kind: "posts",
      limit: 3,
      action: { label: "Resource centre", href: "/resources" },
    }),

    block("CTA_BANNER", {
      heading: "Ready to consolidate your technology procurement?",
      body: "Send us the requirement — a product list, a seat count, or just the problem you are trying to solve. We will come back with a consolidated quotation and a plain recommendation, including where a cheaper option would serve you better.",
      primaryCta: { label: "Get Enterprise Quote", href: "/enquiry" },
      secondaryCta: { label: "Contact sales", href: "/contact" },
      tone: "dark",
    }),
  ],
};

/* ------------------------------------------------------------ enterprise */

const ENTERPRISE: PageSpec = {
  slug: "enterprise",
  title: "Enterprise Technology Procurement",
  description:
    "One procurement partner for your technology stack. Multi-vendor sourcing, consolidated quotations, a single purchase order, GST invoicing, licence management, renewals and deployment.",
  keywords: ["enterprise procurement", "multi-vendor sourcing", "consolidated quotation"],
  breadcrumb: [{ label: "Home", href: "/" }, { label: "Enterprise" }],
  faqTopic: "enterprise",
  blocks: [
    block("HERO", {
      eyebrow: "Enterprise procurement",
      headline: "One Procurement Partner for Your Technology Stack",
      subheadline:
        "A single technology refresh can involve four publishers, two hardware vendors and a services engagement. Handled directly, that is seven vendor relationships, seven quotation formats, seven purchase orders and seven sets of invoices — for one project.",
      primaryCta: { label: "Talk to an Enterprise Specialist", href: "/enquiry" },
      secondaryCta: { label: "Contact sales", href: "/contact" },
      tone: "dark",
    }),

    block("COLLECTION_GRID", {
      heading: "Consolidating vendors including",
      kind: "brands",
      layout: "strip",
      limit: 24,
    }),

    block("CARDS", {
      eyebrow: "What is included",
      heading: "Everything between the requirement and the running system",
      description: "Procurement is the entry point, not the whole engagement.",
      columns: 4,
      items: [
        {
          title: "Multi-vendor procurement",
          body: "Microsoft, Adobe, Autodesk, Zoho, SketchUp, Corel and enterprise infrastructure sourced together. One requirement in, one set of options out — including the alternative you did not ask about, where it fits better.",
        },
        {
          title: "Consolidated quotations",
          body: "Every line itemised and priced individually on a single document, so consolidation never costs you visibility of what each component costs.",
        },
        {
          title: "Single purchase order",
          body: "Your finance team raises one PO covering the whole quotation rather than one per vendor, regardless of how many publishers it spans.",
        },
        {
          title: "GST invoicing",
          body: "One compliant tax invoice with your GSTIN and registered legal name recorded correctly, so input credit is not lost to a reconciliation mismatch.",
        },
        {
          title: "Licence management",
          body: "Seat assignment and reclamation handled as staff join and leave, with a consolidated position across publishers rather than one portal per vendor.",
        },
        {
          title: "Renewal management",
          body: "Every renewal date tracked with a review window ahead of it. Nothing renews at last year's count because nobody looked in time.",
        },
        {
          title: "Deployment",
          body: "Tenant configuration, migration, device enrolment and user onboarding available alongside the licences, so what you buy is actually adopted.",
        },
        {
          title: "Technical support",
          body: "A service desk with response commitments stated in writing in the agreement, and an escalation path to specialists for the issues that need one.",
        },
      ],
    }),

    block("BULLETS", {
      heading: "Who this suits",
      items: [
        "Consolidation pays for itself where vendor count and administrative overhead have grown faster than the IT team.",
        "Organisations buying from three or more software publishers",
        "Finance teams reconciling invoices across multiple vendors and currencies",
        "IT teams without the capacity to track renewal dates across portals",
        "Companies scaling headcount where seat counts change every quarter",
        "Businesses that need GST-compliant invoicing on every technology purchase",
        "Teams that have discovered a licence shortfall and want it corrected quietly",
      ],
    }),

    block("CARDS", {
      heading: "How an engagement starts",
      numbered: true,
      columns: 4,
      items: [
        {
          title: "Send the requirement",
          body: "A product list, a seat count, a renewal date, or just the problem. Whatever detail you have is enough to begin.",
        },
        {
          title: "We review and source",
          body: "Across the relevant publishers, with a note on where a different licensing model would cost you less.",
        },
        {
          title: "You receive one quotation",
          body: "Itemised by line, with the GST position, delivery timeline and licensing terms stated in writing.",
        },
        {
          title: "One purchase order",
          body: "Covering the whole quotation. Provisioning begins on confirmation and you have one contact for status.",
        },
      ],
    }),

    block("LINK_LIST", {
      layout: "inline",
      items: [
        { label: "Build an enquiry", href: "/enquiry" },
        { label: "Read about procurement", href: "/services/it-procurement" },
      ],
    }),

    block("FAQ", {
      heading: "Enterprise procurement questions",
      source: "topic",
      ref: "enterprise",
    }),

    block("CTA_BANNER", {
      heading: "Talk to an Enterprise Specialist",
      body: "Send the requirement and we will come back with a consolidated quotation and a plain recommendation. If a smaller order serves you better, we will say so.",
      primaryCta: { label: "Request enterprise quote", href: "/enquiry" },
      showContactEmail: true,
      tone: "dark",
    }),
  ],
};

/* ----------------------------------------------------------------- about */

const ABOUT: PageSpec = {
  slug: "about",
  title: "About Us",
  description:
    "An enterprise technology procurement partner consolidating software licensing, cloud and IT solutions from multiple vendors into a single commercial relationship.",
  keywords: ["about", "technology procurement partner", "software reseller India"],
  breadcrumb: [{ label: "Home", href: "/" }, { label: "About" }],
  blocks: [
    block("HERO", {
      headline: "One procurement relationship for a multi-vendor technology stack",
      subheadline:
        "We supply enterprise software licensing, cloud services and IT solutions across Microsoft, Adobe, Autodesk, Zoho and enterprise infrastructure vendors — and the deployment, licence management and support that make them work.",
      tone: "dark",
    }),

    block("RICH_TEXT", {
      heading: "What we do",
      markdown: [
        "A single technology refresh can involve four publishers, two hardware vendors and a services engagement. Handled directly, that is seven vendor relationships, seven quotation formats and seven sets of invoices for one project.",
        "",
        "We consolidate that. One requirement produces one itemised quotation, one purchase order and one GST invoice — without losing visibility of what each line costs.",
        "",
        "Alongside procurement we deliver the work that determines whether the software is actually used: tenant design and migration, device management, cloud governance, security posture work and ongoing licence administration.",
      ].join("\n"),
    }),

    block("CARDS", {
      heading: "How we work",
      columns: 2,
      items: [
        {
          title: "Advice before the sale",
          body: "We will tell you when a cheaper licensing model fits better, including when that means a smaller order. A recommendation you cannot trust is worth nothing, and a customer who discovers they were over-sold does not come back.",
        },
        {
          title: "Written commitments",
          body: "Response times, support scope, delivery timelines and licensing terms are stated in the quotation rather than described qualitatively and settled later. A commitment that is not written down is not a commitment.",
        },
        {
          title: "No invented urgency",
          body: "We do not run countdown timers, fabricate discounts or manufacture deadlines. Where a genuine publisher promotion applies, we will say what it is and when it ends.",
        },
        {
          title: "Deployment, not just delivery",
          body: "Software that is bought but not adopted returns nothing. Migration, configuration and onboarding are available alongside the licences because that is what makes them worth owning.",
        },
      ],
    }),

    block("COLLECTION_GRID", {
      heading: "Vendors we supply",
      description: "Licensing and solutions across the vendors most organisations already use.",
      kind: "brands",
      layout: "strip",
      limit: 24,
      action: { label: "All vendors", href: "/brands" },
    }),

    block("COMPANY_INFO", {
      heading: "Company information",
      footnote:
        "Third-party product names and trademarks referenced across this site are the property of their respective owners and are used descriptively to identify the software supplied. Nothing here implies endorsement by, or affiliation with, those vendors beyond a commercial reselling relationship.",
    }),

    block("CTA_BANNER", {
      heading: "Start with a requirement",
      body: "You do not need a finished product list. Tell us what you are trying to achieve and we will come back with the options, priced, and a plain recommendation.",
      primaryCta: { label: "Get Enterprise Quote", href: "/enquiry" },
      secondaryCta: { label: "Contact us", href: "/contact" },
      tone: "dark",
    }),
  ],
};

/* ------------------------------------------------------------- resources */

const RESOURCES: PageSpec = {
  slug: "resources",
  title: "Resource Centre",
  description:
    "Licensing guides, procurement explainers and vendor comparisons covering Microsoft, Adobe, Autodesk, cloud cost, cybersecurity and software asset management.",
  keywords: ["licensing guides", "procurement explainers", "software asset management"],
  breadcrumb: [{ label: "Home", href: "/" }, { label: "Resources" }],
  blocks: [
    block("HERO", {
      headline: "Resource centre",
      subheadline:
        "Licensing and procurement guidance written for people making the purchase. Where a decision has a cheaper answer than the one usually sold, these pages say so.",
      tone: "light",
    }),

    block("LINK_LIST", {
      heading: "Licensing guides",
      layout: "cards",
      itemAction: "Read guide",
      items: [
        {
          label: "Microsoft licensing guide",
          href: "/microsoft-licensing",
          description:
            "CSP, Enterprise Agreement and volume licensing compared, with the thresholds that actually decide it.",
        },
        {
          label: "Microsoft 365 plan comparison",
          href: "/microsoft-365",
          description:
            "Business and Enterprise plans, the 300-seat cap, and why a mixed estate is usually cheaper.",
        },
        {
          label: "Windows Server core licensing",
          href: "/windows-server",
          description:
            "Core counting rules, the sixteen-core minimum, CAL requirements and when Datacenter becomes cheaper.",
        },
        {
          label: "SQL Server licensing",
          href: "/sql-server",
          description:
            "Per-core versus server-plus-CAL, virtualisation rules and when Enterprise edition is genuinely required.",
        },
        {
          label: "Autodesk named-user licensing",
          href: "/autodesk",
          description:
            "What the move away from network licences changed, and which old habits now cost money.",
        },
        {
          label: "Adobe Teams vs Enterprise",
          href: "/adobe",
          description:
            "When federated identity and enterprise-owned storage justify the step up from Teams licensing.",
        },
      ],
    }),

    block("COLLECTION_GRID", {
      heading: "Latest articles",
      kind: "posts",
      limit: 6,
      action: { label: "All articles", href: "/blog" },
    }),

    block("COLLECTION_GRID", {
      heading: "Browse by topic",
      kind: "postCategories",
      limit: 24,
    }),

    block("CTA_BANNER", {
      heading: "Want this applied to your estate?",
      body: "A licence position review establishes what you own, what is deployed and what is actually used — which is where the recoverable cost and the compliance gaps both show up.",
      primaryCta: {
        label: "Software asset management",
        href: "/services/software-asset-management",
      },
      secondaryCta: { label: "Request a review", href: "/enquiry" },
      tone: "light",
    }),
  ],
};

const PAGES: PageSpec[] = [HOME, ENTERPRISE, ABOUT, RESOURCES];

async function main() {
  // Validate everything before writing anything: a payload that fails its
  // schema would be dropped silently at render time, leaving a page that is
  // live and missing a section.
  for (const page of PAGES) {
    page.blocks.forEach((entry, index) => {
      if (!isBlockType(entry.type)) throw new Error(`${page.slug || "/"}#${index}: unknown type`);
      const parsed = BLOCK_SCHEMAS[entry.type].safeParse(entry.data);
      if (!parsed.success) {
        throw new Error(
          `${page.slug || "/"} block ${index} (${entry.type}): ${JSON.stringify(parsed.error.issues)}`,
        );
      }
    });
  }

  for (const page of PAGES) {
    await prisma.page.deleteMany({ where: { slug: page.slug } });

    await prisma.page.create({
      data: {
        slug: page.slug,
        title: page.title,
        description: page.description,
        keywords: page.keywords,
        breadcrumb: page.breadcrumb as unknown as Prisma.InputJsonValue,
        faqTopic: page.faqTopic ?? null,
        status: "PUBLISHED",
        publishedAt: new Date(),
        sections: {
          create: page.blocks.map((entry, index) => ({
            type: entry.type,
            displayOrder: index,
            visible: true,
            // Re-parsed so stored payloads carry the schema's defaults rather
            // than only the keys written above.
            data: BLOCK_SCHEMAS[entry.type].parse(entry.data) as Prisma.InputJsonValue,
          })),
        },
      },
    });

    console.log(`${(page.slug || "/").padEnd(12)} ${page.blocks.length} blocks`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
