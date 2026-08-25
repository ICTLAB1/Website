/**
 * Brand catalogue.
 *
 * Copy here is written for this application. Brand names and product names are
 * used descriptively to identify the software being resold; no publisher
 * marketing text is reproduced.
 *
 * Logos are a separate question, answered in `public/brands/README.md`. Where
 * this repository holds a publisher's mark, the brand points at it; where it
 * does not, the brand keeps a lettered wordmark. Approximating a logo is not
 * one of the options.
 */
export type BrandSeed = {
  slug: string;
  name: string;
  tagline: string;
  summary: string;
  description: string;
  logoText: string;
  /**
   * A file in `public/brands/`, or null for the lettered wordmark.
   *
   * Only set where this repository actually holds the publisher's artwork.
   * See `public/brands/README.md` — a brand with no file keeps the wordmark,
   * which is the intended fallback rather than a gap to be filled with
   * something approximate.
   */
  logoUrl?: string;
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
    logoUrl: "/brands/microsoft.png",
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
    logoUrl: "/brands/adobe.png",
    accentColor: "#e0342c",
    displayOrder: 20,
    featured: true,
  },
  {
    slug: "autodesk",
    logoUrl: "/brands/autodesk.svg",
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
    logoUrl: "/brands/zoho.svg",
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
    logoUrl: "/brands/sketchup.svg",
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
    logoUrl: "/brands/dell.svg",
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
    logoUrl: "/brands/vmware.svg",
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
    logoUrl: "/brands/red-hat.svg",
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
    logoUrl: "/brands/sap.svg",
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
    logoUrl: "/brands/atlassian.svg",
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
    logoUrl: "/brands/jetbrains.svg",
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
    logoUrl: "/brands/dropbox.svg",
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
    logoUrl: "/brands/mcafee.svg",
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
    logoUrl: "/brands/kaspersky.svg",
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
    logoUrl: "/brands/bitdefender.svg",
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
    logoUrl: "/brands/trend-micro.svg",
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
    logoUrl: "/brands/fortinet.svg",
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
    logoUrl: "/brands/cisco.svg",
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
    logoUrl: "/brands/lenovo.png",
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
    logoUrl: "/brands/hp.png",
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
    logoUrl: "/brands/acer.png",
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
    logoUrl: "/brands/asus.svg",
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
    logoUrl: "/brands/intel.svg",
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
    logoUrl: "/brands/amd.svg",
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
    logoUrl: "/brands/nvidia.svg",
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
    logoUrl: "/brands/synology.svg",
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
    logoUrl: "/brands/bentley-systems.svg",
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
    logoUrl: "/brands/dassault-systemes.svg",
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
  /*
   * ── added August 2026 ────────────────────────────────────────────────────
   *
   * A second pass over the line card. Everything below is a description of
   * what the company makes and how its products are bought; none of it is a
   * statement about a relationship with any of them. Partner designations live
   * in their own columns and appear only when somebody has confirmed one — see
   * the `Brand` model — and no entry here fills any of those in.
   *
   * None carries artwork, because this repository holds none for them. Each
   * shows the lettered wordmark, which is the intended fallback rather than a
   * gap to be filled with something approximate.
   */
  {
    slug: "quick-heal",
    name: "Quick Heal",
    tagline: "Endpoint security, developed in India",
    summary:
      "Quick Heal endpoint protection and the Seqrite business range — endpoint, server and mobile security, licensed by seat and by term.",
    description:
      "Quick Heal Technologies is an Indian security company whose business range is sold under the Seqrite name: endpoint protection, endpoint detection and response, server security, data loss prevention and mobile device management. Licences run by device and by term, so sizing comes down to how many endpoints and for how long.\n\nSend us the requirement — a product name, a seat count, or the problem you are solving — and we will return a written quotation with the licence terms and the GST position stated on it.",
    logoText: "Quick Heal",
    accentColor: "#c1272d",
    displayOrder: 420,
    featured: false,
  },
  {
    slug: "sonicwall",
    name: "SonicWall",
    tagline: "Firewalls and secure remote access",
    summary:
      "Next-generation firewalls, secure mobile access and the security subscriptions that run on them.",
    description:
      "A SonicWall firewall is bought as an appliance plus a security subscription, and the subscription is the part that expires: gateway antivirus, intrusion prevention, content filtering and support each run on their own term. A renewal quote is therefore a list of services, not a single line.\n\nSend us the requirement — a product name, a seat count, or the problem you are solving — and we will return a written quotation with the licence terms and the GST position stated on it.",
    logoText: "SonicWall",
    accentColor: "#d15900",
    displayOrder: 430,
    featured: false,
  },
  {
    slug: "acronis",
    name: "Acronis",
    tagline: "Backup, disaster recovery and endpoint protection",
    summary:
      "Cyber Protect backup and recovery for workstations, servers and virtual machines, licensed by workload and by storage.",
    description:
      "Acronis licensing counts two things: the workloads being protected — a workstation, a server, a virtual host — and the cloud storage the backups land in. Getting a quotation right means knowing both, because a licence that covers the machines and not the space they need protects nothing.\n\nSend us the requirement — a product name, a seat count, or the problem you are solving — and we will return a written quotation with the licence terms and the GST position stated on it.",
    logoText: "Acronis",
    accentColor: "#0064b7",
    displayOrder: 440,
    featured: false,
  },
  {
    slug: "check-point",
    name: "Check Point",
    tagline: "Network, cloud and endpoint security",
    summary:
      "Quantum network security, Harmony endpoint and email protection, and CloudGuard for cloud workloads.",
    description:
      "Check Point separates its range by where the protection sits: Quantum at the network edge, Harmony on endpoints and in mailboxes, CloudGuard around cloud workloads. Each is licensed on its own basis — by gateway, by user or by workload — so the shape of a quotation follows the shape of the estate.\n\nSend us the requirement — a product name, a seat count, or the problem you are solving — and we will return a written quotation with the licence terms and the GST position stated on it.",
    logoText: "Check Point",
    accentColor: "#a4128a",
    displayOrder: 450,
    featured: false,
  },
  {
    slug: "palo-alto-networks",
    name: "Palo Alto Networks",
    tagline: "Next-generation firewalls and cloud security",
    summary:
      "PA-Series firewalls, Prisma cloud security and Cortex detection and response.",
    description:
      "A Palo Alto Networks firewall is sized on throughput with the security services subscribed separately, and Prisma and Cortex are licensed on their own terms again. The sizing question is what the appliance has to inspect, not how many people sit behind it.\n\nSend us the requirement — a product name, a seat count, or the problem you are solving — and we will return a written quotation with the licence terms and the GST position stated on it.",
    logoText: "Palo Alto Networks",
    accentColor: "#d1451b",
    displayOrder: 460,
    featured: false,
  },
  {
    slug: "tally",
    name: "Tally Solutions",
    tagline: "Accounting, inventory and statutory compliance",
    summary:
      "TallyPrime for accounting, inventory, payroll and GST filing, in single-user and multi-user editions.",
    description:
      "TallyPrime is sold as a perpetual licence with an annual subscription for updates, in a single-user edition and a multi-user one, and the difference between them is how many people post entries at the same time rather than how many people can open the file.\n\nSend us the requirement — a product name, a seat count, or the problem you are solving — and we will return a written quotation with the licence terms and the GST position stated on it.",
    logoText: "Tally Solutions",
    accentColor: "#1a5aa8",
    displayOrder: 470,
    featured: false,
  },
  {
    slug: "teamviewer",
    name: "TeamViewer",
    tagline: "Remote access and remote support",
    summary:
      "Remote access, attended and unattended support sessions, licensed by concurrent user and by managed device.",
    description:
      "TeamViewer licensing counts two things separately: how many of your people can be in a session at once, and how many machines they may reach without somebody sitting at the other end. A support desk and a fleet of unattended kiosks are different licences even at the same headcount.\n\nSend us the requirement — a product name, a seat count, or the problem you are solving — and we will return a written quotation with the licence terms and the GST position stated on it.",
    logoText: "TeamViewer",
    accentColor: "#0e6ec8",
    displayOrder: 480,
    featured: false,
  },
  {
    slug: "anydesk",
    name: "AnyDesk",
    tagline: "Remote desktop for support teams",
    summary:
      "Remote desktop access with unattended endpoints and session logging, licensed by concurrent session.",
    description:
      "AnyDesk is licensed on concurrent sessions and managed devices, which makes it straightforward to size for a support desk: the question is how many engineers are connected simultaneously at your busiest hour, not how many people are on the team.\n\nSend us the requirement — a product name, a seat count, or the problem you are solving — and we will return a written quotation with the licence terms and the GST position stated on it.",
    logoText: "AnyDesk",
    accentColor: "#c3273a",
    displayOrder: 490,
    featured: false,
  },
  {
    slug: "zoom",
    name: "Zoom",
    tagline: "Meetings, webinars and phone",
    summary:
      "Zoom Workplace meeting licences, webinar and large-meeting add-ons, and Zoom Phone.",
    description:
      "Zoom is licensed per host rather than per attendee, with webinars, large meetings and phone numbers added on top. Most organisations over-buy hosts because attendees are counted first — the licence follows the person who schedules, not the people who join.\n\nSend us the requirement — a product name, a seat count, or the problem you are solving — and we will return a written quotation with the licence terms and the GST position stated on it.",
    logoText: "Zoom",
    accentColor: "#0b5cff",
    displayOrder: 500,
    featured: false,
  },
  {
    slug: "foxit",
    name: "Foxit",
    tagline: "PDF editing and document workflow",
    summary:
      "PDF Editor and PDF Editor Pro for teams, with volume licensing and deployment for managed desktops.",
    description:
      "Foxit's PDF editor covers the work most organisations actually buy Acrobat for — editing, filling, signing, redacting and combining — and is licensed perpetually or by subscription, per named user, with volume terms above a threshold.\n\nSend us the requirement — a product name, a seat count, or the problem you are solving — and we will return a written quotation with the licence terms and the GST position stated on it.",
    logoText: "Foxit",
    accentColor: "#b8371f",
    displayOrder: 510,
    featured: false,
  },
  {
    slug: "mathworks",
    name: "MathWorks",
    tagline: "MATLAB, Simulink and the toolboxes",
    summary:
      "MATLAB and Simulink with their toolboxes, under academic, individual and concurrent network licensing.",
    description:
      "MATLAB is licensed by product and then by toolbox, which is where the cost sits: a base licence plus the four toolboxes a team actually uses is a different quotation from the same licence plus fourteen. Academic, standard and network-concurrent terms are priced separately again.\n\nSend us the requirement — a product name, a seat count, or the problem you are solving — and we will return a written quotation with the licence terms and the GST position stated on it.",
    logoText: "MathWorks",
    accentColor: "#a8410f",
    displayOrder: 520,
    featured: false,
  },
  {
    slug: "ansys",
    name: "Ansys",
    tagline: "Engineering simulation",
    summary:
      "Structural, fluid, thermal and electromagnetic simulation, under task-based and enterprise licensing.",
    description:
      "Ansys licensing separates the solver from the seats that drive it, and simulation licences are commonly shared across a team rather than assigned to individuals. Sizing is a question about concurrent solves and core counts, not headcount.\n\nSend us the requirement — a product name, a seat count, or the problem you are solving — and we will return a written quotation with the licence terms and the GST position stated on it.",
    logoText: "Ansys",
    accentColor: "#8a6100",
    displayOrder: 530,
    featured: false,
  },
  {
    slug: "ptc",
    name: "PTC",
    tagline: "CAD, PLM and service lifecycle software",
    summary:
      "Creo for design, Windchill for product data management, and the Onshape cloud CAD platform.",
    description:
      "PTC's design software is licensed per seat with extensions bought against it, while Windchill is licensed by the kind of access a person needs rather than by the fact that they need any. The two are usually quoted together and rarely sized the same way.\n\nSend us the requirement — a product name, a seat count, or the problem you are solving — and we will return a written quotation with the licence terms and the GST position stated on it.",
    logoText: "PTC",
    accentColor: "#4a5a66",
    displayOrder: 540,
    featured: false,
  },
  {
    slug: "veeam",
    name: "Veeam",
    tagline: "Backup and recovery for virtual, physical and cloud",
    summary:
      "Backup and replication for virtual machines, servers and Microsoft 365, licensed by instance and by workload.",
    description:
      "Veeam counts workloads: a virtual machine, a physical server, a Microsoft 365 mailbox. The licence follows what is being protected rather than the hardware underneath it, which is what makes a mid-term move from on-premises to cloud a re-count rather than a re-purchase.\n\nSend us the requirement — a product name, a seat count, or the problem you are solving — and we will return a written quotation with the licence terms and the GST position stated on it.",
    logoText: "Veeam",
    accentColor: "#00693c",
    displayOrder: 550,
    featured: false,
  },
  {
    slug: "citrix",
    name: "Citrix",
    tagline: "Virtual apps, desktops and delivery",
    summary:
      "Virtual Apps and Desktops with the delivery controllers and ADC appliances that publish them.",
    description:
      "Citrix is licensed per user or per concurrent connection, and the two answers diverge sharply once shift work is involved: a hundred people across three shifts is a hundred users or thirty-five concurrent connections, and the right basis is worth establishing before anything is quoted.\n\nSend us the requirement — a product name, a seat count, or the problem you are solving — and we will return a written quotation with the licence terms and the GST position stated on it.",
    logoText: "Citrix",
    accentColor: "#5a1a75",
    displayOrder: 560,
    featured: false,
  },
  {
    slug: "netgear",
    name: "NETGEAR",
    tagline: "Switching, wireless and small-business networking",
    summary:
      "Managed and smart switches, business access points and network storage for small and mid-sized sites.",
    description:
      "NETGEAR's business range covers the layer most offices actually run on: managed switches, PoE for cameras and access points, and wireless controllers small enough not to need a dedicated engineer. Specification usually turns on port count, PoE budget and how the switches will be managed.\n\nSend us the requirement — a model number, a quantity, or the problem you are solving — and we will return a written quotation with the specification, the warranty terms and the GST position stated on it.",
    logoText: "NETGEAR",
    accentColor: "#00558c",
    displayOrder: 570,
    featured: false,
  },
  {
    slug: "tp-link",
    name: "TP-Link",
    tagline: "Networking, wireless and Omada managed sites",
    summary:
      "Switches, routers and access points, including the Omada range for centrally managed multi-site networks.",
    description:
      "TP-Link's Omada line is the part most businesses buy: access points, switches and gateways that report to one controller, so a chain of branches is administered as a single network rather than as a dozen unrelated ones.\n\nSend us the requirement — a model number, a quantity, or the problem you are solving — and we will return a written quotation with the specification, the warranty terms and the GST position stated on it.",
    logoText: "TP-Link",
    accentColor: "#0d7a8a",
    displayOrder: 580,
    featured: false,
  },
  {
    slug: "seagate",
    name: "Seagate",
    tagline: "Enterprise drives and storage systems",
    summary:
      "Enterprise and surveillance hard drives, SSDs and the Exos storage systems built on them.",
    description:
      "Drives are specified by workload rather than by capacity alone: a surveillance drive, a NAS drive and an enterprise drive of the same size are rated for different duty cycles, and fitting the wrong one is a failure that arrives eighteen months later.\n\nSend us the requirement — a model number, a quantity, or the problem you are solving — and we will return a written quotation with the specification, the warranty terms and the GST position stated on it.",
    logoText: "Seagate",
    accentColor: "#3c8a2e",
    displayOrder: 590,
    featured: false,
  },
  {
    slug: "western-digital",
    name: "Western Digital",
    tagline: "Drives, SSDs and data centre storage",
    summary:
      "WD and SanDisk drives and SSDs, from workstation storage to data centre platforms.",
    description:
      "Western Digital covers both ends of the same requirement — the SSD in a workstation and the platform behind a data centre — and, as with any drive, the specification that matters is the rated workload rather than the number on the label.\n\nSend us the requirement — a model number, a quantity, or the problem you are solving — and we will return a written quotation with the specification, the warranty terms and the GST position stated on it.",
    logoText: "Western Digital",
    accentColor: "#0057a8",
    displayOrder: 600,
    featured: false,
  },
  {
    slug: "samsung",
    name: "Samsung",
    tagline: "Displays, SSDs and business devices",
    summary:
      "Business monitors, professional displays, SSDs and memory for desktops, workstations and servers.",
    description:
      "Samsung's business range spans the desk and the machine under it: monitors and large-format displays, and the SSDs and memory that go into workstations and servers. Panel specification — size, resolution, refresh, and whether it is rated for continuous operation — is what separates an office monitor from a display that runs sixteen hours a day.\n\nSend us the requirement — a model number, a quantity, or the problem you are solving — and we will return a written quotation with the specification, the warranty terms and the GST position stated on it.",
    logoText: "Samsung",
    accentColor: "#1428a0",
    displayOrder: 610,
    featured: false,
  },
  {
    slug: "canon",
    name: "Canon",
    tagline: "Printing, scanning and imaging",
    summary:
      "Office printers and multifunction devices, production scanners and the consumables that run with them.",
    description:
      "A printer is quoted with its running cost, not just its purchase price: cartridge yield, duty cycle and whether the device is meant for a workgroup or a floor decide what it actually costs over three years. Scanners are specified on pages per day rather than resolution.\n\nSend us the requirement — a model number, a quantity, or the problem you are solving — and we will return a written quotation with the specification, the warranty terms and the GST position stated on it.",
    logoText: "Canon",
    accentColor: "#bb0000",
    displayOrder: 620,
    featured: false,
  },
  {
    slug: "epson",
    name: "Epson",
    tagline: "Printing, scanning and projection",
    summary:
      "EcoTank and business inkjet printers, document scanners and installation projectors.",
    description:
      "Epson's business inkjets are bought where print volume is high and cartridge cost is the objection — the tank models change the arithmetic rather than the hardware. Projectors are specified on brightness for the room they are going into, which is the figure most quotations get wrong.\n\nSend us the requirement — a model number, a quantity, or the problem you are solving — and we will return a written quotation with the specification, the warranty terms and the GST position stated on it.",
    logoText: "Epson",
    accentColor: "#1a4f9c",
    displayOrder: 630,
    featured: false,
  },
  {
    slug: "brother",
    name: "Brother",
    tagline: "Printers, scanners and label systems",
    summary:
      "Workgroup laser printers and multifunction devices, document scanners and industrial labelling.",
    description:
      "Brother's workgroup lasers and desktop scanners are specified the way any shared device is: monthly duty cycle first, then paper handling, then the consumable cost per page. The labelling range is a separate requirement that often arrives with the same enquiry.\n\nSend us the requirement — a model number, a quantity, or the problem you are solving — and we will return a written quotation with the specification, the warranty terms and the GST position stated on it.",
    logoText: "Brother",
    accentColor: "#0a5b8c",
    displayOrder: 640,
    featured: false,
  },
  {
    slug: "jabra",
    name: "Jabra",
    tagline: "Headsets and meeting-room audio",
    summary:
      "Professional headsets and conference-room speakerphones and video bars, certified for the major platforms.",
    description:
      "Headsets are bought for a platform as much as for a desk: a device certified for Microsoft Teams or Zoom carries the call controls the software expects, and one that is not certified is a device your users will fight with daily. Room audio is specified by room size rather than by seat count.\n\nSend us the requirement — a model number, a quantity, or the problem you are solving — and we will return a written quotation with the specification, the warranty terms and the GST position stated on it.",
    logoText: "Jabra",
    accentColor: "#8a4b00",
    displayOrder: 650,
    featured: false,
  },
];
