import type { ContentMigration } from "./types";

/**
 * Five Adobe app pages, a site-wide FAQ, and two existing pages extended.
 *
 * ## Where this came from, and where the words did not
 *
 * A competitor's Adobe and managed-services pages were reviewed for what a buyer
 * expects to find: a page per popular Adobe app, a plain explanation of buying
 * in India, a way to see what an engagement might include. That is the shape.
 * The words are this site's own, and nothing is taken from the other site — no
 * sentence, no price, no response time, no certification, no discount figure.
 *
 * ## Every statement is already on this site
 *
 * Each app page describes the app in the catalogue's own sentence, then says what
 * the site already says about every Adobe Teams licence: named user, centrally
 * administered, reassignable seats, GST invoice, price confirmed on a written
 * quotation. The FAQ answers are existing answers: the GST line, the price
 * disclaimer's, the purchase-order line on `/buy`. The Adobe brand's own FAQ
 * (Teams versus Enterprise, mixing seats, VIP) is appended by the page, so it is
 * not written out a second time here. The `/faq` page re-uses
 * answers already written for other pages, looked up by question so they cannot
 * drift from the originals.
 *
 * ## What was deliberately not made
 *
 * - Tiered managed-service packages with prices and response times. The site has
 *   not set any, and a page that invented them would be selling something nobody
 *   agreed to deliver. The managed-services page gets a "common ways to start"
 *   table instead, built only from services the site already sells, and says the
 *   scope and commitments are set in the written proposal.
 * - Pages for structured cabling, database administration, or remote support as
 *   separate services: not offered as such on this site, or already covered by an
 *   existing page (`/services/it-helpdesk`, `/sql-server`), so a new page would
 *   claim a capability or compete with its own sibling.
 * - Pages for Audition, Animate, Stock or Frame.io: they are in the catalogue and
 *   on `/adobe`, and are reached from there; one page per app is for the apps
 *   people search for by name.
 *
 * Idempotent in every part: a page that exists is left exactly as it is, a
 * section is added only while its heading is absent, FAQ rows only while the
 * topic has none.
 */

type Section = { type: string; data: unknown };

/* ------------------------------ Adobe app pages ------------------------------ */

const GST =
  "Every order is invoiced by TechZoid Technologies Private Limited with GST, and the input credit is claimable.";
const PRICE =
  "No. Prices on this site are tentative and shown excluding GST. Final pricing is confirmed on a written quotation, which takes account of your quantity, licensing programme and commitment term.";
const PO = "Yes. Orders are raised against your purchase order and invoiced with GST.";

type App = {
  slug: string;
  name: string;
  title: string;
  description: string;
  keywords: string[];
  eyebrow: string;
  headline: string;
  lead: string;
  /** The catalogue's own sentence for the product. */
  what: string;
  products: string[];
  related: Array<{ href: string; label: string }>;
  cta: string;
};

