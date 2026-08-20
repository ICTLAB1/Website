import { DELIVERY_SUBSCRIPTION, SUPPORT_STANDARD, type ProductSeed } from "./types";

const ZOHO_NOTE =
  "Licensed per user with monthly or annual billing. Annual billing is materially cheaper per user. Users can be added mid-term with prorated billing; reductions apply at renewal. Edition upgrades take effect immediately with a prorated adjustment.";

export const zohoProducts: ProductSeed[] = [
  {
    slug: "zoho-crm",
    name: "Zoho CRM",
    brand: "zoho",
    category: "crm-sales",
    shortDescription:
      "Sales pipeline, contact management and automation for growing sales teams.",
    description:
      "Zoho CRM covers the full sales cycle — leads, contacts, deals, forecasting and post-sale follow-up — with an automation engine that removes the manual data entry sales teams reliably refuse to do.\n\nIts practical strength for mid-sized organisations is customisation without a developer: custom modules, fields and workflow rules are configured through the interface, so a process change does not require a consulting engagement.\n\nEdition choice matters more than most buyers expect. Standard covers basic pipeline management; Professional adds inventory and process automation; Enterprise adds the customisation depth and territory management that larger sales organisations need.",
    features: [
      "Lead, contact, account and deal management",
      "Workflow automation and approval processes",
      "Sales forecasting and quota tracking",
      "Email integration with tracking and templates",
      "Custom modules, fields and layouts",
      "Mobile applications for field sales",
      "Reporting dashboards and analytics",
    ],
    compatibility: [
      "Web application in any modern browser",
      "iOS and Android applications",
      "Outlook and Gmail plug-ins",
      "REST API for custom integration",
    ],
    keywords: ["zoho crm", "crm", "sales", "pipeline", "leads", "automation"],
    licensingNotes: ZOHO_NOTE,
    deliveryNotes: DELIVERY_SUBSCRIPTION,
    supportNotes: `${SUPPORT_STANDARD} Data migration from an existing CRM and workflow configuration are available as a separate implementation engagement.`,
    featured: true,
    popularity: 89,
    availability: "IN_STOCK",
    purchaseMode: "BOTH",
    variants: [
      { sku: "ZOHO-CRM-STD-A1", name: "Standard, annual, per user", licenceType: "SUBSCRIPTION_ANNUAL", termMonths: 12, isDefault: true, listPriceMinor: 9_60_000 },
      { sku: "ZOHO-CRM-PRO-A1", name: "Professional, annual, per user", licenceType: "SUBSCRIPTION_ANNUAL", termMonths: 12, listPriceMinor: 16_80_000 },
      { sku: "ZOHO-CRM-ENT-A1", name: "Enterprise, annual, per user", licenceType: "SUBSCRIPTION_ANNUAL", termMonths: 12, listPriceMinor: 28_80_000 },
    ],
    faqs: [
      {
        question: "Can we migrate from our existing CRM?",
        answer:
          "Yes. Migration from most mainstream CRM platforms covers accounts, contacts, deals, activity history and file attachments. The work that determines success is field mapping and deciding what not to bring across - we scope that before any data moves.",
      },
      {
        question: "Which edition do we actually need?",
        answer:
          "Standard suits a straightforward pipeline. Professional adds process automation and inventory. Enterprise adds deep customisation, territory management and advanced analytics. We would rather size this against your sales process than sell the higher edition by default.",
      },
    ],
  },
  {
    slug: "zoho-books",
    name: "Zoho Books",
    brand: "zoho",
    category: "finance-accounting",
    shortDescription:
      "Accounting, invoicing and GST-compliant filing for Indian businesses.",
    description:
      "Zoho Books handles bookkeeping, invoicing, expense tracking, bank reconciliation and inventory, with GST return preparation and e-invoicing built for Indian statutory requirements rather than retrofitted onto a foreign product.\n\nThat local compliance depth — GSTR filing, e-way bills, TDS handling — is the reason it is chosen over international alternatives by businesses operating primarily in India.",
    features: [
      "Invoicing with GST-compliant formats",
      "GSTR-1, GSTR-3B preparation and e-invoicing",
      "Bank reconciliation and feed integration",
      "Expense and bill management",
      "Inventory tracking with stock valuation",
      "Project time tracking and billing",
      "Client portal for invoice access and payment",
    ],
    compatibility: [
      "Web application in any modern browser",
      "iOS and Android applications",
      "Indian bank feed integrations",
      "Integrates with Zoho CRM and Zoho Inventory",
    ],
    keywords: ["zoho books", "accounting", "gst", "invoicing", "bookkeeping", "e-invoicing"],
    licensingNotes: `${ZOHO_NOTE}\n\nEditions are tiered by the number of invoices, users and the availability of advanced inventory and workflow features.`,
    deliveryNotes: DELIVERY_SUBSCRIPTION,
    supportNotes: SUPPORT_STANDARD,
    featured: true,
    popularity: 79,
    availability: "IN_STOCK",
    purchaseMode: "BOTH",
    variants: [
      { sku: "ZOHO-BKS-STD-A1", name: "Standard, annual, per organisation", licenceType: "SUBSCRIPTION_ANNUAL", termMonths: 12, isDefault: true, listPriceMinor: 7_49_900 },
      { sku: "ZOHO-BKS-PRO-A1", name: "Professional, annual, per organisation", licenceType: "SUBSCRIPTION_ANNUAL", termMonths: 12, listPriceMinor: 14_99_900 },
    ],
  },
  {
    slug: "zoho-desk",
    name: "Zoho Desk",
    brand: "zoho",
    category: "service-desk",
    shortDescription: "Customer support ticketing with self-service and SLA management.",
    description:
      "Zoho Desk consolidates support requests arriving by email, phone, chat and social into one ticket queue, with routing rules, SLA timers and a knowledge base that deflects repeat questions before they become tickets.\n\nThe self-service portal is where most of the measurable return comes from: a well-maintained knowledge base typically removes a significant share of routine tickets, which is a larger effect than any efficiency gain inside the queue itself.",
    features: [
      "Multi-channel ticketing across email, phone, chat and social",
      "SLA policies with escalation rules",
      "Knowledge base and self-service portal",
      "Automated assignment and routing",
      "Customer satisfaction surveys",
      "Agent performance and queue analytics",
    ],
    compatibility: [
      "Web application in any modern browser",
      "iOS and Android agent applications",
      "Telephony integrations",
      "Integrates with Zoho CRM",
    ],
    keywords: ["zoho desk", "helpdesk", "ticketing", "support", "sla", "knowledge base"],
    licensingNotes: ZOHO_NOTE,
    deliveryNotes: DELIVERY_SUBSCRIPTION,
    supportNotes: SUPPORT_STANDARD,
    popularity: 71,
    availability: "IN_STOCK",
    purchaseMode: "BOTH",
    variants: [
      { sku: "ZOHO-DSK-STD-A1", name: "Standard, annual, per agent", licenceType: "SUBSCRIPTION_ANNUAL", termMonths: 12, isDefault: true, listPriceMinor: 9_60_000 },
      { sku: "ZOHO-DSK-PRO-A1", name: "Professional, annual, per agent", licenceType: "SUBSCRIPTION_ANNUAL", termMonths: 12, listPriceMinor: 16_80_000 },
    ],
  },
  {
    slug: "zoho-workplace",
    name: "Zoho Workplace",
    brand: "zoho",
    category: "email-collaboration",
    shortDescription:
      "Business email, documents, chat and meetings in one collaboration suite.",
    description:
      "Zoho Workplace bundles business email on your own domain with documents, spreadsheets, presentations, file storage, chat and meetings. It is positioned directly against the mainstream collaboration suites at a lower per-user cost.\n\nThe honest trade-off is ecosystem: the applications are capable and improve steadily, but if your organisation depends on advanced Excel modelling or has deep integration with the Microsoft stack, the migration cost may outweigh the licensing saving. We will say so rather than quote around it.",
    features: [
      "Business email on your own domain with Zoho Mail",
      "Writer, Sheet and Show document applications",
      "WorkDrive team file storage with version control",
      "Cliq team chat and Meeting for video conferencing",
      "Admin console with policy control",
      "Mobile applications across the suite",
    ],
    compatibility: [
      "Web applications in any modern browser",
      "iOS and Android applications",
      "IMAP/POP and ActiveSync for desktop mail clients",
      "Microsoft Office file format compatibility",
    ],
    keywords: ["zoho workplace", "email", "collaboration", "workdrive", "cliq", "office suite"],
    licensingNotes: ZOHO_NOTE,
    deliveryNotes: DELIVERY_SUBSCRIPTION,
    supportNotes: `${SUPPORT_STANDARD} Mailbox migration from an existing provider is available as a separate engagement.`,
    featured: true,
    popularity: 75,
    availability: "IN_STOCK",
    purchaseMode: "BOTH",
    variants: [
      { sku: "ZOHO-WP-STD-A1", name: "Standard, annual, per user", licenceType: "SUBSCRIPTION_ANNUAL", termMonths: 12, isDefault: true, listPriceMinor: 2_40_000 },
      { sku: "ZOHO-WP-PRO-A1", name: "Professional, annual, per user", licenceType: "SUBSCRIPTION_ANNUAL", termMonths: 12, listPriceMinor: 6_00_000 },
    ],
  },
  {
    slug: "zoho-mail",
    name: "Zoho Mail",
    brand: "zoho",
    category: "email-collaboration",
    shortDescription: "Ad-free business email hosting on your own domain.",
    description:
      "Zoho Mail provides business email hosting on your own domain with calendars, contacts and shared mailboxes, without the wider application suite. It suits organisations that need professional email but already have their document and collaboration tooling settled.\n\nIt is one of the lowest-cost credible options for domain-based business email, and it supports standard protocols, so desktop clients and mobile devices connect without proprietary software.",
    features: [
      "Business email on your own domain",
      "Calendar, contacts, tasks and notes",
      "Shared and group mailboxes",
      "IMAP, POP and ActiveSync support",
      "Email retention and eDiscovery on higher editions",
      "Two-factor authentication and admin policy control",
    ],
    compatibility: [
      "Any IMAP or ActiveSync mail client",
      "Outlook, Apple Mail and Thunderbird",
      "iOS and Android applications",
    ],
    keywords: ["zoho mail", "business email", "email hosting", "domain email", "imap"],
    licensingNotes: ZOHO_NOTE,
    deliveryNotes: DELIVERY_SUBSCRIPTION,
    supportNotes: SUPPORT_STANDARD,
    popularity: 67,
    availability: "IN_STOCK",
    purchaseMode: "BOTH",
    variants: [
      { sku: "ZOHO-MAIL-LITE-A1", name: "Mail Lite, annual, per user", licenceType: "SUBSCRIPTION_ANNUAL", termMonths: 12, isDefault: true, listPriceMinor: 1_20_000 },
      { sku: "ZOHO-MAIL-PREM-A1", name: "Mail Premium, annual, per user", licenceType: "SUBSCRIPTION_ANNUAL", termMonths: 12, listPriceMinor: 4_80_000 },
    ],
  },
  {
    slug: "zoho-one",
    name: "Zoho One",
    brand: "zoho",
    category: "business-suites",
    shortDescription:
      "The full Zoho application suite under a single per-employee subscription.",
    description:
      "Zoho One licenses the entire Zoho application catalogue — CRM, Books, Desk, Projects, People, Workplace and dozens more — for one price per employee. The licensing model is unusual and important: it is priced per employee in the organisation, not per user of any given application.\n\nThat makes it very good value where a broad set of applications will genuinely be adopted, and poor value where only two or three will. The deciding question is not what the suite contains but what your teams will actually run on it within twelve months.",
    features: [
      "Access to the full Zoho application catalogue",
      "Single sign-on and unified administration",
      "Shared customer record across applications",
      "One renewal date and one invoice",
      "Priced per employee rather than per application user",
    ],
    compatibility: [
      "Web applications in any modern browser",
      "iOS and Android applications across the suite",
      "REST APIs for integration",
    ],
    keywords: ["zoho one", "suite", "all apps", "bundle", "business suite"],
    licensingNotes:
      "The all-employee pricing model requires a licence for every employee in the organisation, not only those using the applications. A flexible per-user option exists at a higher unit price. We will model both against your headcount and expected adoption before recommending either.",
    deliveryNotes: DELIVERY_SUBSCRIPTION,
    supportNotes: SUPPORT_STANDARD,
    popularity: 69,
    availability: "IN_STOCK",
    purchaseMode: "BOTH",
    variants: [
      { sku: "ZOHO-ONE-ALLEMP-A1", name: "All-employee pricing, annual, per employee", licenceType: "SUBSCRIPTION_ANNUAL", termMonths: 12, isDefault: true, listPriceMinor: 12_00_000 },
      { sku: "ZOHO-ONE-FLEX-A1", name: "Flexible user pricing, annual, per user", licenceType: "SUBSCRIPTION_ANNUAL", termMonths: 12, listPriceMinor: 30_00_000 },
    ],
  },
  {
    slug: "zoho-projects",
    name: "Zoho Projects",
    brand: "zoho",
    category: "business-suites",
    shortDescription: "Project planning, task tracking and time management for delivery teams.",
    description:
      "Zoho Projects covers planning and delivery: task hierarchies, dependencies, Gantt scheduling, timesheets and issue tracking, with resource utilisation reporting across concurrent projects.\n\nIt is most useful in organisations billing time against projects, where the timesheet and the plan need to be the same system rather than two systems reconciled monthly.",
    features: [
      "Task lists, subtasks and dependencies",
      "Gantt charts with critical path",
      "Timesheets and billable time tracking",
      "Issue tracking with custom workflows",
      "Resource utilisation reporting",
      "Client access to project status",
    ],
    compatibility: ["Web application", "iOS and Android applications", "Integrates with Zoho CRM, Books and Desk"],
    keywords: ["zoho projects", "project management", "gantt", "timesheets", "tasks"],
    licensingNotes: ZOHO_NOTE,
    deliveryNotes: DELIVERY_SUBSCRIPTION,
    supportNotes: SUPPORT_STANDARD,
    popularity: 54,
    availability: "IN_STOCK",
    purchaseMode: "BOTH",
    variants: [
      { sku: "ZOHO-PRJ-PREM-A1", name: "Premium, annual, per user", licenceType: "SUBSCRIPTION_ANNUAL", termMonths: 12, isDefault: true, listPriceMinor: 3_60_000 },
    ],
  },
];
