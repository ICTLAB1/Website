/**
 * The sectors this business supplies.
 *
 * Sixteen, as supplied. Two of them — Infrastructure & Construction and
 * Architecture, Engineering & Construction — overlap substantially; both are
 * kept because both were asked for, and they are written to divide the ground
 * rather than repeat it: the first is the organisation that builds and runs
 * infrastructure, the second is the practice that designs it. If that division
 * turns out not to match how enquiries actually arrive, merge them.
 *
 * Every `solutions` entry names something the catalogue carries or a service
 * that exists in the Service table. Nothing here describes an outcome, a
 * customer or a capability that would have to be evidenced — a sector is not a
 * reference.
 */
export type IndustrySeed = {
  slug: string;
  name: string;
  summary: string;
  description: string;
  icon: string;
  solutions: string[];
  /** Slugs the sector's page links to. Anything that stops resolving is dropped. */
  brandSlugs: string[];
  serviceSlugs: string[];
  categorySlugs: string[];
  displayOrder: number;
};

export const industrySeeds: IndustrySeed[] = [
  {
    slug: "corporate-enterprise",
    name: "Corporate & Enterprise",
    summary:
      "Consolidated software licensing, commercial hardware procurement, cloud subscriptions and IT services for growing and established organisations.",
    description:
      "Most organisations of any size end up holding a dozen supplier relationships for what is really one problem: keeping people equipped and licensed. We put the licensing, the hardware and the renewals on one quotation and one purchase order, so finance reconciles one invoice and IT tracks one set of expiry dates.",
    icon: "business",
    solutions: [
      "Microsoft 365",
      "Adobe Creative Cloud",
      "Business laptops and desktops",
      "Endpoint protection",
      "IT procurement",
      "Licence management",
    ],
    brandSlugs: ["microsoft", "adobe", "hp", "lenovo", "dell", "bitdefender"],
    serviceSlugs: ["microsoft-365", "it-procurement", "licence-management", "endpoint-management"],
    categorySlugs: ["productivity-collaboration", "security-endpoint", "infrastructure-hardware", "document-workflow"],
    displayOrder: 10,
  },
  {
    slug: "it-technology",
    name: "IT & Technology",
    summary:
      "Developer and engineering workstations, cloud subscriptions, developer tooling and security licensing for technology teams.",
    description:
      "Technology companies buy differently: fewer seats, higher specification, and a licensing mix that changes as the product does. We quote workstation configurations against the workload rather than a catalogue tier, and keep subscription counts moving with headcount instead of resetting them once a year.",
    icon: "server",
    solutions: [
      "Developer workstations",
      "Microsoft licensing",
      "Adobe",
      "Autodesk",
      "Cloud subscriptions",
      "Cybersecurity services",
    ],
    brandSlugs: ["microsoft", "atlassian", "jetbrains", "red-hat", "vmware", "nvidia"],
    serviceSlugs: ["cloud", "azure", "cybersecurity", "it-procurement"],
    categorySlugs: ["workstations", "cloud-platforms", "operating-systems", "data-platform"],
    displayOrder: 20,
  },
  {
    slug: "manufacturing",
    name: "Manufacturing",
    summary:
      "Engineering workstations, design and simulation licensing, plant-floor hardware, backup and endpoint security.",
    description:
      "A manufacturing estate runs two very different fleets — the engineering seats that need certified graphics and the plant machines that need to survive the plant — and they are usually bought as though they were the same thing. We quote them separately and licence the design software properly against both.",
    icon: "construction",
    solutions: [
      "Engineering workstations",
      "Autodesk",
      "Business desktops",
      "Backup and disaster recovery",
      "Endpoint protection",
      "IT procurement",
    ],
    brandSlugs: ["autodesk", "dassault-systemes", "hp", "lenovo", "trend-micro", "synology"],
    serviceSlugs: ["backup-disaster-recovery", "cybersecurity", "it-procurement", "endpoint-management"],
    categorySlugs: ["engineering-cad", "workstations", "security-endpoint", "backup-recovery"],
    displayOrder: 30,
  },
  {
    slug: "infrastructure-construction",
    name: "Infrastructure & Construction",
    summary:
      "Site and office hardware, project collaboration licensing, construction management software and document workflow.",
    description:
      "Construction organisations buy for two places at once: an office that needs BIM seats and drawing storage, and a site that needs equipment which survives being on a site. Procurement usually has to run both through one budget and one approval chain, which is the shape a consolidated quotation is for.",
    icon: "construction",
    solutions: [
      "Autodesk Construction Cloud",
      "Business laptops",
      "Document workflow",
      "Cloud storage",
      "Endpoint protection",
      "IT procurement",
    ],
    brandSlugs: ["autodesk", "bentley-systems", "adobe", "dell", "hp", "dropbox"],
    serviceSlugs: ["it-procurement", "cloud", "backup-disaster-recovery", "licence-management"],
    categorySlugs: ["construction-management", "bim-collections", "document-workflow", "infrastructure-hardware"],
    displayOrder: 40,
  },
  {
    slug: "banking-financial-services",
    name: "Banking & Financial Services",
    summary:
      "Productivity licensing, endpoint and identity security, business hardware, and backup for regulated environments.",
    description:
      "Financial services buy under audit: what was purchased, when the licence entitlement started, who holds it and when it lapses are questions somebody will ask in writing. Purchases here are documented to be answerable — GST invoicing, dated entitlements and a licence register that survives an auditor.",
    icon: "finance",
    solutions: [
      "Microsoft 365",
      "Endpoint protection",
      "Identity and access",
      "Business hardware",
      "Backup and disaster recovery",
      "Software asset management",
    ],
    brandSlugs: ["microsoft", "bitdefender", "kaspersky", "dell", "hp", "synology"],
    serviceSlugs: ["cybersecurity", "backup-disaster-recovery", "software-asset-management", "endpoint-management"],
    categorySlugs: ["identity-access", "endpoint-protection", "productivity-collaboration", "backup-recovery"],
    displayOrder: 50,
  },
  {
    slug: "healthcare",
    name: "Healthcare",
    summary:
      "Clinical and administrative hardware, productivity licensing, endpoint security, backup and infrastructure.",
    description:
      "Healthcare estates mix machines that are never switched off with machines that move between rooms all day, and both hold data that cannot be lost. We quote the hardware against those two duty cycles and put the backup and endpoint licensing on the same order rather than a later one.",
    icon: "support",
    solutions: [
      "Business hardware",
      "Microsoft 365",
      "Endpoint protection",
      "Backup and disaster recovery",
      "Servers and storage",
      "IT helpdesk",
    ],
    brandSlugs: ["microsoft", "hp", "lenovo", "trend-micro", "synology", "vmware"],
    serviceSlugs: ["backup-disaster-recovery", "it-helpdesk", "cybersecurity", "endpoint-management"],
    categorySlugs: ["infrastructure-hardware", "security-endpoint", "backup-recovery", "productivity-collaboration"],
    displayOrder: 60,
  },
  {
    slug: "education",
    name: "Education",
    summary:
      "Academic licensing for Microsoft, Adobe and Autodesk, computer-lab hardware, and campus device management.",
    description:
      "Education pricing is its own programme with its own eligibility rules, and the difference between the academic and commercial price of the same product is large enough to be worth getting right. We quote on the academic terms where the institution qualifies and say plainly where it does not.",
    icon: "document",
    solutions: [
      "Microsoft academic licensing",
      "Adobe",
      "Autodesk",
      "Computer-lab desktops",
      "Commercial laptops",
      "Endpoint management",
    ],
    brandSlugs: ["microsoft", "adobe", "autodesk", "acer", "lenovo", "hp"],
    serviceSlugs: ["microsoft-365", "endpoint-management", "it-procurement", "licence-management"],
    categorySlugs: ["productivity-collaboration", "design-creative", "engineering-cad", "infrastructure-hardware"],
    displayOrder: 70,
  },
  {
    slug: "retail-distribution",
    name: "Retail & Distribution",
    summary:
      "Store and warehouse hardware, productivity licensing, endpoint security and cloud subscriptions across sites.",
    description:
      "Retail buys the same thing many times, in many places, and the administrative cost of that is usually larger than the price difference between suppliers. One quotation covering every site, and one renewal date to track, is most of the saving.",
    icon: "business",
    solutions: [
      "Business desktops and laptops",
      "Microsoft 365",
      "Endpoint protection",
      "Cloud subscriptions",
      "Hardware procurement",
      "Licence management",
    ],
    brandSlugs: ["microsoft", "acer", "lenovo", "hp", "bitdefender", "zoho"],
    serviceSlugs: ["it-procurement", "cloud", "endpoint-management", "licence-management"],
    categorySlugs: ["business-applications", "productivity-collaboration", "security-endpoint", "infrastructure-hardware"],
    displayOrder: 80,
  },
  {
    slug: "telecommunications",
    name: "Telecommunications",
    summary:
      "Operations and field hardware, server and storage infrastructure, security licensing and cloud subscriptions.",
    description:
      "Telecom operations run a large, dispersed fleet with a refresh cycle that never quite stops. Procurement here is less about a single purchase than about a supply relationship that can quote the same configuration again in eighteen months, which is what a line card is for.",
    icon: "network",
    solutions: [
      "Business hardware",
      "Servers and storage",
      "Microsoft licensing",
      "Cybersecurity services",
      "Cloud subscriptions",
      "IT procurement",
    ],
    brandSlugs: ["cisco", "dell", "hp", "microsoft", "fortinet", "vmware"],
    serviceSlugs: ["cybersecurity", "cloud", "it-procurement", "it-helpdesk"],
    categorySlugs: ["networking", "servers", "cloud-platforms", "security-endpoint"],
    displayOrder: 90,
  },
  {
    slug: "energy-utilities",
    name: "Energy & Utilities",
    summary:
      "Enterprise hardware, infrastructure, security licensing, backup and software licensing for distributed operations.",
    description:
      "Utilities operate estates that are geographically spread and operationally continuous, where a replacement is a site visit rather than a desk swap. Standardising the configuration and holding the entitlement centrally is what makes that estate manageable.",
    icon: "chart",
    solutions: [
      "Enterprise hardware",
      "Servers and storage",
      "Endpoint protection",
      "Backup and disaster recovery",
      "Software licensing",
      "IT procurement",
    ],
    brandSlugs: ["dell", "hp", "microsoft", "fortinet", "synology", "vmware"],
    serviceSlugs: ["backup-disaster-recovery", "cybersecurity", "it-procurement", "licence-management"],
    categorySlugs: ["servers", "storage", "security-endpoint", "operating-systems"],
    displayOrder: 100,
  },
  {
    slug: "aec",
    name: "Architecture, Engineering & Construction",
    summary:
      "Autodesk design and BIM licensing, certified workstations and professional graphics for design practices.",
    description:
      "Design practices are the case where the licence and the machine have to be bought together: an AEC Collection seat on an under-specified workstation is a seat that cannot be used. We quote the software against the workflow and the hardware against the software, on one document.",
    icon: "cad",
    solutions: [
      "AutoCAD",
      "Revit",
      "3ds Max",
      "Autodesk Inventor",
      "Mobile and desktop workstations",
      "Professional graphics",
    ],
    brandSlugs: ["autodesk", "sketchup", "bentley-systems", "hp", "lenovo", "nvidia"],
    serviceSlugs: ["it-procurement", "licence-management", "backup-disaster-recovery", "software-asset-management"],
    categorySlugs: ["cad-drafting", "bim-collections", "workstations", "construction-management"],
    displayOrder: 110,
  },
  {
    slug: "government-psu",
    name: "Government & PSU",
    summary:
      "Procurement through the Government e-Marketplace and direct tender, with enterprise software, hardware and support.",
    description:
      "Public procurement has its own route, its own documentation and its own timetable, and a supplier who is not set up for it becomes the reason a purchase slips a quarter. This business is a registered GeM seller and supplies through direct tender engagements as well.",
    icon: "shield",
    solutions: [
      "GeM procurement",
      "Enterprise software licensing",
      "Commercial hardware",
      "Licence management",
      "IT helpdesk",
      "IT procurement",
    ],
    brandSlugs: ["microsoft", "adobe", "hp", "lenovo", "acer", "kaspersky"],
    serviceSlugs: ["it-procurement", "licence-management", "it-helpdesk", "endpoint-management"],
    categorySlugs: ["productivity-collaboration", "infrastructure-hardware", "security-endpoint", "operating-systems"],
    displayOrder: 120,
  },
  {
    slug: "defence-aerospace",
    name: "Defence & Aerospace",
    summary:
      "Engineering workstations, design and simulation licensing, enterprise software and security for research and production environments.",
    description:
      "Defence and aerospace procurement combines a long specification cycle with a short delivery window, and a configuration agreed months earlier still has to be quotable on the day the order lands. Holding the line card and the entitlement history is most of what makes that possible.",
    icon: "shield",
    solutions: [
      "Engineering workstations",
      "Autodesk",
      "Enterprise software licensing",
      "Endpoint protection",
      "Servers and storage",
      "IT procurement",
    ],
    brandSlugs: ["autodesk", "dassault-systemes", "hp", "dell", "kaspersky", "nvidia"],
    serviceSlugs: ["cybersecurity", "it-procurement", "backup-disaster-recovery", "software-asset-management"],
    categorySlugs: ["engineering-cad", "workstations", "security-endpoint", "servers"],
    displayOrder: 130,
  },
  {
    slug: "transportation-logistics",
    name: "Transportation & Logistics",
    summary:
      "Depot, warehouse and mobile hardware, productivity licensing, cloud subscriptions and endpoint security.",
    description:
      "Logistics runs on equipment that moves and equipment that never does, and both are replaced on a schedule set by wear rather than by budget. A standing configuration and a known lead time matter more here than a one-off price.",
    icon: "storage",
    solutions: [
      "Business laptops and desktops",
      "Microsoft 365",
      "Cloud subscriptions",
      "Endpoint protection",
      "Hardware procurement",
      "Licence management",
    ],
    brandSlugs: ["microsoft", "lenovo", "acer", "hp", "bitdefender", "zoho"],
    serviceSlugs: ["cloud", "it-procurement", "endpoint-management", "licence-management"],
    categorySlugs: ["productivity-collaboration", "infrastructure-hardware", "security-endpoint", "cloud-platforms"],
    displayOrder: 140,
  },
  {
    slug: "professional-services",
    name: "Professional Services",
    summary:
      "Productivity and creative licensing, business laptops, cloud subscriptions and endpoint security for client-facing teams.",
    description:
      "Professional firms bill by the hour, which makes a laptop that is being replaced a cost measured in fee income rather than in hardware. Standardising the specification and holding spare entitlement is cheaper than the alternative.",
    icon: "workspace",
    solutions: [
      "Microsoft 365",
      "Adobe Acrobat",
      "Business laptops",
      "Cloud subscriptions",
      "Endpoint protection",
      "IT procurement",
    ],
    brandSlugs: ["microsoft", "adobe", "dropbox", "hp", "lenovo", "bitdefender"],
    serviceSlugs: ["microsoft-365", "cloud", "it-procurement", "endpoint-management"],
    categorySlugs: ["productivity-collaboration", "document-workflow", "security-endpoint", "infrastructure-hardware"],
    displayOrder: 150,
  },
  {
    slug: "media-creative",
    name: "Media & Creative Industries",
    summary:
      "Adobe Creative Cloud licensing, colour-accurate workstations, high-performance laptops and storage for production teams.",
    description:
      "Creative production is the one place where storage is a first-class purchase rather than an afterthought, and where the difference between a workstation that renders overnight and one that renders over lunch is a business decision. Both are quoted here against the actual workload.",
    icon: "media",
    solutions: [
      "Adobe Creative Cloud",
      "Professional workstations",
      "High-performance laptops",
      "Storage",
      "Microsoft 365",
      "Professional graphics",
    ],
    brandSlugs: ["adobe", "corel", "hp", "nvidia", "synology", "microsoft"],
    serviceSlugs: ["it-procurement", "backup-disaster-recovery", "licence-management", "cloud"],
    categorySlugs: ["design-creative", "media-entertainment", "workstations", "storage"],
    displayOrder: 160,
  },
];
