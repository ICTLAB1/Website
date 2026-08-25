import { DELIVERY_PERPETUAL, DELIVERY_SUBSCRIPTION, SUPPORT_STANDARD, type ProductSeed } from "./types";

const CSP_NOTE =
  "Available through the Cloud Solution Provider programme. Seat counts can be increased at any point in the term; reductions take effect at the annual renewal date. Monthly-commitment pricing is higher per seat than annual commitment.";

export const microsoftProducts: ProductSeed[] = [
  {
    slug: "microsoft-365-business-standard",
    name: "Microsoft 365 Business Standard",
    brand: "microsoft",
    category: "microsoft-365-plans",
    shortDescription:
      "Desktop Office applications, business email and Teams for organisations up to 300 seats.",
    description:
      "Microsoft 365 Business Standard is the plan most small and mid-sized organisations settle on: it pairs the installed Office applications with hosted email, Teams and cloud storage, without the device management and advanced security layers of the Premium plan.\n\nEach user gets Word, Excel, PowerPoint and Outlook installed on up to five PCs or Macs plus five tablets and five phones, a 50 GB mailbox on a custom domain, 1 TB of OneDrive storage and full Teams meeting capability. Administration is handled through the Microsoft 365 admin centre.\n\nThe plan is capped at 300 seats. Organisations that expect to pass that ceiling should look at the enterprise plans early, because the migration is simpler before the cap is reached than after.",
    features: [
      "Installed Word, Excel, PowerPoint and Outlook on up to five devices per user",
      "50 GB business email on your own domain with Exchange Online",
      "Microsoft Teams with meetings, chat and shared channels",
      "1 TB of OneDrive cloud storage per user",
      "SharePoint team sites and shared document libraries",
      "Web and mobile versions of the Office applications",
      "Standard Microsoft support included with the subscription",
    ],
    compatibility: [
      "Windows 11 and Windows 10 (supported servicing channels)",
      "macOS - three most recent released versions",
      "iOS and Android mobile applications",
      "Any modern browser for the web applications",
    ],
    keywords: ["m365", "office 365", "business standard", "email", "teams", "office"],
    licensingNotes: `${CSP_NOTE}\n\nBusiness plans are limited to a maximum of 300 seats per tenant across the Business Basic, Standard and Premium plans combined.`,
    deliveryNotes: DELIVERY_SUBSCRIPTION,
    supportNotes: SUPPORT_STANDARD,
    featured: true,
    popularity: 100,
    availability: "IN_STOCK",
    purchaseMode: "BOTH",
    variants: [
      { sku: "MS-M365-BS-A1", name: "Annual commitment, billed yearly", licenceType: "CSP", termMonths: 12, isDefault: true, listPriceMinor: 12_50_000, salePriceMinor: 11_80_000 },
      { sku: "MS-M365-BS-M1", name: "Annual commitment, billed monthly", licenceType: "SUBSCRIPTION_MONTHLY", termMonths: 12, listPriceMinor: 1_10_000 },
      { sku: "MS-M365-BS-MM", name: "Monthly commitment", licenceType: "SUBSCRIPTION_MONTHLY", termMonths: 1, listPriceMinor: 1_32_000 },
    ],
    faqs: [
      {
        question: "Can we move from Business Standard to Business Premium mid-term?",
        answer:
          "Yes. An upgrade to a higher plan can be applied during the term and is billed as a prorated difference for the remainder. Downgrades take effect at the renewal date rather than immediately.",
      },
      {
        question: "What happens when we exceed 300 users?",
        answer:
          "Business plans are hard-capped at 300 seats. Beyond that you need an enterprise plan such as Microsoft 365 E3. We recommend planning that transition when you reach roughly 250 seats so it happens on your schedule rather than at a renewal deadline.",
      },
      {
        question: "Is the subscription price inclusive of GST?",
        answer:
          "Prices shown on this page exclude GST. GST is applied at the prevailing rate on the tax invoice, and your GSTIN is recorded on the invoice for input credit.",
      },
    ],
  },
  {
    slug: "microsoft-365-business-premium",
    name: "Microsoft 365 Business Premium",
    brand: "microsoft",
    category: "microsoft-365-plans",
    shortDescription:
      "Business Standard plus device management, advanced threat protection and information protection.",
    description:
      "Business Premium is Business Standard with the security and device management layer added. For most organisations under 300 seats it is the plan that removes the need to buy a separate endpoint management tool, a separate email security product and a separate mobile device policy engine.\n\nThe additions that matter operationally are Intune for device enrolment and policy, Defender for Office 365 for attachment and link protection, Entra ID Premium P1 for conditional access, and Azure Information Protection for document labelling and encryption.\n\nThe per-seat difference over Business Standard is usually recovered quickly once you account for the point products it replaces — and for the incidents that conditional access prevents.",
    features: [
      "Everything in Microsoft 365 Business Standard",
      "Microsoft Intune for device enrolment, policy and remote wipe",
      "Defender for Office 365 Plan 1 - safe attachments and safe links",
      "Entra ID Premium P1 - conditional access and self-service password reset",
      "Azure Information Protection for document labelling and encryption",
      "Windows 11 Business upgrade rights from a qualifying licence",
      "300-seat maximum, same as the other Business plans",
    ],
    compatibility: [
      "Windows 11 and Windows 10 Pro (required for full device management)",
      "macOS - three most recent released versions",
      "iOS and Android with Intune enrolment",
    ],
    keywords: ["m365", "business premium", "intune", "defender", "conditional access", "security"],
    licensingNotes: `${CSP_NOTE}\n\nThe Windows upgrade rights included in this plan require an existing qualifying Windows Pro licence on the device.`,
    deliveryNotes: DELIVERY_SUBSCRIPTION,
    supportNotes: SUPPORT_STANDARD,
    featured: true,
    popularity: 95,
    availability: "IN_STOCK",
    purchaseMode: "BOTH",
    variants: [
      { sku: "MS-M365-BP-A1", name: "Annual commitment, billed yearly", licenceType: "CSP", termMonths: 12, isDefault: true, listPriceMinor: 21_60_000, salePriceMinor: 20_40_000 },
      { sku: "MS-M365-BP-M1", name: "Annual commitment, billed monthly", licenceType: "SUBSCRIPTION_MONTHLY", termMonths: 12, listPriceMinor: 1_90_000 },
    ],
    faqs: [
      {
        question: "Does Business Premium replace our separate antivirus?",
        answer:
          "For most Windows estates, Defender for Endpoint Plan 1 combined with Intune policy replaces a traditional third-party antivirus product. Whether it also replaces a specialist EDR depends on your compliance obligations - we assess that as part of a security review rather than assuming it.",
      },
      {
        question: "Can we mix Business Standard and Business Premium in one tenant?",
        answer:
          "Yes, and it is often the cost-effective approach: Premium for staff who handle sensitive data or use unmanaged devices, Standard for the rest. The combined total still counts against the 300-seat cap.",
      },
    ],
  },
  {
    slug: "microsoft-365-business-basic",
    name: "Microsoft 365 Business Basic",
    brand: "microsoft",
    category: "microsoft-365-plans",
    shortDescription: "Web and mobile Office, business email and Teams, without desktop applications.",
    description:
      "Business Basic covers organisations whose staff work primarily in a browser, or who already have desktop Office licences and only need the hosted services. It provides business email on your own domain, Teams, OneDrive and SharePoint, with the web and mobile versions of the Office applications.\n\nThe practical limitation is the absence of installed desktop applications. For roles that live in Excel, that limitation is felt quickly; for frontline and field staff it rarely is.",
    features: [
      "50 GB business email on your own domain",
      "Microsoft Teams chat, meetings and shared channels",
      "1 TB of OneDrive storage per user",
      "Web and mobile Office applications",
      "SharePoint team sites",
    ],
    compatibility: ["Any modern browser", "iOS and Android mobile applications"],
    keywords: ["m365", "business basic", "web office", "email"],
    licensingNotes: CSP_NOTE,
    deliveryNotes: DELIVERY_SUBSCRIPTION,
    supportNotes: SUPPORT_STANDARD,
    popularity: 70,
    availability: "IN_STOCK",
    purchaseMode: "BOTH",
    variants: [
      { sku: "MS-M365-BB-A1", name: "Annual commitment, billed yearly", licenceType: "CSP", termMonths: 12, isDefault: true, listPriceMinor: 5_04_000 },
      { sku: "MS-M365-BB-MM", name: "Monthly commitment", licenceType: "SUBSCRIPTION_MONTHLY", termMonths: 1, listPriceMinor: 54_000 },
    ],
  },
  {
    slug: "microsoft-365-e3",
    name: "Microsoft 365 E3",
    brand: "microsoft",
    category: "microsoft-365-plans",
    shortDescription:
      "Enterprise productivity, security and compliance with no seat ceiling.",
    description:
      "Microsoft 365 E3 is the standard enterprise plan: the full Office applications, enterprise-grade Exchange and SharePoint, Windows Enterprise upgrade rights, Intune, and the compliance tooling that regulated organisations need for retention and eDiscovery.\n\nUnlike the Business plans, E3 has no seat cap, which makes it the destination for organisations that have outgrown Business Premium. The compliance capabilities — litigation hold, retention policies, data loss prevention — are usually what forces the move rather than the seat count alone.",
    features: [
      "Full desktop, web and mobile Office applications",
      "100 GB mailbox with archiving and litigation hold",
      "Windows 11 Enterprise E3 upgrade rights",
      "Microsoft Intune and Entra ID Premium P1",
      "Data loss prevention and retention policies",
      "eDiscovery (Standard) and audit logging",
      "No maximum seat count",
    ],
    compatibility: [
      "Windows 11 and Windows 10 Enterprise / Pro",
      "macOS - three most recent released versions",
      "iOS and Android",
    ],
    keywords: ["m365 e3", "enterprise", "compliance", "ediscovery", "windows enterprise"],
    licensingNotes: `${CSP_NOTE}\n\nEnterprise plans have no seat cap and are also available under volume licensing agreements. Above roughly 250 seats it is worth pricing CSP and an enterprise agreement side by side across a three-year horizon.`,
    deliveryNotes: DELIVERY_SUBSCRIPTION,
    supportNotes: SUPPORT_STANDARD,
    featured: true,
    popularity: 88,
    availability: "IN_STOCK",
    purchaseMode: "BOTH",
    variants: [
      { sku: "MS-M365-E3-A1", name: "Annual commitment, billed yearly", licenceType: "CSP", termMonths: 12, isDefault: true, listPriceMinor: 33_60_000 },
      { sku: "MS-M365-E3-M1", name: "Annual commitment, billed monthly", licenceType: "SUBSCRIPTION_MONTHLY", termMonths: 12, listPriceMinor: 2_95_000 },
    ],
  },
  {
    slug: "microsoft-365-e5",
    name: "Microsoft 365 E5",
    brand: "microsoft",
    category: "microsoft-365-plans",
    shortDescription:
      "E3 plus advanced security, advanced compliance, Power BI Pro and voice capability.",
    description:
      "E5 adds the top security and compliance tier to E3, along with Power BI Pro and Teams Phone capability. The security additions — Defender for Endpoint Plan 2, Defender for Identity, Defender for Cloud Apps and Entra ID Premium P2 — represent a genuinely different posture rather than an incremental one.\n\nE5 is rarely the right answer for a whole organisation. The common pattern is E3 as the baseline with E5 security add-ons applied to the users who warrant them, and we will model that split rather than quoting a blanket upgrade.",
    features: [
      "Everything in Microsoft 365 E3",
      "Defender for Endpoint Plan 2, Defender for Identity and Defender for Cloud Apps",
      "Entra ID Premium P2 with identity protection and access reviews",
      "Advanced eDiscovery, insider risk management and communication compliance",
      "Power BI Pro for every licensed user",
      "Teams Phone with audio conferencing",
    ],
    compatibility: ["Windows 11 and Windows 10 Enterprise", "macOS", "iOS and Android"],
    keywords: ["m365 e5", "defender", "power bi", "teams phone", "compliance"],
    licensingNotes: `${CSP_NOTE}\n\nMost E5 capabilities are also available as add-ons to an E3 base, which is usually more economical when only part of the workforce needs them.`,
    deliveryNotes: DELIVERY_SUBSCRIPTION,
    supportNotes: SUPPORT_STANDARD,
    popularity: 74,
    availability: "IN_STOCK",
    purchaseMode: "BOTH",
    variants: [
      { sku: "MS-M365-E5-A1", name: "Annual commitment, billed yearly", licenceType: "CSP", termMonths: 12, isDefault: true, listPriceMinor: 55_20_000 },
    ],
  },
  {
    slug: "microsoft-office-ltsc-professional-plus-2024",
    name: "Microsoft Office LTSC Professional Plus 2024",
    brand: "microsoft",
    category: "office-suites",
    shortDescription:
      "Perpetual, device-bound Office for systems that cannot take feature updates.",
    description:
      "Office LTSC is the long-term servicing release of the Office applications: a perpetual, device-bound licence that receives security fixes but no feature updates for the life of the release. It exists for a specific set of situations — process control terminals, air-gapped networks, regulated systems where any change requires revalidation, and machines with no reliable internet connection.\n\nIt is deliberately not the general-purpose choice. LTSC does not include the cloud services, does not receive new capabilities, and is licensed per device rather than per user. For a typical knowledge worker, a Microsoft 365 subscription is both cheaper over the replacement cycle and better supported.",
    features: [
      "Word, Excel, PowerPoint, Outlook, Publisher and Access",
      "Perpetual licence tied to a single device",
      "Security updates for the supported lifecycle of the release",
      "No feature updates - a fixed, revalidation-friendly baseline",
      "Volume activation via KMS or MAK",
    ],
    compatibility: [
      "Windows 11 and Windows 10 (supported servicing channels)",
      "Windows Server 2019 and later for RDS scenarios",
    ],
    keywords: ["office ltsc", "office 2024", "perpetual office", "professional plus", "volume licence"],
    licensingNotes:
      "Licensed per device under volume licensing, not per user. LTSC does not include cloud services, and there is no upgrade path to a newer release without purchasing it. Organisations frequently over-buy LTSC when a subscription would serve better - we will say so if that is the case for your scenario.",
    deliveryNotes: DELIVERY_PERPETUAL,
    supportNotes: SUPPORT_STANDARD,
    popularity: 66,
    availability: "IN_STOCK",
    purchaseMode: "BOTH",
    variants: [
      { sku: "MS-OFF-LTSC-PP24", name: "Volume licence, single device, perpetual", licenceType: "VOLUME", termMonths: null, isDefault: true, listPriceMinor: 62_00_000 },
    ],
    faqs: [
      {
        question: "Can an LTSC licence be moved to a replacement machine?",
        answer:
          "Volume licences may generally be reassigned to a replacement device after 90 days, or sooner if the original hardware has permanently failed. The exact terms sit in your volume licensing agreement and we will confirm them in writing on the quotation.",
      },
    ],
  },
  {
    slug: "microsoft-office-home-and-business-2024",
    name: "Microsoft Office Home & Business 2024",
    brand: "microsoft",
    category: "office-suites",
    shortDescription: "One-time purchase Office for a single PC or Mac, including Outlook.",
    description:
      "A one-time purchase of the classic Office applications for a single device, including Outlook. It suits a small business that wants Office on a handful of machines without a subscription commitment, and organisations that only need the applications rather than hosted email and cloud storage.\n\nThe trade-off is the absence of feature updates and cloud services. If you also need business email on your own domain, a Microsoft 365 Business subscription usually costs less across three years once mail hosting is priced in separately.",
    features: [
      "Word, Excel, PowerPoint and Outlook",
      "One-time purchase for one PC or Mac",
      "Security updates for the supported lifecycle",
      "No subscription renewal required",
    ],
    compatibility: ["Windows 11 and Windows 10", "macOS - three most recent released versions"],
    keywords: ["office 2024", "home and business", "perpetual", "one time purchase", "outlook"],
    licensingNotes:
      "A single-device perpetual licence. It does not include business email hosting, OneDrive storage or Teams, and it is not eligible for volume activation.",
    deliveryNotes: DELIVERY_PERPETUAL,
    supportNotes: SUPPORT_STANDARD,
    popularity: 60,
    availability: "IN_STOCK",
    purchaseMode: "BOTH",
    variants: [
      { sku: "MS-OFF-HB24-1PC", name: "One device, perpetual", licenceType: "PERPETUAL", termMonths: null, isDefault: true, listPriceMinor: 22_99_900, salePriceMinor: 21_49_900 },
    ],
  },
  {
    slug: "windows-11-pro-upgrade",
    name: "Windows 11 Pro Upgrade",
    brand: "microsoft",
    category: "desktop-os",
    shortDescription: "Upgrade licence from Windows Home to Pro for domain join and BitLocker.",
    description:
      "The Pro upgrade unlocks the capabilities a managed estate depends on: domain and Entra ID join, Group Policy, BitLocker drive encryption, Windows Update for Business and Remote Desktop host. Devices bought with a Home edition preinstalled cannot be enrolled into most management platforms until they are upgraded.\n\nWhere devices will be managed with Intune, the Pro edition is effectively a prerequisite rather than an optional extra.",
    features: [
      "Entra ID and Active Directory domain join",
      "BitLocker device encryption with recovery key escrow",
      "Group Policy and Windows Update for Business",
      "Remote Desktop host capability",
      "Hyper-V and Windows Sandbox",
    ],
    compatibility: ["Devices currently running Windows 11 Home or Windows 10 Home", "TPM 2.0 and Secure Boot required for Windows 11"],
    keywords: ["windows 11", "windows pro", "upgrade", "bitlocker", "domain join"],
    licensingNotes:
      "This is an upgrade licence and requires a qualifying underlying Windows licence on the device. It is not a full licence for a machine with no operating system.",
    deliveryNotes: DELIVERY_PERPETUAL,
    supportNotes: SUPPORT_STANDARD,
    popularity: 62,
    availability: "IN_STOCK",
    purchaseMode: "BOTH",
    variants: [
      { sku: "MS-WIN11-PRO-UPG", name: "Per device, perpetual upgrade", licenceType: "VOLUME", termMonths: null, isDefault: true, listPriceMinor: 15_60_000 },
    ],
  },
  {
    slug: "windows-server-2025-standard",
    name: "Windows Server 2025 Standard",
    brand: "microsoft",
    category: "server-os",
    shortDescription:
      "Core-licensed server operating system for physical or lightly virtualised hosts.",
    description:
      "Windows Server Standard is licensed by physical core, with a minimum of sixteen cores per server and eight per processor. A Standard licence covers the host plus two operating system environments; beyond that, additional core licences must be stacked, and past roughly four guests the Datacenter edition usually becomes cheaper.\n\nClient Access Licences are a separate purchase and are frequently the part organisations get wrong: every user or device that connects to the server needs one, and Remote Desktop Services access needs an additional RDS CAL on top.",
    features: [
      "Licensed per physical core, sixteen-core minimum per server",
      "Two operating system environments per licensed host",
      "Storage Replica, Storage Spaces Direct and Hyper-V",
      "Active Directory, DNS, DHCP and file services",
      "Windows Admin Center for management",
    ],
    compatibility: ["64-bit x86 server hardware", "Hyper-V and VMware virtualised hosts"],
    keywords: ["windows server", "server 2025", "core licence", "cal", "hyper-v"],
    licensingNotes:
      "Core licences are sold in two-core packs. A sixteen-core minimum applies per server regardless of the physical core count. Client Access Licences are licensed separately per user or per device, and Remote Desktop Services requires an additional CAL. We size the core count and CAL mix from your actual host configuration rather than a default.",
    deliveryNotes: DELIVERY_PERPETUAL,
    supportNotes: SUPPORT_STANDARD,
    featured: true,
    popularity: 78,
    availability: "IN_STOCK",
    purchaseMode: "ENQUIRY",
    variants: [
      { sku: "MS-WS2025-STD-2C", name: "2-core pack", licenceType: "VOLUME", termMonths: null, seats: 2, isDefault: true, listPriceMinor: 42_50_000 },
      { sku: "MS-WS2025-STD-16C", name: "16-core base licence", licenceType: "VOLUME", termMonths: null, seats: 16, listPriceMinor: 3_40_00_000 },
    ],
    faqs: [
      {
        question: "How many Client Access Licences do we need?",
        answer:
          "One per user or per device that accesses the server, whichever is fewer for your pattern of use. Organisations where staff use several devices each usually license per user; shift environments with shared machines usually license per device.",
      },
      {
        question: "When does Datacenter become cheaper than Standard?",
        answer:
          "Standard covers two virtual machines per licensed host, and additional pairs require stacking full core licences again. Past roughly four to six virtual machines on the same host, Datacenter - which permits unlimited operating system environments - typically costs less.",
      },
    ],
  },
  {
    slug: "windows-server-2025-datacenter",
    name: "Windows Server 2025 Datacenter",
    brand: "microsoft",
    category: "server-os",
    shortDescription: "Unlimited virtualisation rights for densely consolidated hosts.",
    description:
      "Datacenter shares the core licensing model with Standard but permits unlimited operating system environments on the licensed host, which is what makes it the right edition for a consolidated virtualisation platform. It also adds Storage Spaces Direct, Storage Replica without limits and Software Defined Networking.\n\nThe break-even against Standard sits at around four to six virtual machines per host. Below that Standard is cheaper; above it Datacenter is, and the gap widens quickly with density.",
    features: [
      "Unlimited operating system environments per licensed host",
      "Storage Spaces Direct and unrestricted Storage Replica",
      "Software Defined Networking and network controller",
      "Shielded virtual machines",
      "Licensed per physical core, sixteen-core minimum",
    ],
    compatibility: ["64-bit x86 server hardware", "Hyper-V clusters"],
    keywords: ["windows server datacenter", "virtualisation", "storage spaces direct", "core licence"],
    licensingNotes:
      "Same core-counting rules as Standard: two-core packs, sixteen-core minimum per server, eight-core minimum per processor. Client Access Licences remain a separate purchase.",
    deliveryNotes: DELIVERY_PERPETUAL,
    supportNotes: SUPPORT_STANDARD,
    popularity: 58,
    availability: "IN_STOCK",
    purchaseMode: "ENQUIRY",
    variants: [
      { sku: "MS-WS2025-DC-2C", name: "2-core pack", licenceType: "VOLUME", termMonths: null, seats: 2, isDefault: true, listPriceMinor: 2_47_00_000 },
    ],
  },
  {
    slug: "windows-server-cal-user",
    name: "Windows Server 2025 User CAL",
    brand: "microsoft",
    category: "server-os",
    shortDescription: "Per-user Client Access Licence for Windows Server.",
    description:
      "A Client Access Licence permits one named user to access Windows Server, from any number of devices. User CALs are the economical choice where staff use a laptop, a desktop and a phone against the same server; device CALs are cheaper where several people share one machine across shifts.\n\nCALs must match or exceed the server version. A Server 2025 host cannot legally be accessed with Server 2019 CALs.",
    features: [
      "One named user, any number of devices",
      "Version-matched to the server release",
      "Perpetual under volume licensing",
    ],
    compatibility: ["Windows Server 2025 Standard and Datacenter"],
    keywords: ["cal", "client access licence", "user cal", "windows server"],
    licensingNotes:
      "CAL version must be equal to or higher than the server version being accessed. Remote Desktop Services access requires an additional RDS CAL beyond this base CAL.",
    deliveryNotes: DELIVERY_PERPETUAL,
    supportNotes: SUPPORT_STANDARD,
    popularity: 55,
    availability: "IN_STOCK",
    purchaseMode: "BOTH",
    variants: [
      { sku: "MS-WS2025-UCAL", name: "Single user CAL, perpetual", licenceType: "VOLUME", termMonths: null, isDefault: true, listPriceMinor: 3_20_000 },
    ],
  },
  {
    slug: "sql-server-2022-standard",
    name: "SQL Server 2022 Standard",
    brand: "microsoft",
    category: "database-servers",
    shortDescription:
      "Relational database engine licensed per core or by server plus CALs.",
    description:
      "SQL Server Standard covers the great majority of line-of-business database workloads. It can be licensed two ways, and the choice makes a material difference: per core, with a four-core minimum per instance and no CAL requirement, or server-plus-CAL, where a single server licence is paired with a CAL for every user or device that connects.\n\nPer-core licensing suits externally-facing or high-connection-count workloads. Server-plus-CAL suits internal applications with a countable, stable user base. We price both against your actual connection pattern rather than defaulting to one.",
    features: [
      "Full relational engine with Always On basic availability groups",
      "Up to 128 GB of buffer pool memory per instance",
      "Integration, Reporting and Analysis Services",
      "Transparent data encryption and row-level security",
      "Licensed per core (four-core minimum) or per server plus CALs",
    ],
    compatibility: [
      "Windows Server 2019 and later",
      "Supported Linux distributions",
      "Azure Virtual Machines and other hosted platforms",
    ],
    keywords: ["sql server", "database", "sql 2022", "core licence", "standard edition"],
    licensingNotes:
      "Per-core licences are sold in two-core packs with a four-core minimum per instance. Virtualised deployments must license either all physical cores on the host or the virtual cores assigned to the guest, with a four-core minimum per virtual machine. Licence mobility across servers requires active Software Assurance.",
    deliveryNotes: DELIVERY_PERPETUAL,
    supportNotes: SUPPORT_STANDARD,
    featured: true,
    popularity: 72,
    availability: "IN_STOCK",
    purchaseMode: "ENQUIRY",
    variants: [
      { sku: "MS-SQL22-STD-2C", name: "2-core pack, perpetual", licenceType: "VOLUME", termMonths: null, seats: 2, isDefault: true, listPriceMinor: 3_28_00_000 },
      { sku: "MS-SQL22-STD-SVR", name: "Server licence (requires CALs)", licenceType: "VOLUME", termMonths: null, listPriceMinor: 78_00_000 },
      { sku: "MS-SQL22-STD-CAL", name: "User CAL", licenceType: "VOLUME", termMonths: null, listPriceMinor: 17_50_000 },
    ],
    faqs: [
      {
        question: "Do we need Enterprise edition?",
        answer:
          "Enterprise is warranted for online index operations, advanced availability groups, unlimited memory or large-scale partitioning. If none of those appear in your workload, Standard is a substantially cheaper licence for identical functional behaviour.",
      },
    ],
  },
  {
    slug: "sql-server-2022-enterprise",
    name: "SQL Server 2022 Enterprise",
    brand: "microsoft",
    category: "database-servers",
    shortDescription: "Full-capability database engine for high-availability, large-scale workloads.",
    description:
      "Enterprise edition removes the memory and feature ceilings of Standard. The capabilities that usually justify it are multi-replica Always On availability groups, online index rebuilds without downtime, table and index partitioning at scale, and unrestricted buffer pool memory.\n\nIt is licensed per core only, with a four-core minimum. Given the price step over Standard, it is worth confirming that a specific Enterprise feature is genuinely required before committing.",
    features: [
      "Always On availability groups with multiple secondary replicas",
      "Online index and partition operations",
      "Unrestricted memory and core scaling",
      "Advanced data compression and in-memory OLTP",
      "Per-core licensing only",
    ],
    compatibility: ["Windows Server 2019 and later", "Supported Linux distributions"],
    keywords: ["sql server enterprise", "always on", "high availability", "database"],
    licensingNotes:
      "Per-core licensing only; server-plus-CAL is not offered for Enterprise edition. Sold in two-core packs with a four-core minimum per instance.",
    deliveryNotes: DELIVERY_PERPETUAL,
    supportNotes: SUPPORT_STANDARD,
    popularity: 50,
    availability: "IN_STOCK",
    purchaseMode: "ENQUIRY",
    variants: [
      { sku: "MS-SQL22-ENT-2C", name: "2-core pack, perpetual", licenceType: "VOLUME", termMonths: null, seats: 2, isDefault: true, listPriceMinor: 12_56_00_000 },
    ],
  },
  {
    slug: "dynamics-365-sales-professional",
    name: "Dynamics 365 Sales Professional",
    brand: "microsoft",
    category: "crm-sales",
    shortDescription: "Pipeline and opportunity management integrated with Microsoft 365.",
    description:
      "Sales Professional is the core CRM capability without the enterprise customisation depth: accounts, contacts, leads, opportunities, quotes and forecasting, with native Outlook and Teams integration.\n\nFor organisations already standardised on Microsoft 365, the integration is the differentiator — activity tracking from Outlook without a plug-in that breaks at every update, and records surfaced in Teams alongside the conversation about them.",
    features: [
      "Lead, opportunity and account management",
      "Quote and order processing",
      "Native Outlook and Teams integration",
      "Sales forecasting and pipeline dashboards",
      "Power BI reporting on sales data",
    ],
    compatibility: ["Web application in any modern browser", "Outlook add-in", "iOS and Android"],
    keywords: ["dynamics 365", "crm", "sales professional", "pipeline"],
    licensingNotes: CSP_NOTE,
    deliveryNotes: DELIVERY_SUBSCRIPTION,
    supportNotes: SUPPORT_STANDARD,
    popularity: 48,
    availability: "IN_STOCK",
    purchaseMode: "BOTH",
    variants: [
      { sku: "MS-D365-SALESPRO-A1", name: "Annual commitment, per user", licenceType: "CSP", termMonths: 12, isDefault: true, listPriceMinor: 55_80_000 },
    ],
  },
  {
    slug: "azure-consumption-commitment",
    name: "Microsoft Azure Consumption",
    brand: "microsoft",
    category: "cloud-subscriptions",
    shortDescription:
      "Azure consumption billed through CSP, with cost governance and reserved instance planning.",
    description:
      "Azure is consumption-billed rather than seat-licensed, so there is no unit price to quote in a catalogue. What we provide is the commercial and operational wrapper: a CSP billing relationship with consolidated INR invoicing, spend visibility by subscription and resource group, and reserved instance or savings plan analysis where a workload's baseline is predictable enough to commit.\n\nMost organisations we work with reduce their Azure bill by fifteen to thirty percent in the first quarter, not by using less, but by right-sizing over-provisioned resources and committing the genuinely steady portion of the baseline. We size that from your actual usage data.",
    features: [
      "Consolidated INR invoicing with GST",
      "Subscription and resource group cost allocation",
      "Reserved instance and savings plan analysis",
      "Budget alerts and anomaly detection",
      "Azure Hybrid Benefit assessment for existing Windows and SQL licences",
    ],
    compatibility: ["All Azure regions and services", "Existing Azure tenants can be transitioned to CSP billing"],
    keywords: ["azure", "cloud", "consumption", "reserved instances", "csp"],
    licensingNotes:
      "Azure consumption is billed monthly in arrears against actual usage. Reserved instances and savings plans are separate commitments with their own terms. Existing Azure Hybrid Benefit entitlements from Windows Server and SQL Server licences with Software Assurance can materially reduce compute cost.",
    deliveryNotes:
      "Billing transition to CSP is completed without service interruption. Existing resources, subscriptions and configuration are unaffected.",
    supportNotes:
      "Includes billing support and cost review. Managed Azure operations are available as a separate engagement.",
    featured: true,
    popularity: 82,
    availability: "ON_REQUEST",
    purchaseMode: "ENQUIRY",
    variants: [
      { sku: "MS-AZ-CSP-CONSUMP", name: "Consumption billing, monthly in arrears", licenceType: "CSP", termMonths: 1, isDefault: true, listPriceMinor: 0 },
    ],
    faqs: [
      {
        question: "Why is there no price shown for Azure?",
        answer:
          "Azure is billed on metered consumption, so a per-unit catalogue price would be meaningless. We quote against your actual or projected usage profile, and we will show you where the current spend is going before proposing any commitment.",
      },
      {
        question: "Can we move an existing Azure subscription to your billing?",
        answer:
          "Yes. A transition to CSP billing is an administrative change that does not touch the running resources - no downtime, no reconfiguration, no resource migration.",
      },
    ],
  },
  /*
   * ── added 25 August 2026, from the search index rather than the line card ──
   *
   * Neither of these was in the catalogue, and both are what this domain
   * actually ranks for: "visual studio enterprise" at 13 and "microsoft visio
   * plan 1" at 10 in India. Both positions were held by `/product-page/` URLs
   * from the previous site, which this repository retires — and retiring a URL
   * Google is still ranking, with nothing to send it to, throws the ranking
   * away. So the products exist here, the redirects point at them, and the
   * position has somewhere to land.
   *
   * No price, deliberately: `listPriceMinor: 0` is the absence of a price and
   * not a price, the same convention the hardware catalogue uses. Neither
   * product's Indian pricing is something this repository knows, and inventing
   * a figure on a page a customer might quote from would be worse than showing
   * none.
   */
  {
    slug: "visual-studio-enterprise",
    name: "Visual Studio Enterprise",
    brand: "microsoft",
    category: "business-applications",
    shortDescription:
      "The full Visual Studio IDE with its subscriber benefits, licensed per named developer.",
    description:
      "Visual Studio Enterprise is the top edition of Microsoft's development environment, licensed per named user rather than per machine — one developer may install it on as many devices as they work on. The subscription is the larger part of what is bought: alongside the IDE it carries development and test licences for most Microsoft server software, an Azure credit, and access to the Windows and Office release channels for testing.\n\nThe edition question is usually the commercial one. Professional covers the IDE for teams that do not need the enterprise testing and architecture tooling; Enterprise adds it along with the subscriber benefits that many organisations are already paying for separately elsewhere. We quote both against your actual developer count so the comparison is on your numbers rather than on a list price.",
    features: [
      "Per-user licensing — install on every device that developer works on",
      "Development and test licences for Microsoft server software",
      "Monthly Azure credit included with the subscription",
      "Enterprise testing, profiling and architecture tooling",
      "Standard or cloud subscription, with or without an existing agreement",
    ],
    compatibility: ["Windows 10 and 11", "Windows Server 2019 and later", "macOS via Visual Studio Code or remote development"],
    keywords: [
      "visual studio",
      "visual studio enterprise",
      "visual studio licence",
      "developer tools",
      "msdn subscription",
    ],
    licensingNotes: CSP_NOTE,
    deliveryNotes: DELIVERY_SUBSCRIPTION,
    supportNotes: SUPPORT_STANDARD,
    popularity: 40,
    availability: "ON_REQUEST",
    purchaseMode: "ENQUIRY",
    variants: [
      // Zero is the absence of a price, not a price.
      {
        sku: "MS-VS-ENT-A1",
        name: "Annual subscription, per named developer",
        licenceType: "SUBSCRIPTION_ANNUAL",
        termMonths: 12,
        isDefault: true,
        listPriceMinor: 0,
      },
    ],
  },
  {
    slug: "visio-plan-1",
    name: "Microsoft Visio Plan 1",
    brand: "microsoft",
    category: "productivity-collaboration",
    shortDescription:
      "Browser-based diagramming with 2 GB of OneDrive storage, licensed per user.",
    description:
      "Visio Plan 1 is the web edition: diagrams are created and edited in a browser, stored in OneDrive, and shared with anyone who has a Microsoft 365 licence — including people with no Visio licence at all, who can view and comment. It does not include the Windows desktop application, which is the single distinction that decides most purchases.\n\nPlan 2 adds that desktop app and the data-linked and engineering templates. Most organisations need a mixture: a handful of Plan 2 seats for the people who build the diagrams, Plan 1 for those who maintain and share them. We quote the mix rather than a single plan across the whole team.",
    features: [
      "Diagramming in the browser, no installation",
      "2 GB of OneDrive storage for diagram files",
      "Sharing and commenting for colleagues without a Visio licence",
      "Starter templates for flowcharts, org charts and basic network diagrams",
      "Files interchange with the Visio desktop application",
    ],
    compatibility: ["Any modern browser", "Microsoft 365 account required", "iOS and Android for viewing"],
    keywords: ["visio", "visio plan 1", "diagramming", "flowchart", "org chart"],
    licensingNotes: CSP_NOTE,
    deliveryNotes: DELIVERY_SUBSCRIPTION,
    supportNotes: SUPPORT_STANDARD,
    popularity: 38,
    availability: "ON_REQUEST",
    purchaseMode: "ENQUIRY",
    variants: [
      {
        sku: "MS-VISIO-P1-A1",
        name: "Annual subscription, per user",
        licenceType: "SUBSCRIPTION_ANNUAL",
        termMonths: 12,
        isDefault: true,
        listPriceMinor: 0,
      },
    ],
  },
];
