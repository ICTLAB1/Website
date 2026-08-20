import type { Metadata } from "next";
import { LegalPage } from "@/components/marketing/legal-page";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Refund Policy",
  description:
    "How cancellations, returns and refunds work for software licences, subscriptions, hardware and services.",
  path: "/refund-policy",
});

export default function RefundPolicyPage() {
  return (
    <LegalPage
      title="Refund policy"
      intro={[
        "Refund treatment differs substantially between software licences, cloud subscriptions, hardware and services, because in most cases it is determined by the publisher or vendor rather than by us.",
        "This page sets out the general position for each category. The terms that actually apply to a specific purchase are those stated on its quotation.",
      ]}
      sections={[
        {
          heading: "Why software is treated differently",
          paragraphs: [
            "Once a software licence has been provisioned into your tenant or vendor account, or a key has been issued, the publisher has generally fulfilled its obligation. Most publishers do not permit a return at that point, and where they do it is within a short, specific window.",
            "We cannot offer a refund that the publisher will not honour. Where a cancellation is possible, we will process it; where it is not, we will tell you plainly rather than leave the request open.",
          ],
        },
        {
          heading: "Subscription licences",
          bullets: [
            "Cancellation windows are set by the publisher and are typically short — commonly measured in days from provisioning rather than weeks.",
            "Outside that window, an annual subscription generally runs to the end of its term. Seat reductions take effect at the renewal date rather than immediately.",
            "Monthly-commitment subscriptions can usually be reduced or cancelled from the next billing cycle.",
            "The specific window applying to your purchase is stated on the quotation before you order.",
          ],
        },
        {
          heading: "Perpetual licences",
          bullets: [
            "Once an entitlement is issued and the licence key delivered, a perpetual licence is generally non-returnable.",
            "Where an order has been placed but not yet fulfilled, it can normally be cancelled without charge.",
          ],
        },
        {
          heading: "Cloud consumption",
          paragraphs: [
            "Consumption-based cloud services are billed in arrears against actual usage and are not refundable, because the resources have been consumed.",
            "Reserved instances and savings plans are commitments with their own cancellation terms, which vary by provider and are stated on the quotation before you commit.",
          ],
        },
        {
          heading: "Hardware",
          bullets: [
            "Configured-to-order hardware is generally non-returnable once it has been built to your specification.",
            "Standard-configuration hardware may be returnable within the vendor's stated window, usually subject to it being unopened and a restocking charge.",
            "Faulty hardware is handled under the manufacturer's warranty and the support contract purchased with it, not as a return.",
          ],
        },
        {
          heading: "Services",
          bullets: [
            "Services already delivered are chargeable.",
            "Scheduled work can normally be rescheduled or cancelled without charge if notice is given within the period stated in the engagement.",
            "Where a fixed-price engagement is terminated part-way, charging is based on the work actually completed.",
          ],
        },
        {
          heading: "Errors on our part",
          paragraphs: [
            "If we supply the wrong product, the wrong edition, the wrong quantity or the wrong term against a confirmed quotation, we correct it at our cost. That includes cases where our licensing advice led you to a product that does not meet the requirement you described to us.",
            "This is not conditional on a cancellation window, and it applies whether or not the publisher would otherwise permit a return.",
          ],
        },
        {
          heading: "How to raise a request",
          paragraphs: [
            "Contact us with your order or enquiry reference and what you would like to change. We will tell you what is possible under the applicable terms, and what it will cost, before anything is actioned.",
            "The consumer protection obligations that may apply in addition to the above depend on jurisdiction and on whether the buyer is a business, and must be confirmed during the legal review of this document.",
          ],
        },
      ]}
    />
  );
}
