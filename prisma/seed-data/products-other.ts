import {
  DELIVERY_HARDWARE,
  DELIVERY_PERPETUAL,
  DELIVERY_SUBSCRIPTION,
  SUPPORT_STANDARD,
  type ProductSeed,
} from "./types";

export const otherProducts: ProductSeed[] = [
  // ---------------------------------------------------------------- SketchUp
  {
    slug: "sketchup-pro",
    name: "SketchUp Pro",
    brand: "sketchup",
    category: "cad-drafting",
    shortDescription:
      "3D modelling with 2D documentation for architecture, interiors and fabrication.",
    description:
      "SketchUp Pro pairs fast conceptual modelling with LayOut for 2D documentation, which is the combination that makes it viable as a delivery tool rather than only a sketching one. Practices commonly model early-stage design in SketchUp, present from it, then hand off to a documentation platform for construction information.\n\nThe extension ecosystem is a genuine part of its value — rendering, parametric components and fabrication output are all handled by mature third-party extensions rather than by the base application.",
    features: [
      "Direct push-pull 3D modelling",
      "LayOut for 2D construction documentation",
      "Style Builder for presentation output",
      "3D Warehouse component library",
      "Extension Warehouse for rendering and analysis plug-ins",
      "Web and iPad modelling included",
      "IFC, DWG and DXF import and export",
    ],
    compatibility: [
      "Windows 11 and Windows 10 (64-bit)",
      "macOS - currently supported versions",
      "8 GB RAM minimum, 16 GB recommended",
      "GPU with 1 GB VRAM or more supporting OpenGL 3.1",
    ],
    keywords: ["sketchup", "3d modelling", "architecture", "interior design", "layout"],
    licensingNotes:
      "Licensed per named user on an annual subscription. Extensions purchased from the Extension Warehouse are licensed separately by their publishers and are not included.",
    deliveryNotes: DELIVERY_SUBSCRIPTION,
    supportNotes: SUPPORT_STANDARD,
    featured: true,
    popularity: 73,
    availability: "IN_STOCK",
    purchaseMode: "BOTH",
    variants: [
      { sku: "SKP-PRO-1Y", name: "1-year subscription, single user", licenceType: "SUBSCRIPTION_ANNUAL", termMonths: 12, isDefault: true, listPriceMinor: 32_50_000 },
    ],
  },
  {
    slug: "sketchup-studio",
    name: "SketchUp Studio",
    brand: "sketchup",
    category: "cad-drafting",
    shortDescription: "SketchUp Pro with photorealistic rendering and scan-to-model tooling.",
    description:
      "Studio adds V-Ray for photorealistic rendering and Scan Essentials for working with point cloud survey data, on top of everything in Pro. It suits practices that produce client-facing visuals in-house and those doing refurbishment work where an accurate as-built survey is the starting point.\n\nWhere rendering is outsourced and projects are new-build, Pro is sufficient and considerably cheaper.",
    features: [
      "Everything in SketchUp Pro",
      "V-Ray photorealistic rendering",
      "Scan Essentials for point cloud data",
      "Windows-only for the point cloud toolset",
    ],
    compatibility: [
      "Windows 11 and Windows 10 (64-bit) - Scan Essentials is Windows-only",
      "16 GB RAM minimum, 32 GB for rendering",
      "Dedicated GPU strongly recommended for V-Ray",
    ],
    keywords: ["sketchup studio", "v-ray", "rendering", "point cloud", "scan"],
    licensingNotes: "Licensed per named user on an annual subscription.",
    deliveryNotes: DELIVERY_SUBSCRIPTION,
    supportNotes: SUPPORT_STANDARD,
    popularity: 52,
    availability: "IN_STOCK",
    purchaseMode: "BOTH",
    variants: [
      { sku: "SKP-STUDIO-1Y", name: "1-year subscription, single user", licenceType: "SUBSCRIPTION_ANNUAL", termMonths: 12, isDefault: true, listPriceMinor: 63_50_000 },
    ],
  },

  // -------------------------------------------------------------------- Corel
  {
    slug: "coreldraw-graphics-suite",
    name: "CorelDRAW Graphics Suite",
    brand: "corel",
    category: "single-creative-apps",
    shortDescription:
      "Vector illustration, page layout and photo editing, available perpetually or by subscription.",
    description:
      "CorelDRAW Graphics Suite bundles vector illustration, page layout, photo editing and font management. It retains a strong position in print, signage, screen printing and apparel decoration, where existing artwork libraries and operator familiarity carry real switching cost.\n\nIt is one of the few remaining mainstream creative products offered as a genuine perpetual licence, which matters where budget is capital rather than operating. The perpetual version does not receive feature updates; the subscription does.",
    features: [
      "CorelDRAW for vector illustration and layout",
      "Corel PHOTO-PAINT for image editing",
      "Corel Font Manager",
      "PowerTRACE bitmap-to-vector conversion",
      "Colour management for print output",
      "Multi-page layout and imposition",
      "Perpetual or subscription licensing",
    ],
    compatibility: [
      "Windows 11 and Windows 10 (64-bit)",
      "macOS - currently supported versions",
      "8 GB RAM minimum, 16 GB recommended",
    ],
    keywords: ["coreldraw", "corel", "vector", "signage", "print", "graphics suite"],
    licensingNotes:
      "Available as a perpetual licence for a single user, or as an annual subscription that includes feature updates. Perpetual licences receive maintenance fixes but no new features. Volume licensing is available from five seats and includes deployment tooling.",
    deliveryNotes: DELIVERY_PERPETUAL,
    supportNotes: SUPPORT_STANDARD,
    featured: true,
    popularity: 65,
    availability: "IN_STOCK",
    purchaseMode: "BOTH",
    variants: [
      { sku: "CRL-CDGS-PERP", name: "Perpetual licence, single user", licenceType: "PERPETUAL", termMonths: null, isDefault: true, listPriceMinor: 5_49_00_000 },
      { sku: "CRL-CDGS-SUB-1Y", name: "1-year subscription, single user", licenceType: "SUBSCRIPTION_ANNUAL", termMonths: 12, listPriceMinor: 2_25_00_000 },
      { sku: "CRL-CDGS-VL-5", name: "Volume licence, 5-seat minimum, perpetual", licenceType: "VOLUME", termMonths: null, seats: 5, listPriceMinor: 24_50_00_000 },
    ],
    faqs: [
      {
        question: "Should we buy perpetual or subscription?",
        answer:
          "Perpetual costs more up front but nothing thereafter, and suits organisations that upgrade every three or four releases rather than every year. Subscription costs less initially and always runs the current release. Over a five-year horizon, perpetual with a mid-cycle upgrade is usually cheaper for stable teams.",
      },
    ],
  },
  {
    slug: "corel-wordperfect-office",
    name: "Corel WordPerfect Office",
    brand: "corel",
    category: "office-suites",
    shortDescription:
      "Perpetual office suite with legal document tooling and Reveal Codes formatting.",
    description:
      "WordPerfect Office remains in active use in legal and government environments, largely because of two capabilities that have no direct equivalent elsewhere: Reveal Codes, which exposes the underlying formatting of a document, and the legal-specific tooling for pleadings, tables of authorities and Bates numbering.\n\nIt is a perpetual licence with no subscription requirement, which is often the deciding factor for public sector procurement.",
    features: [
      "WordPerfect word processor with Reveal Codes",
      "Quattro Pro spreadsheet",
      "Presentations graphics application",
      "Legal tooling - pleadings, tables of authorities, Bates numbering",
      "PDF creation and import",
      "Microsoft Office file compatibility",
      "Perpetual licence, no subscription",
    ],
    compatibility: ["Windows 11 and Windows 10 (64-bit) only", "4 GB RAM minimum"],
    keywords: ["wordperfect", "corel office", "legal", "quattro pro", "perpetual office"],
    licensingNotes:
      "Perpetual licence per user. Volume licensing is available for larger deployments with a single serial number for imaging.",
    deliveryNotes: DELIVERY_PERPETUAL,
    supportNotes: SUPPORT_STANDARD,
    popularity: 42,
    availability: "IN_STOCK",
    purchaseMode: "BOTH",
    variants: [
      { sku: "CRL-WPO-PERP", name: "Perpetual licence, single user", licenceType: "PERPETUAL", termMonths: null, isDefault: true, listPriceMinor: 2_45_00_000 },
    ],
  },
  {
    slug: "corel-paintshop-pro",
    name: "Corel PaintShop Pro",
    brand: "corel",
    category: "single-creative-apps",
    shortDescription: "Perpetual photo editing and design software for Windows.",
    description:
      "PaintShop Pro is a perpetual-licence photo editor covering layered editing, RAW processing, retouching and basic design work. It is positioned as a lower-cost alternative for organisations that need capable image editing on a number of machines without a per-seat subscription.\n\nIt is Windows-only and does not integrate with a wider creative ecosystem, which is the trade-off against the subscription alternatives.",
    features: [
      "Layered raster editing with masks",
      "RAW file processing",
      "Retouching and correction tools",
      "Basic vector and text tools",
      "Batch processing",
      "Perpetual licence",
    ],
    compatibility: ["Windows 11 and Windows 10 (64-bit) only", "8 GB RAM recommended"],
    keywords: ["paintshop pro", "photo editing", "corel", "perpetual", "raw"],
    licensingNotes: "Perpetual licence per user. Volume licensing available from five seats.",
    deliveryNotes: DELIVERY_PERPETUAL,
    supportNotes: SUPPORT_STANDARD,
    popularity: 38,
    availability: "IN_STOCK",
    purchaseMode: "BOTH",
    variants: [
      { sku: "CRL-PSP-PERP", name: "Perpetual licence, single user", licenceType: "PERPETUAL", termMonths: null, isDefault: true, listPriceMinor: 79_00_000 },
    ],
  },

  // ---------------------------------------------------------------------- HPE
  {
    slug: "hpe-proliant-dl380-server",
    name: "HPE ProLiant DL380 Rack Server",
    brand: "hpe",
    category: "servers",
    shortDescription:
      "Dual-socket 2U rack server configured to workload, quoted with support terms.",
    description:
      "The DL380 is the general-purpose dual-socket rack server most virtualisation and database workloads land on. Its usefulness comes from configurability rather than any single specification: processor count, memory density, storage controller, drive mix and network adapters are all chosen against the workload.\n\nWe do not quote a standard build. A virtualisation host consolidating fifteen guests and a database server serving a transactional application need different memory-to-core ratios and very different storage. The quotation states the exact bill of materials and the support tier, because a server without a matching response-time contract is a risk that surfaces at the worst possible moment.",
    features: [
      "2U dual-socket rack chassis",
      "Configurable processor, memory and storage",
      "Redundant hot-plug power supplies and fans",
      "iLO out-of-band management",
      "Flexible network adapter options",
      "Configured against the specific workload",
    ],
    compatibility: [
      "VMware vSphere, Microsoft Hyper-V and supported Linux hypervisors",
      "Windows Server 2019 and later",
      "Standard 19-inch rack mounting",
    ],
    keywords: ["hpe", "proliant", "dl380", "rack server", "virtualisation", "server"],
    licensingNotes:
      "Server hardware does not carry a software licence. Windows Server, hypervisor and backup licensing are quoted separately and sized against the host's physical core count.",
    deliveryNotes: DELIVERY_HARDWARE,
    supportNotes:
      "Quoted with an explicit support tier and term. Next-business-day and four-hour response options are available depending on location and recovery objectives.",
    featured: true,
    popularity: 57,
    availability: "MADE_TO_ORDER",
    purchaseMode: "ENQUIRY",
    variants: [
      { sku: "HPE-DL380-CFG", name: "Configured to requirement", licenceType: "PERPETUAL", termMonths: null, isDefault: true, listPriceMinor: 0 },
    ],
    faqs: [
      {
        question: "Why is no price shown?",
        answer:
          "The configuration determines the price, and the spread between a minimal and a well-specified build of the same chassis is large. Quoting a headline figure against an unstated configuration would be misleading, so we size it first.",
      },
    ],
  },
  {
    slug: "hpe-msa-storage-array",
    name: "HPE MSA Storage Array",
    brand: "hpe",
    category: "storage",
    shortDescription: "Entry-level SAN storage for virtualisation and file consolidation.",
    description:
      "The MSA family covers shared block storage for small and mid-sized virtualisation clusters: dual controllers for redundancy, a mix of SSD and spinning media with automated tiering, and connectivity over Fibre Channel, iSCSI or SAS.\n\nSizing is driven by IOPS and recovery objectives rather than raw capacity. We work from the workload profile, because a capacity-led purchase that ignores IOPS is the most common way storage projects disappoint.",
    features: [
      "Dual redundant controllers",
      "SSD and HDD tiering",
      "Fibre Channel, iSCSI and SAS connectivity",
      "Snapshot and remote replication",
      "Thin provisioning",
    ],
    compatibility: [
      "VMware vSphere and Microsoft Hyper-V",
      "Windows Server and supported Linux distributions",
      "Standard rack mounting",
    ],
    keywords: ["hpe msa", "san", "storage array", "iscsi", "fibre channel", "storage"],
    deliveryNotes: DELIVERY_HARDWARE,
    supportNotes: "Quoted with support tier and term stated on the quotation.",
    popularity: 44,
    availability: "MADE_TO_ORDER",
    purchaseMode: "ENQUIRY",
    variants: [
      { sku: "HPE-MSA-CFG", name: "Configured to requirement", licenceType: "PERPETUAL", termMonths: null, isDefault: true, listPriceMinor: 0 },
    ],
  },
  {
    slug: "hpe-aruba-networking-switch",
    name: "HPE Aruba Networking Switch",
    brand: "hpe",
    category: "networking",
    shortDescription: "Managed access and aggregation switching for campus networks.",
    description:
      "Aruba switching covers access and aggregation for campus and branch networks, with centralised management, role-based access policy and Power over Ethernet for phones, access points and cameras.\n\nPort count, PoE budget and uplink speed are configuration decisions we make against the device count and the growth expected over the switch's service life, rather than against today's count alone.",
    features: [
      "Layer 2 and Layer 3 managed switching",
      "Power over Ethernet with configurable budget",
      "Role-based access control policy",
      "Centralised cloud or on-premises management",
      "Stacking for simplified operation",
    ],
    compatibility: ["Standard Ethernet and PoE devices", "Integrates with Aruba wireless access points"],
    keywords: ["aruba", "switch", "networking", "poe", "campus network"],
    deliveryNotes: DELIVERY_HARDWARE,
    supportNotes: "Quoted with support tier and term stated on the quotation.",
    popularity: 40,
    availability: "MADE_TO_ORDER",
    purchaseMode: "ENQUIRY",
    variants: [
      { sku: "HPE-ARUBA-SW-CFG", name: "Configured to requirement", licenceType: "PERPETUAL", termMonths: null, isDefault: true, listPriceMinor: 0 },
    ],
  },

  // --------------------------------------------------------------------- Dell
  {
    slug: "dell-poweredge-r760-server",
    name: "Dell PowerEdge R760 Rack Server",
    brand: "dell",
    category: "servers",
    shortDescription: "Dual-socket 2U rack server for virtualisation and database workloads.",
    description:
      "The PowerEdge R760 is Dell's mainstream dual-socket 2U server, configured per workload across processor, memory, storage and networking. iDRAC provides out-of-band management, which materially reduces the number of situations requiring physical access to the machine.\n\nAs with any server purchase, the configuration and the support contract carry more weight than the chassis choice. We quote both explicitly.",
    features: [
      "2U dual-socket rack chassis",
      "Configurable processor, memory and storage",
      "iDRAC out-of-band management with lifecycle controller",
      "Redundant hot-plug power supplies",
      "NVMe, SAS and SATA drive options",
    ],
    compatibility: [
      "VMware vSphere, Microsoft Hyper-V and supported Linux hypervisors",
      "Windows Server 2019 and later",
      "Standard 19-inch rack mounting",
    ],
    keywords: ["dell", "poweredge", "r760", "rack server", "virtualisation"],
    licensingNotes:
      "Operating system, hypervisor and backup licensing are quoted separately and sized against the host's physical core count.",
    deliveryNotes: DELIVERY_HARDWARE,
    supportNotes:
      "Quoted with an explicit ProSupport tier and term matched to your recovery objectives.",
    featured: true,
    popularity: 55,
    availability: "MADE_TO_ORDER",
    purchaseMode: "ENQUIRY",
    variants: [
      { sku: "DELL-R760-CFG", name: "Configured to requirement", licenceType: "PERPETUAL", termMonths: null, isDefault: true, listPriceMinor: 0 },
    ],
  },
  {
    slug: "dell-precision-workstation",
    name: "Dell Precision Workstation",
    brand: "dell",
    category: "workstations",
    shortDescription:
      "ISV-certified workstations for CAD, BIM, simulation and video production.",
    description:
      "Precision workstations are certified by the software publishers whose applications run on them, which matters more than it sounds: a certified configuration is one the publisher will support when a graphics driver causes a problem in a production model.\n\nWe size these against the software rather than a generic specification. A Revit model of a large building stresses single-thread performance and memory; a Premiere Pro 4K timeline stresses GPU and storage throughput; a simulation workload stresses core count. The same budget spent differently produces very different results for each.",
    features: [
      "ISV certification for major CAD, BIM and media applications",
      "Professional GPU options",
      "ECC memory available on higher configurations",
      "Tower, rack and mobile form factors",
      "Configured against the target application",
    ],
    compatibility: [
      "Autodesk Revit, AutoCAD, Civil 3D and Maya",
      "Adobe Premiere Pro and After Effects",
      "SolidWorks and simulation workloads",
      "Windows 11 Pro and supported Linux distributions",
    ],
    keywords: ["dell precision", "workstation", "cad workstation", "isv certified", "revit"],
    deliveryNotes: DELIVERY_HARDWARE,
    supportNotes:
      "Quoted with a ProSupport tier appropriate to whether the machine is a shared studio resource or an individual's primary device.",
    featured: true,
    popularity: 53,
    availability: "MADE_TO_ORDER",
    purchaseMode: "ENQUIRY",
    variants: [
      { sku: "DELL-PRECISION-CFG", name: "Configured to requirement", licenceType: "PERPETUAL", termMonths: null, isDefault: true, listPriceMinor: 0 },
    ],
    faqs: [
      {
        question: "What specification do we need for Revit?",
        answer:
          "Revit benefits most from high single-thread processor performance and generous memory - model size drives the memory requirement more than anything else. A mid-range professional GPU is usually sufficient; spending the budget on a top-tier card instead of memory is the most common sizing mistake we correct.",
      },
    ],
  },
  {
    slug: "dell-powerstore-storage",
    name: "Dell PowerStore Storage",
    brand: "dell",
    category: "storage",
    shortDescription: "All-flash storage with inline data reduction for consolidated workloads.",
    description:
      "PowerStore is Dell's all-flash platform for consolidating mixed block and file workloads, with inline deduplication and compression, non-disruptive scaling and native replication.\n\nEffective capacity depends heavily on the data reduction achieved, which varies by workload. We size from a realistic reduction assumption for your data rather than a best-case marketing figure, because the difference between the two is where storage projects run out of capacity early.",
    features: [
      "All-flash NVMe architecture",
      "Inline deduplication and compression",
      "Block and file services in one platform",
      "Non-disruptive scale-up and scale-out",
      "Native asynchronous replication",
    ],
    compatibility: [
      "VMware vSphere with native integration",
      "Microsoft Hyper-V and supported Linux",
      "Fibre Channel, iSCSI and NVMe/TCP connectivity",
    ],
    keywords: ["dell powerstore", "all flash", "storage", "nvme", "deduplication"],
    deliveryNotes: DELIVERY_HARDWARE,
    supportNotes: "Quoted with support tier and term stated on the quotation.",
    popularity: 43,
    availability: "MADE_TO_ORDER",
    purchaseMode: "ENQUIRY",
    variants: [
      { sku: "DELL-PWRSTORE-CFG", name: "Configured to requirement", licenceType: "PERPETUAL", termMonths: null, isDefault: true, listPriceMinor: 0 },
    ],
  },
];
