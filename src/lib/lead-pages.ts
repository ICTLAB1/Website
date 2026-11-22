/**
 * The pages that open with the enquiry form, and what each one offers to ask about.
 *
 * Plain data, so the page, the form and the tests read the same list. The
 * options in "Product interested in" are the products and services this site
 * already names on its own pages; nothing here is a new claim about what is
 * sold. Each list ends with a way out for the visitor who does not know yet,
 * because a required select with no honest option is how a lead is lost.
 */

export const NOT_SURE = "Other / not sure yet";

export type LeadPage = {
  /** Reported with the conversion, so a report can tell the forms apart. */
  source: string;
  heading: string;
  /** What the visitor is choosing between in "Product interested in". */
  products: readonly string[];
  /** Replaces the sentence under the heading, for a page that quotes a service rather than products. */
  intro?: string;
  /** Replaces "Estimated quantity or number of licences" where the count is users or devices, not licences. */
  quantityLabel?: string;
  quantityHint?: string;
  /** Replaces "Request a quotation" on the submit button. */
  submitLabel?: string;
};

export const LEAD_PAGES: Record<string, LeadPage> = {
  "microsoft-365": {
    source: "landing_microsoft_365",
    heading: "Get a Microsoft 365 quotation",
    products: [
      "Microsoft 365 Business Basic",
      "Microsoft 365 Business Standard",
      "Microsoft 365 Business Premium",
      "Microsoft 365 Business Standard with Copilot",
      "Microsoft 365 Business Premium with Copilot",
      "Microsoft 365 E3",
      "Microsoft 365 E5",
      "Office 365 (E1, E3 or E5)",
      NOT_SURE,
    ],
  },
  "adobe-licensing": {
    source: "landing_adobe_licensing",
    heading: "Get an Adobe licensing quotation",
    products: [
      "Creative Cloud All Apps",
      "Creative Cloud Single App",
      "Acrobat Pro",
      "Acrobat Standard",
      "Photoshop",
      "Illustrator",
      "Premiere Pro",
      "InDesign",
      NOT_SURE,
    ],
  },
  "autodesk-licensing": {
    source: "landing_autodesk_licensing",
    heading: "Get an Autodesk licensing quotation",
    products: [
      "AutoCAD",
      "AutoCAD LT",
      "Revit",
      "Inventor",
      "AEC Collection",
      "Civil 3D",
      "Maya",
      "Fusion",
      "Autodesk Construction Cloud",
      NOT_SURE,
    ],
  },
  "enterprise-it-hardware": {
    source: "landing_enterprise_it_hardware",
    heading: "Get an IT hardware quotation",
    products: [
      "Rack servers",
      "Tower servers",
      "Business laptops",
      "Tower desktops",
      "Small form factor desktops",
      "All-in-one desktops",
      "Desktop workstations",
      "Storage",
      "Networking",
      NOT_SURE,
    ],
  },
  "corporate-it-solutions": {
    source: "landing_corporate_it_solutions",
    heading: "Talk to us about your IT requirement",
    products: [
      "Cloud migration and advisory",
      "Microsoft 365 deployment",
      "Cybersecurity",
      "Email migration",
      "Backup and disaster recovery",
      "Software asset management",
      "Endpoint management",
      "IT helpdesk",
      "IT procurement",
      NOT_SURE,
    ],
  },
};

LEAD_PAGES["managed-it-services"] = {
  source: "landing_managed_it_services",
  heading: "Get a managed IT services proposal",
  intro:
    "Tell us who you are and roughly how big your estate is. We reply with a written proposal that states the scope, the response commitments and the price. Nothing is agreed or charged by sending this.",
  quantityLabel: "Number of users or devices to support",
  quantityHint: "A rough number is fine.",
  submitLabel: "Request a proposal",
  products: [
    "IT helpdesk and managed support",
    "Endpoint management",
    "Backup and disaster recovery",
    "Cybersecurity",
    "Cloud operations (Azure, AWS or Google Cloud)",
    "Microsoft 365 support",
    "Software asset and licence management",
    NOT_SURE,
  ],
};

export function leadPageFor(slug: string): LeadPage | null {
  return Object.hasOwn(LEAD_PAGES, slug) ? (LEAD_PAGES[slug] as LeadPage) : null;
}
