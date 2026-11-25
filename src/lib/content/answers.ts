/**
 * The plain answers at the top of the money pages, and the short question-and-answer
 * headings under them — the shape search engines and AI assistants quote from.
 *
 * Every figure is a `{{price:<slug>}}` / `{{gst:<slug>}}` token resolved from the catalogue when
 * the page renders. `{reseller}` becomes "an Autodesk reseller" unless the site holds a
 * current, published partner designation for the brand, in which case it names that
 * designation: this file never states a partner level of its own.
 */
export type Answer = {
  brand: "autodesk" | "microsoft" | "zoho" | "multi";
  answer: string;
  qas: Array<{ q: string; a: string }>;
  /** A price article the page links to, by blog slug. Shown only if that article is published. */
  guide?: { slug: string; label: string };
  /** For a landing page about one product: the product whose price it states, for Product and Offer markup. */
  schemaProduct?: string;
};

const AUTOCAD: Answer = {
  brand: "autodesk",
  answer:
    "AutoCAD is Autodesk's software for 2D drafting and 3D design, sold as a named-user subscription. It costs {{price:autocad}} per user per year in India (1-year subscription, excluding GST), and it suits architects, engineers, drafters and construction teams. TechZoid is {reseller}.",
  qas: [
    { q: "How much does AutoCAD cost in India?", a: "AutoCAD is {{price:autocad}} per user per year excluding GST, or {{gst:autocad}} including 18% GST. The price is tentative and fixed by a written quotation." },
    { q: "Which is better, AutoCAD or AutoCAD LT?", a: "It depends on the work. AutoCAD LT ({{price:autocad-lt}} per user per year) covers 2D drafting and documentation. AutoCAD ({{price:autocad}}) adds 3D modelling and the industry toolsets. If your team only drafts in 2D, LT is usually enough." },
    { q: "Is AutoCAD a subscription or a one-time purchase?", a: "AutoCAD is a named-user subscription, not a one-time purchase. A seat is assigned to a person and can be reassigned when they leave." },
  ],
  guide: { slug: "autocad-subscription-price-in-india", label: "AutoCAD price in India: the full price guide" },
};

const REVIT: Answer = {
  brand: "autodesk",
  answer:
    "Revit is Autodesk's building information modelling (BIM) software for architecture, structural and MEP design. It costs {{price:revit}} per user per year in India (excluding GST), and it suits architects, structural and MEP engineers and construction teams. TechZoid is {reseller}.",
  qas: [
    { q: "How much does Revit cost in India?", a: "Revit is {{price:revit}} per user per year excluding GST, or {{gst:revit}} including 18% GST. The price is tentative and fixed by a written quotation." },
    { q: "Which is better, Revit or AutoCAD?", a: "Revit is for BIM: one model from which plans, sections and schedules are produced. AutoCAD ({{price:autocad}} per user per year) is for drafting. Many practices use both; our [Revit vs AutoCAD](/blog/revit-vs-autocad) article explains the choice." },
    { q: "Is Revit a subscription or a one-time purchase?", a: "Revit is a named-user subscription, not a one-time purchase." },
  ],
};

