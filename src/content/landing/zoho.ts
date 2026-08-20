import type { LandingPage } from "./types";

const zohoCrumb = (label: string) => [
  { label: "Home", href: "/" },
  { label: "Zoho", href: "/zoho" },
  { label },
];

export const zohoPages: LandingPage[] = [
  {
    slug: "zoho",
    title: "Zoho Licensing & Implementation",
    description:
      "Zoho CRM, Books, Desk, Workplace, Mail and Zoho One licensing with the implementation work that determines whether it is adopted: data migration, workflow configuration and onboarding.",
    keywords: ["zoho", "zoho licensing", "zoho crm", "zoho one", "zoho partner"],
    breadcrumb: [{ label: "Home", href: "/" }, { label: "Zoho" }],
    hero: {
      eyebrow: "Zoho",
      headline: "Zoho licensing, with the implementation that makes it work",
      subheadline:
        "A business application that is bought but not adopted returns nothing. We supply the licensing and the migration, configuration and onboarding around it.",
      primaryCta: { label: "Get Zoho pricing", href: "/enquiry" },
      secondaryCta: { label: "Browse Zoho products", href: "/products?brand=zoho" },
    },
    intro: [
      "Zoho's appeal for mid-sized organisations is breadth at a predictable per-user cost: one vendor covering CRM, accounting, service desk and collaboration, with the applications sharing a customer record rather than being stitched together afterwards.",
      "The failure mode is equally predictable. Licences are bought, data is not migrated properly, workflows are left at their defaults, and six months later the team is still working in spreadsheets. The licensing is the easy part.",
    ],
    sections: [
      {
        heading: "The applications we most often license",
        cards: [
          { title: "Zoho CRM", body: "Pipeline, contacts, deals and forecasting, with automation that removes the manual data entry sales teams reliably refuse to do." },
          { title: "Zoho Books", body: "Accounting with GST return preparation and e-invoicing built for Indian statutory requirements rather than retrofitted." },
          { title: "Zoho Desk", body: "Multi-channel support ticketing with SLA management and a knowledge base that deflects repeat questions." },
          { title: "Zoho Workplace", body: "Business email, documents, chat and meetings at a lower per-user cost than the mainstream alternatives." },
          { title: "Zoho One", body: "The full application catalogue priced per employee — excellent value for broad adoption, poor value for two applications." },
        ],
      },
      {
        heading: "Zoho One: the pricing model to understand first",
        body: [
          "Zoho One's all-employee pricing requires a licence for every employee in the organisation, not only those using the applications. There is a flexible per-user option at a considerably higher unit price.",
          "That makes it very good value where a broad set of applications will genuinely be adopted, and poor value where only two or three will. The deciding question is not what the suite contains but what your teams will actually run on it within twelve months. We will model both against your headcount.",
        ],
      },
    ],
    productsHeading: "Zoho licensing in the catalogue",
    productSlugs: ["zoho-crm", "zoho-books", "zoho-desk", "zoho-workplace", "zoho-mail", "zoho-one"],
    brandSlug: "zoho",
    related: [
      { label: "Zoho CRM", href: "/zoho-crm" },
      { label: "Zoho Books", href: "/zoho-books" },
      { label: "Zoho Workplace", href: "/zoho-workplace" },
      { label: "Email migration", href: "/services/email-migration" },
    ],
    cta: {
      heading: "Get Zoho priced and scoped",
      body: "Tell us your headcount, which applications you expect to adopt and what you are migrating from. We will price the licensing and scope the implementation separately, so you can see both.",
    },
  },
  {
    slug: "zoho-crm",
    title: "Zoho CRM — Pricing, Editions & Implementation",
    description:
      "Zoho CRM editions compared with the customisation depth each provides, plus data migration from an existing CRM and workflow configuration.",
    keywords: ["zoho crm", "zoho crm pricing", "crm india", "zoho crm editions"],
    breadcrumb: zohoCrumb("CRM"),
    hero: {
      eyebrow: "Zoho CRM",
      headline: "Zoho CRM, sized to your sales process",
      subheadline:
        "Edition choice matters more than most buyers expect, and the migration matters more than the edition.",
      primaryCta: { label: "Get CRM pricing", href: "/enquiry" },
      secondaryCta: { label: "View product details", href: "/products/zoho-crm" },
    },
    intro: [
      "Zoho CRM covers leads, contacts, deals, forecasting and post-sale follow-up, with an automation engine and customisation that does not require a developer.",
      "We would rather size the edition against your sales process than sell the higher tier by default — and we will say when Standard is sufficient.",
    ],
    sections: [
      {
        heading: "Editions",
        cards: [
          { title: "Standard", body: "Pipeline management, basic automation and reporting. Sufficient for a straightforward sales process with a small team." },
          { title: "Professional", body: "Adds inventory management, process automation (blueprints) and validation rules. The common choice for growing sales organisations." },
          { title: "Enterprise", body: "Adds deep customisation, territory management, advanced analytics and multi-user portals. Warranted by structural complexity, not headcount alone." },
        ],
      },
      {
        heading: "Migration is where projects succeed or fail",
        body: [
          "Migration from most mainstream CRM platforms covers accounts, contacts, deals, activity history and file attachments. The technical part is routine.",
          "The work that determines success is field mapping and deciding what not to bring across. Migrating a decade of dead leads and stale custom fields reproduces the mess that prompted the change. We scope that before any data moves.",
        ],
      },
    ],
    productSlugs: ["zoho-crm", "zoho-one"],
    productsHeading: "Zoho CRM licensing",
    brandSlug: "zoho",
    related: [
      { label: "Zoho Books", href: "/zoho-books" },
      { label: "Zoho Desk", href: "/zoho-desk" },
      { label: "Zoho overview", href: "/zoho" },
    ],
    cta: {
      heading: "Get Zoho CRM priced and scoped",
      body: "Tell us the user count, your current system and how your sales process actually runs. We will recommend an edition and scope the migration.",
    },
  },
  {
    slug: "zoho-books",
    title: "Zoho Books — GST Accounting Software Pricing",
    description:
      "Zoho Books licensing for Indian businesses: GST-compliant invoicing, GSTR preparation, e-invoicing, bank reconciliation and inventory.",
    keywords: ["zoho books", "gst accounting software", "zoho books price", "e-invoicing", "gstr filing"],
    breadcrumb: zohoCrumb("Books"),
    hero: {
      eyebrow: "Zoho Books",
      headline: "Zoho Books for GST-compliant accounting",
      subheadline:
        "Statutory compliance built for Indian requirements rather than retrofitted onto a foreign product — which is the reason it is chosen over international alternatives.",
      primaryCta: { label: "Get Books pricing", href: "/enquiry" },
      secondaryCta: { label: "View product details", href: "/products/zoho-books" },
    },
    intro: [
      "Zoho Books handles bookkeeping, invoicing, expense tracking, bank reconciliation and inventory, with GST return preparation and e-invoicing.",
      "Editions are tiered by invoice volume, user count and the availability of advanced inventory and workflow features, so the right edition depends on transaction volume rather than headcount.",
    ],
    sections: [
      {
        heading: "Compliance capability",
        bullets: [
          "GST-compliant invoice formats with correct tax splits",
          "GSTR-1 and GSTR-3B preparation",
          "E-invoicing and e-way bill generation",
          "TDS handling",
          "Indian bank feed integrations for reconciliation",
          "Client portal for invoice access and payment",
        ],
      },
      {
        heading: "Working with the rest of the suite",
        body: [
          "Books shares a customer record with Zoho CRM, so a deal that closes in CRM becomes an invoice in Books without re-keying. Where both are in use, that integration removes a recurring source of error.",
          "Where CRM sits elsewhere, the integration is available but needs configuring, and we scope that as part of the implementation.",
        ],
      },
    ],
    productSlugs: ["zoho-books", "zoho-one"],
    productsHeading: "Zoho Books licensing",
    brandSlug: "zoho",
    related: [
      { label: "Zoho CRM", href: "/zoho-crm" },
      { label: "GST and procurement", href: "/blog/gst-input-credit-on-software-purchases" },
    ],
    cta: {
      heading: "Get Zoho Books pricing",
      body: "Tell us your monthly invoice volume and how many people need access. We will recommend an edition sized to the transaction load.",
    },
  },
  {
    slug: "zoho-desk",
    title: "Zoho Desk — Support Ticketing Pricing & Setup",
    description:
      "Zoho Desk licensing: multi-channel ticketing, SLA management, knowledge base and self-service portal, with configuration that actually deflects repeat tickets.",
    keywords: ["zoho desk", "helpdesk software", "ticketing system", "zoho desk pricing"],
    breadcrumb: zohoCrumb("Desk"),
    hero: {
      eyebrow: "Zoho Desk",
      headline: "Zoho Desk for customer support teams",
      subheadline:
        "Most of the measurable return comes from the knowledge base rather than from efficiency inside the queue.",
      primaryCta: { label: "Get Desk pricing", href: "/enquiry" },
      secondaryCta: { label: "View product details", href: "/products/zoho-desk" },
    },
    intro: [
      "Zoho Desk consolidates requests arriving by email, phone, chat and social into one queue, with routing rules, SLA timers and a knowledge base.",
      "A well-maintained knowledge base typically removes a significant share of routine tickets before they are raised, which is a larger effect than any efficiency gain inside the queue itself. That is where we focus the configuration work.",
    ],
    sections: [
      {
        heading: "What we configure during implementation",
        bullets: [
          "Ticket routing rules matched to how the team is actually organised",
          "SLA policies with escalation that fires before a breach rather than after",
          "A knowledge base seeded from your most repeated tickets",
          "A self-service portal that customers can find and use",
          "Satisfaction surveys and the reporting to act on them",
        ],
      },
    ],
    productSlugs: ["zoho-desk", "zoho-crm"],
    productsHeading: "Zoho Desk licensing",
    brandSlug: "zoho",
    related: [
      { label: "Zoho CRM", href: "/zoho-crm" },
      { label: "IT helpdesk service", href: "/services/it-helpdesk" },
    ],
    cta: {
      heading: "Get Zoho Desk pricing",
      body: "Tell us the agent count and your current ticket volume by channel. We will price the licensing and scope the setup.",
    },
  },
  {
    slug: "zoho-workplace",
    title: "Zoho Workplace — Email & Collaboration Pricing",
    description:
      "Zoho Workplace licensing: business email, documents, file storage, chat and meetings at a lower per-user cost, with the migration trade-offs stated plainly.",
    keywords: ["zoho workplace", "zoho email", "workplace pricing", "google workspace alternative"],
    breadcrumb: zohoCrumb("Workplace"),
    hero: {
      eyebrow: "Zoho Workplace",
      headline: "Zoho Workplace as a collaboration suite",
      subheadline:
        "Positioned directly against the mainstream suites at a lower per-user cost — with a trade-off worth being honest about before you migrate.",
      primaryCta: { label: "Get Workplace pricing", href: "/enquiry" },
      secondaryCta: { label: "View product details", href: "/products/zoho-workplace" },
    },
    intro: [
      "Workplace bundles business email on your own domain with documents, spreadsheets, presentations, file storage, chat and meetings.",
      "The applications are capable and improve steadily. But if your organisation depends on advanced Excel modelling, or has deep integration with the Microsoft stack, the migration cost may outweigh the licensing saving. We will say so rather than quote around it.",
    ],
    sections: [
      {
        heading: "Where Workplace is a strong fit",
        bullets: [
          "Organisations already running other Zoho applications",
          "Teams whose document work is straightforward and collaborative rather than model-heavy",
          "Businesses where the per-user cost difference is material at their headcount",
          "Companies wanting one vendor across business applications and collaboration",
        ],
      },
      {
        heading: "Where it is not",
        bullets: [
          "Finance teams with complex Excel models and add-ins",
          "Organisations with deep Microsoft 365 integration in line-of-business systems",
          "Environments with a compliance requirement met by a specific Microsoft capability",
        ],
      },
    ],
    productSlugs: ["zoho-workplace", "zoho-mail", "microsoft-365-business-standard"],
    productsHeading: "Workplace licensing and the alternative",
    brandSlug: "zoho",
    related: [
      { label: "Zoho Mail", href: "/zoho-mail" },
      { label: "Microsoft 365", href: "/microsoft-365" },
      { label: "Email migration", href: "/services/email-migration" },
    ],
    cta: {
      heading: "Get Workplace priced against the alternative",
      body: "Tell us your headcount and what you are running now. We will price Workplace and Microsoft 365 side by side, including the migration cost.",
    },
  },
  {
    slug: "zoho-mail",
    title: "Zoho Mail — Business Email Hosting Pricing",
    description:
      "Zoho Mail licensing: ad-free business email on your own domain with calendars, shared mailboxes and standard protocol support for any mail client.",
    keywords: ["zoho mail", "business email hosting", "domain email", "zoho mail pricing"],
    breadcrumb: zohoCrumb("Mail"),
    hero: {
      eyebrow: "Zoho Mail",
      headline: "Zoho Mail for business email hosting",
      subheadline:
        "Professional email on your own domain without the wider suite, for organisations whose document and collaboration tooling is already settled.",
      primaryCta: { label: "Get Mail pricing", href: "/enquiry" },
      secondaryCta: { label: "View product details", href: "/products/zoho-mail" },
    },
    intro: [
      "Zoho Mail provides business email hosting with calendars, contacts and shared mailboxes. It is one of the lowest-cost credible options for domain-based business email.",
      "It supports IMAP, POP and ActiveSync, so desktop clients and mobile devices connect without proprietary software — which matters more than it sounds if your team has established habits.",
    ],
    sections: [
      {
        heading: "Migrating to it",
        body: [
          "Mailbox migration from most providers is a standard engagement. What needs planning is not the mailboxes but everything attached to them: shared mailboxes, delegate permissions, distribution lists, forwarding rules and connected applications.",
          "Those are what break during a migration, so we inventory them before moving anything.",
        ],
      },
    ],
    productSlugs: ["zoho-mail", "zoho-workplace"],
    productsHeading: "Zoho Mail licensing",
    brandSlug: "zoho",
    related: [
      { label: "Zoho Workplace", href: "/zoho-workplace" },
      { label: "Email migration service", href: "/services/email-migration" },
    ],
    cta: {
      heading: "Get Zoho Mail pricing",
      body: "Tell us the mailbox count and what you are migrating from. We will price the licensing and the migration separately.",
    },
  },
];
