import type { ContentMigration } from "./types";

/**
 * A page for the thing a buyer searches for, which this site covers only in
 * pieces: managed IT services.
 *
 * ## Where the structure came from, and where the words did not
 *
 * The shape follows what a buyer of managed services expects to meet on such a
 * page: the problem, the model, what is covered, how a handover works, the
 * standards behind it, then a form. That shape is common to the category, and
 * borrowing it is the point. The words are not borrowed. Nothing here is taken
 * from any other company's page, and no figure, award or capability of theirs
 * is claimed for this one.
 *
 * ## Every statement is already on this site
 *
 * The problem and the model are the `IT Helpdesk & Managed Support` service's
 * own copy, condensed; the scope list is the services the site already sells,
 * each with its own page; the standards are the three ISO certificates on
 * `/about`. What is deliberately absent is anything this business has not said
 * it does — 24x7 operations, a security operations centre, a virtual CIO
 * service, named uptime or savings figures. Those belong here the day somebody
 * with authority confirms them and can stand behind them; until then a page
 * that promised them would be selling something nobody had agreed to deliver.
 *
 * ## It overlaps `/services/it-helpdesk`, knowingly
 *
 * That page is the service; this is the landing page that sells it with the
 * rest of the managed offer around it. The page carries its own canonical, says
 * what it is for, and links to the service pages. If search shows the pair
 * splitting a query, `noindex` on this one is a one-field change.
 *
 * Idempotent: a slug that exists is left exactly as it is.
 */
const SLUG = "managed-it-services";

type Section = { type: string; data: unknown };

const SECTIONS: Section[] = [
  {
    type: "RICH_TEXT",
    data: {
      heading: "Why IT stays in firefighting mode",
      markdown:
        "Small IT teams spend their time on interruptions. The work that would reduce future interruptions — patching, monitoring, documentation, capacity planning — is always next week’s work, and next week has its own interruptions.\n\nManaged IT services exist to take that load: a service desk with defined response times, monitoring that catches failures before users report them, and the routine maintenance that otherwise never happens.",
    },
  },
  {
    type: "KEY_VALUE_LIST",
    data: {
      heading: "One partner, written commitments",
      items: [
        {
          key: "Commitments in writing",
          value: "Response and resolution commitments are stated in the agreement before you sign, not described in general terms.",
        },
        {
          key: "No opaque dependency",
          value: "Documentation, monitoring dashboards and ticket history stay accessible to you, so the relationship can end without an archaeology project.",
        },
        {
          key: "Works with your team",
          value: "Usually we take first-line volume and routine maintenance so your own IT team can work on projects. Full outsourcing is possible but is a different engagement.",
        },
      ],
    },
  },
  {
    type: "BULLETS",
    data: {
      heading: "What the support covers",
      items: [
        "A service desk with defined response and resolution commitments",
        "Monitoring with alerting before users notice a failure",
        "Patch and update management on a schedule",
        "Asset and configuration documentation, kept current",
        "An escalation path to specialists for complex issues",
        "Monthly reporting on volumes, trends and recurring causes",
      ],
    },
  },
  {
    type: "KEY_VALUE_LIST",
    data: {
      heading: "Services we can run for you",
      items: [
        {
          key: "IT helpdesk and managed support",
          value: "Service desk, monitoring and proactive maintenance with defined response commitments.",
        },
        {
          key: "Endpoint management",
          value: "Device enrolment, configuration policy, application deployment and compliance reporting.",
        },
        {
          key: "Backup and disaster recovery",
          value: "Backup design, offsite replication, recovery testing and documented recovery procedures.",
        },
        {
          key: "Cybersecurity",
          value: "Security posture assessment, identity hardening, endpoint protection and incident readiness.",
        },
        {
          key: "Cloud operations",
          value: "Ongoing cost review and governance for Azure, AWS and Google Cloud, by your team with our support or as a managed service.",
        },
        {
          key: "Microsoft 365",
          value: "Tenant design, policy configuration and user onboarding, with support once it is live.",
        },
        {
          key: "Software asset and licence management",
          value: "Licence position audit, entitlement reconciliation and ongoing compliance management.",
        },
      ],
    },
  },
  {
    type: "KEY_VALUE_LIST",
    data: {
      heading: "How we take over",
      items: [
        { key: "1. Onboarding audit", value: "Your estate, systems, access, existing documentation and current pain points." },
        { key: "2. Tooling", value: "Monitoring agents, patch management and remote support tooling deployed." },
        { key: "3. Service definition", value: "Response commitments, escalation path, and what is in and out of scope, agreed in writing." },
        { key: "4. Transition", value: "Support handover with a period of overlap rather than a hard switch." },
        { key: "5. Steady state", value: "Ongoing support with monthly reporting and a periodic service review." },
      ],
    },
  },
  {
    type: "KEY_VALUE_LIST",
    data: {
      heading: "Standards behind the service",
      items: [
        { key: "ISO/IEC 20000-1:2018", value: "IT service management." },
        { key: "ISO 27001:2022", value: "Information security management." },
        { key: "ISO 9001:2015", value: "Quality management." },
      ],
    },
  },
  {
    type: "FAQ",
    data: {
      source: "page",
      items: [
        {
          question: "What response times do you commit to?",
          answer:
            "Response commitments are stated in the service agreement and vary by severity and by the tier you select. We put them in writing before you sign rather than describing them qualitatively — a commitment that is not written down is not a commitment.",
        },
        {
          question: "Do you replace our internal IT team?",
          answer:
            "Usually we work alongside it. The common arrangement is that we take first-line volume and routine maintenance so the internal team can work on projects. Full outsourcing is possible but is a different engagement.",
        },
        {
          question: "Can I end the arrangement?",
          answer:
            "Yes. Documentation, monitoring dashboards and ticket history stay accessible to you, so the relationship can be ended without a lengthy handover exercise. The notice terms are in the agreement.",
        },
        {
          question: "Can I get a GST invoice?",
          answer:
            "Every invoice is raised by TechZoid Technologies Private Limited with GST, and the input credit is claimable.",
        },
      ],
    },
  },
  {
    type: "LINK_LIST",
    data: {
      heading: "The services behind it",
      layout: "cards",
      items: [
        { href: "/services/it-helpdesk", label: "IT helpdesk and managed support" },
        { href: "/services/endpoint-management", label: "Endpoint management" },
        { href: "/services/backup-disaster-recovery", label: "Backup and disaster recovery" },
        { href: "/services/cybersecurity", label: "Cybersecurity" },
        { href: "/services/cloud", label: "Cloud advisory and migration" },
        { href: "/services/software-asset-management", label: "Software asset management" },
      ],
    },
  },
  {
    type: "CTA_BANNER",
    data: {
      tone: "dark",
      heading: "Ready to hand over the interruptions?",
      body: "Tell us about your estate and we will come back with a written proposal. If you would rather talk it through first, call the Delhi office.",
      primaryCta: { href: "#quote", label: "Get a proposal" },
      secondaryCta: { href: "/contact", label: "Contact us" },
    },
  },
];

