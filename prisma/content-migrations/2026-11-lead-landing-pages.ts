import type { ContentMigration } from "./types";

/**
 * Four landing pages that open with the enquiry form.
 *
 * `/adobe-licensing`, `/autodesk-licensing`, `/enterprise-it-hardware` and
 * `/corporate-it-solutions`. `/microsoft-365` already existed; the form at the
 * top of it is code (see `cms-route.tsx`), not content, so it is not here.
 *
 * ## Nothing on them is new
 *
 * Every statement is one the site already makes elsewhere — on `/adobe`,
 * `/autodesk`, `/hardware`, `/solutions` and `/software-licensing-company-delhi`
 * — reworded for a visitor who has arrived to ask rather than to read. No
 * price, no availability, no claim about the company or its status with a
 * publisher that is not already on file. Prices stay in the catalogue and on
 * the written quotation, where the quotation engine can be held to them: a
 * figure typed into a migration is right the day it is written (see
 * `2026-10-quote-page-adobe`).
 *
 * ## They overlap pages that exist, knowingly
 *
 * `/adobe-licensing` and `/adobe` are about the same subject, and so on down the
 * list. That was asked for by name, and the answer to "will they compete" was
 * given in advance: possibly. Each page therefore says what it is for (asking),
 * opens with the form, links to its sibling, and carries a canonical to
 * itself. If search shows the pair splitting a query, `noindex` on the newer
 * one is a one-field change.
 *
 * Published, because a landing page that is a draft is not a landing page; the
 * copy is short and sourced from pages that have already been read.
 *
 * Idempotent: a slug that exists is left exactly as it is.
 */

type Section = { type: string; data: unknown };

type LandingPage = {
  slug: string;
  title: string;
  description: string;
  keywords: string[];
  eyebrow: string;
  headline: string;
  subheadline: string;
  secondary: { href: string; label: string };
  sections: Section[];
  related: Array<{ href: string; label: string }>;
};

const GST_AND_PO: Section = {
  type: "FAQ",
  data: {
    source: "page",
    items: [
      {
        question: "Can I get a GST invoice?",
        answer:
          "Every order is invoiced by TechZoid Technologies Private Limited with GST, and the input credit is claimable.",
      },
      {
        question: "Do you accept purchase orders?",
        answer:
          "Yes. A written quotation can become one purchase order and one GST invoice, covering everything on it.",
      },
      {
        question: "Is the price on the website final?",
        answer:
          "Prices shown in the catalogue are tentative and exclude GST. The final price is confirmed on a written quotation, which takes account of your quantity, licensing programme and commitment term.",
      },
    ],
  },
};

