import type { LandingPage } from "./types";

const adobeCrumb = (label: string) => [
  { label: "Home", href: "/" },
  { label: "Adobe", href: "/adobe" },
  { label },
];

export const adobePages: LandingPage[] = [
  {
    slug: "adobe",
    title: "Adobe Licensing for Teams & Enterprise",
    description:
      "Adobe Creative Cloud, Acrobat and single-application licensing for business, with centralised administration, reassignable seats and consolidated billing.",
    keywords: ["adobe licensing", "creative cloud for teams", "adobe business", "acrobat licensing"],
    breadcrumb: [{ label: "Home", href: "/" }, { label: "Adobe" }],
    hero: {
      eyebrow: "Adobe",
      headline: "Adobe licensing that follows the role, not the machine",
      subheadline:
        "Named-user entitlements with an admin console that lets a seat move to a new starter the same day someone leaves — which is the practical reason organisations move off individual subscriptions.",
      primaryCta: { label: "Get Adobe pricing", href: "/enquiry" },
      secondaryCta: { label: "Browse Adobe products", href: "/products?brand=adobe" },
    },
    intro: [
      "Adobe's business licensing separates the entitlement from the person holding it. That is what makes it workable at scale: seats can be reassigned when people change roles, deployment can be packaged rather than installed by hand, and billing lands on one renewal date.",
      "The decision that costs the most is All Apps versus single applications. For a designer who genuinely uses four or more applications, All Apps is cheaper. For someone who only opens Photoshop, it is not — and we will quote the single app.",
    ],
    sections: [
      {
        heading: "Teams or Enterprise",
        cards: [
          {
            title: "Creative Cloud for Teams",
            body: "Adobe-managed identities, a straightforward admin console, reassignable seats and one renewal date. Suits most organisations, and is considerably simpler to run.",
          },
          {
            title: "Creative Cloud for Enterprise",
            body: "Federated single sign-on against your directory, enterprise-owned storage that survives an employee's departure, and managed deployment. Worth it above roughly fifty seats, or wherever asset ownership is a compliance requirement.",
          },
        ],
      },
      {
        heading: "Getting the mix right",
        bullets: [
          "All Apps for people who use four or more applications regularly",
          "Single App for specialists — a retoucher who never opens InDesign, an editor who never opens Illustrator",
          "Acrobat Pro for the much larger group who need PDF workflows but no creative tools",
          "A mixed team agreement is permitted, so all three can sit on one renewal date",
        ],
      },
    ],
    productsHeading: "Adobe licensing in the catalogue",
    productSlugs: [
      "adobe-creative-cloud-all-apps-teams",
      "adobe-acrobat-pro-teams",
      "adobe-creative-cloud-single-app-teams",
      "adobe-photoshop-teams",
      "adobe-illustrator-teams",
      "adobe-premiere-pro-teams",
    ],
    brandSlug: "adobe",
    related: [
      { label: "Creative Cloud", href: "/adobe-creative-cloud" },
      { label: "Acrobat", href: "/adobe-acrobat" },
      { label: "Design & engineering solutions", href: "/solutions/design-engineering" },
    ],
    cta: {
      heading: "Get Adobe pricing for your team",
      body: "Tell us how many people use which applications and how often. We will price the mix rather than putting everyone on All Apps.",
    },
  },
  {
    slug: "adobe-creative-cloud",
    title: "Adobe Creative Cloud for Teams — Pricing & Licensing",
    description:
      "Creative Cloud for Teams licensing: over twenty applications, reassignable named-user seats, shared libraries and consolidated billing on one renewal date.",
    keywords: ["creative cloud", "adobe cc teams", "creative cloud pricing", "all apps"],
    breadcrumb: adobeCrumb("Creative Cloud"),
    hero: {
      eyebrow: "Creative Cloud",
      headline: "Adobe Creative Cloud for Teams",
      subheadline:
        "The full Adobe application set per named user, with an admin console that makes seats an organisational asset rather than an individual's subscription.",
      primaryCta: { label: "Request pricing", href: "/enquiry" },
      secondaryCta: { label: "View product details", href: "/products/adobe-creative-cloud-all-apps-teams" },
    },
    intro: [
      "All Apps gives each user Photoshop, Illustrator, InDesign, Premiere Pro, After Effects, Lightroom, Acrobat Pro and the rest, plus cloud storage and the shared libraries that keep brand assets consistent across a team.",
      "The Teams edition adds what matters at organisational scale: seat assignment and reclamation, consolidated billing, and Adobe's advanced support.",
    ],
    sections: [
      {
        heading: "All Apps or Single App",
        body: [
          "Around four single applications, All Apps becomes cheaper per user, and it removes the administrative work of tracking who has which application. Below that threshold, single-app subscriptions cost less.",
          "A team agreement can hold a mix of both, so the decision is made per seat rather than for the whole team.",
        ],
      },
      {
        heading: "What the admin console changes",
        bullets: [
          "Seats assigned and unassigned in seconds, without contacting Adobe",
          "A leaver's entitlement recovered rather than lost until renewal",
          "Deployment packaged centrally instead of installed machine by machine",
          "One renewal date and one invoice across every seat",
          "Shared libraries so brand assets are the same for everyone",
        ],
      },
    ],
    productSlugs: [
      "adobe-creative-cloud-all-apps-teams",
      "adobe-creative-cloud-single-app-teams",
      "adobe-creative-cloud-enterprise",
    ],
    productsHeading: "Creative Cloud licensing",
    brandSlug: "adobe",
    related: [
      { label: "Photoshop", href: "/adobe-photoshop" },
      { label: "Illustrator", href: "/adobe-illustrator" },
      { label: "Premiere Pro", href: "/adobe-premiere-pro" },
    ],
    cta: {
      heading: "Get Creative Cloud pricing",
      body: "Volume pricing applies from modest seat counts. Send us the number and the application mix.",
    },
  },
  {
    slug: "adobe-acrobat",
    title: "Adobe Acrobat Licensing for Business",
    description:
      "Adobe Acrobat Standard and Pro licensing for teams: PDF creation, editing, redaction, comparison and e-signature with centralised seat management.",
    keywords: ["adobe acrobat", "acrobat licensing", "acrobat pro", "pdf editor business"],
    breadcrumb: adobeCrumb("Acrobat"),
    hero: {
      eyebrow: "Acrobat",
      headline: "Adobe Acrobat for business",
      subheadline:
        "The most widely deployed Adobe product in organisations with no creative team at all, because PDF handling is a universal business requirement rather than a design one.",
      primaryCta: { label: "Get Acrobat pricing", href: "/enquiry" },
      secondaryCta: { label: "Compare Standard and Pro", href: "/adobe-acrobat-pro" },
    },
    intro: [
      "Acrobat covers creation, editing, comparison, form handling, redaction and electronic signature collection — the document workflow that sits underneath contracts, tenders, compliance filings and everything else that leaves the organisation as a PDF.",
    ],
    sections: [
      {
        heading: "Standard or Pro",
        cards: [
          {
            title: "Acrobat Standard",
            body: "Create, edit, combine, fill and sign. Windows only. Sufficient where documents are internal and no redaction or comparison is needed.",
          },
          {
            title: "Acrobat Pro",
            body: "Adds redaction that permanently removes content, document comparison, accessibility checking, advanced forms and macOS support. Needed by any organisation handling contracts or regulated documents.",
          },
        ],
      },
    ],
    productSlugs: ["adobe-acrobat-pro-teams", "adobe-acrobat-standard-teams"],
    productsHeading: "Acrobat licensing",
    brandSlug: "adobe",
    related: [
      { label: "Acrobat Pro detail", href: "/adobe-acrobat-pro" },
      { label: "Creative Cloud", href: "/adobe-creative-cloud" },
    ],
    cta: {
      heading: "Get Acrobat pricing",
      body: "Tell us the seat count and whether redaction or document comparison is required. We will quote the edition you actually need.",
    },
  },
  {
    slug: "adobe-acrobat-pro",
    title: "Adobe Acrobat Pro — Pricing & Licensing for Teams",
    description:
      "Acrobat Pro for teams: redaction, document comparison, accessibility checking, advanced forms and e-signature, with reassignable seats and one renewal date.",
    keywords: ["acrobat pro", "acrobat pro price", "pdf redaction", "document comparison"],
    breadcrumb: [
      { label: "Home", href: "/" },
      { label: "Adobe", href: "/adobe" },
      { label: "Acrobat", href: "/adobe-acrobat" },
      { label: "Acrobat Pro" },
    ],
    hero: {
      eyebrow: "Acrobat Pro",
      headline: "Adobe Acrobat Pro for teams",
      subheadline:
        "The capabilities that justify Pro over a free reader are specific and easy to check against your workflow.",
      primaryCta: { label: "Request pricing", href: "/enquiry" },
      secondaryCta: { label: "View product details", href: "/products/adobe-acrobat-pro-teams" },
    },
    intro: [
      "Three capabilities repeatedly decide it: redaction that genuinely removes content rather than covering it, document comparison for contract review, and e-signature workflows that avoid a separate signing subscription.",
      "If none of those appear in your workflow, Acrobat Standard is a meaningfully cheaper seat and we will quote that instead.",
    ],
    sections: [
      {
        heading: "What Pro adds",
        bullets: [
          "Redaction that permanently removes content from the file, not just from the view",
          "Document comparison, showing exactly what changed between two versions",
          "PDF/A conversion and accessibility checking for compliance requirements",
          "Advanced form creation with data collection and export",
          "macOS support — Standard is Windows only",
          "Signature request and tracking without a separate product",
        ],
      },
      {
        heading: "A note on e-signature volume",
        body: [
          "Acrobat Pro includes signature request capability with a fair-use transaction allowance. High-volume or regulated signing workflows are served by Adobe Acrobat Sign, which is licensed separately.",
          "We will tell you which one your actual volume needs rather than selling the larger product by default.",
        ],
      },
    ],
    productSlugs: ["adobe-acrobat-pro-teams", "adobe-acrobat-standard-teams"],
    productsHeading: "Buy Acrobat Pro",
    brandSlug: "adobe",
    related: [
      { label: "Acrobat overview", href: "/adobe-acrobat" },
      { label: "Creative Cloud", href: "/adobe-creative-cloud" },
    ],
    cta: {
      heading: "Get Acrobat Pro pricing",
      body: "Send us the seat count. Volume pricing applies well below the threshold most buyers expect.",
    },
  },
  {
    slug: "adobe-photoshop",
    title: "Adobe Photoshop for Teams — Pricing & Licensing",
    description:
      "Photoshop for teams: image editing, compositing and retouching per named user, with reassignable seats, shared libraries and consolidated billing.",
    keywords: ["photoshop", "photoshop for teams", "photoshop business licence"],
    breadcrumb: adobeCrumb("Photoshop"),
    hero: {
      eyebrow: "Photoshop",
      headline: "Adobe Photoshop for teams",
      subheadline:
        "The reference tool for raster image work, licensed so the seat follows the role rather than the person who first received it.",
      primaryCta: { label: "Request pricing", href: "/enquiry" },
      secondaryCta: { label: "View product details", href: "/products/adobe-photoshop-teams" },
    },
    intro: [
      "Photoshop covers retouching, compositing, masking and colour correction, with generative fill now handling a meaningful share of routine masking and extension work.",
      "As a single-app Teams subscription it includes cloud storage, Adobe Fonts, Photoshop on iPad, and the admin console that makes the seat reassignable.",
    ],
    sections: [
      {
        heading: "Single app or All Apps",
        body: [
          "If your team also uses Illustrator, InDesign or Premiere Pro regularly, All Apps is usually cheaper once three or four applications are in play — and it covers occasional use of tools nobody would justify buying outright.",
          "For a dedicated retoucher who works only in Photoshop, the single application subscription is the honest recommendation.",
        ],
      },
      {
        heading: "Workstation considerations",
        bullets: [
          "16 GB RAM is a working minimum; 32 GB for large layered documents",
          "A GPU with 4 GB VRAM or more for the accelerated and generative features",
          "Fast NVMe scratch storage makes more difference than most buyers expect",
        ],
      },
    ],
    productSlugs: ["adobe-photoshop-teams", "adobe-creative-cloud-all-apps-teams"],
    productsHeading: "Buy Photoshop for teams",
    brandSlug: "adobe",
    related: [
      { label: "Illustrator", href: "/adobe-illustrator" },
      { label: "Creative Cloud All Apps", href: "/adobe-creative-cloud" },
      { label: "Workstations", href: "/products?category=workstations" },
    ],
    cta: {
      heading: "Get Photoshop pricing",
      body: "Tell us the seat count and whether other Adobe applications are in use. We will price both options.",
    },
  },
  {
    slug: "adobe-illustrator",
    title: "Adobe Illustrator for Teams — Pricing & Licensing",
    description:
      "Illustrator for teams: vector illustration, logo and packaging design per named user, with shared Creative Cloud Libraries and reassignable seats.",
    keywords: ["illustrator", "adobe illustrator teams", "vector design licence"],
    breadcrumb: adobeCrumb("Illustrator"),
    hero: {
      eyebrow: "Illustrator",
      headline: "Adobe Illustrator for teams",
      subheadline:
        "Vector work that scales without loss — logos, iconography, packaging artwork and technical illustration, output cleanly to print, signage, apparel and screen.",
      primaryCta: { label: "Request pricing", href: "/enquiry" },
      secondaryCta: { label: "View product details", href: "/products/adobe-illustrator-teams" },
    },
    intro: [
      "Illustrator is the vector counterpart to Photoshop. Where Photoshop edits pixels, Illustrator draws paths, which is why brand assets and anything destined for large-format output are built here.",
      "The single-app Teams subscription includes Adobe Fonts, cloud libraries shared with the rest of the team, and Illustrator on iPad.",
    ],
    sections: [
      {
        heading: "Shared libraries across a team",
        body: [
          "Creative Cloud Libraries are the practical reason to license Illustrator through a team agreement rather than individually. Brand colours, logos and type styles live in one place, and a change propagates to everyone using them.",
          "Without that, brand assets diverge quietly across a team until someone notices in print.",
        ],
      },
    ],
    productSlugs: ["adobe-illustrator-teams", "adobe-creative-cloud-all-apps-teams"],
    productsHeading: "Buy Illustrator for teams",
    brandSlug: "adobe",
    related: [
      { label: "Photoshop", href: "/adobe-photoshop" },
      { label: "Creative Cloud All Apps", href: "/adobe-creative-cloud" },
      { label: "CorelDRAW alternative", href: "/brands/corel" },
    ],
    cta: {
      heading: "Get Illustrator pricing",
      body: "Send us the seat count and application mix. A combined team agreement usually prices better than separate ones.",
    },
  },
  {
    slug: "adobe-premiere-pro",
    title: "Adobe Premiere Pro for Teams — Pricing & Licensing",
    description:
      "Premiere Pro for teams: multi-camera editing, colour grading and delivery per named user, with workstation guidance for 4K and multi-camera workflows.",
    keywords: ["premiere pro", "video editing licence", "adobe premiere teams"],
    breadcrumb: adobeCrumb("Premiere Pro"),
    hero: {
      eyebrow: "Premiere Pro",
      headline: "Adobe Premiere Pro for teams",
      subheadline:
        "The editing half of a video pipeline, with a round trip to After Effects for motion graphics and Audition for sound.",
      primaryCta: { label: "Request pricing", href: "/enquiry" },
      secondaryCta: { label: "View product details", href: "/products/adobe-premiere-pro-teams" },
    },
    intro: [
      "Premiere Pro handles multi-camera assembly, colour, audio and delivery. Editing is hardware-sensitive in a way most software is not, so before quoting seats we will usually ask what the source footage is.",
      "A 4K multi-camera timeline and a talking-head interview place very different demands on the workstation underneath. Quoting licences without asking that question produces a team that cannot use them productively.",
    ],
    sections: [
      {
        heading: "Workstation requirements by workload",
        cards: [
          {
            title: "Interview and corporate video",
            body: "16–32 GB RAM, a mid-range GPU and fast local storage. A well-specified general-purpose workstation is sufficient.",
          },
          {
            title: "4K multi-camera and colour work",
            body: "32–64 GB RAM, a GPU with 8 GB VRAM or more, and NVMe media storage. This is where a mis-specified machine costs editor hours every day.",
          },
        ],
      },
      {
        heading: "Beyond the editor",
        bullets: [
          "After Effects for motion graphics, via Dynamic Link rather than rendered exports",
          "Audition for sound cleanup and mixing",
          "Media Encoder for background delivery renders",
          "All three are included in All Apps, which is why video teams rarely buy Premiere alone",
        ],
      },
    ],
    productSlugs: ["adobe-premiere-pro-teams", "adobe-creative-cloud-all-apps-teams", "dell-precision-workstation"],
    productsHeading: "Premiere Pro and the hardware under it",
    brandSlug: "adobe",
    related: [
      { label: "Creative Cloud All Apps", href: "/adobe-creative-cloud" },
      { label: "Workstations", href: "/products?category=workstations" },
    ],
    cta: {
      heading: "Get Premiere Pro pricing",
      body: "Tell us the seat count and what footage the team works with. We will quote the licences and, if useful, the workstations to run them.",
    },
  },
];