export const managedItServicesPage: ContentMigration = {
  id: "2026-11-managed-it-services-page",
  describe: "a managed IT services landing page that opens with the enquiry form",

  async apply(prisma) {
    const existing = await prisma.page.findUnique({ where: { slug: SLUG }, select: { id: true } });
    if (existing) return `/${SLUG} already exists; nothing changed`;

    const page = await prisma.page.create({
      data: {
        slug: SLUG,
        title: "Managed IT Services in India: Helpdesk and Support",
        description:
          "Managed IT services from TechZoid: a service desk with response times in writing, monitoring, patching, backup and security. Ask for a written proposal.",
        keywords: [
          "managed it services india",
          "managed service provider india",
          "it helpdesk outsourcing",
          "managed it support for business",
          "it support delhi ncr",
        ],
        status: "PUBLISHED",
        breadcrumb: [{ href: "/", label: "Home" }, { label: "Managed IT services" }],
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
          eyebrow: "Managed IT services",
          headline: "Hand over the IT interruptions. Keep the control.",
          subheadline:
            "A service desk with response times in writing, monitoring that catches failures before users report them, and the routine maintenance that never gets done. Tell us about your estate and we reply with a written proposal.",
          primaryCta: { href: "#quote", label: "Get a proposal" },
          secondaryCta: { href: "/services", label: "See all services" },
          showSearch: false,
        },
      },
      ...SECTIONS,
    ];

    let order = 10;
    for (const section of sections) {
      await prisma.pageSection.create({
        data: {
          pageId: page.id,
          type: section.type as never,
          displayOrder: order,
          visible: true,
          data: section.data as never,
        },
      });
      order += 10;
    }

    return `/${SLUG} created with ${sections.length} sections`;
  },
};
