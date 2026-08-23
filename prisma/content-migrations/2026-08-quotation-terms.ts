import type { ContentMigration } from "./types";

/**
 * The quotation's standard terms, as the business supplied them.
 *
 * These live in `SiteSettings.quoteTerms`, the field an administrator edits,
 * and are written here for the same reason as every other supplied value: a
 * setting typed into one environment's panel exists in that environment only,
 * and these have to be on the document the moment the deploy finishes.
 *
 * Until now that field was deliberately empty and the quotation printed no
 * terms of its own, only a link to the published ones — because payment terms,
 * delivery timelines and a liability position are commitments a business makes
 * to a customer, and a plausible default mailed out under its name would be
 * putting words in its mouth. These are not a default this application chose.
 * They arrived in the business's own design pack.
 *
 * ## Why it refuses to overwrite
 *
 * Anything already stored is left alone. The field exists so a person can
 * decide what this business commits to, and a migration that replaced a later
 * revision with this list would undo that silently, during a deploy.
 */
const TERMS = [
  "Quotation is valid for 30 days from the date of issue unless otherwise specified.",
  "Prices are exclusive of applicable GST, taxes, duties, freight and other charges unless specifically stated otherwise.",
  "Product, service and availability are subject to confirmation at the time of order.",
  "Order confirmation is subject to receipt and acceptance of a valid Purchase Order and/or payment, as applicable.",
  "Payment terms shall be as specified in this quotation and are subject to TechZoid's approved commercial terms.",
  "Delivery timelines are indicative and may vary depending on product availability, manufacturer/distributor schedules and logistics.",
  "Product specifications, models and availability may be subject to change by the respective manufacturer without prior notice.",
  "Hardware products are subject to the applicable manufacturer's warranty and support terms.",
  "Any installation, configuration, deployment or other professional services are included only where specifically mentioned in this quotation.",
  "Any cancellation, modification or change to an order after confirmation shall be subject to applicable commercial and supplier terms.",
  "The customer is responsible for providing accurate billing, delivery and order-related information required for fulfilment.",
  "TechZoid Technologies Private Limited shall not be responsible for delays caused by circumstances beyond its reasonable control, including manufacturer, distributor, logistics or regulatory delays.",
  "Acceptance of this quotation constitutes acceptance of the applicable terms and conditions stated herein, unless otherwise agreed in writing.",
  "All disputes shall be subject to the jurisdiction of the courts at New Delhi, India.",
].join("\n");

export const quotationTerms: ContentMigration = {
  id: "2026-08-quotation-terms",
  describe: "the quotation's standard terms, as supplied",

  async apply(prisma) {
    const existing = await prisma.siteSettings.findUnique({
      where: { id: "singleton" },
      select: { quoteTerms: true },
    });

    if (existing?.quoteTerms?.trim()) {
      return "quotation terms are already set — left alone";
    }

    await prisma.siteSettings.upsert({
      where: { id: "singleton" },
      create: { id: "singleton", quoteTerms: TERMS },
      update: { quoteTerms: TERMS },
    });

    return "14 standard terms written to the quotation";
  },
};