const APPS: App[] = [
  {
    slug: "adobe-indesign",
    name: "InDesign",
    title: "Adobe InDesign Price in India — For Teams",
    description:
      "Adobe InDesign for teams: page layout and publishing for print and digital, licensed per named user with reassignable seats. Ask for a written quotation.",
    keywords: ["adobe indesign price in india", "indesign for teams", "indesign business licence"],
    eyebrow: "InDesign",
    headline: "Adobe InDesign for teams",
    lead: "Page layout and publishing for print and digital, licensed so the seat follows the role rather than the person who first received it.",
    what: "InDesign is the layout tool for brochures, reports, catalogues and magazines. As a Teams subscription it comes with shared previews and review, and the admin console that makes the seat reassignable.",
    products: ["adobe-indesign-teams", "adobe-creative-cloud-all-apps-teams"],
    related: [
      { href: "/adobe-photoshop", label: "Photoshop" },
      { href: "/adobe-illustrator", label: "Illustrator" },
      { href: "/products/adobe-incopy-teams", label: "InCopy, for editing alongside InDesign layouts" },
    ],
    cta: "Tell us the seat count and whether other Adobe applications are in use. We will price both options.",
  },
  {
    slug: "adobe-after-effects",
    name: "After Effects",
    title: "Adobe After Effects Price in India — Teams",
    description:
      "Adobe After Effects for teams: motion graphics and visual effects for film, television, web and social work, licensed per named user. Ask for a quotation.",
    keywords: ["after effects price in india", "after effects for teams", "after effects business licence"],
    eyebrow: "After Effects",
    headline: "Adobe After Effects for teams",
    lead: "Motion graphics and visual effects, licensed so the seat follows the role and can be reassigned when the person changes.",
    what: "After Effects is the motion graphics and visual effects tool used for film, television, web and social work. It is usually bought alongside Premiere Pro, which is why the All Apps subscription often works out simpler than two single-app seats.",
    products: ["adobe-after-effects-teams", "adobe-creative-cloud-all-apps-teams"],
    related: [
      { href: "/adobe-premiere-pro", label: "Premiere Pro" },
      { href: "/adobe-creative-cloud", label: "Creative Cloud All Apps" },
      { href: "/products/adobe-audition-teams", label: "Audition, for audio" },
    ],
    cta: "Tell us the seat count and whether the same people edit video. We will price single-app and All Apps seats side by side.",
  },
  {
    slug: "adobe-lightroom",
    name: "Lightroom",
    title: "Adobe Lightroom Price in India — For Teams",
    description:
      "Adobe Lightroom for teams: photo organisation and editing across desktop, web and mobile with cloud-synced libraries, per named user. Ask for a quotation.",
    keywords: ["adobe lightroom price in india", "lightroom for teams", "lightroom business licence"],
    eyebrow: "Lightroom",
    headline: "Adobe Lightroom for teams",
    lead: "Photo organisation and editing for teams that handle a lot of images, licensed per named user with seats you can reassign.",
    what: "Lightroom organises and edits photographs across desktop, web and mobile, with cloud-synced libraries. It suits people who process volume — product, event or site photography — rather than composite a single image, which is Photoshop's job.",
    products: ["adobe-lightroom-teams", "adobe-creative-cloud-all-apps-teams"],
    related: [
      { href: "/adobe-photoshop", label: "Photoshop" },
      { href: "/adobe-creative-cloud", label: "Creative Cloud All Apps" },
      { href: "/products/adobe-stock-10-assets", label: "Adobe Stock" },
    ],
    cta: "Tell us the seat count and whether the same people also retouch in Photoshop. We will price both options.",
  },
  {
    slug: "adobe-firefly",
    name: "Firefly",
    title: "Adobe Firefly Price in India — Plans",
    description:
      "Adobe Firefly plans for business: generative AI for images, video and audio in Pro, Pro Plus and Premium, with monthly credits. Ask for a written quotation.",
    keywords: ["adobe firefly price in india", "adobe firefly pricing", "firefly pro plus"],
    eyebrow: "Firefly",
    headline: "Adobe Firefly plans",
    lead: "Generative AI for images, video and audio, in three plans that differ by how many generative credits you get each month.",
    what: "Firefly is sold in three plans. Pro carries 4,000 monthly generative credits, Pro Plus 10,000 with unlimited access to the standard AI features, and Premium 50,000 with access to the Firefly Video Model. The plan you need depends on how much video and high-volume generation your team does, which is the question to settle before ordering.",
    products: ["adobe-firefly-pro", "adobe-firefly-pro-plus", "adobe-firefly-premium"],
    related: [
      { href: "/adobe-creative-cloud", label: "Creative Cloud All Apps" },
      { href: "/adobe-photoshop", label: "Photoshop" },
      { href: "/adobe", label: "All Adobe licensing" },
    ],
    cta: "Tell us how many people will generate content and whether video is involved. We will recommend a plan.",
  },
  {
    slug: "adobe-express",
    name: "Express",
    title: "Adobe Express Price in India — For Teams",
    description:
      "Adobe Express for teams: quick creation of videos, social posts, flyers and documents from brand-controlled templates, licensed per named user. Ask for a quotation.",
    keywords: ["adobe express price in india", "adobe express for teams", "adobe express business"],
    eyebrow: "Express",
    headline: "Adobe Express for teams",
    lead: "Quick creation of videos, social posts, flyers and documents from brand-controlled templates, for people who are not designers.",
    what: "Express is the lightweight option: marketing, sales and operations staff produce on-brand material from templates the design team controls, without needing a full Creative Cloud seat. It is the right answer when the need is volume of simple work rather than craft.",
    products: ["adobe-express-teams", "adobe-creative-cloud-all-apps-teams"],
    related: [
      { href: "/adobe-creative-cloud", label: "Creative Cloud All Apps" },
      { href: "/adobe-illustrator", label: "Illustrator" },
      { href: "/adobe", label: "All Adobe licensing" },
    ],
    cta: "Tell us how many people will use it and whether a design team also needs full Creative Cloud. We will price both.",
  },
];

