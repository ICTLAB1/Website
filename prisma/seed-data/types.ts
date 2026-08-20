export type LicenceTypeSeed =
  | "SUBSCRIPTION_ANNUAL"
  | "SUBSCRIPTION_MONTHLY"
  | "PERPETUAL"
  | "VOLUME"
  | "CSP"
  | "OEM"
  | "EDUCATION"
  | "MAINTENANCE";

export type VariantSeed = {
  sku: string;
  name: string;
  licenceType: LicenceTypeSeed;
  /** null for perpetual licences */
  termMonths: number | null;
  seats?: number;
  isDefault?: boolean;
  /**
   * INDICATIVE list price in paise. Sample catalogue data for development.
   * Replace with distributor pricing before going live - the product pages
   * label all pricing as indicative and subject to written quotation.
   */
  listPriceMinor: number;
  salePriceMinor?: number;
  gstRatePercent?: number;
};

export type ProductSeed = {
  slug: string;
  name: string;
  brand: string;
  category: string;
  shortDescription: string;
  description: string;
  features: string[];
  compatibility: string[];
  keywords: string[];
  licensingNotes?: string;
  deliveryNotes?: string;
  supportNotes?: string;
  availability?: "IN_STOCK" | "MADE_TO_ORDER" | "ON_REQUEST" | "DISCONTINUED";
  purchaseMode?: "DIRECT" | "ENQUIRY" | "BOTH";
  featured?: boolean;
  popularity?: number;
  variants: VariantSeed[];
  faqs?: Array<{ question: string; answer: string }>;
};

/** Shared boilerplate so every product page carries consistent operational copy. */
export const DELIVERY_SUBSCRIPTION =
  "Subscriptions are provisioned into your tenant or vendor account, typically within one business day of a confirmed purchase order. Licence assignment and admin console access are handled with your IT team.";

export const DELIVERY_PERPETUAL =
  "Perpetual licences are delivered electronically with the publisher's entitlement record and download links, typically within one business day of a confirmed purchase order.";

export const DELIVERY_HARDWARE =
  "Hardware is configured to the agreed bill of materials and shipped from the vendor or distributor. Lead times are confirmed in writing on the quotation before order placement.";

export const SUPPORT_STANDARD =
  "Includes procurement support, licence assignment assistance and renewal reminders. Deployment, migration and managed support are available as separate engagements.";
