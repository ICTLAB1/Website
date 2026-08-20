import { DELIVERY_SUBSCRIPTION, SUPPORT_STANDARD, type ProductSeed } from "./types";

const TEAMS_NOTE =
  "Licensed per named user through the Adobe Admin Console. Seats can be reassigned between people as roles change, which is the practical advantage over device-bound licensing. Annual commitment applies; mid-term seat additions are prorated to the common renewal date.";

export const adobeProducts: ProductSeed[] = [
  {
    slug: "adobe-creative-cloud-all-apps-teams",
    name: "Adobe Creative Cloud All Apps for Teams",
    brand: "adobe",
    category: "creative-suites",
    shortDescription:
      "The full Adobe creative application set with centralised admin and reassignable seats.",
    description:
      "Creative Cloud All Apps gives each named user the complete Adobe application set — Photoshop, Illustrator, InDesign, Premiere Pro, After Effects, Lightroom, Acrobat Pro and the rest — plus cloud storage and the shared libraries that keep brand assets consistent across a team.\n\nThe Teams edition adds what matters at organisational scale: an admin console for assigning and reclaiming seats, consolidated billing on one renewal date, and the ability to move a licence to a new starter the same day someone leaves.\n\nFor a designer who genuinely uses four or more applications, All Apps costs less than the individual subscriptions. For someone who only opens Photoshop, a single-app subscription is the honest recommendation and we will make it.",
    features: [
      "Over twenty Adobe desktop and mobile applications",
      "Adobe Admin Console for seat assignment and reclamation",
      "100 GB of cloud storage per user",
      "Creative Cloud Libraries for shared brand assets",
      "Adobe Fonts and Adobe Stock integration",
      "Acrobat Pro included",
      "Consolidated billing on a single renewal date",
    ],
    compatibility: [
      "Windows 11 and Windows 10 (64-bit, current supported builds)",
      "macOS - versions supported by the current Adobe release",
      "16 GB RAM recommended; 32 GB for video and 3D workloads",
      "GPU with 4 GB VRAM or more for accelerated features",
    ],
    keywords: ["creative cloud", "adobe cc", "all apps", "photoshop", "illustrator", "premiere"],
    licensingNotes: TEAMS_NOTE,
    deliveryNotes: DELIVERY_SUBSCRIPTION,
    supportNotes: `${SUPPORT_STANDARD} Teams subscriptions include Adobe's advanced 24x7 technical support and two one-on-one expert sessions per year.`,
    featured: true,
    popularity: 98,
    availability: "IN_STOCK",
    purchaseMode: "BOTH",
    variants: [
      { sku: "ADB-CC-ALL-TEAM-A1", name: "Annual commitment, billed yearly", licenceType: "SUBSCRIPTION_ANNUAL", termMonths: 12, isDefault: true, listPriceMinor: 74_40_000, salePriceMinor: 70_68_000 },
      { sku: "ADB-CC-ALL-TEAM-M1", name: "Annual commitment, billed monthly", licenceType: "SUBSCRIPTION_MONTHLY", termMonths: 12, listPriceMinor: 6_50_000 },
    ],
    faqs: [
      {
        question: "Can a seat be moved from one employee to another?",
        answer:
          "Yes. Seats are assigned to a named user in the Admin Console and can be unassigned and reassigned at any time. This is the main operational reason organisations choose the Teams edition over individual subscriptions.",
      },
      {
        question: "Is All Apps better value than several single-app subscriptions?",
        answer:
          "It depends on the count. Around four single applications, All Apps becomes cheaper per user, and it removes the administrative work of tracking who has which application. Below that threshold, single-app subscriptions cost less and we will quote them that way.",
      },
    ],
  },
  {
    slug: "adobe-creative-cloud-single-app-teams",
    name: "Adobe Creative Cloud Single App for Teams",
    brand: "adobe",
    category: "single-creative-apps",
    shortDescription: "One Adobe application per named user, with team administration.",
    description:
      "A single-application subscription with the same admin console, seat reassignment and consolidated billing as the All Apps plan. The choice of application is made per seat, so one team can hold a mix of Photoshop, Illustrator and Premiere Pro seats under one agreement.\n\nThis is the right plan where roles are specialised — a photo retoucher who never opens InDesign, a video editor who never opens Illustrator — and it typically saves a substantial amount per seat against All Apps.",
    features: [
      "One Adobe application of your choice per seat",
      "100 GB of cloud storage per user",
      "Adobe Admin Console with reassignable seats",
      "Adobe Fonts included",
      "Mixed application selection within a single team agreement",
    ],
    compatibility: [
      "Windows 11 and Windows 10 (64-bit)",
      "macOS - versions supported by the current Adobe release",
      "16 GB RAM recommended",
    ],
    keywords: ["single app", "creative cloud", "photoshop only", "illustrator only", "teams"],
    licensingNotes: TEAMS_NOTE,
    deliveryNotes: DELIVERY_SUBSCRIPTION,
    supportNotes: SUPPORT_STANDARD,
    featured: true,
    popularity: 84,
    availability: "IN_STOCK",
    purchaseMode: "BOTH",
    variants: [
      { sku: "ADB-CC-SINGLE-TEAM-A1", name: "Annual commitment, billed yearly", licenceType: "SUBSCRIPTION_ANNUAL", termMonths: 12, isDefault: true, listPriceMinor: 30_36_000 },
      { sku: "ADB-CC-SINGLE-TEAM-M1", name: "Annual commitment, billed monthly", licenceType: "SUBSCRIPTION_MONTHLY", termMonths: 12, listPriceMinor: 2_65_000 },
    ],
  },
  {
    slug: "adobe-acrobat-pro-teams",
    name: "Adobe Acrobat Pro for Teams",
    brand: "adobe",
    category: "document-workflow",
    shortDescription:
      "PDF creation, editing, e-signature and redaction with centralised licence management.",
    description:
      "Acrobat Pro is the most widely deployed Adobe product in organisations that have no creative team at all, because PDF handling is a universal business requirement rather than a design one. It covers creation, editing, comparison, form handling, redaction and electronic signature collection.\n\nThe capabilities that repeatedly justify Pro over free readers are redaction that genuinely removes content rather than covering it, document comparison for contract review, and e-signature workflows that avoid a separate signing subscription.",
    features: [
      "Create, edit and export PDF documents",
      "Combine, split, compare and organise pages",
      "Redaction that permanently removes content",
      "Electronic signature request and tracking",
      "Form creation with data collection",
      "Password protection and permission control",
      "Admin Console seat management",
    ],
    compatibility: [
      "Windows 11 and Windows 10",
      "macOS - currently supported versions",
      "iOS and Android mobile applications",
      "Microsoft 365 and Google Workspace integrations",
    ],
    keywords: ["acrobat", "acrobat pro", "pdf", "e-signature", "redaction", "document"],
    licensingNotes: TEAMS_NOTE,
    deliveryNotes: DELIVERY_SUBSCRIPTION,
    supportNotes: SUPPORT_STANDARD,
    featured: true,
    popularity: 92,
    availability: "IN_STOCK",
    purchaseMode: "BOTH",
    variants: [
      { sku: "ADB-ACR-PRO-TEAM-A1", name: "Annual commitment, billed yearly", licenceType: "SUBSCRIPTION_ANNUAL", termMonths: 12, isDefault: true, listPriceMinor: 20_45_000, salePriceMinor: 19_20_000 },
      { sku: "ADB-ACR-PRO-TEAM-M1", name: "Annual commitment, billed monthly", licenceType: "SUBSCRIPTION_MONTHLY", termMonths: 12, listPriceMinor: 1_85_000 },
    ],
    faqs: [
      {
        question: "What is the difference between Acrobat Standard and Pro?",
        answer:
          "Pro adds redaction, document comparison, PDF/A and accessibility checking, advanced form handling and Mac support. Standard is Windows-only and covers basic creation and editing. Organisations handling contracts or regulated documents generally need Pro.",
      },
      {
        question: "Does this include unlimited e-signature transactions?",
        answer:
          "Acrobat Pro includes signature request capability with a fair-use transaction allowance. High-volume or regulated signing workflows are served by Adobe Acrobat Sign, which is licensed separately - we will tell you which one your volume actually needs.",
      },
    ],
  },
  {
    slug: "adobe-acrobat-standard-teams",
    name: "Adobe Acrobat Standard for Teams",
    brand: "adobe",
    category: "document-workflow",
    shortDescription: "Core PDF creation and editing for Windows, with team administration.",
    description:
      "Acrobat Standard covers everyday PDF work: creating documents from Office files, editing text and images, merging and reordering pages, filling and signing forms, and applying password protection.\n\nIt is Windows-only and omits redaction, document comparison and accessibility checking. Where those are not needed, it is a meaningfully cheaper seat than Pro.",
    features: [
      "Create and edit PDF documents",
      "Combine and reorganise pages",
      "Fill, sign and request basic signatures",
      "Password protection",
      "Admin Console seat management",
    ],
    compatibility: ["Windows 11 and Windows 10 only", "Mobile applications for iOS and Android"],
    keywords: ["acrobat standard", "pdf editor", "windows"],
    licensingNotes: TEAMS_NOTE,
    deliveryNotes: DELIVERY_SUBSCRIPTION,
    supportNotes: SUPPORT_STANDARD,
    popularity: 64,
    availability: "IN_STOCK",
    purchaseMode: "BOTH",
    variants: [
      { sku: "ADB-ACR-STD-TEAM-A1", name: "Annual commitment, billed yearly", licenceType: "SUBSCRIPTION_ANNUAL", termMonths: 12, isDefault: true, listPriceMinor: 16_32_000 },
    ],
  },
  {
    slug: "adobe-photoshop-teams",
    name: "Adobe Photoshop for Teams",
    brand: "adobe",
    category: "single-creative-apps",
    shortDescription: "Image editing, compositing and retouching for a named user.",
    description:
      "Photoshop remains the reference tool for raster image work: retouching, compositing, masking and colour correction, with generative fill and neural filters now handling a meaningful share of routine masking and extension work.\n\nAs a single-app Teams subscription it includes cloud storage, Adobe Fonts, and the admin console that lets a seat follow the role rather than the person who first received it.",
    features: [
      "Raster editing, compositing and retouching",
      "Layer, mask and adjustment workflow",
      "Generative fill and expand",
      "Camera Raw processing",
      "Photoshop on iPad included",
      "100 GB cloud storage",
    ],
    compatibility: [
      "Windows 11 and Windows 10 (64-bit)",
      "macOS - currently supported versions",
      "16 GB RAM recommended for large documents",
      "GPU with 4 GB VRAM for accelerated features",
    ],
    keywords: ["photoshop", "image editing", "retouching", "compositing", "photo"],
    licensingNotes: TEAMS_NOTE,
    deliveryNotes: DELIVERY_SUBSCRIPTION,
    supportNotes: SUPPORT_STANDARD,
    featured: true,
    popularity: 90,
    availability: "IN_STOCK",
    purchaseMode: "BOTH",
    variants: [
      { sku: "ADB-PS-TEAM-A1", name: "Annual commitment, billed yearly", licenceType: "SUBSCRIPTION_ANNUAL", termMonths: 12, isDefault: true, listPriceMinor: 30_36_000 },
    ],
  },
  {
    slug: "adobe-illustrator-teams",
    name: "Adobe Illustrator for Teams",
    brand: "adobe",
    category: "single-creative-apps",
    shortDescription: "Vector illustration, logo and layout design for a named user.",
    description:
      "Illustrator is the vector counterpart to Photoshop: logos, iconography, packaging artwork, technical illustration and anything that must scale without loss. Output goes cleanly to print, signage, apparel and screen.\n\nThe single-app Teams subscription includes Adobe Fonts, cloud libraries shared with the rest of the team, and Illustrator on iPad.",
    features: [
      "Vector drawing and precision path editing",
      "Type on a path, variable fonts and Adobe Fonts",
      "Artboards for multi-format output",
      "Colour separation preview for print",
      "Illustrator on iPad included",
      "Shared Creative Cloud Libraries",
    ],
    compatibility: [
      "Windows 11 and Windows 10 (64-bit)",
      "macOS - currently supported versions",
      "16 GB RAM recommended",
    ],
    keywords: ["illustrator", "vector", "logo design", "artwork", "packaging"],
    licensingNotes: TEAMS_NOTE,
    deliveryNotes: DELIVERY_SUBSCRIPTION,
    supportNotes: SUPPORT_STANDARD,
    popularity: 86,
    availability: "IN_STOCK",
    purchaseMode: "BOTH",
    variants: [
      { sku: "ADB-AI-TEAM-A1", name: "Annual commitment, billed yearly", licenceType: "SUBSCRIPTION_ANNUAL", termMonths: 12, isDefault: true, listPriceMinor: 30_36_000 },
    ],
  },
  {
    slug: "adobe-premiere-pro-teams",
    name: "Adobe Premiere Pro for Teams",
    brand: "adobe",
    category: "single-creative-apps",
    shortDescription: "Professional video editing and post-production for a named user.",
    description:
      "Premiere Pro handles the editing half of a video pipeline: multi-camera assembly, colour, audio and delivery, with a round-trip to After Effects for motion graphics and to Audition for sound work.\n\nEditing is hardware-sensitive in a way that most software is not. Before quoting seats we will usually ask what the source footage is, because a 4K multi-camera timeline and a talking-head interview place very different demands on the workstation underneath.",
    features: [
      "Multi-track, multi-camera timeline editing",
      "Lumetri colour grading",
      "Essential Graphics and motion templates",
      "Speech-to-text captioning",
      "Dynamic Link round-trip with After Effects",
      "Broadcast and web delivery presets",
    ],
    compatibility: [
      "Windows 11 and Windows 10 (64-bit)",
      "macOS - currently supported versions",
      "32 GB RAM recommended for 4K workflows",
      "Dedicated GPU with 6 GB VRAM or more strongly recommended",
      "Fast NVMe storage for media",
    ],
    keywords: ["premiere pro", "video editing", "post production", "4k", "colour grading"],
    licensingNotes: TEAMS_NOTE,
    deliveryNotes: DELIVERY_SUBSCRIPTION,
    supportNotes: SUPPORT_STANDARD,
    popularity: 80,
    availability: "IN_STOCK",
    purchaseMode: "BOTH",
    variants: [
      { sku: "ADB-PR-TEAM-A1", name: "Annual commitment, billed yearly", licenceType: "SUBSCRIPTION_ANNUAL", termMonths: 12, isDefault: true, listPriceMinor: 30_36_000 },
    ],
  },
  {
    slug: "adobe-creative-cloud-enterprise",
    name: "Adobe Creative Cloud for Enterprise",
    brand: "adobe",
    category: "creative-suites",
    shortDescription:
      "Enterprise creative licensing with federated identity, managed deployment and enterprise storage.",
    description:
      "The enterprise edition changes the identity and governance model rather than the applications. Users authenticate against your directory through federated single sign-on, assets live in enterprise-owned storage that survives an employee's departure, and deployment is packaged centrally rather than installed per machine.\n\nIt is the right model above roughly fifty creative seats, or wherever asset ownership and offboarding are a compliance requirement rather than an inconvenience.",
    features: [
      "Federated single sign-on against your identity provider",
      "Enterprise-owned storage with asset reclamation on offboarding",
      "Managed package deployment and update control",
      "Advanced admin roles and delegated administration",
      "Enterprise support with a named contact",
    ],
    compatibility: [
      "Windows 11 and Windows 10 (64-bit)",
      "macOS - currently supported versions",
      "SAML 2.0 identity provider for federated identity",
    ],
    keywords: ["creative cloud enterprise", "sso", "federated id", "enterprise deployment"],
    licensingNotes:
      "Enterprise agreements are quoted against seat count, term and the identity model. Pricing is not published; every enterprise quotation is prepared individually.",
    deliveryNotes:
      "Enterprise onboarding includes directory federation, deployment package creation and an admin handover session.",
    supportNotes: "Includes Adobe enterprise support alongside our own account management.",
    popularity: 56,
    availability: "ON_REQUEST",
    purchaseMode: "ENQUIRY",
    variants: [
      { sku: "ADB-CC-ENT", name: "Enterprise agreement, per seat", licenceType: "SUBSCRIPTION_ANNUAL", termMonths: 12, isDefault: true, listPriceMinor: 0 },
    ],
  },
];