function appSections(app: App): Section[] {
  return [
    {
      type: "HERO",
      data: {
        tone: "dark",
        eyebrow: app.eyebrow,
        headline: app.headline,
        subheadline: app.lead,
        primaryCta: { href: "/enquiry", label: "Request pricing" },
        secondaryCta: { href: `/products/${app.products[0]}`, label: "View product details" },
        showSearch: false,
      },
    },
    { type: "RICH_TEXT", data: { markdown: app.what } },
    {
      type: "RICH_TEXT",
      data: {
        heading: "How the licence works",
        markdown:
          "Adobe Teams subscriptions are assigned to named users through an admin console, so a seat can be moved to a colleague when someone leaves or changes role. Billing is consolidated, and every order is invoiced with GST.\n\nIf your team uses several Adobe applications regularly, All Apps is usually cheaper once three or four are in play, and it covers occasional use of tools nobody would justify buying outright.",
      },
    },
    {
      type: "PRODUCT_GRID",
      data: {
        limit: app.products.length,
        slugs: app.products,
        action: { href: "/products?brand=adobe", label: "All Adobe products" },
        source: "manual",
        heading: `Buy ${app.name} for teams`,
      },
    },
    { type: "FAQ", data: { items: [], source: "page" } },
    { type: "LINK_LIST", data: { heading: "Related pages", layout: "cards", items: app.related } },
    {
      type: "CTA_BANNER",
      data: {
        tone: "dark",
        heading: `Get ${app.name} pricing`,
        body: app.cta,
        primaryCta: { href: "/enquiry", label: "Get Enterprise Quote" },
        secondaryCta: { href: "/contact", label: "Talk to a specialist" },
      },
    },
  ];
}

const APP_FAQS = (name: string) => [
  { question: "Do you provide a GST invoice?", answer: GST },
  { question: `Is the ${name} price on the website final?`, answer: PRICE },
  { question: "Do you accept purchase orders?", answer: PO },
];

/* ------------------------------ the /faq page ------------------------------ */

/** Existing questions, looked up by their text so the answers stay the originals. */
const HUB_QUESTIONS = [
  "Do you provide a GST invoice?",
  "Can you supply multiple brands on one purchase order?",
  "Can one quotation cover servers, desktops and the licences?",
  "How long does a quotation take?",
  "What does the listed price cover?",
  "Do you handle hardware as well as software?",
  "Should we buy perpetual or subscription?",
  "Do you supply both subscription and perpetual Microsoft licensing?",
  "Is there a seat limit on the Business plans?",
  "Can a seat be moved from one employee to another?",
  "Can we mix All Apps and Single App seats?",
  "Can renewals be consolidated onto one date?",
  "Can seat counts be reduced mid-term?",
  "Can you transfer our existing Microsoft tenant to your billing?",
  "Can you migrate from Google Workspace?",
  "Do you replace our internal IT team?",
];
const HUB_TOPIC = "site-faq";

/* ------------------------------ extensions ------------------------------ */

const ADOBE_BUYING = {
  heading: "Buying Adobe in India",
  markdown:
    "Prices on this site are in rupees, shown excluding GST, and every order is invoiced by TechZoid Technologies Private Limited with GST — the input credit is claimable. Orders are raised against your purchase order, and the figure you see is tentative until a written quotation confirms it.\n\nAdobe's business subscriptions are assigned to people through an admin console. When you compare suppliers, ask how the seat will be assigned, which organisation holds the contract, and what happens to the seat when an employee leaves. A licence that cannot be reassigned is a cost that returns every time somebody changes role.",
};

const ADOBE_APPS = {
  heading: "Adobe applications and where to buy them",
  layout: "cards",
  items: [
    { href: "/adobe-creative-cloud", label: "Creative Cloud, all apps" },
    { href: "/adobe-photoshop", label: "Photoshop" },
    { href: "/adobe-illustrator", label: "Illustrator" },
    { href: "/adobe-indesign", label: "InDesign" },
    { href: "/adobe-premiere-pro", label: "Premiere Pro" },
    { href: "/adobe-after-effects", label: "After Effects" },
    { href: "/adobe-lightroom", label: "Lightroom" },
    { href: "/adobe-firefly", label: "Firefly" },
    { href: "/adobe-express", label: "Express" },
    { href: "/adobe-acrobat", label: "Acrobat" },
  ],
};

