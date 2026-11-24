import type { Faq } from "./guides";

/**
 * Copy for the UAE section under /ae.
 *
 * The UAE pages are quote-only: no price appears on any of them, in rupees or in
 * dirhams. Everything said about the Ajman office comes from the site settings at
 * render time (address, phone, registrations), not from this file.
 */
export type UaePageCopy = {
  path: string;
  indiaPath: string;
  title: string;
  description: string;
  h1: string;
  breadcrumb: string;
  intro: string[];
  sections: Array<{ heading: string; paragraphs?: string[]; bullets?: string[] }>;
  faqs: Faq[];
  links: Array<{ href: string; label: string }>;
};

export const UAE_UPDATED = "2026-11-24";

export const UAE_PAGES: Record<"home" | "microsoft-365" | "autodesk" | "adobe", UaePageCopy> = {
  home: {
    path: "/ae",
    indiaPath: "/",
    title: "Microsoft, Adobe & Autodesk Licensing in the UAE | TechZoid",
    description:
      "Microsoft 365, Adobe and Autodesk licensing for UAE businesses from TechZoid's Ajman Free Zone office. Quoted in writing, with support. Request a quotation.",
    h1: "Microsoft, Adobe & Autodesk Licensing in the UAE",
    breadcrumb: "UAE",
    intro: [
      "TechZoid Technologies supplies Microsoft, Adobe and Autodesk software licences to businesses in the United Arab Emirates from an office in the Ajman Free Zone, alongside our head office in New Delhi, India. If your company is in the UAE and you need Microsoft 365, Adobe Creative Cloud or Acrobat, or AutoCAD and the other Autodesk products, you can ask us for a written quotation and we will return it for the programme and region that applies to you.",
      "This section is for buyers in the UAE. Buyers in India should use the main site, which lists tentative rupee prices and invoices with GST. UAE pricing is quote-only: we do not publish prices here, because the right programme, currency and tax treatment depend on who is buying and where, and we would rather confirm them on a quotation than show a figure that does not apply to you.",
    ],
    sections: [
      {
        heading: "The brands we supply in the UAE",
        paragraphs: [
          "We quote three publishers' business software to UAE customers. Each has its own page below, with a short summary and a link to the full product pages on our main site, where you can read what each product includes and who it is for.",
        ],
        bullets: [
          "Microsoft: Microsoft 365 business plans, Office, Windows and related products. See [Microsoft 365 in the UAE](/ae/microsoft-365).",
          "Adobe: Creative Cloud, Acrobat and the single-app subscriptions for teams. See [Adobe in the UAE](/ae/adobe).",
          "Autodesk: AutoCAD, Revit, Fusion and the industry collections. See [Autodesk in the UAE](/ae/autodesk).",
        ],
      },
      {
        heading: "How quoting works",
        paragraphs: [
          "Because pricing is quote-only, the quickest route is to tell us what you need. A request that names the product, the number of users and the term lets us answer in one reply instead of several.",
        ],
        bullets: [
          "Send the request through the [enquiry form](/enquiry) or [contact us](/contact), naming the products, the number of users or seats, and the term you want.",
          "Tell us the legal name of the company that will be invoiced and the emirate it is based in. If it is a free-zone company, say so.",
          "We return a written quotation. It fixes the price, states the currency and the tax treatment that apply, and says how the licences are delivered.",
          "You confirm by purchase order or written acceptance. We then help with activation and with assigning seats to your people.",
        ],
      },
      {
        heading: "Who this is for",
        paragraphs: [
          "UAE businesses that want one supplier for their core software: offices standardising on Microsoft 365, design and marketing teams buying Adobe subscriptions, and engineering, architecture and construction firms buying Autodesk. Because we quote across brands, a company that needs all three can ask for one quotation and one purchase order rather than three.",
          "If you are also buying for staff or sites in India, say so in your request. We can quote both markets, but the licences, currency and invoicing are separate, and we will keep them separate on paper.",
        ],
      },
      {
        heading: "Support and licence management",
        paragraphs: [
          "We help new customers with activation and with assigning seats in the publisher's admin console, and we can advise on renewals so that seats added during the year come back to one renewal date. Our wider services, including [Microsoft 365 deployment](/services/microsoft-365), [email migration](/services/email-migration) and [licence management](/services/licence-management), are described on the main site; tell us if you want a service quoted alongside the licences.",
        ],
      },
    ],
    faqs: [
      {
        question: "Does TechZoid supply Microsoft, Adobe and Autodesk licences in the UAE?",
        answer:
          "Yes. We quote Microsoft, Adobe and Autodesk business software to UAE customers from our Ajman Free Zone office. Send the products, the number of users and the term you need, and we return a written quotation.",
      },
      {
        question: "Why are there no prices on the UAE pages?",
        answer:
          "UAE pricing is quote-only. The programme, currency and tax treatment depend on who is buying and where, so we confirm them on a written quotation rather than publish a figure that may not apply to you. The rupee prices on our main site are for buyers in India.",
      },
      {
        question: "Where is the TechZoid office in the UAE?",
        answer:
          "Our UAE office is in the Ajman Free Zone, in the emirate of Ajman. The full address and our registration details are shown on this page and in the footer of every page on the site.",
      },
      {
        question: "Can you quote for the UAE and India on one request?",
        answer:
          "You can ask for both in one request, and we will respond for each market. The licences, currency and invoicing for the two markets are separate, so you will receive them as separate quotations.",
      },
      {
        question: "How are the licences delivered?",
        answer:
          "Software licences are delivered digitally. The quotation says how each one is provisioned, and we help with activation and with assigning seats to your users once you have confirmed the order.",
      },
      {
        question: "Which regional licence do I need if my company is in the UAE?",
        answer:
          "Publishers sell some programmes by region, so the licence that applies to a UAE company is not always the one sold in India. Tell us where the company is registered and where the users sit, and we confirm the right programme on the quotation before you commit.",
      },
    ],
    links: [
      { href: "/microsoft-365", label: "Microsoft 365 on the main site" },
      { href: "/adobe", label: "Adobe on the main site" },
      { href: "/autodesk", label: "Autodesk on the main site" },
      { href: "/about", label: "About TechZoid" },
    ],
  },
  "microsoft-365": {
    path: "/ae/microsoft-365",
    indiaPath: "/microsoft-365",
    title: "Microsoft 365 for UAE Businesses | TechZoid",
    description:
      "Microsoft 365 business plans for UAE companies, quoted in writing by TechZoid from Ajman. Business Basic, Standard and Premium. Request a quotation.",
    h1: "Microsoft 365 for UAE Businesses",
    breadcrumb: "Microsoft 365",
    intro: [
      "TechZoid quotes Microsoft 365 business plans to companies in the UAE from our Ajman Free Zone office. The plans most small and mid-sized businesses choose between are Business Basic, Business Standard and Business Premium, and each is described on our main site.",
      "UAE pricing is quote-only. Send us the plan, the number of users and the term, and we return a written quotation that states the price, the currency and how the subscriptions are provisioned.",
    ],
    sections: [
      {
        heading: "Choosing a plan",
        bullets: [
          "[Business Basic](/products/microsoft-365-business-basic): web and mobile Office apps with email, Teams and cloud storage, for staff who do not need the desktop apps.",
          "[Business Standard](/products/microsoft-365-business-standard): adds the desktop Office apps, the usual choice for office staff.",
          "[Business Premium](/products/microsoft-365-business-premium): adds device management and advanced security, for companies that want to manage laptops and protect data.",
        ],
        paragraphs: [
          "Our guide to [Basic, Standard and Premium](/blog/microsoft-365-business-basic-vs-standard-vs-premium) explains the differences in plain terms, and the [Microsoft 365 page](/microsoft-365) lists the full range. We can also help with [migration and deployment](/services/microsoft-365).",
        ],
      },
    ],
    faqs: [
      {
        question: "How do I get a Microsoft 365 quotation in the UAE?",
        answer:
          "Use the enquiry form and tell us the plan, the number of users, the term and the legal name of the company to be invoiced. We reply with a written quotation.",
      },
      {
        question: "Are prices shown for the UAE?",
        answer:
          "No. UAE pricing is quote-only, so the price, currency and tax treatment are confirmed on the written quotation.",
      },
      {
        question: "Can you help us move our email to Microsoft 365?",
        answer:
          "Yes. We offer Microsoft 365 deployment and email migration as services, which can be quoted alongside the licences.",
      },
    ],
    links: [
      { href: "/microsoft-365", label: "Microsoft 365: full details and tentative India prices" },
      { href: "/ae", label: "TechZoid in the UAE" },
    ],
  },
  autodesk: {
    path: "/ae/autodesk",
    indiaPath: "/autodesk",
    title: "Autodesk Software for UAE Businesses | TechZoid",
    description:
      "AutoCAD, Revit, Fusion and Autodesk collections for UAE companies, quoted in writing by TechZoid from Ajman. Request a quotation.",
    h1: "Autodesk Software for UAE Businesses",
    breadcrumb: "Autodesk",
    intro: [
      "TechZoid quotes Autodesk subscriptions to engineering, architecture and construction firms in the UAE from our Ajman Free Zone office. Our main site describes each product, who it suits and how it compares with the alternatives.",
      "UAE pricing is quote-only. Tell us the products, the number of users and the term, and we return a written quotation for the programme and region that applies to your company.",
    ],
    sections: [
      {
        heading: "Where to start",
        bullets: [
          "[AutoCAD](/products/autocad) and [AutoCAD LT](/products/autocad-lt): 2D and 3D drafting, and the lighter 2D-only option. See [AutoCAD vs AutoCAD LT](/blog/autocad-vs-autocad-lt).",
          "[Revit](/products/revit) for BIM, and the [AEC Collection](/products/aec-collection) for firms that use several Autodesk tools together.",
          "[Fusion](/products/fusion-360) for product design and manufacturing.",
        ],
        paragraphs: [
          "The [CAD software](/cad-software) and [BIM software](/bim-software) guides compare the options, and the [Autodesk page](/autodesk) lists the whole range.",
        ],
      },
    ],
    faqs: [
      {
        question: "How do I get an Autodesk quotation in the UAE?",
        answer:
          "Use the enquiry form and tell us the products, the number of users, the term and the company to be invoiced. We reply with a written quotation.",
      },
      {
        question: "Why is there no price on this page?",
        answer:
          "UAE pricing is quote-only. The programme, currency and tax treatment depend on the buyer, so we confirm them on the quotation.",
      },
      {
        question: "Can you quote Autodesk together with Microsoft or Adobe?",
        answer:
          "Yes. We quote across brands, so a company buying more than one publisher's software can ask for a single quotation.",
      },
    ],
    links: [
      { href: "/autodesk", label: "Autodesk: full details and tentative India prices" },
      { href: "/ae", label: "TechZoid in the UAE" },
    ],
  },
  adobe: {
    path: "/ae/adobe",
    indiaPath: "/adobe",
    title: "Adobe Creative Cloud & Acrobat for UAE Businesses | TechZoid",
    description:
      "Adobe Creative Cloud, Acrobat and single-app subscriptions for UAE teams, quoted in writing by TechZoid from Ajman. Request a quotation.",
    h1: "Adobe Creative Cloud & Acrobat for UAE Businesses",
    breadcrumb: "Adobe",
    intro: [
      "TechZoid quotes Adobe business subscriptions to design, marketing and office teams in the UAE from our Ajman Free Zone office. Our main site describes each product and how the named-user licences work.",
      "UAE pricing is quote-only. Tell us the products, the number of named users and the term, and we return a written quotation.",
    ],
    sections: [
      {
        heading: "Where to start",
        bullets: [
          "[Creative Cloud All Apps for Teams](/products/adobe-creative-cloud-all-apps-teams): the full set of Adobe creative applications under one named-user seat.",
          "[Photoshop](/products/adobe-photoshop-teams), [Illustrator](/products/adobe-illustrator-teams) and [Premiere Pro](/products/adobe-premiere-pro-teams): single-app subscriptions.",
          "[Acrobat Pro for Teams](/products/adobe-acrobat-pro-teams) and [Acrobat Standard](/products/adobe-acrobat-standard-teams) for PDF work.",
        ],
        paragraphs: [
          "Our [PDF software](/pdf-software) and [video editing software](/video-editing-software) guides help you choose, and the [Adobe page](/adobe) lists the whole range.",
        ],
      },
    ],
    faqs: [
      {
        question: "How do I get an Adobe quotation in the UAE?",
        answer:
          "Use the enquiry form and tell us the products, the number of named users, the term and the company to be invoiced. We reply with a written quotation.",
      },
      {
        question: "Why is there no price on this page?",
        answer:
          "UAE pricing is quote-only. The programme, currency and tax treatment depend on the buyer, so we confirm them on the quotation.",
      },
      {
        question: "Are Adobe licences assigned to named users?",
        answer:
          "Adobe's business subscriptions are licensed per named user through the Adobe Admin Console, and seats can be reassigned when people change role.",
      },
    ],
    links: [
      { href: "/adobe", label: "Adobe: full details and tentative India prices" },
      { href: "/ae", label: "TechZoid in the UAE" },
    ],
  },
};
