import type { LandingPage } from "./types";

export const microsoftPages: LandingPage[] = [
  {
    slug: "microsoft",
    title: "Microsoft Licensing, Cloud & Enterprise Solutions",
    description:
      "Microsoft 365, Office, Windows Server, SQL Server, Dynamics 365 and Azure licensing, supplied under the purchasing programme that suits how your organisation actually buys.",
    keywords: ["microsoft licensing", "microsoft 365", "csp", "volume licensing", "azure"],
    breadcrumb: [{ label: "Home", href: "/" }, { label: "Microsoft" }],
    hero: {
      eyebrow: "Microsoft",
      headline: "Microsoft licensing, advised before it is sold",
      subheadline:
        "Microsoft licensing spans several purchasing programmes, and the right one depends on your size, contract appetite and how quickly your seat count changes. We model the options before quoting one.",
      primaryCta: { label: "Get Microsoft pricing", href: "/enquiry" },
      secondaryCta: { label: "Browse Microsoft products", href: "/products?brand=microsoft" },
    },
    intro: [
      "Most organisations do not have a Microsoft pricing problem. They have a Microsoft licensing-model problem: paying for an edition nobody uses, holding seats assigned to people who left, or committed to a three-year agreement sized against growth that did not happen.",
      "We start by establishing what you actually hold and what is actually being used, then price the programme that fits. Sometimes that produces a smaller order than the one you asked for. We will still say so.",
    ],
    sections: [
      {
        heading: "The purchasing programmes, compared honestly",
        cards: [
          {
            title: "Cloud Solution Provider (CSP)",
            body: "Annual or monthly terms through a partner, with seats addable at any point and reducible at the anniversary. Billed in INR with GST. The right answer for most organisations below roughly 250 seats.",
          },
          {
            title: "Volume licensing agreements",
            body: "Three-year commitments with price protection and Software Assurance benefits. Worth modelling from around 250 seats, and usually the better answer above 500 where headcount is stable.",
          },
          {
            title: "Perpetual licensing",
            body: "Windows Server, SQL Server and Office LTSC remain available perpetually. Suits capital budgets and systems where any change requires revalidation — not general knowledge work.",
          },
        ],
      },
      {
        heading: "Where Microsoft spend usually leaks",
        bullets: [
          "Seats still assigned to people who have left — disabling an account does not release its licence",
          "Users on E5 or Business Premium who use none of the capability the tier adds",
          "Separate endpoint, email security and MDM products duplicating what Business Premium already includes",
          "Enterprise agreements sized against optimistic headcount growth and then committed for three years",
          "Windows Server CALs under-counted, which is a compliance exposure rather than a saving",
          "Azure resources migrated at their on-premises specification and never right-sized",
        ],
      },
    ],
    productsHeading: "Microsoft licensing in the catalogue",
    productSlugs: [
      "microsoft-365-business-standard",
      "microsoft-365-business-premium",
      "microsoft-365-e3",
      "windows-server-2025-standard",
      "sql-server-2022-standard",
      "microsoft-office-ltsc-professional-plus-2024",
    ],
    brandSlug: "microsoft",
    related: [
      { label: "Microsoft 365", href: "/microsoft-365", description: "Plan comparison and seat sizing" },
      { label: "Microsoft licensing guide", href: "/microsoft-licensing", description: "CSP, EA and volume licensing compared" },
      { label: "Microsoft CSP", href: "/microsoft-csp", description: "How partner-led purchasing works" },
      { label: "Microsoft 365 deployment", href: "/services/microsoft-365", description: "Tenant design and migration" },
    ],
    cta: {
      heading: "Get a Microsoft licensing position",
      body: "Send us your current subscriptions and seat counts. We will tell you what you are paying for that nobody uses, and where you are exposed.",
    },
  },
  {
    slug: "microsoft-365",
    title: "Microsoft 365 Plans, Pricing & Licensing",
    description:
      "Microsoft 365 Business and Enterprise plans compared, with seat sizing, the 300-user cap explained and CSP pricing in INR with GST invoicing.",
    keywords: ["microsoft 365", "m365 pricing", "business standard", "business premium", "e3", "e5"],
    breadcrumb: [{ label: "Home", href: "/" }, { label: "Microsoft", href: "/microsoft" }, { label: "Microsoft 365" }],
    hero: {
      eyebrow: "Microsoft 365",
      headline: "Microsoft 365, sized to what your teams actually use",
      subheadline:
        "The plan difference matters more than the per-seat price. Most organisations are better served by a mixed estate than by putting everyone on the same tier.",
      primaryCta: { label: "Get Microsoft 365 pricing", href: "/enquiry" },
      secondaryCta: { label: "Compare plans below", href: "#plans" },
    },
    intro: [
      "Microsoft 365 splits into two families that behave quite differently. The Business plans are capped at 300 seats and are priced for small and mid-sized organisations. The Enterprise plans have no cap and add the compliance tooling that regulated organisations need.",
      "The most common mistake is uniformity: putting an entire workforce on one plan because it is simpler to administer. A mixed estate — Premium for staff handling sensitive data, Standard for the rest, Basic for frontline roles — is almost always cheaper and no harder to manage.",
    ],
    plans: {
      heading: "Plans compared",
      description: "All prices are per user per month equivalent, exclusive of GST, on annual commitment.",
      items: [
        {
          name: "Business Basic",
          summary: "Web and mobile Office, business email and Teams. No desktop applications.",
          points: [
            "50 GB business email on your own domain",
            "Teams, OneDrive and SharePoint",
            "Web and mobile Office only",
            "Suits frontline and field roles",
          ],
          productSlug: "microsoft-365-business-basic",
        },
        {
          name: "Business Standard",
          summary: "Desktop Office applications plus the hosted services. The common default.",
          points: [
            "Installed Word, Excel, PowerPoint and Outlook",
            "Up to five devices per user",
            "50 GB mailbox and 1 TB OneDrive",
            "300-seat maximum",
          ],
          productSlug: "microsoft-365-business-standard",
        },
        {
          name: "Business Premium",
          summary: "Standard plus device management, threat protection and conditional access.",
          points: [
            "Everything in Business Standard",
            "Intune device management and remote wipe",
            "Defender for Office 365 Plan 1",
            "Entra ID Premium P1 conditional access",
          ],
          productSlug: "microsoft-365-business-premium",
        },
        {
          name: "Enterprise E3",
          summary: "No seat cap, with compliance tooling and Windows Enterprise rights.",
          points: [
            "Unlimited seats",
            "100 GB mailbox with litigation hold",
            "Data loss prevention and retention policies",
            "Windows 11 Enterprise upgrade rights",
          ],
          productSlug: "microsoft-365-e3",
        },
      ],
    },
    sections: [
      {
        heading: "The 300-seat cap, and when to plan around it",
        body: [
          "The Business plans are hard-capped at 300 seats across Basic, Standard and Premium combined. There is no override and no grace allowance.",
          "Organisations that hit the cap unexpectedly end up migrating to enterprise plans under time pressure, usually at a renewal deadline. We recommend planning the transition at around 250 seats, when it can happen on your schedule and the commercial comparison can be made properly.",
        ],
      },
      {
        heading: "What Business Premium replaces",
        body: [
          "Premium is frequently mispriced by buyers because it is compared against Standard on the per-seat difference alone. That comparison ignores what it removes from the rest of the budget.",
        ],
        bullets: [
          "A separate endpoint protection product, for most Windows estates",
          "A separate mobile device management platform",
          "A separate email attachment and link security product",
          "A separate multi-factor authentication and conditional access tool",
        ],
      },
    ],
    productsHeading: "Microsoft 365 in the catalogue",
    productSlugs: [
      "microsoft-365-business-basic",
      "microsoft-365-business-standard",
      "microsoft-365-business-premium",
      "microsoft-365-e3",
      "microsoft-365-e5",
    ],
    brandSlug: "microsoft",
    related: [
      { label: "Business Standard", href: "/microsoft-365/business-standard" },
      { label: "Business Premium", href: "/microsoft-365/business-premium" },
      { label: "Microsoft 365 deployment", href: "/services/microsoft-365" },
      { label: "Email migration", href: "/services/email-migration" },
    ],
    cta: {
      heading: "Get Microsoft 365 pricing for your seat mix",
      body: "Tell us your headcount and how the roles split. We will price a mixed estate rather than putting everyone on the same tier.",
    },
  },
  {
    slug: "microsoft-365/business-standard",
    title: "Microsoft 365 Business Standard — Pricing & Licensing",
    description:
      "Microsoft 365 Business Standard licensing: desktop Office applications, 50 GB business email, Teams and 1 TB OneDrive for organisations up to 300 seats.",
    keywords: ["microsoft 365 business standard", "m365 business standard price", "office 365 business"],
    breadcrumb: [
      { label: "Home", href: "/" },
      { label: "Microsoft", href: "/microsoft" },
      { label: "Microsoft 365", href: "/microsoft-365" },
      { label: "Business Standard" },
    ],
    hero: {
      eyebrow: "Microsoft 365",
      headline: "Microsoft 365 Business Standard",
      subheadline:
        "Desktop Office applications, business email on your own domain, Teams and 1 TB of cloud storage per user. The plan most organisations under 300 seats settle on.",
      primaryCta: { label: "Request pricing", href: "/enquiry" },
      secondaryCta: { label: "View product details", href: "/products/microsoft-365-business-standard" },
    },
    intro: [
      "Business Standard pairs the installed Office applications with hosted email, Teams and cloud storage. It stops short of the device management and advanced security layers that Business Premium adds — which is the right trade-off for organisations whose devices are already managed, and the wrong one for those where they are not.",
    ],
    sections: [
      {
        heading: "What each user gets",
        bullets: [
          "Word, Excel, PowerPoint and Outlook installed on up to five PCs or Macs, five tablets and five phones",
          "A 50 GB mailbox on your own domain, with Exchange Online",
          "Microsoft Teams with meetings, chat and shared channels",
          "1 TB of OneDrive storage",
          "SharePoint team sites and shared document libraries",
          "Web and mobile versions of every application",
        ],
      },
      {
        heading: "When Standard is the wrong plan",
        body: [
          "Standard assumes your devices are managed and your identity controls are in place through some other means. If they are not, Business Premium is the better purchase even though it costs more per seat: the device management, conditional access and threat protection it adds are not optional capabilities for an unmanaged estate.",
          "It is also the wrong plan for organisations approaching 300 seats, where the enterprise family should be evaluated before the cap forces the issue.",
        ],
      },
    ],
    productSlugs: ["microsoft-365-business-standard", "microsoft-365-business-premium"],
    productsHeading: "Buy Microsoft 365 Business Standard",
    brandSlug: "microsoft",
    related: [
      { label: "Business Premium comparison", href: "/microsoft-365/business-premium" },
      { label: "All Microsoft 365 plans", href: "/microsoft-365" },
      { label: "Deployment service", href: "/services/microsoft-365" },
    ],
    cta: {
      heading: "Get Business Standard pricing",
      body: "Volume pricing applies from modest seat counts. Send us the number and we will quote it.",
    },
  },
  {
    slug: "microsoft-365/business-premium",
    title: "Microsoft 365 Business Premium — Pricing & Licensing",
    description:
      "Microsoft 365 Business Premium licensing: everything in Business Standard plus Intune device management, Defender for Office 365 and conditional access.",
    keywords: ["microsoft 365 business premium", "business premium price", "intune", "defender"],
    breadcrumb: [
      { label: "Home", href: "/" },
      { label: "Microsoft", href: "/microsoft" },
      { label: "Microsoft 365", href: "/microsoft-365" },
      { label: "Business Premium" },
    ],
    hero: {
      eyebrow: "Microsoft 365",
      headline: "Microsoft 365 Business Premium",
      subheadline:
        "Business Standard plus the security and device management layer — which for most organisations removes the need for three separate point products.",
      primaryCta: { label: "Request pricing", href: "/enquiry" },
      secondaryCta: { label: "View product details", href: "/products/microsoft-365-business-premium" },
    },
    intro: [
      "The per-seat step up from Business Standard is usually recovered quickly once you account for the products Premium replaces — and for the incidents that conditional access prevents.",
      "The caveat worth stating plainly: Premium only delivers that value if it is configured. In most tenants we review, a substantial part of what it includes has never been switched on.",
    ],
    sections: [
      {
        heading: "What Premium adds over Standard",
        cards: [
          {
            title: "Microsoft Intune",
            body: "Device enrolment, configuration policy, compliance reporting and remote wipe. Without it, a lost laptop is an incident rather than an inconvenience.",
          },
          {
            title: "Defender for Office 365 Plan 1",
            body: "Attachments detonated in a sandbox before delivery, and links checked at click time rather than at delivery.",
          },
          {
            title: "Entra ID Premium P1",
            body: "Conditional access, self-service password reset and group-based licensing. Requiring MFA and a compliant device closes the most commonly exploited path there is.",
          },
          {
            title: "Azure Information Protection",
            body: "Sensitivity labels and encryption that travel with the document rather than with the folder it happens to be in.",
          },
        ],
      },
      {
        heading: "Mixing Premium and Standard",
        body: [
          "There is no requirement to put everyone on the same plan. The common and cost-effective pattern is Premium for staff who handle sensitive data or work from unmanaged devices, and Standard for everyone else.",
          "The combined total still counts against the 300-seat Business cap, so plan the enterprise transition on the same timeline either way.",
        ],
      },
    ],
    productSlugs: ["microsoft-365-business-premium", "microsoft-365-business-standard"],
    productsHeading: "Buy Microsoft 365 Business Premium",
    brandSlug: "microsoft",
    related: [
      { label: "Business Standard comparison", href: "/microsoft-365/business-standard" },
      { label: "Cybersecurity services", href: "/services/cybersecurity" },
      { label: "Endpoint management", href: "/services/endpoint-management" },
    ],
    cta: {
      heading: "Get Business Premium pricing",
      body: "We will also review what you are currently paying for separately that Premium would replace.",
    },
  },
  {
    slug: "microsoft-office",
    title: "Microsoft Office Licensing — Perpetual & Subscription",
    description:
      "Microsoft Office licensing for business: perpetual Home & Business and Professional Plus licences, LTSC volume licensing, and the Microsoft 365 subscription alternative compared.",
    keywords: ["microsoft office", "office licence", "office 2024", "perpetual office", "office professional"],
    breadcrumb: [{ label: "Home", href: "/" }, { label: "Microsoft", href: "/microsoft" }, { label: "Office" }],
    hero: {
      eyebrow: "Microsoft Office",
      headline: "Microsoft Office licensing, perpetual or subscription",
      subheadline:
        "Both models remain available, and the right one depends far more on how long you keep a release than on the headline price.",
      primaryCta: { label: "Get Office pricing", href: "/enquiry" },
      secondaryCta: { label: "Browse Office products", href: "/products?category=office-suites" },
    },
    intro: [
      "A perpetual Office licence costs more up front and nothing thereafter. A subscription costs less initially and always runs the current release. Over a five-year horizon, perpetual with one mid-cycle upgrade is usually cheaper for organisations that do not need current features.",
      "The factor that most often forces the decision is not cost but file format compatibility with clients and suppliers. If you exchange documents with people on current versions, staying several releases behind eventually stops being a choice.",
    ],
    sections: [
      {
        heading: "Choosing between them",
        cards: [
          {
            title: "Perpetual is the better fit when",
            body: "Budget is capital rather than operating, machines are replaced on a long cycle, cloud services are not required, or the system is regulated and any change requires revalidation.",
          },
          {
            title: "Subscription is the better fit when",
            body: "You also need business email and cloud storage, staff work across several devices, headcount changes regularly, or you want the licence to follow the person rather than the machine.",
          },
        ],
      },
    ],
    productSlugs: [
      "microsoft-office-home-and-business-2024",
      "microsoft-office-ltsc-professional-plus-2024",
      "microsoft-365-business-standard",
    ],
    productsHeading: "Office licensing in the catalogue",
    brandSlug: "microsoft",
    related: [
      { label: "Office LTSC", href: "/microsoft-office-ltsc" },
      { label: "Microsoft 365 plans", href: "/microsoft-365" },
      { label: "Licensing guide", href: "/microsoft-licensing" },
    ],
    cta: {
      heading: "Get Office pricing both ways",
      body: "Tell us the device count and replacement cycle. We will price perpetual and subscription side by side across a realistic horizon.",
    },
  },
  {
    slug: "microsoft-office-ltsc",
    title: "Microsoft Office LTSC 2024 — Volume Licensing",
    description:
      "Office LTSC Professional Plus 2024 volume licensing for systems that cannot take feature updates: perpetual, device-bound, security fixes only.",
    keywords: ["office ltsc", "office ltsc 2024", "professional plus", "volume licensing", "perpetual office"],
    breadcrumb: [
      { label: "Home", href: "/" },
      { label: "Microsoft", href: "/microsoft" },
      { label: "Office LTSC" },
    ],
    hero: {
      eyebrow: "Office LTSC",
      headline: "Office LTSC, for systems that must not change",
      subheadline:
        "A perpetual, device-bound release that receives security fixes but no feature updates. It exists for a specific set of situations, and is over-bought for everything else.",
      primaryCta: { label: "Get LTSC pricing", href: "/enquiry" },
      secondaryCta: { label: "View product details", href: "/products/microsoft-office-ltsc-professional-plus-2024" },
    },
    intro: [
      "Office LTSC is the long-term servicing release: a fixed, revalidation-friendly baseline for process control terminals, air-gapped networks, regulated systems and machines with no reliable internet connection.",
      "It is deliberately not the general-purpose choice. LTSC does not include the cloud services, does not receive new capabilities, and is licensed per device rather than per user. For a typical knowledge worker, a Microsoft 365 subscription is both cheaper across the replacement cycle and better supported. We will tell you if that is your situation.",
    ],
    sections: [
      {
        heading: "Where LTSC is genuinely the right answer",
        bullets: [
          "Manufacturing and process control terminals where any software change requires revalidation",
          "Air-gapped or restricted networks with no path to Microsoft's services",
          "Regulated environments with a documented, frozen software baseline",
          "Shared devices with no named user to attach a subscription to",
          "Machines with no reliable internet connection for activation and updates",
        ],
      },
      {
        heading: "What you give up",
        bullets: [
          "No feature updates for the life of the release",
          "No cloud services — no OneDrive, no Teams, no hosted email",
          "Licensed per device, so a user with two machines needs two licences",
          "No upgrade path to a newer release without purchasing it again",
        ],
      },
    ],
    productSlugs: ["microsoft-office-ltsc-professional-plus-2024"],
    productsHeading: "Office LTSC licensing",
    brandSlug: "microsoft",
    related: [
      { label: "Office licensing overview", href: "/microsoft-office" },
      { label: "Microsoft licensing guide", href: "/microsoft-licensing" },
      { label: "Software asset management", href: "/services/software-asset-management" },
    ],
    cta: {
      heading: "Get Office LTSC pricing",
      body: "Tell us the device count and why the systems need a frozen baseline. If a subscription would serve better, we will say so.",
    },
  },
  {
    slug: "windows-server",
    title: "Windows Server Licensing — Core Licences & CALs",
    description:
      "Windows Server 2025 Standard and Datacenter licensing explained: core counting rules, the sixteen-core minimum, when Datacenter becomes cheaper, and how CALs are counted.",
    keywords: ["windows server", "windows server 2025", "core licensing", "cal", "datacenter"],
    breadcrumb: [{ label: "Home", href: "/" }, { label: "Microsoft", href: "/microsoft" }, { label: "Windows Server" }],
    hero: {
      eyebrow: "Windows Server",
      headline: "Windows Server licensing, counted correctly",
      subheadline:
        "Core counting and CAL requirements are where most Windows Server purchases go wrong — in both directions. We size it from your actual host configuration.",
      primaryCta: { label: "Get Windows Server pricing", href: "/enquiry" },
      secondaryCta: { label: "Browse server licensing", href: "/products?category=server-os" },
    },
    intro: [
      "Windows Server is licensed by physical core, with a minimum of sixteen cores per server and eight per processor, sold in two-core packs. Those minimums apply regardless of the actual core count, which is why a small server is rarely as cheap as buyers expect.",
      "Client Access Licences are a separate purchase and are the part organisations most frequently get wrong. Under-counting them is a compliance exposure that only becomes visible during an audit.",
    ],
    sections: [
      {
        heading: "Standard or Datacenter",
        body: [
          "Both editions share the core licensing model. The difference is virtualisation rights: Standard covers the host plus two operating system environments, while Datacenter permits unlimited environments.",
          "Beyond two virtual machines on a Standard host, additional full core licences must be stacked. Past roughly four to six guests, Datacenter costs less — and the gap widens quickly with density.",
        ],
        cards: [
          {
            title: "Standard",
            body: "Two operating system environments per licensed host. Suits physical servers and lightly virtualised hosts running a handful of guests.",
          },
          {
            title: "Datacenter",
            body: "Unlimited operating system environments, plus Storage Spaces Direct and Software Defined Networking. Suits consolidated virtualisation platforms.",
          },
        ],
      },
      {
        heading: "Client Access Licences",
        body: [
          "Every user or device that accesses the server needs a CAL, and the CAL version must match or exceed the server version. A Server 2025 host cannot legally be accessed with Server 2019 CALs.",
        ],
        bullets: [
          "User CALs suit organisations where staff use several devices each",
          "Device CALs suit shift environments where several people share one machine",
          "Remote Desktop Services access requires an additional RDS CAL on top of the base CAL",
          "CALs are perpetual under volume licensing and do not need renewing annually",
        ],
      },
    ],
    productSlugs: [
      "windows-server-2025-standard",
      "windows-server-2025-datacenter",
      "windows-server-cal-user",
    ],
    productsHeading: "Windows Server licensing",
    brandSlug: "microsoft",
    related: [
      { label: "SQL Server licensing", href: "/sql-server" },
      { label: "Infrastructure hardware", href: "/products?category=infrastructure-hardware" },
      { label: "Backup and disaster recovery", href: "/services/backup-disaster-recovery" },
    ],
    cta: {
      heading: "Get Windows Server sized properly",
      body: "Send us the physical core count, the number of guests and how staff connect. We will quote the correct core packs and CAL mix rather than a default.",
    },
  },
  {
    slug: "sql-server",
    title: "SQL Server Licensing — Core & Server Plus CAL",
    description:
      "SQL Server 2022 Standard and Enterprise licensing: per-core versus server-plus-CAL, the four-core minimum, virtualisation rules and when Enterprise is genuinely required.",
    keywords: ["sql server", "sql server 2022", "sql licensing", "core licence", "enterprise edition"],
    breadcrumb: [{ label: "Home", href: "/" }, { label: "Microsoft", href: "/microsoft" }, { label: "SQL Server" }],
    hero: {
      eyebrow: "SQL Server",
      headline: "SQL Server licensing, priced both ways",
      subheadline:
        "Per-core and server-plus-CAL produce very different totals for the same workload. We price both against your actual connection pattern rather than defaulting to one.",
      primaryCta: { label: "Get SQL Server pricing", href: "/enquiry" },
      secondaryCta: { label: "Browse database licensing", href: "/products?category=database-servers" },
    },
    intro: [
      "SQL Server Standard can be licensed two ways: per core, with a four-core minimum per instance and no CAL requirement, or server-plus-CAL, where one server licence is paired with a CAL for every user or device that connects.",
      "Per-core suits externally-facing or high-connection-count workloads. Server-plus-CAL suits internal applications with a countable, stable user base. The difference between them on the same workload is frequently large.",
    ],
    sections: [
      {
        heading: "Standard or Enterprise",
        body: [
          "Enterprise removes the memory and feature ceilings of Standard, and is licensed per core only. Given the price step, it is worth confirming that a specific Enterprise capability is genuinely required before committing.",
        ],
        bullets: [
          "Multi-replica Always On availability groups — Enterprise",
          "Online index rebuilds without downtime — Enterprise",
          "Table and index partitioning at scale — Enterprise",
          "Buffer pool memory above 128 GB per instance — Enterprise",
          "Everything else, for most line-of-business workloads — Standard",
        ],
      },
      {
        heading: "Virtualisation and licence mobility",
        body: [
          "A virtualised SQL deployment must license either all physical cores on the host or the virtual cores assigned to the guest, with a four-core minimum per virtual machine.",
          "Moving licences between servers more often than every 90 days requires active Software Assurance. This matters particularly if you intend to run SQL on cloud infrastructure — without licence mobility, the licence cannot move.",
        ],
      },
    ],
    productSlugs: ["sql-server-2022-standard", "sql-server-2022-enterprise"],
    productsHeading: "SQL Server licensing",
    brandSlug: "microsoft",
    related: [
      { label: "Windows Server licensing", href: "/windows-server" },
      { label: "Azure services", href: "/services/azure" },
      { label: "Backup and disaster recovery", href: "/services/backup-disaster-recovery" },
    ],
    cta: {
      heading: "Get SQL Server priced both ways",
      body: "Tell us the core count, connection pattern and whether the workload is virtualised. We will quote per-core and server-plus-CAL side by side.",
    },
  },
  {
    slug: "microsoft-csp",
    title: "Microsoft CSP — Cloud Solution Provider Programme",
    description:
      "How Microsoft's Cloud Solution Provider programme works: annual and monthly terms, mid-term seat changes, INR billing with GST, and how it compares to a volume agreement.",
    keywords: ["microsoft csp", "cloud solution provider", "csp licensing", "csp partner"],
    breadcrumb: [{ label: "Home", href: "/" }, { label: "Microsoft", href: "/microsoft" }, { label: "CSP" }],
    hero: {
      eyebrow: "Cloud Solution Provider",
      headline: "Microsoft CSP, explained without the sales gloss",
      subheadline:
        "Partner-led purchasing with annual or monthly terms, INR billing and GST invoicing. It suits most organisations below roughly 250 seats — and we will tell you when it does not suit yours.",
      primaryCta: { label: "Discuss CSP", href: "/enquiry" },
      secondaryCta: { label: "Compare licensing models", href: "/microsoft-licensing" },
    },
    intro: [
      "Under CSP, licences are bought through a partner who handles billing, provisioning and first-line support. The commercial characteristics that matter are the term length, the ability to change seat counts mid-term, and the billing currency.",
    ],
    sections: [
      {
        heading: "What CSP gives you",
        bullets: [
          "Annual or monthly commitment terms, chosen per subscription",
          "Seats addable at any point in the term, billed prorated",
          "Seat reductions at the subscription anniversary",
          "Billing in INR on a compliant GST invoice, with no currency exposure",
          "One partner relationship across all your Microsoft subscriptions",
          "Provisioning and licence assignment support",
        ],
      },
      {
        heading: "Where CSP is not the better answer",
        body: [
          "Above roughly 500 seats with a stable headcount, a volume licensing agreement usually costs less across three years and adds Software Assurance benefits that CSP does not include.",
          "Organisations that need licence mobility for SQL Server or Windows Server on cloud infrastructure need Software Assurance, which comes through volume licensing rather than CSP.",
          "Between 250 and 500 seats both should be modelled across the full term before deciding. We will do that rather than assume.",
        ],
      },
      {
        heading: "Moving an existing tenant to CSP",
        body: [
          "Transferring the billing relationship is an administrative change. Your tenant, data, configuration, users and settings are unaffected, and there is no downtime or migration of any kind.",
          "The transfer takes effect at your next subscription renewal date for annual terms, or at the next billing cycle for monthly ones.",
        ],
      },
    ],
    faqTopic: "microsoft-licensing",
    related: [
      { label: "Microsoft licensing guide", href: "/microsoft-licensing" },
      { label: "Microsoft 365 plans", href: "/microsoft-365" },
      { label: "Azure services", href: "/services/azure" },
    ],
    cta: {
      heading: "Talk to us about CSP",
      body: "Send us your current subscriptions and renewal dates. We will model CSP against your alternatives across a full three-year term.",
    },
  },
  {
    slug: "microsoft-licensing",
    title: "Microsoft Licensing Guide — CSP, EA & Volume Licensing",
    description:
      "A practical comparison of Microsoft's purchasing programmes: Cloud Solution Provider, Enterprise Agreement and volume licensing, with the thresholds that actually decide it.",
    keywords: ["microsoft licensing", "enterprise agreement", "volume licensing", "csp vs ea", "software assurance"],
    breadcrumb: [
      { label: "Home", href: "/" },
      { label: "Microsoft", href: "/microsoft" },
      { label: "Licensing guide" },
    ],
    hero: {
      eyebrow: "Licensing guide",
      headline: "Which Microsoft licensing model fits your organisation",
      subheadline:
        "The decision is usually made on headline unit price, which is the least reliable basis for it. Here is what actually differs.",
      primaryCta: { label: "Get a licensing review", href: "/enquiry" },
      secondaryCta: { label: "Read the full article", href: "/blog/csp-vs-enterprise-agreement-which-microsoft-licensing-model" },
    },
    intro: [
      "Microsoft's purchasing programmes differ in three ways that matter more than unit price: commitment shape, billing arrangement, and how much flexibility you retain mid-term.",
    ],
    sections: [
      {
        heading: "The three that matter",
        cards: [
          {
            title: "Commitment shape",
            body: "CSP subscriptions are annual, with seats addable any time and reducible at the anniversary. An Enterprise Agreement commits you for three years at a baseline count, with a true-up for additions. Stable headcount favours the agreement; changing headcount favours CSP.",
          },
          {
            title: "Billing",
            body: "CSP is billed by your partner in INR on a standard GST invoice. Volume agreements often involve direct billing and foreign exchange exposure. For organisations that need clean input credit without currency risk, that difference is substantive.",
          },
          {
            title: "Mid-term flexibility",
            body: "Under CSP you can move a user between plans or add a mid-year cohort without renegotiating. Under an agreement, changes flow through the true-up process, which is slower and less forgiving.",
          },
        ],
      },
      {
        heading: "Rough thresholds",
        bullets: [
          "Below 250 seats — CSP almost always. The flexibility is worth more than the price protection, and an agreement's administrative overhead is disproportionate.",
          "250 to 500 seats — genuinely worth modelling both, across the full three-year term including a scenario where headcount falls.",
          "Above 500 seats — an agreement usually wins on price, but only if the baseline count is set accurately rather than against optimistic growth.",
        ],
      },
      {
        heading: "Software Assurance, and whether you need it",
        body: [
          "Software Assurance adds upgrade rights, licence mobility and deployment benefits to volume licences. It is bundled into some agreements and optional on others.",
          "Licence mobility is the benefit that most often decides it: without it, a SQL Server or Windows Server licence cannot be moved to cloud infrastructure. If any part of your estate is heading to Azure or AWS, check this before committing either way.",
        ],
      },
    ],
    faqTopic: "microsoft-licensing",
    related: [
      { label: "Microsoft CSP", href: "/microsoft-csp" },
      { label: "Software asset management", href: "/services/software-asset-management" },
      { label: "Licence management", href: "/services/licence-management" },
    ],
    cta: {
      heading: "Get your licensing position modelled",
      body: "Send us your current agreements, subscriptions and renewal dates. We will model the alternatives across a full term and show the assumptions so you can challenge them.",
    },
  },
];
