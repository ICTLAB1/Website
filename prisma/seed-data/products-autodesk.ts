import { DELIVERY_SUBSCRIPTION, SUPPORT_STANDARD, type ProductSeed } from "./types";

const NAMED_USER_NOTE =
  "Licensed per named user. A subscription is assigned to one person and cannot be shared, but it can be reassigned when someone leaves. Each named user may install on multiple machines and sign in on one at a time. Multi-year terms are available and are usually cheaper per year than annual renewal.";

export const autodeskProducts: ProductSeed[] = [
  {
    slug: "autocad",
    name: "AutoCAD",
    brand: "autodesk",
    category: "cad-drafting",
    shortDescription:
      "2D drafting and 3D design with the industry-specific toolsets included.",
    description:
      "AutoCAD is the drafting baseline across architecture, engineering and manufacturing, and the current subscription includes the seven industry toolsets — Architecture, Mechanical, Electrical, MEP, Map 3D, Plant 3D and Raster Design — which were previously separate purchases. For teams that use even one of them, that inclusion is the substantive commercial change of the last few years.\n\nThe subscription also carries the web and mobile applications, which matter more on site than in the office: opening a current drawing on a tablet during a site visit removes a whole category of printing and version confusion.",
    features: [
      "2D drafting, annotation and dimensioning",
      "3D modelling, visualisation and rendering",
      "All seven industry-specific toolsets included",
      "AutoCAD web and mobile applications",
      "DWG comparison and drawing history",
      "Sheet sets and layout management",
      "Autodesk Docs integration for shared project files",
    ],
    compatibility: [
      "Windows 11 and Windows 10 (64-bit)",
      "macOS - feature set differs from the Windows release",
      "16 GB RAM minimum, 32 GB recommended for large drawings",
      "DirectX 12 capable GPU with 4 GB VRAM or more",
    ],
    keywords: ["autocad", "cad", "drafting", "dwg", "2d", "3d", "toolsets"],
    licensingNotes: `${NAMED_USER_NOTE}\n\nAutoCAD LT was consolidated into the main AutoCAD product line. Where an older LT entitlement exists, we will confirm the current equivalent rather than assuming a like-for-like renewal.`,
    deliveryNotes: DELIVERY_SUBSCRIPTION,
    supportNotes: SUPPORT_STANDARD,
    featured: true,
    popularity: 96,
    availability: "IN_STOCK",
    purchaseMode: "BOTH",
    variants: [
      { sku: "ADSK-ACAD-1Y", name: "1-year subscription, single user", licenceType: "SUBSCRIPTION_ANNUAL", termMonths: 12, isDefault: true, listPriceMinor: 1_54_000_00, salePriceMinor: 1_46_300_00 },
      { sku: "ADSK-ACAD-3Y", name: "3-year subscription, single user", licenceType: "SUBSCRIPTION_ANNUAL", termMonths: 36, listPriceMinor: 4_38_900_00 },
      { sku: "ADSK-ACAD-1M", name: "Monthly subscription, single user", licenceType: "SUBSCRIPTION_MONTHLY", termMonths: 1, listPriceMinor: 19_300_00 },
    ],
    faqs: [
      {
        question: "Are the industry toolsets really included?",
        answer:
          "Yes. A current AutoCAD subscription includes all seven specialised toolsets at no additional cost. If your team is renewing an older entitlement that predates this, the change is worth reviewing because it may remove a separate line item you are still paying for.",
      },
      {
        question: "Is a three-year term worth the commitment?",
        answer:
          "The per-year cost is lower and the price is locked against increases across the term. It is the right choice where the seat count is stable. Where headcount is uncertain, annual terms preserve the flexibility to reduce at renewal.",
      },
    ],
  },
  {
    slug: "revit",
    name: "Autodesk Revit",
    brand: "autodesk",
    category: "bim-collections",
    shortDescription:
      "Building information modelling for architecture, structure and building services.",
    description:
      "Revit is a building information model rather than a drawing set: architectural, structural and MEP elements exist as objects with real properties, and every plan, section and schedule is a view onto the same model. Change a wall type once and every drawing that shows it updates.\n\nThat model-first approach is why Revit is specified on public and large private projects — the coordination and clash detection it enables happen before construction rather than during it. It is also why adoption takes real effort: a practice moving from 2D drafting needs template and family library work before the benefit arrives.",
    features: [
      "Parametric architectural, structural and MEP modelling",
      "Automatic drawing, schedule and quantity generation",
      "Worksharing for multi-user models",
      "Clash coordination with Navisworks",
      "Family editor for custom components",
      "IFC import and export for open BIM exchange",
      "Autodesk Docs integration",
    ],
    compatibility: [
      "Windows 11 and Windows 10 (64-bit) only - no macOS release",
      "16 GB RAM minimum, 32 GB or more for large models",
      "DirectX 11 capable GPU with 4 GB VRAM or more",
      "SSD storage strongly recommended for model performance",
    ],
    keywords: ["revit", "bim", "architecture", "mep", "structural", "modelling"],
    licensingNotes: `${NAMED_USER_NOTE}\n\nWhere a team also uses AutoCAD, Navisworks or Civil 3D, the AEC Collection usually costs less than the individual subscriptions and is worth pricing side by side.`,
    deliveryNotes: DELIVERY_SUBSCRIPTION,
    supportNotes: SUPPORT_STANDARD,
    featured: true,
    popularity: 91,
    availability: "IN_STOCK",
    purchaseMode: "BOTH",
    variants: [
      { sku: "ADSK-RVT-1Y", name: "1-year subscription, single user", licenceType: "SUBSCRIPTION_ANNUAL", termMonths: 12, isDefault: true, listPriceMinor: 3_15_000_00 },
      { sku: "ADSK-RVT-3Y", name: "3-year subscription, single user", licenceType: "SUBSCRIPTION_ANNUAL", termMonths: 36, listPriceMinor: 8_97_750_00 },
    ],
    faqs: [
      {
        question: "Should we buy Revit on its own or the AEC Collection?",
        answer:
          "If your team uses only Revit, the standalone subscription is cheaper. Once a second Autodesk product enters the workflow - AutoCAD, Navisworks, Civil 3D or Infraworks - the AEC Collection is usually less expensive than buying them separately, and it covers occasional use of tools nobody would justify buying outright.",
      },
    ],
  },
  {
    slug: "aec-collection",
    name: "Autodesk AEC Collection",
    brand: "autodesk",
    category: "bim-collections",
    shortDescription:
      "Revit, AutoCAD, Civil 3D, Navisworks and the wider AEC toolset in one subscription.",
    description:
      "The Architecture, Engineering and Construction Collection bundles the design and coordination tools used across a building or infrastructure project: Revit, AutoCAD with its toolsets, Civil 3D, Navisworks Manage, Infraworks, 3ds Max and the structural analysis tools.\n\nThe commercial logic is straightforward. A practice where most people live in Revit but a few need Civil 3D for site work and someone runs clash detection in Navisworks would pay considerably more buying those separately — and would still be short of the occasional-use tools that the collection makes available to everyone.",
    features: [
      "Revit for building information modelling",
      "AutoCAD with all industry toolsets",
      "Civil 3D for infrastructure and site design",
      "Navisworks Manage for clash detection and coordination",
      "Infraworks for conceptual infrastructure design",
      "3ds Max for visualisation",
      "Structural Bridge Design and Robot Structural Analysis",
      "Autodesk Docs for common data environment",
    ],
    compatibility: [
      "Windows 11 and Windows 10 (64-bit) - several products are Windows-only",
      "32 GB RAM recommended across the collection",
      "Professional GPU with 8 GB VRAM for visualisation workloads",
    ],
    keywords: ["aec collection", "revit", "civil 3d", "navisworks", "bim", "infrastructure"],
    licensingNotes: NAMED_USER_NOTE,
    deliveryNotes: DELIVERY_SUBSCRIPTION,
    supportNotes: SUPPORT_STANDARD,
    featured: true,
    popularity: 87,
    availability: "IN_STOCK",
    purchaseMode: "BOTH",
    variants: [
      { sku: "ADSK-AEC-1Y", name: "1-year subscription, single user", licenceType: "SUBSCRIPTION_ANNUAL", termMonths: 12, isDefault: true, listPriceMinor: 3_86_000_00, salePriceMinor: 3_66_700_00 },
      { sku: "ADSK-AEC-3Y", name: "3-year subscription, single user", licenceType: "SUBSCRIPTION_ANNUAL", termMonths: 36, listPriceMinor: 10_99_100_00 },
    ],
  },
  {
    slug: "fusion-360",
    name: "Autodesk Fusion",
    brand: "autodesk",
    category: "cad-drafting",
    shortDescription:
      "Cloud-connected CAD, CAM, CAE and PCB design in a single product design environment.",
    description:
      "Fusion combines mechanical design, manufacturing toolpaths, simulation and electronics in one cloud-connected application, which is unusual: the traditional alternative is three separate products and a translation step between each.\n\nFor product design and small-batch manufacturing teams that integration is the point — a design change propagates to the CAM toolpath without re-importing geometry. Larger organisations with established CATIA or NX pipelines usually adopt Fusion alongside rather than instead.",
    features: [
      "Parametric and direct modelling in one environment",
      "Integrated 2.5 to 5-axis CAM toolpaths",
      "Simulation for static stress, modal and thermal analysis",
      "Generative design",
      "PCB and electronics design",
      "Cloud data management with version history",
      "Windows and macOS support",
    ],
    compatibility: [
      "Windows 11 and Windows 10 (64-bit)",
      "macOS - currently supported versions",
      "8 GB RAM minimum, 16 GB recommended",
      "Persistent internet connection required for cloud data",
    ],
    keywords: ["fusion 360", "fusion", "cad cam", "product design", "manufacturing", "cnc"],
    licensingNotes: `${NAMED_USER_NOTE}\n\nCertain advanced manufacturing, simulation and generative design capabilities are licensed as separate extensions on top of the base subscription.`,
    deliveryNotes: DELIVERY_SUBSCRIPTION,
    supportNotes: SUPPORT_STANDARD,
    popularity: 76,
    availability: "IN_STOCK",
    purchaseMode: "BOTH",
    variants: [
      { sku: "ADSK-FSN-1Y", name: "1-year subscription, single user", licenceType: "SUBSCRIPTION_ANNUAL", termMonths: 12, isDefault: true, listPriceMinor: 60_500_00 },
      { sku: "ADSK-FSN-3Y", name: "3-year subscription, single user", licenceType: "SUBSCRIPTION_ANNUAL", termMonths: 36, listPriceMinor: 1_72_400_00 },
    ],
  },
  {
    slug: "maya",
    name: "Autodesk Maya",
    brand: "autodesk",
    category: "media-entertainment",
    shortDescription: "3D animation, modelling, simulation and rendering for media production.",
    description:
      "Maya is the animation and visual effects standard in film, television and games: character rigging, keyframe and procedural animation, cloth and hair simulation, and rendering through Arnold.\n\nIts depth is also its cost — pipelines are built around it with substantial in-house tooling, which makes it very sticky once adopted. Studios evaluating it should budget for pipeline development alongside the licences.",
    features: [
      "Character rigging and animation toolset",
      "Bifrost for procedural effects and simulation",
      "nCloth, nHair and nParticles simulation",
      "Arnold renderer included with the subscription",
      "USD support for pipeline interchange",
      "Python and MEL scripting for pipeline tooling",
    ],
    compatibility: [
      "Windows 11 and Windows 10 (64-bit)",
      "macOS and supported Linux distributions",
      "32 GB RAM recommended",
      "Professional GPU with 8 GB VRAM or more",
    ],
    keywords: ["maya", "3d animation", "vfx", "rigging", "arnold", "modelling"],
    licensingNotes: NAMED_USER_NOTE,
    deliveryNotes: DELIVERY_SUBSCRIPTION,
    supportNotes: SUPPORT_STANDARD,
    popularity: 68,
    availability: "IN_STOCK",
    purchaseMode: "BOTH",
    variants: [
      { sku: "ADSK-MAYA-1Y", name: "1-year subscription, single user", licenceType: "SUBSCRIPTION_ANNUAL", termMonths: 12, isDefault: true, listPriceMinor: 2_16_000_00 },
      { sku: "ADSK-MAYA-3Y", name: "3-year subscription, single user", licenceType: "SUBSCRIPTION_ANNUAL", termMonths: 36, listPriceMinor: 6_15_600_00 },
    ],
  },
  {
    slug: "autodesk-construction-cloud",
    name: "Autodesk Construction Cloud",
    brand: "autodesk",
    category: "construction-management",
    shortDescription:
      "Common data environment, field management and project delivery for construction teams.",
    description:
      "Autodesk Construction Cloud connects design and site: a single document store with controlled versions, issue and RFI tracking, quality and safety checklists, and model coordination that runs against the current model rather than a stale export.\n\nIts value is proportional to how much of the project team actually uses it. A platform used by the design team but not the contractor recreates the coordination problem it was bought to solve, so we scope rollouts around who will be on it from day one.",
    features: [
      "Common data environment with controlled document versions",
      "Issue, RFI and submittal tracking",
      "Model coordination and automated clash detection",
      "Field checklists for quality and safety",
      "Photo and progress documentation",
      "Cost management and change order tracking",
      "Role-based access for external project members",
    ],
    compatibility: [
      "Web application in any modern browser",
      "iOS and Android field applications with offline capability",
      "Revit, Navisworks and Civil 3D integration",
    ],
    keywords: ["construction cloud", "acc", "bim 360", "field management", "rfi", "common data environment"],
    licensingNotes:
      "Licensed per user across several product modules - Docs, Build, BIM Collaborate and Takeoff - with capability differing by module. Pricing depends on the module mix and the number of external collaborators, so this product is quoted rather than listed.",
    deliveryNotes:
      "Implementation includes project template setup, permission model design and team onboarding.",
    supportNotes: SUPPORT_STANDARD,
    popularity: 63,
    availability: "ON_REQUEST",
    purchaseMode: "ENQUIRY",
    variants: [
      { sku: "ADSK-ACC-DOCS-1Y", name: "Autodesk Docs, 1-year, per user", licenceType: "SUBSCRIPTION_ANNUAL", termMonths: 12, isDefault: true, listPriceMinor: 0 },
    ],
  },
  {
    slug: "autodesk-product-design-manufacturing-collection",
    name: "Autodesk Product Design & Manufacturing Collection",
    brand: "autodesk",
    category: "bim-collections",
    shortDescription:
      "Inventor, AutoCAD, Fusion, Navisworks and Vault for manufacturing engineering teams.",
    description:
      "The manufacturing counterpart to the AEC Collection: Inventor for mechanical design, AutoCAD with toolsets, Fusion for CAM and generative work, Nastran for simulation, Vault Basic for data management and Factory Design Utilities for plant layout.\n\nThe collection makes sense in the same circumstance as its AEC sibling — a team where most people use one product heavily and several others occasionally.",
    features: [
      "Inventor Professional for mechanical design",
      "AutoCAD with all industry toolsets",
      "Fusion with generative design",
      "Inventor Nastran for finite element analysis",
      "Vault Basic for engineering data management",
      "Factory Design Utilities for layout planning",
      "Navisworks Manage",
    ],
    compatibility: [
      "Windows 11 and Windows 10 (64-bit) - most products are Windows-only",
      "32 GB RAM recommended",
      "Certified professional GPU recommended for large assemblies",
    ],
    keywords: ["pdm collection", "inventor", "manufacturing", "nastran", "vault", "cam"],
    licensingNotes: NAMED_USER_NOTE,
    deliveryNotes: DELIVERY_SUBSCRIPTION,
    supportNotes: SUPPORT_STANDARD,
    popularity: 61,
    availability: "IN_STOCK",
    purchaseMode: "BOTH",
    variants: [
      { sku: "ADSK-PDMC-1Y", name: "1-year subscription, single user", licenceType: "SUBSCRIPTION_ANNUAL", termMonths: 12, isDefault: true, listPriceMinor: 3_86_000_00 },
    ],
  },
  {
    slug: "autodesk-civil-3d",
    name: "Autodesk Civil 3D",
    brand: "autodesk",
    category: "cad-drafting",
    shortDescription: "Civil engineering design and documentation for infrastructure projects.",
    description:
      "Civil 3D handles the model-based design of roads, drainage, earthworks and site grading, with surfaces, alignments, profiles and corridors as intelligent objects that update their documentation when the design changes.\n\nIt is included in the AEC Collection, so teams that also use Revit should price the collection before buying it standalone.",
    features: [
      "Surface, alignment, profile and corridor modelling",
      "Pipe network and drainage design",
      "Earthwork volume calculation and grading",
      "Survey data import and point cloud support",
      "Automated plan and profile sheet production",
    ],
    compatibility: [
      "Windows 11 and Windows 10 (64-bit) only",
      "32 GB RAM recommended for large corridors",
      "DirectX 12 capable GPU",
    ],
    keywords: ["civil 3d", "infrastructure", "roads", "drainage", "survey", "grading"],
    licensingNotes: NAMED_USER_NOTE,
    deliveryNotes: DELIVERY_SUBSCRIPTION,
    supportNotes: SUPPORT_STANDARD,
    popularity: 59,
    availability: "IN_STOCK",
    purchaseMode: "BOTH",
    variants: [
      { sku: "ADSK-C3D-1Y", name: "1-year subscription, single user", licenceType: "SUBSCRIPTION_ANNUAL", termMonths: 12, isDefault: true, listPriceMinor: 3_15_000_00 },
    ],
  },
  /*
   * "3ds max license" sits at position 9.2 on 736 impressions a quarter, held
   * by a page of the previous site that no longer exists. Maya has been in
   * this catalogue all along and 3ds Max never was, which is the whole reason
   * the position had nothing to land on.
   *
   * No price. The Autodesk lines above are priced from a rate card that did
   * not cover this product, and a figure nobody can check is worse than a
   * quote route — the same answer `visual-studio-enterprise` gives.
   */
  {
    slug: "3ds-max",
    name: "Autodesk 3ds Max",
    brand: "autodesk",
    category: "media-entertainment",
    shortDescription:
      "3D modelling, rendering and animation for visualisation, games and product design.",
    description:
      "3ds Max is Autodesk's modelling and rendering application for architectural visualisation, games, product design and motion graphics. It reads the Revit and AutoCAD files an architectural practice already has, which is the usual reason a practice licenses it alongside them rather than instead of them.\n\nIt is licensed per named user, like the rest of the Autodesk line: the entitlement follows a person rather than a machine, and can be reassigned when somebody leaves.\n\nWhere a studio uses both 3ds Max and Maya, or several Autodesk applications, a collection is usually cheaper than the standalone subscriptions and we will quote both so the comparison is visible.",
    features: [
      "Polygon, spline and parametric modelling",
      "Arnold renderer included",
      "Character animation and rigging",
      "Interoperability with Revit, AutoCAD and Inventor files",
      "Scripting and a large third-party plug-in ecosystem",
    ],
    compatibility: [
      "Windows 11 and Windows 10 (64-bit) only",
      "GPU with 4 GB VRAM or more recommended",
      "32 GB RAM recommended for large scenes",
    ],
    keywords: ["3ds max", "3d modelling", "rendering", "animation", "visualisation", "arnold"],
    licensingNotes: NAMED_USER_NOTE,
    deliveryNotes: DELIVERY_SUBSCRIPTION,
    supportNotes: SUPPORT_STANDARD,
    /*
     * Ranked from what this domain is measured doing, not from a guess.
     *
     * It was 44 — last of the nine Autodesk products, below Civil 3D and the
     * Construction Cloud — which was the value it was given when the row was
     * created to fill a gap rather than ranked against its siblings. Search
     * Console has "3ds max license" at position 9.2 on 736 impressions over
     * three months, which is the strongest demand signal on this brand after
     * AutoCAD and Revit and better than anything below it here.
     *
     * 70 places it fourth of nine, above Maya and below Fusion 360. It moves
     * the product up the catalogue's popular sort, the brand page and search
     * results. It does not decide whether anything links to it — the related
     * products ring covers every product regardless of score — so this is
     * ordering, not visibility.
     */
    popularity: 70,
    availability: "ON_REQUEST",
    purchaseMode: "ENQUIRY",
    variants: [
      {
        sku: "ADSK-3DSMAX-1Y",
        name: "1-year subscription, single user",
        licenceType: "SUBSCRIPTION_ANNUAL",
        termMonths: 12,
        isDefault: true,
        listPriceMinor: 0,
      },
    ],
  },
];