const MANAGED_START = {
  eyebrow: "Scope",
  heading: "Common ways to start",
  description:
    "These are starting points for the conversation, not fixed packages. The scope, the response commitments and the price are set in the written proposal.",
  columns: ["Service desk", "Plus endpoints", "Plus resilience and security"],
  groups: [
    {
      heading: "What is included",
      rows: [
        { label: "IT helpdesk and managed support", cells: ["yes", "yes", "yes"] },
        { label: "Endpoint management and patching", cells: ["no", "yes", "yes"] },
        { label: "Backup and disaster recovery", cells: ["no", "no", "yes"] },
        { label: "Cybersecurity", cells: ["no", "no", "yes"] },
      ],
    },
  ],
};

export const adobeAppsFaqAndGuides: ContentMigration = {
  id: "2026-11-adobe-apps-faq-and-guides",
  describe: "five Adobe app pages, a site FAQ, a buying-in-India section on /adobe and a starting-points table on managed services",

  async apply(prisma) {
    const notes: string[] = [];
    const adobe = await prisma.brand.findUnique({ where: { slug: "adobe" }, select: { id: true } });

    // 1. The Adobe app pages ---------------------------------------------------
    for (const app of APPS) {
      const existing = await prisma.page.findUnique({ where: { slug: app.slug }, select: { id: true } });
      if (existing) {
        notes.push(`/${app.slug} exists`);
        continue;
      }
      // Only link to products that exist and are on sale.
      const live = await prisma.product.findMany({
        where: { slug: { in: app.products }, status: "ACTIVE", deletedAt: null },
        select: { slug: true },
      });
      if (live.length !== app.products.length) {
        notes.push(`/${app.slug} skipped: a product it links to is not on sale`);
        continue;
      }

      const page = await prisma.page.create({
        data: {
          slug: app.slug,
          title: app.title,
          description: app.description,
          keywords: app.keywords,
          status: "PUBLISHED",
          breadcrumb: [{ href: "/", label: "Home" }, { href: "/adobe", label: "Adobe" }, { label: app.name }],
          brandId: adobe?.id ?? null,
          faqTopic: app.slug,
          publishedAt: new Date(),
        },
        select: { id: true },
      });
      let order = 10;
      for (const section of appSections(app)) {
        await prisma.pageSection.create({
          data: { pageId: page.id, type: section.type as never, displayOrder: order, visible: true, data: section.data as never },
        });
        order += 10;
      }
      if ((await prisma.faq.count({ where: { topic: app.slug } })) === 0) {
        await prisma.faq.createMany({
          data: APP_FAQS(app.name).map((item, index) => ({ ...item, topic: app.slug, displayOrder: (index + 1) * 10 })),
        });
      }
      notes.push(`/${app.slug} created`);
    }

    // 2. /faq ------------------------------------------------------------------
    const faq = await prisma.page.findUnique({ where: { slug: "faq" }, select: { id: true } });
    if (faq) {
      notes.push("/faq exists");
    } else {
      const rows = [];
      for (const question of HUB_QUESTIONS) {
        const found = await prisma.faq.findFirst({
          where: { question, OR: [{ topic: null }, { topic: { not: HUB_TOPIC } }] },
          orderBy: { createdAt: "asc" },
          select: { question: true, answer: true },
        });
        if (found) rows.push(found);
      }
      if (rows.length < 8) {
        notes.push(`/faq skipped: only ${rows.length} of the source answers exist`);
      } else {
        const page = await prisma.page.create({
          data: {
            slug: "faq",
            title: "FAQ: Buying Software Licences and IT Services in India",
            description:
              "Answers to the questions buyers ask before ordering software licences, hardware and IT services in India: GST invoices, quotations, renewals and migration.",
            keywords: ["software licence faq india", "buying microsoft licences india", "gst invoice software licence"],
            status: "PUBLISHED",
            breadcrumb: [{ href: "/", label: "Home" }, { label: "FAQ" }],
            faqTopic: HUB_TOPIC,
            publishedAt: new Date(),
          },
          select: { id: true },
        });
        await prisma.faq.createMany({
          data: rows.map((row, index) => ({ ...row, topic: HUB_TOPIC, displayOrder: (index + 1) * 10 })),
        });
        const sections: Section[] = [
          {
            type: "HERO",
            data: {
              tone: "dark",
              eyebrow: "FAQ",
              headline: "Questions buyers ask before they order",
              subheadline:
                "How quotations, GST invoices, purchase orders, renewals and migrations work, in the same words we use on the pages for each product.",
              primaryCta: { href: "/enquiry", label: "Ask us something else" },
              secondaryCta: { href: "/products", label: "Browse the catalogue" },
              showSearch: false,
            },
          },
          { type: "FAQ", data: { items: [], source: "page" } },
          {
            type: "LINK_LIST",
            data: {
              heading: "Go deeper",
              layout: "cards",
              items: [
                { href: "/microsoft-365", label: "Microsoft 365" },
                { href: "/adobe", label: "Adobe" },
                { href: "/autodesk", label: "Autodesk" },
                { href: "/managed-it-services", label: "Managed IT services" },
                { href: "/hardware", label: "Hardware" },
                { href: "/blog", label: "Guides and articles" },
              ],
            },
          },
          {
            type: "CTA_BANNER",
            data: {
              tone: "dark",
              heading: "Not answered here?",
              body: "Send us the question with your seat count or requirement and we will reply with a written answer or quotation.",
              primaryCta: { href: "/enquiry", label: "Get Enterprise Quote" },
              secondaryCta: { href: "/contact", label: "Contact us" },
            },
          },
        ];
        let order = 10;
        for (const section of sections) {
          await prisma.pageSection.create({
            data: { pageId: page.id, type: section.type as never, displayOrder: order, visible: true, data: section.data as never },
          });
          order += 10;
        }
        notes.push(`/faq created with ${rows.length} questions`);
      }
    }

    // 3. /adobe: a buying section and the index of app pages -------------------
    const adobePage = await prisma.page.findUnique({ where: { slug: "adobe" }, select: { id: true } });
    if (adobePage) {
      const has = async (heading: string) =>
        (await prisma.pageSection.findMany({ where: { pageId: adobePage.id }, select: { data: true } })).some(
          (s) => (s.data as { heading?: string })?.heading === heading,
        );
      if (!(await has(ADOBE_BUYING.heading))) {
        await prisma.pageSection.create({
          data: { pageId: adobePage.id, type: "RICH_TEXT", displayOrder: 45, visible: true, data: ADOBE_BUYING as never },
        });
        notes.push("/adobe: buying section added");
      }
      if (!(await has(ADOBE_APPS.heading))) {
        await prisma.pageSection.create({
          data: { pageId: adobePage.id, type: "LINK_LIST", displayOrder: 55, visible: true, data: ADOBE_APPS as never },
        });
        notes.push("/adobe: app index added");
      }
    }

    // 4. /managed-it-services: common ways to start ----------------------------
    const managed = await prisma.page.findUnique({ where: { slug: "managed-it-services" }, select: { id: true } });
    if (managed) {
      const sections = await prisma.pageSection.findMany({ where: { pageId: managed.id }, select: { type: true, data: true } });
      const present = sections.some((s) => (s.data as { heading?: string })?.heading === MANAGED_START.heading);
      if (!present) {
        await prisma.pageSection.create({
          data: { pageId: managed.id, type: "COMPARISON_TABLE", displayOrder: 55, visible: true, data: MANAGED_START as never },
        });
        notes.push("/managed-it-services: starting points added");
      }
    }

    // 5. A footer link to /faq -------------------------------------------------
    if (!(await prisma.navigationItem.findFirst({ where: { menu: "FOOTER", href: "/faq" }, select: { id: true } }))) {
      const column = await prisma.navigationItem.findFirst({
        where: { menu: "FOOTER", parentId: null, label: "Company" },
        select: { id: true },
      });
      if (column) {
        const last = await prisma.navigationItem.findFirst({
          where: { parentId: column.id },
          orderBy: { displayOrder: "desc" },
          select: { displayOrder: true },
        });
        await prisma.navigationItem.create({
          data: { menu: "FOOTER", label: "FAQ", href: "/faq", parentId: column.id, displayOrder: (last?.displayOrder ?? 0) + 1, visible: true },
        });
        notes.push("footer: FAQ linked");
      } else {
        notes.push('footer: no "Company" column, /faq not linked there');
      }
    }

    return notes.join("; ");
  },
};
