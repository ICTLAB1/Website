import type { Faq } from "./guides";

/**
 * The "plans and pricing" pages: each plan as a card with its price, what it includes
 * and how to buy it, grouped the way a buyer chooses.
 *
 * Nothing here states a price or a feature list. The cards read both from the catalogue
 * — the price from the cheapest public variant, the "what it includes" from the product's
 * own feature list — so a page cannot quote a figure the catalogue has since changed. What
 * is written here is the grouping, the short guidance and the questions, all of it facts the
 * site already states elsewhere.
 */
export type PlansGroup = {
  heading: string;
  blurb: string;
  slugs: string[];
};

export type PlansPage = {
  slug: string;
  title: string;
  description: string;
  h1: string;
  breadcrumb: string;
  intro: string;
  groups: PlansGroup[];
  /** Short "which one" guidance, one line each. */
  choose: Array<{ heading: string; body: string }>;
  faqs: Faq[];
  related: Array<{ href: string; label: string }>;
};

export const PLANS_UPDATED = "2026-11-25";

export const PLANS_PAGES: Record<string, PlansPage> = {
  "microsoft-365-business-plans-and-pricing": {
    slug: "microsoft-365-business-plans-and-pricing",
    title: "Microsoft 365 Business Plans and Pricing in India | TechZoid",
    description:
      "Compare Microsoft 365 Business Basic, Standard and Premium plans for up to 300 users, with prices excluding GST and a GST invoice. Get a quote today.",
    h1: "Microsoft 365 Business Plans and Pricing",
    breadcrumb: "Microsoft 365 business plans",
    intro:
      "Microsoft 365 Business plans are for organisations of up to 300 seats. They differ in three ways: whether staff get the installed Office applications, whether devices are managed, and how much security protection is built in. The prices below are per user, excluding GST, taken from our catalogue, and are tentative until a written quotation confirms them.",
    groups: [
      {
        heading: "Business plans",
        blurb: "The three plans most organisations of up to 300 users choose between.",
        slugs: ["microsoft-365-business-basic", "microsoft-365-business-standard", "microsoft-365-business-premium"],
      },
      {
        heading: "With Microsoft 365 Copilot",
        blurb: "The same plans with Microsoft's AI assistant built in.",
        slugs: ["microsoft-365-business-standard-with-copilot", "microsoft-365-business-premium-with-copilot"],
      },
      {
        heading: "Apps only, and add-ons",
        blurb: "For staff who need the Office applications without hosted email, or the Copilot add-on on top of a plan they already hold.",
        slugs: ["microsoft-365-apps-for-business", "microsoft-365-copilot"],
      },
    ],
    choose: [
      { heading: "Business Basic", body: "Web and mobile Office, business email and Teams, without the installed desktop applications. For staff who work mostly in the browser or on a phone." },
      { heading: "Business Standard", body: "Adds the installed desktop Office applications. The usual choice for office staff who work in Word, Excel, PowerPoint and Outlook all day." },
      { heading: "Business Premium", body: "Standard plus device management, advanced threat protection and information protection. For organisations that want to manage laptops and protect data without buying separate tools." },
    ],
    faqs: [
      {
        question: "What is the difference between Business Basic, Standard and Premium?",
        answer:
          "Business Basic gives web and mobile Office, business email and Teams, without the installed desktop applications. Business Standard adds the installed desktop applications. Business Premium adds device management, advanced threat protection and information protection on top of Standard.",
      },
      {
        question: "Is there a limit on the number of users?",
        answer:
          "Microsoft 365 Business plans are for organisations of up to 300 seats. Above that, the enterprise plans apply; they are on our [Microsoft 365 enterprise plans and pricing](/microsoft-365-enterprise-plans-and-pricing) page.",
      },
      {
        question: "How much does Microsoft 365 Business Premium cost in India?",
        answer:
          "Business Premium is {{price:microsoft-365-business-premium}} per user per year excluding GST, which is {{gst:microsoft-365-business-premium}} including 18% GST. The price is tentative and fixed by a written quotation.",
      },
      {
        question: "Can we mix different plans in one organisation?",
        answer:
          "Yes. Plans are assigned per user, so a company can put desk staff on Standard or Premium and occasional users on Basic. We quote the mix on one quotation.",
      },
      {
        question: "Do you charge GST, and can we claim it?",
        answer:
          "Every order is invoiced with 18% GST. GST-registered buyers can usually claim it as input credit; give us your registered entity name and GSTIN before the invoice is raised.",
      },
      {
        question: "How do I buy?",
        answer:
          "Ask for a written quotation, or use Buy now where a plan offers it. We accept orders against your purchase order, and we help with activation and with assigning seats.",
      },
    ],
    related: [
      { href: "/microsoft-365", label: "Microsoft 365: plans compared in detail" },
      { href: "/microsoft-365-enterprise-plans-and-pricing", label: "Microsoft 365 enterprise plans and pricing" },
      { href: "/blog/microsoft-365-business-basic-vs-standard-vs-premium", label: "Basic vs Standard vs Premium, explained" },
      { href: "/microsoft", label: "All Microsoft products" },
    ],
  },
  "microsoft-365-enterprise-plans-and-pricing": {
    slug: "microsoft-365-enterprise-plans-and-pricing",
    title: "Microsoft 365 Enterprise Plans and Pricing in India | TechZoid",
    description:
      "Compare Microsoft 365 E3, E5 and E7, Office 365 E1, E3 and E5, and frontline plans, with prices excluding GST and a GST invoice. Get a quote today.",
    h1: "Microsoft 365 Enterprise Plans and Pricing",
    breadcrumb: "Microsoft 365 enterprise plans",
    intro:
      "The Microsoft 365 enterprise plans have no seat ceiling and add security, compliance and analytics capabilities that the Business plans do not carry. The prices below are per user, excluding GST, taken from our catalogue, and are tentative until a written quotation confirms them. Where a plan shows no price, ask for today's price.",
    groups: [
      {
        heading: "Microsoft 365 enterprise plans",
        blurb: "Office applications, email, Teams and the Windows and security components, at three levels.",
        slugs: ["microsoft-365-e3", "microsoft-365-e5", "microsoft-365-e7", "microsoft-365-apps-for-enterprise"],
      },
      {
        heading: "Office 365 plans",
        blurb: "Office applications and services without the Windows and security components of Microsoft 365.",
        slugs: ["office-365-e1", "office-365-e3", "office-365-e5"],
      },
      {
        heading: "Frontline workers and add-ons",
        blurb: "Lighter plans for frontline staff, and the Copilot add-on for users who hold an eligible plan.",
        slugs: ["microsoft-365-f3", "office-365-f3", "microsoft-365-copilot"],
      },
    ],
    choose: [
      { heading: "Microsoft 365 E3", body: "Full desktop, web and mobile Office applications with enterprise security and compliance, and no seat ceiling." },
      { heading: "Microsoft 365 E5", body: "E3 plus advanced security, advanced compliance, Power BI Pro and voice capability, for organisations that want to consolidate security and analytics tools." },
      { heading: "Office 365 plans", body: "The Office applications and cloud services, for organisations that manage Windows and security separately." },
    ],
    faqs: [
      {
        question: "What is the difference between Microsoft 365 E3 and E5?",
        answer:
          "E5 adds advanced security, advanced compliance, Power BI Pro and voice capability to what E3 includes. E3 suits most large organisations; E5 suits those that want to replace separate security and analytics tools.",
      },
      {
        question: "What is the difference between Microsoft 365 and Office 365 plans?",
        answer:
          "The Office 365 plans cover the Office applications and cloud services. The Microsoft 365 plans add the Windows and security components. If you manage Windows and security separately, an Office 365 plan can be enough.",
      },
      {
        question: "How much does Microsoft 365 E3 cost in India?",
        answer:
          "Microsoft 365 E3 is {{price:microsoft-365-e3}} per user per year excluding GST, which is {{gst:microsoft-365-e3}} including 18% GST. The price is tentative and fixed by a written quotation.",
      },
      {
        question: "Is there a seat limit on the enterprise plans?",
        answer:
          "The enterprise plans have no seat ceiling. Organisations of up to 300 seats can also use the [Business plans](/microsoft-365-business-plans-and-pricing).",
      },
      {
        question: "Why do some plans show no price?",
        answer:
          "Where the catalogue holds no price for a plan, the card says \"Get today's price\" rather than showing a figure. We confirm the price, programme and term on a written quotation.",
      },
      {
        question: "Do you charge GST, and how do I buy?",
        answer:
          "Every order is invoiced with 18% GST, usually claimable as input credit by GST-registered buyers. Ask for a written quotation, and we accept orders against your purchase order.",
      },
    ],
    related: [
      { href: "/microsoft-365", label: "Microsoft 365: plans compared in detail" },
      { href: "/microsoft-365-business-plans-and-pricing", label: "Microsoft 365 business plans and pricing" },
      { href: "/blog/csp-vs-enterprise-agreement-which-microsoft-licensing-model", label: "CSP or Enterprise Agreement: which licensing model" },
      { href: "/microsoft", label: "All Microsoft products" },
    ],
  },
  "adobe-plans-and-pricing": {
    slug: "adobe-plans-and-pricing",
    title: "Adobe Creative Cloud and Acrobat Plans and Pricing in India | TechZoid",
    description:
      "Adobe Creative Cloud, single-app and Acrobat plans for teams, with prices excluding GST and a GST invoice. Named-user licences. Get a quote today.",
    h1: "Adobe Plans and Pricing",
    breadcrumb: "Adobe plans and pricing",
    intro:
      "Adobe's business subscriptions are licensed per named user. The prices below are per user, excluding GST, taken from our catalogue, and are tentative until a written quotation confirms them. Where a plan shows no price, ask for today's price.",
    groups: [
      {
        heading: "Creative Cloud for teams",
        blurb: "The full set of Adobe creative applications, or a single application, under one named-user seat.",
        slugs: ["adobe-creative-cloud-all-apps-teams", "adobe-creative-cloud-single-app-teams"],
      },
      {
        heading: "Single applications",
        blurb: "One application per seat, for teams that use one tool.",
        slugs: ["adobe-photoshop-teams", "adobe-illustrator-teams", "adobe-premiere-pro-teams", "adobe-after-effects-teams", "adobe-indesign-teams", "adobe-lightroom-teams"],
      },
      {
        heading: "Acrobat and PDF",
        blurb: "PDF creation, editing and signing, at three levels.",
        slugs: ["adobe-acrobat-standard-teams", "adobe-acrobat-pro-teams", "adobe-acrobat-studio"],
      },
    ],
    choose: [
      { heading: "All Apps", body: "For people who use several Adobe applications. All Apps includes Acrobat Pro, so those seats need no separate Acrobat licence." },
      { heading: "Single app", body: "For people who use one application. A single-application seat costs less than All Apps and can be reassigned." },
      { heading: "Acrobat", body: "Standard covers everyday PDF work on Windows; Pro adds redaction, comparison and macOS support; Studio adds AI-assisted creative and document tools." },
    ],
    faqs: [
      {
        question: "How are Adobe business subscriptions licensed?",
        answer:
          "Per named user, through the Adobe Admin Console. A seat is assigned to a person, usually by email address, and the administrator can reassign it when that person changes role or leaves.",
      },
      {
        question: "How much does Creative Cloud All Apps cost in India?",
        answer:
          "Creative Cloud All Apps for Teams is {{price:adobe-creative-cloud-all-apps-teams}} per user per year excluding GST, which is {{gst:adobe-creative-cloud-all-apps-teams}} including 18% GST. The price is tentative and fixed by a written quotation.",
      },
      {
        question: "Do we need Acrobat if we have Creative Cloud All Apps?",
        answer:
          "Usually not for those users: All Apps includes Acrobat Pro, so a separate seat would be a double payment.",
      },
      {
        question: "Why do some plans show no price?",
        answer:
          "Where the catalogue holds no price for a plan, the card says \"Get today's price\" rather than showing a figure. We confirm it on a written quotation.",
      },
      {
        question: "Do you charge GST, and how do I buy?",
        answer:
          "Every order is invoiced with 18% GST, usually claimable as input credit by GST-registered buyers. Ask for a written quotation; we accept orders against your purchase order and help with seat assignment.",
      },
    ],
    related: [
      { href: "/adobe", label: "Adobe: licensing explained" },
      { href: "/pdf-software", label: "PDF software buying guide" },
      { href: "/video-editing-software", label: "Video editing software buying guide" },
      { href: "/price-list", label: "Full price list" },
    ],
  },
  "autodesk-plans-and-pricing": {
    slug: "autodesk-plans-and-pricing",
    title: "Autodesk Plans and Pricing in India – AutoCAD, Revit, Fusion | TechZoid",
    description:
      "AutoCAD, Revit, Fusion and Autodesk collections with prices excluding GST and a GST invoice. Named-user subscriptions. Get a quote today.",
    h1: "Autodesk Plans and Pricing",
    breadcrumb: "Autodesk plans and pricing",
    intro:
      "Autodesk subscriptions are named-user: seats follow people rather than machines. The prices below are per user, excluding GST, taken from our catalogue, and are tentative until a written quotation confirms them. Where a product shows no price, ask for today's price.",
    groups: [
      {
        heading: "Drafting and design",
        blurb: "2D and 3D drafting, and product design.",
        slugs: ["autocad", "autocad-lt", "autodesk-inventor", "fusion-360"],
      },
      {
        heading: "Building and infrastructure",
        blurb: "BIM and civil design.",
        slugs: ["revit", "autodesk-revit-lt", "autodesk-civil-3d", "autocad-revit-lt-suite"],
      },
      {
        heading: "Collections and media",
        blurb: "Several Autodesk tools under one seat, and 3D animation and modelling.",
        slugs: ["aec-collection", "autodesk-product-design-manufacturing-collection", "3ds-max", "maya"],
      },
    ],
    choose: [
      { heading: "AutoCAD or AutoCAD LT", body: "AutoCAD covers 2D and 3D drafting with the industry toolsets; AutoCAD LT is the lower-priced 2D drafting subscription." },
      { heading: "A collection", body: "Where one person uses several Autodesk tools, a collection can cost less than separate subscriptions." },
      { heading: "Revit", body: "For BIM work. Revit LT is a lighter option for smaller BIM projects." },
    ],
    faqs: [
      {
        question: "How are Autodesk subscriptions licensed?",
        answer:
          "Per named user. A seat is assigned to a person, and the administrator can reassign it when that person leaves. Seats follow people rather than machines.",
      },
      {
        question: "How much does AutoCAD cost in India?",
        answer:
          "AutoCAD is {{price:autocad}} per user per year excluding GST, which is {{gst:autocad}} including 18% GST. The price is tentative and fixed by a written quotation. AutoCAD LT is listed separately at {{price:autocad-lt}}.",
      },
      {
        question: "Why do some products show no price?",
        answer:
          "Where the catalogue holds no price for a product, the card says \"Get today's price\" rather than showing a figure. We confirm it on a written quotation.",
      },
      {
        question: "Can longer terms be quoted?",
        answer:
          "The prices on this site are for the annual subscription. A longer term can be quoted on request, and the quotation states what it costs against the annual price.",
      },
      {
        question: "Do you charge GST, and how do I buy?",
        answer:
          "Every order is invoiced with 18% GST, usually claimable as input credit by GST-registered buyers. Ask for a written quotation, and we accept orders against your purchase order.",
      },
    ],
    related: [
      { href: "/autodesk", label: "Autodesk: licensing explained" },
      { href: "/cad-software", label: "CAD software buying guide" },
      { href: "/bim-software", label: "BIM software buying guide" },
      { href: "/price-list", label: "Full price list" },
    ],
  },
};

export const PLANS_ROUTES = Object.keys(PLANS_PAGES).map((slug) => `/${slug}`);
