import type { LandingPage } from "./types";

const autodeskCrumb = (label: string) => [
  { label: "Home", href: "/" },
  { label: "Autodesk", href: "/autodesk" },
  { label },
];

export const autodeskPages: LandingPage[] = [
  {
    slug: "autodesk",
    title: "Autodesk Licensing for Design & Engineering Teams",
    description:
      "AutoCAD, Revit, the AEC and Product Design collections, Maya, Fusion and Autodesk Construction Cloud, licensed per named user with collection pricing modelled honestly.",
    keywords: ["autodesk licensing", "autocad", "revit", "aec collection", "named user"],
    breadcrumb: [{ label: "Home", href: "/" }, { label: "Autodesk" }],
    hero: {
      eyebrow: "Autodesk",
      headline: "Autodesk licensing after the named-user transition",
      subheadline:
        "Seats now follow people rather than machines, which changed the economics of occasional users and made collections better value than they used to be. Some old habits now cost money.",
      primaryCta: { label: "Get Autodesk pricing", href: "/enquiry" },
      secondaryCta: { label: "Browse Autodesk products", href: "/products?brand=autodesk" },
    },
    intro: [
      "Under the old network licensing model, a practice with twenty designers might hold twelve licences because they were never all in the application at once. That is no longer possible: a named-user subscription is assigned to one person and cannot be pooled.",
      "The practical consequence is that occasional users became expensive, and collections became better value. Most practices we review are still allocating seats on habits formed under the old model.",
    ],
    sections: [
      {
        heading: "Industries we license for",
        cards: [
          {
            title: "Architecture",
            body: "Revit for BIM, AutoCAD for documentation, SketchUp for early-stage design and Navisworks for coordination. The AEC Collection usually covers all of it more cheaply than buying separately.",
          },
          {
            title: "Engineering",
            body: "Civil 3D for infrastructure, Revit for building services, and the structural analysis tools. Collection licensing covers occasional use of tools nobody would justify outright.",
          },
          {
            title: "Construction",
            body: "Autodesk Construction Cloud for the common data environment, field issue tracking and model coordination against the current model rather than a stale export.",
          },
          {
            title: "Manufacturing",
            body: "Inventor for mechanical design, Fusion for CAM and generative work, Nastran for simulation and Vault for engineering data management.",
          },
          {
            title: "Media & Entertainment",
            body: "Maya for animation and visual effects, 3ds Max for visualisation, with Arnold rendering included in the subscription.",
          },
        ],
      },
      {
        heading: "Where Autodesk spend usually leaks",
        bullets: [
          "Seats held by people who last opened the software eighteen months ago",
          "Three individual subscriptions where a collection would cost less",
          "Annual renewal where a stable team would pay less on a three-year term",
          "Leavers' seats never reclaimed, because reassignment is not part of the offboarding checklist",
          "Occasional users on full seats where a viewer or web workflow would serve",
        ],
      },
    ],
    productsHeading: "Autodesk licensing in the catalogue",
    productSlugs: [
      "autocad",
      "revit",
      "aec-collection",
      "fusion-360",
      "maya",
      "autodesk-product-design-manufacturing-collection",
    ],
    brandSlug: "autodesk",
    related: [
      { label: "AutoCAD", href: "/autocad" },
      { label: "Revit", href: "/revit" },
      { label: "AEC Collection", href: "/aec-collection" },
      { label: "Architecture & construction solutions", href: "/solutions/architecture-construction" },
    ],
    cta: {
      heading: "Get an Autodesk licensing review",
      body: "Send us your current seats and who actually opens what. We will show where a collection or a longer term costs less, and where seats can be reclaimed.",
    },
  },
  {
    slug: "autocad",
    title: "AutoCAD Licensing & Pricing",
    description:
      "AutoCAD subscriptions with all seven industry toolsets included: 2D drafting, 3D design, web and mobile access, and one- or three-year terms priced side by side.",
    keywords: ["autocad", "autocad price", "autocad subscription", "autocad toolsets", "autocad lt"],
    breadcrumb: autodeskCrumb("AutoCAD"),
    hero: {
      eyebrow: "AutoCAD",
      headline: "AutoCAD, with the industry toolsets included",
      subheadline:
        "The seven specialised toolsets that used to be separate purchases now come with the subscription. For teams using even one, that is the substantive commercial change of recent years.",
      primaryCta: { label: "Get AutoCAD pricing", href: "/enquiry" },
      secondaryCta: { label: "View product details", href: "/products/autocad" },
    },
    intro: [
      "A current AutoCAD subscription includes Architecture, Mechanical, Electrical, MEP, Map 3D, Plant 3D and Raster Design at no additional cost, plus the web and mobile applications.",
      "If your team is renewing an entitlement that predates this change, it is worth reviewing — you may still be paying for a toolset separately that is now bundled.",
    ],
    sections: [
      {
        heading: "One year or three",
        body: [
          "The three-year term costs less per year and locks the price against increases across the term. It is the right choice where the seat count is stable.",
          "Where headcount is uncertain, the annual term preserves the ability to reduce at renewal, and that flexibility is often worth more than the discount.",
        ],
      },
      {
        heading: "A note on AutoCAD LT",
        body: [
          "AutoCAD LT was consolidated into the main AutoCAD product line. Where an older LT entitlement exists, we confirm the current equivalent rather than assuming a like-for-like renewal — the mapping is not always what buyers expect.",
        ],
      },
      {
        heading: "Workstation guidance",
        bullets: [
          "16 GB RAM minimum, 32 GB for large drawings and 3D work",
          "A DirectX 12 capable GPU with 4 GB VRAM or more",
          "Single-thread processor performance matters more than core count for most AutoCAD work",
          "SSD storage for drawing files and the temporary directory",
        ],
      },
    ],
    productSlugs: ["autocad", "aec-collection", "autodesk-civil-3d"],
    productsHeading: "AutoCAD licensing",
    brandSlug: "autodesk",
    related: [
      { label: "Revit", href: "/revit" },
      { label: "AEC Collection", href: "/aec-collection" },
      { label: "Workstations", href: "/products?category=workstations" },
    ],
    cta: {
      heading: "Get AutoCAD pricing",
      body: "Tell us the seat count and whether the team also uses Revit or Civil 3D. We will price standalone and collection licensing side by side.",
    },
  },
  {
    slug: "revit",
    title: "Autodesk Revit Licensing & Pricing",
    description:
      "Revit subscriptions for architecture, structure and building services: BIM modelling, worksharing, automatic documentation and IFC exchange, with collection pricing compared.",
    keywords: ["revit", "revit price", "bim software", "revit subscription", "revit licence"],
    breadcrumb: autodeskCrumb("Revit"),
    hero: {
      eyebrow: "Revit",
      headline: "Revit licensing for BIM practices",
      subheadline:
        "A building information model rather than a drawing set: change a wall type once and every drawing that shows it updates.",
      primaryCta: { label: "Get Revit pricing", href: "/enquiry" },
      secondaryCta: { label: "View product details", href: "/products/revit" },
    },
    intro: [
      "Revit is specified on public and large private projects because the coordination and clash detection it enables happen before construction rather than during it.",
      "It is also why adoption takes real effort. A practice moving from 2D drafting needs template and family library work before the benefit arrives — and we would rather set that expectation than sell licences into a team that is not ready for them.",
    ],
    sections: [
      {
        heading: "Standalone or the AEC Collection",
        body: [
          "If your team uses only Revit, the standalone subscription is cheaper. Once a second Autodesk product enters the workflow — AutoCAD, Navisworks, Civil 3D or Infraworks — the AEC Collection is usually less expensive than buying them separately.",
          "The collection also covers occasional use of tools nobody would justify buying outright, which for most practices is where the real value sits.",
        ],
      },
      {
        heading: "Model performance and hardware",
        bullets: [
          "32 GB RAM or more for large models — this is the single biggest factor",
          "High single-thread processor performance; Revit does not scale well across many cores",
          "A DirectX 11 capable GPU with 4 GB VRAM; a top-tier card is rarely the right place for the budget",
          "SSD storage for local models and the central file cache",
          "Windows only — there is no macOS release",
        ],
      },
    ],
    productSlugs: ["revit", "aec-collection", "dell-precision-workstation"],
    productsHeading: "Revit licensing and hardware",
    brandSlug: "autodesk",
    related: [
      { label: "AEC Collection", href: "/aec-collection" },
      { label: "AutoCAD", href: "/autocad" },
      { label: "Construction Cloud", href: "/autodesk-construction-cloud" },
      { label: "Architecture & construction", href: "/solutions/architecture-construction" },
    ],
    cta: {
      heading: "Get Revit pricing",
      body: "Send us the seat count and the other Autodesk products in use. We will price standalone and collection licensing across one- and three-year terms.",
    },
  },
  {
    slug: "aec-collection",
    title: "Autodesk AEC Collection — Pricing & What Is Included",
    description:
      "The Architecture, Engineering and Construction Collection: Revit, AutoCAD, Civil 3D, Navisworks, Infraworks and 3ds Max in one subscription, priced against buying separately.",
    keywords: ["aec collection", "autodesk collection", "revit civil 3d navisworks", "aec collection price"],
    breadcrumb: autodeskCrumb("AEC Collection"),
    hero: {
      eyebrow: "AEC Collection",
      headline: "The AEC Collection, and when it is genuinely cheaper",
      subheadline:
        "A practice where most people live in Revit but a few need Civil 3D, and someone runs clash detection in Navisworks, pays considerably more buying those separately.",
      primaryCta: { label: "Get collection pricing", href: "/enquiry" },
      secondaryCta: { label: "View product details", href: "/products/aec-collection" },
    },
    intro: [
      "The collection bundles the design and coordination tools used across a building or infrastructure project, licensed per named user like any other Autodesk subscription.",
      "The commercial logic is straightforward: past two products per user it usually wins, and it covers occasional use of tools nobody would buy outright.",
    ],
    sections: [
      {
        heading: "What is included",
        bullets: [
          "Revit for building information modelling",
          "AutoCAD with all seven industry toolsets",
          "Civil 3D for infrastructure and site design",
          "Navisworks Manage for clash detection and coordination",
          "Infraworks for conceptual infrastructure design",
          "3ds Max for visualisation",
          "Structural Bridge Design and Robot Structural Analysis",
          "Autodesk Docs for a common data environment",
        ],
      },
      {
        heading: "Working out whether it pays",
        body: [
          "Count how many Autodesk products each person opens in a year, not how many they have installed. One product per user means standalone subscriptions are cheaper.",
          "Two products is roughly break-even. Three or more, or a team where people occasionally need a tool they do not have, and the collection wins clearly.",
          "We will run that comparison against your actual usage before quoting either.",
        ],
      },
    ],
    productSlugs: ["aec-collection", "revit", "autocad", "autodesk-civil-3d"],
    productsHeading: "Collection and standalone licensing",
    brandSlug: "autodesk",
    related: [
      { label: "Revit", href: "/revit" },
      { label: "AutoCAD", href: "/autocad" },
      { label: "Construction Cloud", href: "/autodesk-construction-cloud" },
    ],
    cta: {
      heading: "Get the collection compared to standalone",
      body: "Tell us who uses what. We will price both and show the working rather than asserting which is cheaper.",
    },
  },
  {
    slug: "fusion-360",
    title: "Autodesk Fusion — Pricing & Licensing",
    description:
      "Autodesk Fusion subscriptions: integrated CAD, CAM, simulation and PCB design for product development and small-batch manufacturing teams.",
    keywords: ["fusion 360", "fusion", "cad cam", "product design software", "generative design"],
    breadcrumb: autodeskCrumb("Fusion"),
    hero: {
      eyebrow: "Fusion",
      headline: "Autodesk Fusion for product design and manufacturing",
      subheadline:
        "CAD, CAM, simulation and electronics in one cloud-connected environment — where the traditional alternative is three products and a translation step between each.",
      primaryCta: { label: "Get Fusion pricing", href: "/enquiry" },
      secondaryCta: { label: "View product details", href: "/products/fusion-360" },
    },
    intro: [
      "For product design and small-batch manufacturing teams, the integration is the point: a design change propagates to the CAM toolpath without re-importing geometry.",
      "Larger organisations with established CATIA or NX pipelines usually adopt Fusion alongside rather than instead, which is a perfectly reasonable outcome and worth planning for rather than discovering.",
    ],
    sections: [
      {
        heading: "What the subscription covers",
        bullets: [
          "Parametric and direct modelling in one environment",
          "Integrated 2.5 to 5-axis CAM toolpaths",
          "Simulation for static stress, modal and thermal analysis",
          "Generative design",
          "PCB and electronics design",
          "Cloud data management with version history",
          "Windows and macOS support",
        ],
      },
      {
        heading: "Extensions, and what they cost",
        body: [
          "Certain advanced manufacturing, simulation and generative design capabilities are licensed as separate extensions on top of the base subscription.",
          "This catches buyers out regularly, because the base price looks very competitive until the capability you actually need turns out to be an extension. We will identify which extensions your workflow requires before quoting.",
        ],
      },
    ],
    productSlugs: ["fusion-360", "autodesk-product-design-manufacturing-collection"],
    productsHeading: "Fusion licensing",
    brandSlug: "autodesk",
    related: [
      { label: "Autodesk overview", href: "/autodesk" },
      { label: "Manufacturing solutions", href: "/solutions/manufacturing" },
      { label: "Workstations", href: "/products?category=workstations" },
    ],
    cta: {
      heading: "Get Fusion pricing",
      body: "Tell us what the team makes and which capabilities matter. We will identify the extensions you need rather than quoting a base price that will not cover the work.",
    },
  },
  {
    slug: "maya",
    title: "Autodesk Maya — Pricing & Licensing",
    description:
      "Maya subscriptions for animation, visual effects and games: character rigging, Bifrost simulation, Arnold rendering and USD pipeline support.",
    keywords: ["maya", "maya price", "3d animation software", "vfx software", "arnold renderer"],
    breadcrumb: autodeskCrumb("Maya"),
    hero: {
      eyebrow: "Maya",
      headline: "Autodesk Maya for animation and visual effects",
      subheadline:
        "The animation and VFX standard in film, television and games — with a pipeline cost that should be budgeted alongside the licences.",
      primaryCta: { label: "Get Maya pricing", href: "/enquiry" },
      secondaryCta: { label: "View product details", href: "/products/maya" },
    },
    intro: [
      "Maya covers character rigging, keyframe and procedural animation, cloth and hair simulation, and rendering through Arnold, which is included with the subscription.",
      "Its depth is also its cost. Studios build substantial in-house tooling around it, which makes it very sticky once adopted — and means an evaluation should budget for pipeline development, not just seats.",
    ],
    sections: [
      {
        heading: "What the subscription includes",
        bullets: [
          "Character rigging and animation toolset",
          "Bifrost for procedural effects and simulation",
          "nCloth, nHair and nParticles",
          "Arnold renderer with the subscription",
          "USD support for pipeline interchange",
          "Python and MEL scripting for custom tooling",
        ],
      },
      {
        heading: "Render capacity",
        body: [
          "Arnold is included for interactive work on the artist's machine. Batch rendering at scale needs render node licensing, which is a separate purchase sized against your farm.",
          "We will quote that alongside the seats rather than leaving it to be discovered at the first deadline.",
        ],
      },
    ],
    productSlugs: ["maya", "dell-precision-workstation"],
    productsHeading: "Maya licensing and workstations",
    brandSlug: "autodesk",
    related: [
      { label: "Autodesk overview", href: "/autodesk" },
      { label: "Creative Cloud", href: "/adobe-creative-cloud" },
      { label: "Workstations", href: "/products?category=workstations" },
    ],
    cta: {
      heading: "Get Maya pricing",
      body: "Tell us the seat count and whether you render locally or on a farm. We will quote the seats and the render capacity together.",
    },
  },
  {
    slug: "autodesk-construction-cloud",
    title: "Autodesk Construction Cloud — Licensing & Modules",
    description:
      "Autodesk Construction Cloud: common data environment, issue and RFI tracking, model coordination and field checklists, licensed per user across Docs, Build and BIM Collaborate.",
    keywords: ["autodesk construction cloud", "acc", "bim 360", "common data environment", "construction software"],
    breadcrumb: autodeskCrumb("Construction Cloud"),
    hero: {
      eyebrow: "Construction Cloud",
      headline: "Autodesk Construction Cloud, scoped around who will actually use it",
      subheadline:
        "A platform used by the design team but not the contractor recreates the coordination problem it was bought to solve.",
      primaryCta: { label: "Discuss Construction Cloud", href: "/enquiry" },
      secondaryCta: { label: "View product details", href: "/products/autodesk-construction-cloud" },
    },
    intro: [
      "Construction Cloud connects design and site: a single document store with controlled versions, issue and RFI tracking, quality and safety checklists, and model coordination that runs against the current model rather than a stale export.",
      "Its value is proportional to how much of the project team is on it. We scope rollouts around who will be using it from day one, including the external members, because that is what determines whether it works.",
    ],
    sections: [
      {
        heading: "The modules",
        cards: [
          {
            title: "Autodesk Docs",
            body: "The common data environment: controlled document versions, permissions and review workflows. The foundation the other modules sit on.",
          },
          {
            title: "Autodesk Build",
            body: "Field execution: issues, RFIs, submittals, quality and safety checklists, photo documentation and cost management.",
          },
          {
            title: "BIM Collaborate",
            body: "Model coordination and automated clash detection across disciplines, running against the live model.",
          },
          {
            title: "Takeoff",
            body: "Quantity takeoff from 2D drawings and 3D models, feeding estimating rather than being re-measured by hand.",
          },
        ],
      },
      {
        heading: "Licensing and external collaborators",
        body: [
          "Licensing is per user across the modules, with capability differing by module. Pricing depends on the module mix and the number of external collaborators, so this is quoted rather than listed.",
          "The external collaborator count is the variable that most often surprises buyers — a project with many subcontractors needs planning for before the agreement is signed.",
        ],
      },
    ],
    productSlugs: ["autodesk-construction-cloud", "revit", "aec-collection"],
    productsHeading: "Construction Cloud and related licensing",
    brandSlug: "autodesk",
    related: [
      { label: "Revit", href: "/revit" },
      { label: "AEC Collection", href: "/aec-collection" },
      { label: "Architecture & construction", href: "/solutions/architecture-construction" },
    ],
    cta: {
      heading: "Scope Construction Cloud properly",
      body: "Tell us the project size, the disciplines involved and how many external collaborators need access. We will scope the module mix and quote it.",
    },
  },
];