export const LANDING_PAGES: LandingPage[] = [
  {
    slug: "adobe-licensing",
    title: "Adobe Licensing for Teams and Enterprises in India",
    description:
      "Ask about Adobe Creative Cloud, Acrobat and Acrobat Sign licensing for your team. Named-user seats, one renewal date, and a written quotation with GST invoice.",
    keywords: ["adobe licensing india", "adobe creative cloud for teams", "adobe acrobat pro licence", "adobe volume licensing"],
    eyebrow: "Adobe licensing",
    headline: "Adobe licences for your team, quoted for your seat count",
    subheadline:
      "Tell us the product and roughly how many seats. We reply with a written quotation, and a GST invoice follows the order.",
    secondary: { href: "/adobe", label: "Read the Adobe licensing guide" },
    sections: [
      {
        type: "RICH_TEXT",
        data: {
          heading: "How Adobe business licensing works",
          markdown:
            "Adobe's business licensing separates the entitlement from the person holding it. That is what makes it workable at scale: seats can be reassigned when people change roles, deployment can be packaged rather than installed by hand, and billing lands on one renewal date.\n\nThe decision that costs the most is All Apps versus single applications. For a designer who genuinely uses four or more applications, All Apps is cheaper. For someone who only opens Photoshop, it is not — and we will quote the single app.",
        },
      },
      {
        type: "BULLETS",
        data: {
          heading: "Getting the mix right",
          items: [
            "All Apps for people who use four or more applications regularly",
            "Single App for specialists — a retoucher who never opens InDesign, an editor who never opens Illustrator",
            "Acrobat Pro for the much larger group who need PDF workflows but no creative tools",
            "A mixed team agreement is permitted, so all three can sit on one renewal date",
          ],
        },
      },
      {
        type: "KEY_VALUE_LIST",
        data: {
          heading: "Teams or Enterprise",
          items: [
            {
              key: "Creative Cloud for Teams",
              value:
                "Adobe-managed identities, a straightforward admin console, reassignable seats and one renewal date. Suits most organisations, and is considerably simpler to run.",
            },
            {
              key: "Creative Cloud for Enterprise",
              value:
                "Federated single sign-on, enterprise-owned storage that survives an employee's departure, and managed deployment. Worth it above roughly fifty seats.",
            },
          ],
        },
      },
      GST_AND_PO,
    ],
    related: [
      { href: "/adobe", label: "Adobe licensing guide and catalogue" },
      { href: "/get-a-quote/adobe", label: "Adobe pricing in India" },
      { href: "/microsoft-365", label: "Microsoft 365" },
      { href: "/about", label: "About TechZoid" },
    ],
  },
  {
    slug: "autodesk-licensing",
    title: "Autodesk Licensing for Firms and Studios in India",
    description:
      "Ask about AutoCAD, Revit, Inventor and Autodesk collections for your firm. Named-user subscriptions reviewed for what you use, with a written quotation.",
    keywords: ["autodesk licensing india", "autocad subscription for business", "autodesk aec collection", "autodesk named user licence"],
    eyebrow: "Autodesk licensing",
    headline: "Autodesk subscriptions, sized to how your team really works",
    subheadline:
      "Tell us the product and how many people use it. We reply with a written quotation, and a GST invoice follows the order.",
    secondary: { href: "/autodesk", label: "Read the Autodesk licensing guide" },
    sections: [
      {
        type: "RICH_TEXT",
        data: {
          heading: "Seats now follow people, not machines",
          markdown:
            "Under the old network licensing model, a practice with twenty designers might hold twelve licences because they were never all in the application at once. That is no longer possible: a named-user subscription is assigned to one person and cannot be pooled.\n\nThe practical consequence is that occasional users became expensive, and collections became better value. Most practices we review are still allocating seats on habits formed under the old model.",
        },
      },
      {
        type: "BULLETS",
        data: {
          heading: "Where Autodesk spend usually leaks",
          items: [
            "Seats held by people who last opened the software eighteen months ago",
            "Three individual subscriptions where a collection would cost less",
            "Annual renewal where a stable team would pay less on a three-year term",
            "Leavers' seats never reclaimed, because reassignment is not part of the offboarding checklist",
            "Occasional users on full seats where a viewer or web workflow would serve",
          ],
        },
      },
      {
        type: "KEY_VALUE_LIST",
        data: {
          heading: "What we license, by industry",
          items: [
            { key: "Architecture", value: "Revit for BIM, AutoCAD for documentation and Navisworks for coordination. The AEC Collection usually covers all of it more cheaply than buying separately." },
            { key: "Engineering", value: "Civil 3D for infrastructure, Revit for building services, and the structural analysis tools." },
            { key: "Construction", value: "Autodesk Construction Cloud for the common data environment, field issue tracking and model coordination." },
            { key: "Manufacturing", value: "Inventor for mechanical design, Fusion for CAM and generative work, Nastran for simulation and Vault for engineering data management." },
          ],
        },
      },
      GST_AND_PO,
    ],
    related: [
      { href: "/autodesk", label: "Autodesk licensing guide and catalogue" },
      { href: "/get-a-quote/autodesk", label: "Autodesk pricing in India" },
      { href: "/solutions/design-engineering", label: "Design & engineering solutions" },
      { href: "/about", label: "About TechZoid" },
    ],
  },
  {
    slug: "enterprise-it-hardware",
    title: "Enterprise IT Hardware: Servers, Laptops and Desktops",
    description:
      "Ask about business laptops, desktops, workstations and servers from HP, Dell and HPE, quoted together with the licensing that goes on them.",
    keywords: ["enterprise it hardware india", "business laptops bulk purchase", "dell poweredge server supplier", "hp workstation supplier delhi"],
    eyebrow: "Enterprise IT hardware",
    headline: "Business hardware and the licensing that goes on it, on one quotation",
    subheadline:
      "Tell us what you need and roughly how many. We reply with a written quotation covering the machines and the software together.",
    secondary: { href: "/hardware", label: "Browse the hardware catalogue" },
    sections: [
      {
        type: "RICH_TEXT",
        data: {
          heading: "One supplier for the machines and the software",
          markdown:
            "Business-class laptops, desktops, workstations and servers for enterprise, government, PSU, education and corporate requirements — sourced from the manufacturers and supplied by TechZoid Technologies Private Limited on one quotation, alongside the licensing that goes on them.\n\nThat keeps the paperwork to one quotation, one purchase order and one GST invoice, whatever the mix.",
        },
      },
      {
        type: "BULLETS",
        data: {
          heading: "What you can ask about",
          items: [
            "Rack and tower servers — Dell PowerEdge and HPE ProLiant",
            "Business laptops and desktops — HP commercial ranges",
            "Desktop workstations and small form factor machines",
            "The operating system, Microsoft 365 and other licensing that goes on them",
          ],
        },
      },
      {
        type: "FAQ",
        data: {
          source: "page",
          items: [
            {
              question: "Can you quote hardware and software together?",
              answer:
                "Yes. A single quotation can cover machines and licensing, and becomes one purchase order and one GST invoice.",
            },
            {
              question: "Is the price on the website final?",
              answer:
                "Prices shown are tentative and exclude GST. Final pricing is confirmed on a written quotation, which takes account of your quantity, licensing programme and commitment term. Configuration, quantity and delivery location can change it.",
            },
            {
              question: "Can I get a GST invoice?",
              answer:
                "Every order is invoiced by TechZoid Technologies Private Limited with GST, and the input credit is claimable.",
            },
          ],
        },
      },
    ],
    related: [
      { href: "/hardware", label: "Business computers catalogue" },
      { href: "/hardware?family=servers", label: "Servers" },
      { href: "/hardware?family=laptops", label: "Business laptops" },
      { href: "/requirement", label: "Describe a larger requirement" },
    ],
  },
  {
    slug: "corporate-it-solutions",
    title: "Corporate IT Solutions: Cloud, Security and Licensing",
    description:
      "Ask about Microsoft 365 deployment, cloud migration, cybersecurity, backup and software asset management for your organisation. Written proposal, GST invoicing.",
    keywords: ["corporate it solutions india", "it services for business delhi", "cloud migration partner", "microsoft 365 deployment partner"],
    eyebrow: "Corporate IT solutions",
    headline: "Start from the outcome you need, not the product list",
    subheadline:
      "Tell us the problem and roughly how many people it affects. We come back with the options, priced.",
    secondary: { href: "/solutions", label: "See solutions by outcome" },
    sections: [
      {
        type: "RICH_TEXT",
        data: {
          heading: "Licensing and services from one partner",
          markdown:
            "Licensing decisions look different depending on what the software is being used for. We group products and services by the problem they are bought to solve, and you do not need a product list to start.\n\nTechZoid Technologies is ISO 9001:2015, ISO 27001:2022 and ISO/IEC 20000-1:2018 certified, and works from an office at Netaji Subhash Place, New Delhi.",
        },
      },
      {
        type: "KEY_VALUE_LIST",
        data: {
          heading: "By outcome",
          items: [
            { key: "Modern workplace", value: "Email, documents, meetings and device management, with the identity controls that make remote work safe rather than merely possible." },
            { key: "Cloud transformation", value: "Workload assessment, migration and the governance that keeps cloud cost where the business case said it would be." },
            { key: "Design & engineering", value: "CAD, BIM and creative tooling, with the workstations sized against the software rather than a generic specification." },
            { key: "Security & compliance", value: "Identity hardening, endpoint posture and recovery testing, prioritised by what actually gets exploited." },
          ],
        },
      },
      {
        type: "BULLETS",
        data: {
          heading: "Services you can ask about",
          items: [
            "Cloud advisory and migration",
            "Microsoft 365 deployment and email migration",
            "Cybersecurity",
            "Backup and disaster recovery",
            "Software asset management",
            "Endpoint management and IT helpdesk",
          ],
        },
      },
      GST_AND_PO,
    ],
    related: [
      { href: "/solutions", label: "Solutions by outcome and industry" },
      { href: "/services", label: "All services" },
      { href: "/enterprise", label: "Enterprise procurement" },
      { href: "/about", label: "About TechZoid" },
    ],
  },
];

