/**
 * Brand catalogue.
 *
 * Copy here is written for this application. Brand names and product names are
 * used descriptively to identify the software being resold; no publisher marketing
 * text, imagery or logo asset is reproduced.
 */
export type BrandSeed = {
  slug: string;
  name: string;
  tagline: string;
  summary: string;
  description: string;
  logoText: string;
  accentColor: string;
  displayOrder: number;
  featured: boolean;
};

export const brands: BrandSeed[] = [
  {
    slug: "microsoft",
    name: "Microsoft",
    tagline: "Productivity, cloud and data platform licensing",
    summary:
      "Microsoft 365, Office, Windows, Windows Server, SQL Server, Dynamics 365 and Azure, supplied under the licensing programme that fits how your organisation buys.",
    description:
      "Microsoft licensing spans several purchasing programmes, and the right one depends on your organisation's size, contract appetite and how quickly your seat count changes. We supply Microsoft 365 and Office subscriptions, Windows and Windows Server, SQL Server, Dynamics 365 and Azure consumption, and we advise on whether a Cloud Solution Provider subscription, a volume licensing agreement or a perpetual purchase gives you the better commercial position over a three-year horizon.\n\nOur team handles tenant provisioning, licence assignment, mid-term seat changes and renewal planning, so the licensing you buy stays aligned with the people who actually need it.",
    logoText: "Microsoft",
    accentColor: "#0f6cbd",
    displayOrder: 10,
    featured: true,
  },
  {
    slug: "adobe",
    name: "Adobe",
    tagline: "Creative Cloud and document workflows for teams",
    summary:
      "Creative Cloud for teams and enterprise, Acrobat, and the individual creative applications, with centralised administration and deployment support.",
    description:
      "Adobe's business licensing separates named-user entitlements from the admin console that manages them, which is what makes it workable at scale: seats can be reassigned when people change roles, and deployment can be packaged rather than installed by hand.\n\nWe supply Creative Cloud for teams and enterprise, Acrobat for document workflows, and single applications where a full suite is not warranted. We help you decide which of those is genuinely cheaper for your mix of full-time designers, occasional users and reviewers who only need to comment on a PDF.",
    logoText: "Adobe",
    accentColor: "#e0342c",
    displayOrder: 20,
    featured: true,
  },
  {
    slug: "autodesk",
    name: "Autodesk",
    tagline: "Design, engineering and construction software",
    summary:
      "AutoCAD, Revit, the AEC and Product Design collections, Maya, Fusion and Autodesk Construction Cloud for design-led organisations.",
    description:
      "Autodesk software underpins the drawing, modelling and coordination work in architecture, engineering, construction and manufacturing. Its licensing has moved decisively to named-user subscriptions, which changes how teams should think about seat allocation: entitlements now follow people rather than machines.\n\nWe supply single-product subscriptions and the industry collections, and we help teams work out whether a collection is better value than three individual products once you count the people who dip into a second tool a few weeks a year.",
    logoText: "Autodesk",
    accentColor: "#0696d7",
    displayOrder: 30,
    featured: true,
  },
  {
    slug: "zoho",
    name: "Zoho",
    tagline: "Business applications for sales, finance and support",
    summary:
      "Zoho CRM, Books, Desk, Workplace, Mail and the Zoho One bundle, with implementation and data migration support.",
    description:
      "Zoho's appeal for mid-sized organisations is breadth at a predictable per-user cost: a single publisher covering CRM, accounting, service desk and collaboration, with the applications sharing a customer record rather than being stitched together after the fact.\n\nWe supply Zoho licensing and, just as importantly, the implementation work around it — data migration from an incumbent system, field mapping, workflow configuration and user onboarding — because a business application that is bought but not adopted returns nothing.",
    logoText: "Zoho",
    accentColor: "#e42527",
    displayOrder: 40,
    featured: true,
  },
  {
    slug: "sketchup",
    name: "SketchUp",
    tagline: "3D modelling for architecture and interiors",
    summary:
      "SketchUp Pro and Studio subscriptions for architectural visualisation, interior design and fabrication workflows.",
    description:
      "SketchUp occupies a useful position between sketching and full BIM: fast enough for early-stage massing and client-facing visuals, precise enough to hand off to a documentation tool later.\n\nWe supply Pro and Studio subscriptions for practices that model in SketchUp and coordinate elsewhere, along with guidance on extension licensing and shared file workflows across a studio.",
    logoText: "SketchUp",
    accentColor: "#c8102e",
    displayOrder: 50,
    featured: true,
  },
  {
    slug: "corel",
    name: "Corel",
    tagline: "Graphics and office productivity software",
    summary:
      "CorelDRAW Graphics Suite and WordPerfect Office, available as perpetual licences and subscriptions for print, signage and public-sector use.",
    description:
      "Corel remains the practical choice in workflows built around vector output for print, signage and apparel, where existing artwork libraries and operator familiarity carry real switching cost.\n\nIt is also one of the few remaining mainstream publishers offering genuine perpetual licensing, which matters to organisations with capital rather than operating budgets. We supply both models and can price them side by side across a realistic replacement cycle.",
    logoText: "Corel",
    accentColor: "#0a7c3f",
    displayOrder: 60,
    featured: true,
  },
  {
    slug: "hpe",
    name: "HPE",
    tagline: "Servers, storage and networking infrastructure",
    summary:
      "Hewlett Packard Enterprise compute, storage and networking, configured to workload with support contracts sized to your recovery objectives.",
    description:
      "Infrastructure decisions are harder to reverse than software ones, so the configuration matters more than the headline price. We quote HPE compute, storage and networking against the workload you are actually running — not a generic bill of materials.\n\nQuotes include the support tier and term, because a server without a matching response-time contract is a risk that only becomes visible at the worst moment.",
    logoText: "HPE",
    accentColor: "#01a982",
    displayOrder: 70,
    featured: true,
  },
  {
    slug: "dell",
    name: "Dell Technologies",
    tagline: "Enterprise compute, storage and workstations",
    summary:
      "Dell PowerEdge servers, storage arrays, networking and Precision workstations for design and engineering teams.",
    description:
      "Dell's enterprise range covers the ground from rack compute to the workstations that sit under a CAD or video editing workload, which makes it straightforward to standardise a mixed estate on one manufacturer and one support relationship.\n\nWe size workstations against the software they will run — a Revit model and a Premiere Pro timeline stress very different parts of a machine — and quote server and storage configurations with the support terms attached.",
    logoText: "Dell",
    accentColor: "#0076ce",
    displayOrder: 80,
    featured: true,
  },

  /*
   * Brands supplied on quotation.
   *
   * Listed with no products beneath them, deliberately. A brand page that says
   * what the publisher makes and invites an enquiry is honest; one padded with
   * invented SKUs and guessed prices is not, and there is no price list for
   * these yet. As each one arrives it is imported the way the Microsoft lists
   * were, and the products appear under the brand already here.
   */
  {
    slug: "vmware",
    name: "VMware",
    tagline: "Virtualisation and private cloud",
    summary:
      "vSphere, vSAN and the surrounding management tools for virtualised and private-cloud estates.",
    description:
      "VMware licensing is quoted rather than listed: the right programme, edition and term depend on how your organisation buys and how quickly your seat count moves.\n\nSend us the requirement — a product name, a seat count, or the problem you are solving — and we will return a written quotation with the licence terms and the GST position stated on it.",
    logoText: "VMware",
    accentColor: "#607078",
    displayOrder: 100,
    featured: false,
  },
  {
    slug: "red-hat",
    name: "Red Hat",
    tagline: "Enterprise Linux and open-source platforms",
    summary:
      "Red Hat Enterprise Linux, OpenShift and the middleware and automation tooling around them.",
    description:
      "Red Hat licensing is quoted rather than listed: the right programme, edition and term depend on how your organisation buys and how quickly your seat count moves.\n\nSend us the requirement — a product name, a seat count, or the problem you are solving — and we will return a written quotation with the licence terms and the GST position stated on it.",
    logoText: "Red Hat",
    accentColor: "#ee0000",
    displayOrder: 110,
    featured: false,
  },
  {
    slug: "oracle",
    name: "Oracle",
    tagline: "Database, middleware and business applications",
    summary:
      "Oracle Database, middleware and the Fusion application suite, licensed by processor or by named user.",
    description:
      "Oracle licensing is quoted rather than listed: the right programme, edition and term depend on how your organisation buys and how quickly your seat count moves.\n\nSend us the requirement — a product name, a seat count, or the problem you are solving — and we will return a written quotation with the licence terms and the GST position stated on it.",
    logoText: "Oracle",
    accentColor: "#c74634",
    displayOrder: 120,
    featured: false,
  },
  {
    slug: "ibm",
    name: "IBM",
    tagline: "Enterprise software and infrastructure",
    summary:
      "IBM software across data, automation and security, and the infrastructure it runs on.",
    description:
      "IBM licensing is quoted rather than listed: the right programme, edition and term depend on how your organisation buys and how quickly your seat count moves.\n\nSend us the requirement — a product name, a seat count, or the problem you are solving — and we will return a written quotation with the licence terms and the GST position stated on it.",
    logoText: "IBM",
    accentColor: "#0f62fe",
    displayOrder: 130,
    featured: false,
  },
  {
    slug: "sap",
    name: "SAP",
    tagline: "Enterprise resource planning",
    summary:
      "SAP business applications, licensed by user type and deployment model.",
    description:
      "SAP licensing is quoted rather than listed: the right programme, edition and term depend on how your organisation buys and how quickly your seat count moves.\n\nSend us the requirement — a product name, a seat count, or the problem you are solving — and we will return a written quotation with the licence terms and the GST position stated on it.",
    logoText: "SAP",
    accentColor: "#0faaff",
    displayOrder: 140,
    featured: false,
  },
  {
    slug: "salesforce",
    name: "Salesforce",
    tagline: "CRM and customer platforms",
    summary:
      "Sales, Service and Marketing Cloud, licensed per user per edition.",
    description:
      "Salesforce licensing is quoted rather than listed: the right programme, edition and term depend on how your organisation buys and how quickly your seat count moves.\n\nSend us the requirement — a product name, a seat count, or the problem you are solving — and we will return a written quotation with the licence terms and the GST position stated on it.",
    logoText: "Salesforce",
    accentColor: "#00a1e0",
    displayOrder: 150,
    featured: false,
  },
  {
    slug: "atlassian",
    name: "Atlassian",
    tagline: "Software delivery and collaboration",
    summary:
      "Jira, Confluence and the surrounding tooling, cloud or data centre.",
    description:
      "Atlassian licensing is quoted rather than listed: the right programme, edition and term depend on how your organisation buys and how quickly your seat count moves.\n\nSend us the requirement — a product name, a seat count, or the problem you are solving — and we will return a written quotation with the licence terms and the GST position stated on it.",
    logoText: "Atlassian",
    accentColor: "#0052cc",
    displayOrder: 160,
    featured: false,
  },
  {
    slug: "jetbrains",
    name: "JetBrains",
    tagline: "Developer tools",
    summary:
      "IntelliJ IDEA, the wider IDE range and the All Products Pack, per user or per organisation.",
    description:
      "JetBrains licensing is quoted rather than listed: the right programme, edition and term depend on how your organisation buys and how quickly your seat count moves.\n\nSend us the requirement — a product name, a seat count, or the problem you are solving — and we will return a written quotation with the licence terms and the GST position stated on it.",
    logoText: "JetBrains",
    accentColor: "#000000",
    displayOrder: 170,
    featured: false,
  },
  {
    slug: "dropbox",
    name: "Dropbox",
    tagline: "File storage and sharing",
    summary:
      "Dropbox Business and its administration, retention and sharing controls.",
    description:
      "Dropbox licensing is quoted rather than listed: the right programme, edition and term depend on how your organisation buys and how quickly your seat count moves.\n\nSend us the requirement — a product name, a seat count, or the problem you are solving — and we will return a written quotation with the licence terms and the GST position stated on it.",
    logoText: "Dropbox",
    accentColor: "#0061ff",
    displayOrder: 180,
    featured: false,
  },
  {
    slug: "google-workspace",
    name: "Google Workspace",
    tagline: "Email, documents and collaboration",
    summary:
      "Gmail, Drive, Meet and the Workspace administration console, by edition and seat count.",
    description:
      "Google Workspace licensing is quoted rather than listed: the right programme, edition and term depend on how your organisation buys and how quickly your seat count moves.\n\nSend us the requirement — a product name, a seat count, or the problem you are solving — and we will return a written quotation with the licence terms and the GST position stated on it.",
    logoText: "Google Workspace",
    accentColor: "#1a73e8",
    displayOrder: 190,
    featured: false,
  },
  {
    slug: "mcafee",
    name: "McAfee",
    tagline: "Endpoint and data protection",
    summary:
      "Endpoint protection and data security for managed estates.",
    description:
      "McAfee licensing is quoted rather than listed: the right programme, edition and term depend on how your organisation buys and how quickly your seat count moves.\n\nSend us the requirement — a product name, a seat count, or the problem you are solving — and we will return a written quotation with the licence terms and the GST position stated on it.",
    logoText: "McAfee",
    accentColor: "#c01818",
    displayOrder: 200,
    featured: false,
  },
  {
    slug: "kaspersky",
    name: "Kaspersky",
    tagline: "Endpoint security",
    summary:
      "Endpoint, server and gateway protection with central management.",
    description:
      "Kaspersky licensing is quoted rather than listed: the right programme, edition and term depend on how your organisation buys and how quickly your seat count moves.\n\nSend us the requirement — a product name, a seat count, or the problem you are solving — and we will return a written quotation with the licence terms and the GST position stated on it.",
    logoText: "Kaspersky",
    accentColor: "#006d5c",
    displayOrder: 210,
    featured: false,
  },
  {
    slug: "bitdefender",
    name: "Bitdefender",
    tagline: "Endpoint and cloud workload security",
    summary:
      "GravityZone endpoint protection and cloud workload security.",
    description:
      "Bitdefender licensing is quoted rather than listed: the right programme, edition and term depend on how your organisation buys and how quickly your seat count moves.\n\nSend us the requirement — a product name, a seat count, or the problem you are solving — and we will return a written quotation with the licence terms and the GST position stated on it.",
    logoText: "Bitdefender",
    accentColor: "#ed1c24",
    displayOrder: 220,
    featured: false,
  },
  {
    slug: "eset",
    name: "ESET",
    tagline: "Endpoint protection and encryption",
    summary:
      "Endpoint protection, encryption and the management console around them.",
    description:
      "ESET licensing is quoted rather than listed: the right programme, edition and term depend on how your organisation buys and how quickly your seat count moves.\n\nSend us the requirement — a product name, a seat count, or the problem you are solving — and we will return a written quotation with the licence terms and the GST position stated on it.",
    logoText: "ESET",
    accentColor: "#00a4e4",
    displayOrder: 230,
    featured: false,
  },
  {
    slug: "trend-micro",
    name: "Trend Micro",
    tagline: "Hybrid cloud and endpoint security",
    summary:
      "Endpoint, server and cloud workload protection.",
    description:
      "Trend Micro licensing is quoted rather than listed: the right programme, edition and term depend on how your organisation buys and how quickly your seat count moves.\n\nSend us the requirement — a product name, a seat count, or the problem you are solving — and we will return a written quotation with the licence terms and the GST position stated on it.",
    logoText: "Trend Micro",
    accentColor: "#d71920",
    displayOrder: 240,
    featured: false,
  },
  {
    slug: "sophos",
    name: "Sophos",
    tagline: "Endpoint, firewall and managed detection",
    summary:
      "Intercept X endpoint protection, firewalls and managed detection and response.",
    description:
      "Sophos licensing is quoted rather than listed: the right programme, edition and term depend on how your organisation buys and how quickly your seat count moves.\n\nSend us the requirement — a product name, a seat count, or the problem you are solving — and we will return a written quotation with the licence terms and the GST position stated on it.",
    logoText: "Sophos",
    accentColor: "#0080c3",
    displayOrder: 250,
    featured: false,
  },
  {
    slug: "fortinet",
    name: "Fortinet",
    tagline: "Network security",
    summary:
      "FortiGate firewalls and the Security Fabric of products around them.",
    description:
      "Fortinet licensing is quoted rather than listed: the right programme, edition and term depend on how your organisation buys and how quickly your seat count moves.\n\nSend us the requirement — a product name, a seat count, or the problem you are solving — and we will return a written quotation with the licence terms and the GST position stated on it.",
    logoText: "Fortinet",
    accentColor: "#da291c",
    displayOrder: 260,
    featured: false,
  },
  {
    slug: "cisco",
    name: "Cisco",
    tagline: "Networking and network security",
    summary:
      "Switching, routing, wireless and the security software licensed alongside them.",
    description:
      "Cisco licensing is quoted rather than listed: the right programme, edition and term depend on how your organisation buys and how quickly your seat count moves.\n\nSend us the requirement — a product name, a seat count, or the problem you are solving — and we will return a written quotation with the licence terms and the GST position stated on it.",
    logoText: "Cisco",
    accentColor: "#1ba0d7",
    displayOrder: 270,
    featured: false,
  },
  {
    slug: "watchguard",
    name: "WatchGuard",
    tagline: "Firewalls and multi-factor authentication",
    summary:
      "Firebox appliances, subscription security services and AuthPoint.",
    description:
      "WatchGuard licensing is quoted rather than listed: the right programme, edition and term depend on how your organisation buys and how quickly your seat count moves.\n\nSend us the requirement — a product name, a seat count, or the problem you are solving — and we will return a written quotation with the licence terms and the GST position stated on it.",
    logoText: "WatchGuard",
    accentColor: "#d81e05",
    displayOrder: 280,
    featured: false,
  },
  {
    slug: "crowdstrike",
    name: "CrowdStrike",
    tagline: "Endpoint detection and response",
    summary:
      "Falcon endpoint detection and response, by module and endpoint count.",
    description:
      "CrowdStrike licensing is quoted rather than listed: the right programme, edition and term depend on how your organisation buys and how quickly your seat count moves.\n\nSend us the requirement — a product name, a seat count, or the problem you are solving — and we will return a written quotation with the licence terms and the GST position stated on it.",
    logoText: "CrowdStrike",
    accentColor: "#e01f3d",
    displayOrder: 290,
    featured: false,
  },
  {
    slug: "lenovo",
    name: "Lenovo",
    tagline: "Servers, workstations and laptops",
    summary:
      "ThinkSystem servers, ThinkStation workstations and the ThinkPad range.",
    description:
      "Lenovo licensing is quoted rather than listed: the right programme, edition and term depend on how your organisation buys and how quickly your seat count moves.\n\nSend us the requirement — a product name, a seat count, or the problem you are solving — and we will return a written quotation with the licence terms and the GST position stated on it.",
    logoText: "Lenovo",
    accentColor: "#e2231a",
    displayOrder: 300,
    featured: false,
  },
  {
    slug: "hp",
    name: "HP",
    tagline: "Workstations, laptops and printing",
    summary:
      "Workstations, business laptops and printing hardware with matching support terms.",
    description:
      "HP licensing is quoted rather than listed: the right programme, edition and term depend on how your organisation buys and how quickly your seat count moves.\n\nSend us the requirement — a product name, a seat count, or the problem you are solving — and we will return a written quotation with the licence terms and the GST position stated on it.",
    logoText: "HP",
    accentColor: "#0096d6",
    displayOrder: 310,
    featured: false,
  },
  {
    slug: "acer",
    name: "Acer",
    tagline: "Laptops, desktops and displays",
    summary:
      "Business laptops, desktops and displays.",
    description:
      "Acer licensing is quoted rather than listed: the right programme, edition and term depend on how your organisation buys and how quickly your seat count moves.\n\nSend us the requirement — a product name, a seat count, or the problem you are solving — and we will return a written quotation with the licence terms and the GST position stated on it.",
    logoText: "Acer",
    accentColor: "#83b81a",
    displayOrder: 320,
    featured: false,
  },
  {
    slug: "asus",
    name: "ASUS",
    tagline: "Laptops, workstations and components",
    summary:
      "Business laptops, workstations and component-level hardware.",
    description:
      "ASUS licensing is quoted rather than listed: the right programme, edition and term depend on how your organisation buys and how quickly your seat count moves.\n\nSend us the requirement — a product name, a seat count, or the problem you are solving — and we will return a written quotation with the licence terms and the GST position stated on it.",
    logoText: "ASUS",
    accentColor: "#00539b",
    displayOrder: 330,
    featured: false,
  },
  {
    slug: "intel",
    name: "Intel",
    tagline: "Processors and platform technology",
    summary:
      "Processor and platform technology, specified as part of a system build.",
    description:
      "Intel licensing is quoted rather than listed: the right programme, edition and term depend on how your organisation buys and how quickly your seat count moves.\n\nSend us the requirement — a product name, a seat count, or the problem you are solving — and we will return a written quotation with the licence terms and the GST position stated on it.",
    logoText: "Intel",
    accentColor: "#0068b5",
    displayOrder: 340,
    featured: false,
  },
  {
    slug: "amd",
    name: "AMD",
    tagline: "Processors and accelerators",
    summary:
      "EPYC, Ryzen and Radeon Pro, specified as part of a system build.",
    description:
      "AMD licensing is quoted rather than listed: the right programme, edition and term depend on how your organisation buys and how quickly your seat count moves.\n\nSend us the requirement — a product name, a seat count, or the problem you are solving — and we will return a written quotation with the licence terms and the GST position stated on it.",
    logoText: "AMD",
    accentColor: "#ed1c24",
    displayOrder: 350,
    featured: false,
  },
  {
    slug: "nvidia",
    name: "NVIDIA",
    tagline: "GPUs and accelerated computing",
    summary:
      "RTX professional GPUs and data-centre accelerators for design, simulation and AI workloads.",
    description:
      "NVIDIA licensing is quoted rather than listed: the right programme, edition and term depend on how your organisation buys and how quickly your seat count moves.\n\nSend us the requirement — a product name, a seat count, or the problem you are solving — and we will return a written quotation with the licence terms and the GST position stated on it.",
    logoText: "NVIDIA",
    accentColor: "#76b900",
    displayOrder: 360,
    featured: false,
  },
  {
    slug: "synology",
    name: "Synology",
    tagline: "Network-attached storage and backup",
    summary:
      "NAS appliances and the backup and file services software on them.",
    description:
      "Synology licensing is quoted rather than listed: the right programme, edition and term depend on how your organisation buys and how quickly your seat count moves.\n\nSend us the requirement — a product name, a seat count, or the problem you are solving — and we will return a written quotation with the licence terms and the GST position stated on it.",
    logoText: "Synology",
    accentColor: "#5b6d80",
    displayOrder: 370,
    featured: false,
  },
  {
    slug: "apc",
    name: "APC",
    tagline: "Power protection",
    summary:
      "Uninterruptible power supplies, rack power distribution and management software.",
    description:
      "APC licensing is quoted rather than listed: the right programme, edition and term depend on how your organisation buys and how quickly your seat count moves.\n\nSend us the requirement — a product name, a seat count, or the problem you are solving — and we will return a written quotation with the licence terms and the GST position stated on it.",
    logoText: "APC",
    accentColor: "#009639",
    displayOrder: 380,
    featured: false,
  },
  {
    slug: "logitech",
    name: "Logitech",
    tagline: "Meeting room and desktop peripherals",
    summary:
      "Video conferencing hardware for meeting rooms, and desktop peripherals.",
    description:
      "Logitech licensing is quoted rather than listed: the right programme, edition and term depend on how your organisation buys and how quickly your seat count moves.\n\nSend us the requirement — a product name, a seat count, or the problem you are solving — and we will return a written quotation with the licence terms and the GST position stated on it.",
    logoText: "Logitech",
    accentColor: "#00b8fc",
    displayOrder: 390,
    featured: false,
  },
  {
    slug: "bentley-systems",
    name: "Bentley Systems",
    tagline: "Infrastructure engineering software",
    summary:
      "MicroStation, OpenRoads and the infrastructure engineering range.",
    description:
      "Bentley Systems licensing is quoted rather than listed: the right programme, edition and term depend on how your organisation buys and how quickly your seat count moves.\n\nSend us the requirement — a product name, a seat count, or the problem you are solving — and we will return a written quotation with the licence terms and the GST position stated on it.",
    logoText: "Bentley Systems",
    accentColor: "#00539f",
    displayOrder: 400,
    featured: false,
  },
  {
    slug: "dassault-systemes",
    name: "Dassault Systèmes",
    tagline: "Product design and simulation",
    summary:
      "SOLIDWORKS, CATIA and the 3DEXPERIENCE platform for design and simulation.",
    description:
      "Dassault Systèmes licensing is quoted rather than listed: the right programme, edition and term depend on how your organisation buys and how quickly your seat count moves.\n\nSend us the requirement — a product name, a seat count, or the problem you are solving — and we will return a written quotation with the licence terms and the GST position stated on it.",
    logoText: "Dassault Systèmes",
    accentColor: "#005386",
    displayOrder: 410,
    featured: false,
  },
];
