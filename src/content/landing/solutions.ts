import type { LandingPage } from "./types";

const solutionCrumb = (label: string) => [
  { label: "Home", href: "/" },
  { label: "Solutions", href: "/solutions" },
  { label },
];

export const solutionPages: LandingPage[] = [
  {
    slug: "solutions",
    title: "Technology Solutions by Outcome & Industry",
    description:
      "Enterprise technology solutions organised by the outcome you are buying — modern workplace, cloud transformation, design and engineering, security and compliance — and by industry.",
    keywords: ["technology solutions", "enterprise it solutions", "industry solutions"],
    breadcrumb: [{ label: "Home", href: "/" }, { label: "Solutions" }],
    hero: {
      eyebrow: "Solutions",
      headline: "Start from the outcome, not the product list",
      subheadline:
        "Licensing decisions look different depending on what the software is being used for. These pages group the products and services by the problem they are bought to solve.",
      primaryCta: { label: "Talk to a specialist", href: "/contact" },
      secondaryCta: { label: "Browse the catalogue", href: "/products" },
    },
    sections: [
      {
        heading: "By outcome",
        cards: [
          { title: "Modern workplace", body: "Email, documents, meetings and device management, with the identity controls that make remote work safe rather than merely possible." },
          { title: "Cloud transformation", body: "Workload assessment, migration and the governance that keeps cloud cost where the business case said it would be." },
          { title: "Design & engineering", body: "CAD, BIM and creative tooling, with the workstations sized against the software rather than a generic specification." },
          { title: "Security & compliance", body: "Identity hardening, endpoint posture and recovery testing, prioritised by what actually gets exploited." },
        ],
      },
      {
        heading: "By industry",
        cards: [
          { title: "Architecture & construction", body: "BIM, common data environments and field coordination across design and site teams." },
          { title: "Manufacturing", body: "Product design, CAM, simulation and engineering data management." },
          { title: "IT & software", body: "Cloud platforms, developer tooling, and licensing that scales with headcount rather than ahead of it." },
          { title: "Financial services", body: "Retention, eDiscovery and identity controls that satisfy a regulator rather than a checklist." },
          { title: "Education", body: "Academic licensing programmes and campus-wide deployment." },
        ],
      },
    ],
    related: [
      { label: "Modern workplace", href: "/solutions/modern-workplace" },
      { label: "Cloud transformation", href: "/solutions/cloud-transformation" },
      { label: "Design & engineering", href: "/solutions/design-engineering" },
      { label: "Security & compliance", href: "/solutions/security-compliance" },
      { label: "Architecture & construction", href: "/solutions/architecture-construction" },
      { label: "Manufacturing", href: "/solutions/manufacturing" },
      { label: "IT & software", href: "/solutions/technology" },
      { label: "Financial services", href: "/solutions/financial-services" },
      { label: "Education", href: "/solutions/education" },
    ],
    cta: {
      heading: "Describe the outcome you need",
      body: "You do not need a product list to start. Tell us the problem and we will come back with the options, priced.",
    },
  },
  {
    slug: "solutions/modern-workplace",
    title: "Modern Workplace Solutions",
    description:
      "Email, documents, meetings, device management and identity controls for distributed teams — licensed, deployed and governed as one estate.",
    keywords: ["modern workplace", "microsoft 365 deployment", "hybrid work", "device management"],
    breadcrumb: solutionCrumb("Modern workplace"),
    hero: {
      eyebrow: "Solution",
      headline: "A workplace estate you can actually account for",
      subheadline:
        "Most workplace problems are configuration problems, not licensing ones. The licences are usually already there.",
      primaryCta: { label: "Discuss your workplace", href: "/contact" },
      secondaryCta: { label: "Microsoft 365 plans", href: "/microsoft-365" },
    },
    intro: [
      "A working modern workplace has four parts: identity that is enforced, devices that are managed, collaboration tooling people actually use, and a licence position that matches headcount.",
      "Organisations usually have the licences for all four and the configuration for one or two.",
    ],
    sections: [
      {
        heading: "What we put in place",
        bullets: [
          "Identity model with conditional access and multi-factor authentication enforced, not merely available",
          "Device enrolment with compliance policy and remote wipe",
            "Email, document and meeting platform configured deliberately rather than at defaults",
          "Sharing and retention posture chosen explicitly and documented",
          "Licence assignment matched to actual role requirements, with a reclamation process",
        ],
      },
    ],
    productSlugs: ["microsoft-365-business-premium", "microsoft-365-business-standard", "zoho-workplace"],
    productsHeading: "Licensing for a modern workplace",
    related: [
      { label: "Microsoft 365 deployment", href: "/services/microsoft-365" },
      { label: "Endpoint management", href: "/services/endpoint-management" },
      { label: "Email migration", href: "/services/email-migration" },
    ],
    cta: { heading: "Get your workplace estate reviewed", body: "We will tell you what you already own that is not switched on before recommending anything new." },
  },
  {
    slug: "solutions/cloud-transformation",
    title: "Cloud Transformation Solutions",
    description:
      "Workload assessment, platform selection, migration and cost governance across Azure, AWS and Google Cloud — with the business case built before commitment.",
    keywords: ["cloud transformation", "cloud migration", "azure aws gcp", "cloud cost"],
    breadcrumb: solutionCrumb("Cloud transformation"),
    hero: {
      eyebrow: "Solution",
      headline: "Cloud decisions that survive contact with the invoice",
      subheadline:
        "Migrations fail commercially far more often than technically. The technology works; the business case does not.",
      primaryCta: { label: "Discuss a migration", href: "/contact" },
      secondaryCta: { label: "Cloud services", href: "/services/cloud" },
    },
    intro: [
      "The common failure is migrating the specification rather than the workload: a server sized for a peak that happens twice a year, lifted as-is into a platform that bills by the hour.",
      "We assess each workload against what it actually consumes, model the cost before commitment, and build the governance layer before anything moves.",
    ],
    sections: [
      {
        heading: "The sequence that avoids the common failure",
        bullets: [
          "Measure current consumption over a representative period",
          "Model the cost with measured figures, and state the assumptions so they can be challenged",
          "Build the landing zone — network, identity, tagging, governance — before workloads move",
          "Migrate in dependency order with a tested rollback at each wave",
          "Right-size against observed rather than projected load",
          "Commit the genuinely steady baseline, and only then",
        ],
      },
    ],
    productSlugs: ["azure-consumption-commitment"],
    productsHeading: "Cloud consumption",
    related: [
      { label: "Cloud advisory", href: "/services/cloud" },
      { label: "Microsoft Azure", href: "/services/azure" },
      { label: "Amazon Web Services", href: "/services/aws" },
      { label: "Backup & disaster recovery", href: "/services/backup-disaster-recovery" },
    ],
    cta: { heading: "Get a cloud business case", body: "Built from your measured consumption, with the assumptions stated rather than hidden." },
  },
  {
    slug: "solutions/design-engineering",
    title: "Design & Engineering Technology Solutions",
    description:
      "CAD, BIM and creative tooling with the workstations sized against the software that will run on them, licensed as one estate across Autodesk, Adobe and SketchUp.",
    keywords: ["cad solutions", "bim", "design software", "engineering workstations"],
    breadcrumb: solutionCrumb("Design & engineering"),
    hero: {
      eyebrow: "Solution",
      headline: "Design tooling sized to the work, not the brochure",
      subheadline:
        "The same workstation budget spent differently produces very different results for Revit, Premiere Pro and simulation. We ask what it will run before quoting.",
      primaryCta: { label: "Discuss a design estate", href: "/contact" },
      secondaryCta: { label: "Autodesk licensing", href: "/autodesk" },
    },
    intro: [
      "Design teams carry two costs that interact: the software licensing and the hardware under it. Quoting one without the other reliably produces a team with licences it cannot use productively.",
    ],
    sections: [
      {
        heading: "What we get right that generic quoting does not",
        bullets: [
          "Collection versus standalone licensing modelled against who actually opens what",
          "Occasional users identified, and served by a viewer or web workflow where that fits",
          "Workstations specified against the specific application — memory for Revit, GPU and storage for video, cores for simulation",
          "Seats reclaimed and reassigned as staff change, rather than accumulating",
        ],
      },
    ],
    productSlugs: ["aec-collection", "adobe-creative-cloud-all-apps-teams", "sketchup-pro", "dell-precision-workstation"],
    productsHeading: "Design and engineering licensing",
    related: [
      { label: "Autodesk", href: "/autodesk" },
      { label: "Adobe", href: "/adobe" },
      { label: "Architecture & construction", href: "/solutions/architecture-construction" },
    ],
    cta: { heading: "Get a design estate reviewed", body: "Send us who uses what. We will model collection versus standalone and specify the hardware to match." },
  },
  {
    slug: "solutions/security-compliance",
    title: "Security & Compliance Solutions",
    description:
      "Identity hardening, endpoint posture, email security and recovery testing, prioritised by what actually gets exploited rather than by framework coverage.",
    keywords: ["security solutions", "compliance", "identity", "endpoint security", "conditional access"],
    breadcrumb: solutionCrumb("Security & compliance"),
    hero: {
      eyebrow: "Solution",
      headline: "Close the gaps that actually get exploited",
      subheadline:
        "Most organisations that suffer a breach were not defeated by a sophisticated adversary. The controls that would have stopped it were available and unconfigured.",
      primaryCta: { label: "Request a posture review", href: "/contact" },
      secondaryCta: { label: "Cybersecurity services", href: "/services/cybersecurity" },
    },
    intro: [
      "We work through controls in order of what actually gets exploited: identity first, then endpoint posture, email security, patch discipline and backup recoverability.",
      "We also report where effort should not go. A finding that costs a month to close and reduces real risk marginally is worth saying so about.",
    ],
    sections: [
      {
        heading: "Priority order, and why",
        bullets: [
          "Multi-factor authentication and conditional access — closes the most common path, deployable in a controlled way quickly",
          "Privileged account review — standing administrative access is the difference between an incident and a catastrophe",
          "Endpoint compliance and patch visibility — you cannot fix what you cannot report on",
          "Email attachment and link protection — still the most common initial vector",
          "Backup recoverability, tested — an untested backup is a plan, not a capability",
        ],
      },
    ],
    productSlugs: ["microsoft-365-business-premium", "microsoft-365-e5"],
    productsHeading: "Security licensing",
    related: [
      { label: "Cybersecurity services", href: "/services/cybersecurity" },
      { label: "Endpoint management", href: "/services/endpoint-management" },
      { label: "Backup & disaster recovery", href: "/services/backup-disaster-recovery" },
    ],
    cta: { heading: "Get a posture assessment", body: "Findings reported with real risk, effort to close, and our recommendation on whether it is worth closing now." },
  },
  {
    slug: "solutions/architecture-construction",
    title: "Technology for Architecture & Construction",
    description:
      "BIM, CAD, common data environments and field coordination for architecture practices, engineering consultancies and contractors.",
    keywords: ["architecture software", "construction technology", "bim", "revit", "construction cloud"],
    breadcrumb: solutionCrumb("Architecture & construction"),
    hero: {
      eyebrow: "Industry",
      headline: "Technology for architecture and construction",
      subheadline:
        "Coordination problems are expensive during construction and cheap during design. The tooling only helps if the whole project team is on it.",
      primaryCta: { label: "Discuss a project estate", href: "/contact" },
      secondaryCta: { label: "AEC Collection", href: "/aec-collection" },
    },
    sections: [
      {
        heading: "What practices in this sector typically need",
        bullets: [
          "Revit for BIM, with the template and family library work that makes adoption stick",
          "AutoCAD for documentation and legacy drawing sets",
          "Civil 3D where infrastructure or site work is in scope",
          "Navisworks for clash detection before construction rather than during",
          "A common data environment the contractor will actually use",
          "Workstations specified against model size rather than a generic figure",
        ],
      },
    ],
    productSlugs: ["aec-collection", "revit", "autocad", "sketchup-pro", "autodesk-construction-cloud"],
    productsHeading: "Licensing for AEC practices",
    related: [
      { label: "Autodesk", href: "/autodesk" },
      { label: "Revit", href: "/revit" },
      { label: "Construction Cloud", href: "/autodesk-construction-cloud" },
    ],
    cta: { heading: "Get an AEC estate priced", body: "Tell us the team size and disciplines. We will model collection licensing and scope the common data environment." },
  },
  {
    slug: "solutions/manufacturing",
    title: "Technology for Manufacturing",
    description:
      "Product design, CAM, simulation and engineering data management for manufacturing organisations, with the licensing and workstations sized together.",
    keywords: ["manufacturing software", "cad cam", "inventor", "fusion", "simulation"],
    breadcrumb: solutionCrumb("Manufacturing"),
    hero: {
      eyebrow: "Industry",
      headline: "Technology for manufacturing engineering",
      subheadline:
        "Design, manufacture and simulation in one estate, with the data management that stops revisions diverging.",
      primaryCta: { label: "Discuss a requirement", href: "/contact" },
      secondaryCta: { label: "Fusion", href: "/fusion-360" },
    },
    sections: [
      {
        heading: "Typical requirements",
        bullets: [
          "Inventor or Fusion for mechanical design, depending on assembly complexity",
          "Integrated CAM so a design change propagates to the toolpath without re-import",
          "Simulation for stress, modal and thermal analysis before a prototype is cut",
          "Vault or equivalent for engineering data management and revision control",
          "Office LTSC where process control terminals need a frozen software baseline",
          "Workstations specified for core count on simulation and single-thread on modelling",
        ],
      },
    ],
    productSlugs: [
      "autodesk-product-design-manufacturing-collection",
      "fusion-360",
      "microsoft-office-ltsc-professional-plus-2024",
      "dell-precision-workstation",
    ],
    productsHeading: "Licensing for manufacturing",
    related: [
      { label: "Fusion", href: "/fusion-360" },
      { label: "Autodesk", href: "/autodesk" },
      { label: "Office LTSC", href: "/microsoft-office-ltsc" },
    ],
    cta: { heading: "Get a manufacturing estate priced", body: "Tell us what you make and how the design-to-manufacture handoff works today." },
  },
  {
    slug: "solutions/technology",
    title: "Technology for IT & Software Companies",
    description:
      "Cloud platforms, developer tooling, data platform licensing and security controls for technology companies, with licensing that scales with headcount.",
    keywords: ["technology company it", "developer tooling", "cloud licensing", "sql server"],
    breadcrumb: solutionCrumb("IT & software"),
    hero: {
      eyebrow: "Industry",
      headline: "Technology for technology companies",
      subheadline:
        "Licensing that scales with headcount rather than ahead of it, and cloud spend that stays attributable as teams multiply.",
      primaryCta: { label: "Discuss a requirement", href: "/contact" },
      secondaryCta: { label: "Cloud services", href: "/services/cloud" },
    },
    sections: [
      {
        heading: "What tends to matter here",
        bullets: [
          "Cloud cost attribution by team and product, enforced through tagging rather than requested",
          "SQL Server licensed per core or per server plus CAL, priced both ways for the actual connection pattern",
          "Annual rather than multi-year terms where headcount is genuinely volatile",
          "Identity and conditional access across a workforce that is remote by default",
          "Licence reclamation that keeps pace with turnover",
        ],
      },
    ],
    productSlugs: ["azure-consumption-commitment", "sql-server-2022-standard", "microsoft-365-e3"],
    productsHeading: "Licensing for technology companies",
    related: [
      { label: "Azure", href: "/services/azure" },
      { label: "AWS", href: "/services/aws" },
      { label: "SQL Server", href: "/sql-server" },
    ],
    cta: { heading: "Get your estate reviewed", body: "Particularly worth doing if headcount has changed materially in the last year." },
  },
  {
    slug: "solutions/financial-services",
    title: "Technology for Financial Services",
    description:
      "Retention, eDiscovery, identity controls and endpoint posture for financial services organisations, licensed against the compliance obligation rather than a checklist.",
    keywords: ["financial services it", "compliance", "ediscovery", "retention", "regulated"],
    breadcrumb: solutionCrumb("Financial services"),
    hero: {
      eyebrow: "Industry",
      headline: "Technology for regulated financial organisations",
      subheadline:
        "The compliance capabilities usually force the licensing decision before headcount does.",
      primaryCta: { label: "Discuss a requirement", href: "/contact" },
      secondaryCta: { label: "Security & compliance", href: "/solutions/security-compliance" },
    },
    intro: [
      "In regulated organisations, litigation hold, retention policy and eDiscovery are typically what drive the move from Business to Enterprise plans, rather than the seat count.",
      "That changes the comparison: the question is not which plan is cheaper per seat but which one satisfies the obligation without a separate archiving product.",
    ],
    sections: [
      {
        heading: "Capabilities that usually decide it",
        bullets: [
          "Litigation hold and immutable retention on mailboxes and documents",
          "eDiscovery with defensible search and export",
          "Data loss prevention on outbound communication",
          "Conditional access with device compliance for privileged roles",
          "Audit logging retained for the required period",
          "Backup with a tested recovery procedure, documented",
        ],
      },
    ],
    productSlugs: ["microsoft-365-e3", "microsoft-365-e5"],
    productsHeading: "Licensing for regulated organisations",
    related: [
      { label: "Cybersecurity", href: "/services/cybersecurity" },
      { label: "Backup & disaster recovery", href: "/services/backup-disaster-recovery" },
      { label: "Microsoft 365 plans", href: "/microsoft-365" },
    ],
    cta: { heading: "Get compliance capability mapped to licensing", body: "Tell us the obligations you are meeting. We will map them to the plan that satisfies them without over-buying." },
  },
  {
    slug: "solutions/education",
    title: "Technology for Education",
    description:
      "Academic licensing programmes, campus deployment and device management for schools, colleges and universities.",
    keywords: ["education licensing", "academic software", "campus deployment", "education pricing"],
    breadcrumb: solutionCrumb("Education"),
    hero: {
      eyebrow: "Industry",
      headline: "Technology for educational institutions",
      subheadline:
        "Academic licensing is materially cheaper than commercial licensing, and the eligibility rules are stricter than most buyers assume.",
      primaryCta: { label: "Discuss academic licensing", href: "/contact" },
      secondaryCta: { label: "Browse the catalogue", href: "/products" },
    },
    intro: [
      "Most major publishers offer academic programmes at substantially reduced pricing, with eligibility tied to accreditation and to how the software is used.",
      "The rules differ by publisher and are enforced. We confirm eligibility before quoting rather than after, because a purchase made under the wrong programme has to be unwound.",
    ],
    sections: [
      {
        heading: "What we handle for institutions",
        bullets: [
          "Eligibility confirmation against each publisher's academic programme",
          "Campus-wide and lab licensing, where the counting rules differ from commercial",
          "Deployment across shared lab machines and student devices",
          "Device management for institution-owned hardware",
          "Renewal planning aligned to the academic year rather than the calendar one",
        ],
      },
    ],
    productSlugs: ["autocad", "adobe-creative-cloud-all-apps-teams", "microsoft-365-e3"],
    productsHeading: "Commonly licensed in education",
    related: [
      { label: "Autodesk", href: "/autodesk" },
      { label: "Adobe", href: "/adobe" },
      { label: "Endpoint management", href: "/services/endpoint-management" },
    ],
    cta: { heading: "Confirm academic eligibility and pricing", body: "Send us your institution details and requirement. We will confirm eligibility per publisher before quoting." },
  },
];