export const leadLandingPages: ContentMigration = {
  id: "2026-11-lead-landing-pages",
  describe: "four landing pages that open with the enquiry form",

  async apply(prisma) {
    const results: string[] = [];

    for (const page of LANDING_PAGES) {
      const existing = await prisma.page.findUnique({ where: { slug: page.slug }, select: { id: true } });
      if (existing) {
        results.push(`/${page.slug} already exists`);
        continue;
      }

      const created = await prisma.page.create({
        data: {
          slug: page.slug,
          title: page.title,
          description: page.description,
          keywords: page.keywords,
          status: "PUBLISHED",
          breadcrumb: [{ href: "/", label: "Home" }, { label: page.eyebrow }],
          faqTopic: null,
          publishedAt: new Date(),
        },
        select: { id: true },
      });

      const sections: Section[] = [
        {
          type: "HERO",
          data: {
            tone: "dark",
            eyebrow: page.eyebrow,
            headline: page.headline,
            subheadline: page.subheadline,
            // Both land on the form, which sits directly under this block.
            primaryCta: { href: "#quote", label: "Get a quotation" },
            secondaryCta: page.secondary,
            showSearch: false,
          },
        },
        ...page.sections,
        {
          type: "LINK_LIST",
          data: { heading: "Related pages", layout: "cards", items: page.related },
        },
        {
          type: "CTA_BANNER",
          data: {
            tone: "dark",
            heading: "Ready to ask?",
            body: "Send your requirement and we will come back with a written quotation. If you would rather talk it through first, call the Delhi office.",
            primaryCta: { href: "#quote", label: "Get a quotation" },
            secondaryCta: { href: "/contact", label: "Contact us" },
          },
        },
      ];

      let order = 10;
      for (const section of sections) {
        await prisma.pageSection.create({
          data: {
            pageId: created.id,
            type: section.type as never,
            displayOrder: order,
            visible: true,
            data: section.data as never,
          },
        });
        order += 10;
      }

      results.push(`/${page.slug} created with ${sections.length} sections`);
    }

    return results.join("; ");
  },
};