const ANSWERS: Record<string, Answer> = {
  "/autocad": { ...AUTOCAD, schemaProduct: "autocad" },
  "/products/autocad": AUTOCAD,
  "/products/autocad-lt": {
    brand: "autodesk",
    answer:
      "AutoCAD LT is the 2D drafting and documentation version of AutoCAD, sold as an annual named-user subscription. It costs {{price:autocad-lt}} per user per year in India, excluding GST, and it suits teams that draft in 2D. TechZoid is {reseller}.",
    qas: [
      { q: "How much does AutoCAD LT cost in India?", a: "AutoCAD LT is {{price:autocad-lt}} per user per year excluding GST, or {{gst:autocad-lt}} including 18% GST. The price is tentative and fixed by a written quotation." },
      { q: "Which is better, AutoCAD LT or AutoCAD?", a: "AutoCAD LT covers 2D drafting and documentation and costs less. AutoCAD ({{price:autocad}} per user per year) adds 3D modelling and the industry toolsets. Choose LT if your team only drafts in 2D; our [AutoCAD vs AutoCAD LT](/blog/autocad-vs-autocad-lt) article explains the difference." },
      { q: "Is AutoCAD LT a subscription?", a: "Yes. It is sold as an annual named-user subscription, not a one-time purchase." },
    ],
    guide: { slug: "autocad-subscription-price-in-india", label: "AutoCAD price in India: the full price guide" },
  },
  "/revit": { ...REVIT, schemaProduct: "revit" },
  "/products/revit": REVIT,
  "/cad-software": {
    brand: "autodesk",
    answer:
      "CAD software is used to draft and design in 2D and 3D. In India, AutoCAD costs {{price:autocad}} per user per year and AutoCAD LT {{price:autocad-lt}}, both excluding GST, and Fusion is {{price:fusion-360}}. TechZoid is {reseller}, and quotes every product on a written quotation with a GST invoice.",
    qas: [
      { q: "How much does CAD software cost in India?", a: "On our catalogue prices, AutoCAD LT is {{price:autocad-lt}} per user per year, AutoCAD is {{price:autocad}} and Fusion is {{price:fusion-360}}, all excluding 18% GST. Prices are tentative and fixed by a written quotation." },
      { q: "Which CAD software should a small firm buy?", a: "For 2D drafting only, AutoCAD LT is usually enough. For 3D modelling or an industry toolset, buy AutoCAD. For product design and manufacturing, look at Fusion." },
    ],
    guide: { slug: "autocad-subscription-price-in-india", label: "AutoCAD price in India: the full price guide" },
  },
  "/bim-software": {
    brand: "autodesk",
    answer:
      "BIM software builds one data-rich model of a building from which drawings and schedules are produced. In India, Revit costs {{price:revit}} per user per year excluding GST, and the AEC Collection, which bundles several Autodesk tools, costs {{price:aec-collection}}. TechZoid is {reseller}.",
    qas: [
      { q: "How much does BIM software cost in India?", a: "Revit is {{price:revit}} per user per year and the AEC Collection is {{price:aec-collection}}, both excluding 18% GST. Prices are tentative and fixed by a written quotation." },
      { q: "Which is better, Revit or the AEC Collection?", a: "Revit alone suits a person who only models. The AEC Collection suits a person who uses several Autodesk tools, where a collection can cost less than separate subscriptions." },
    ],
  },
  "/microsoft-365": {
    brand: "microsoft",
    answer:
      "Microsoft 365 is Microsoft's subscription for Office apps, business email, Teams and security. In India, Business Basic is {{price:microsoft-365-business-basic}}, Business Standard is {{price:microsoft-365-business-standard}} and Business Premium is {{price:microsoft-365-business-premium}} per user per year, excluding GST, for organisations of up to 300 seats. TechZoid is {reseller}.",
    qas: [
      { q: "How much does Microsoft 365 cost in India?", a: "Business Basic is {{price:microsoft-365-business-basic}}, Business Standard {{price:microsoft-365-business-standard}} and Business Premium {{price:microsoft-365-business-premium}} per user per year excluding 18% GST. Enterprise plans are on our [enterprise plans and pricing](/microsoft-365-enterprise-plans-and-pricing) page." },
      { q: "Which Microsoft 365 plan should a business choose?", a: "Basic gives web and mobile Office without the desktop apps. Standard adds the desktop apps. Premium adds device management and advanced threat protection. See the [business plans and pricing](/microsoft-365-business-plans-and-pricing) page." },
      { q: "Is there a user limit?", a: "Microsoft 365 Business plans are for organisations of up to 300 seats. Larger organisations use the enterprise plans." },
    ],
  },
  "/products/microsoft-365-business-standard": {
    brand: "microsoft",
    answer:
      "Microsoft 365 Business Standard gives desktop Office applications, business email and Teams to organisations of up to 300 seats. It costs {{price:microsoft-365-business-standard}} per user per year in India, excluding GST, and it suits office staff who work in Word, Excel, PowerPoint and Outlook. TechZoid is {reseller}.",
    qas: [
      { q: "How much does Microsoft 365 Business Standard cost in India?", a: "{{price:microsoft-365-business-standard}} per user per year excluding GST, or {{gst:microsoft-365-business-standard}} including 18% GST. The price is tentative and fixed by a written quotation." },
      { q: "What is the difference between Business Basic and Business Standard?", a: "Business Basic ({{price:microsoft-365-business-basic}}) has web and mobile Office only. Business Standard adds the installed desktop Office applications." },
      { q: "Which is better, Business Standard or Business Premium?", a: "Premium ({{price:microsoft-365-business-premium}}) adds device management, advanced threat protection and information protection to Standard. Choose Premium if you want to manage laptops and protect data without separate tools." },
    ],
  },
  "/products/microsoft-office-ltsc-professional-plus-2024": {
    brand: "microsoft",
    answer:
      "Office LTSC Professional Plus 2024 is Microsoft's volume-licensed, one-time-purchase Office suite for organisations. It costs {{price:microsoft-office-ltsc-professional-plus-2024}} per licence in India, excluding GST, and it suits organisations that want a fixed Office version without a subscription. TechZoid is {reseller}.",
    qas: [
      { q: "How much does Office LTSC Professional Plus 2024 cost in India?", a: "{{price:microsoft-office-ltsc-professional-plus-2024}} per licence excluding GST, or {{gst:microsoft-office-ltsc-professional-plus-2024}} including 18% GST. The price is tentative and fixed by a written quotation." },
      { q: "Which is better, Office LTSC or Microsoft 365?", a: "Office LTSC is bought once and stays on a fixed version. Microsoft 365 is a subscription that adds email, Teams and cloud services and keeps updating. Our [Office 2024 vs Microsoft 365](/blog/microsoft-office-ltsc-2024-vs-microsoft-365) article explains the choice." },
      { q: "Is Office LTSC a subscription?", a: "No. It is a perpetual, volume-licensed purchase." },
    ],
  },
  "/price-list": {
    brand: "multi",
    answer:
      "TechZoid's price list shows every product we supply with its annual price per user in rupees, excluding 18% GST. For example, AutoCAD is {{price:autocad}}, Microsoft 365 Business Standard is {{price:microsoft-365-business-standard}} and Adobe Creative Cloud All Apps for Teams is {{price:adobe-creative-cloud-all-apps-teams}}. Prices are tentative and confirmed on a written quotation. TechZoid supplies Microsoft, Adobe, Autodesk and Zoho software.",
    qas: [
      { q: "Are these prices final?", a: "No. Prices on the website are tentative and exclude GST. A written quotation, which takes account of your quantity and licensing programme, fixes the price." },
      { q: "Do the prices include GST?", a: "No. Every order is invoiced with 18% GST on top. GST-registered buyers can usually claim it as input credit." },
    ],
  },
  "/zoho-workplace": {
    brand: "zoho",
    answer:
      "Zoho Workplace is Zoho's business email and collaboration suite. It costs {{price:zoho-workplace}} per user per year in India on the Standard plan (annual billing, excluding GST), and it suits small and mid-sized businesses that want email with office apps in one subscription.",
    qas: [
      { q: "How much does Zoho Workplace cost in India?", a: "Zoho Workplace Standard is {{price:zoho-workplace}} per user per year excluding GST, or {{gst:zoho-workplace}} including 18% GST. The price is tentative and fixed by a written quotation." },
      { q: "What is the difference between Zoho Mail and Zoho Workplace?", a: "Zoho Mail is business email, from {{price:zoho-mail}} per user per year. Zoho Workplace adds Zoho's office and collaboration applications to the email." },
    ],
    guide: { slug: "zoho-pricing-in-india-how-it-works", label: "Zoho pricing in India: how it works" },
  },
  "/products/zoho-workplace": {
    brand: "zoho",
    answer:
      "Zoho Workplace is Zoho's business email and collaboration suite. It costs {{price:zoho-workplace}} per user per year in India on the Standard plan (annual billing, excluding GST), and it suits small and mid-sized businesses that want email with office apps in one subscription.",
    qas: [
      { q: "How much does Zoho Workplace cost in India?", a: "Zoho Workplace Standard is {{price:zoho-workplace}} per user per year excluding GST, or {{gst:zoho-workplace}} including 18% GST. The price is tentative and fixed by a written quotation." },
      { q: "Is Zoho Workplace billed monthly or annually?", a: "The Zoho prices in our catalogue are annual, per user. Ask for a quotation if you want a different term." },
    ],
    guide: { slug: "zoho-pricing-in-india-how-it-works", label: "Zoho pricing in India: how it works" },
  },
  "/products/windows-11-pro-upgrade": {
    brand: "microsoft",
    answer:
      "The Windows 11 Pro upgrade licence upgrades a device that already runs Windows 11 Home to Pro. It costs {{price:windows-11-pro-upgrade}} per device in India (one-time, perpetual, excluding GST), and it suits businesses that need domain join, BitLocker and Group Policy. TechZoid is {reseller}.",
    qas: [
      { q: "How much does the Windows 11 Pro upgrade cost in India?", a: "{{price:windows-11-pro-upgrade}} per device excluding GST, or {{gst:windows-11-pro-upgrade}} including 18% GST. The price is tentative and fixed by a written quotation." },
      { q: "What is the difference between the upgrade and a full licence?", a: "The upgrade moves a device that already has Windows 11 Home to Pro. A full Windows 11 Pro licence is for a device with no qualifying Windows licence, and is quoted on request." },
    ],
    guide: { slug: "windows-11-pro-upgrade-licence-price-in-india", label: "Windows licence cost in India: the full price guide" },
  },
};

export function answerFor(path: string): Answer | null {
  return ANSWERS[path] ?? null;
}
