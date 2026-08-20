import type { Metadata } from "next";
import { LegalPage } from "@/components/marketing/legal-page";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Terms of Service",
  description:
    "The terms on which this website is provided, how quotations and orders work, and the limits of what is offered here.",
  path: "/terms",
});

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of service"
      intro={[
        "These terms govern your use of this website and the enquiry and account features it provides. They describe how quotations and orders actually work in this application.",
        "Throughout, “the Company” means the entity operating this website, and “you” means a visitor or account holder.",
      ]}
      sections={[
        {
          heading: "What this website is",
          paragraphs: [
            "This website presents a catalogue of software licensing, cloud services and IT products, and allows you to build an enquiry and request a quotation. It is a business-to-business service intended for organisations rather than consumers.",
          ],
        },
        {
          heading: "Pricing shown on this site",
          paragraphs: [
            "Prices displayed in the catalogue are indicative and exclude GST. They are not an offer capable of acceptance, and they do not form a contract.",
            "Binding pricing is given only in a written quotation issued to you. A quotation states its own validity period, the GST position, delivery timelines and the licensing terms that apply. Where a quotation and this website disagree, the quotation governs.",
            "Prices may change without notice, including because a publisher changes its own pricing or because a currency movement affects the underlying cost.",
          ],
        },
        {
          heading: "Enquiries and orders",
          bullets: [
            "Submitting an enquiry is a request for a quotation. It does not create an order and does not commit either party.",
            "An order is created when you issue a purchase order against a valid quotation and we accept it in writing.",
            "We may decline an order, including where a publisher declines to supply, where the pricing on a quotation was affected by an error, or where we cannot verify the licensing eligibility claimed.",
            "Product availability and lead times are confirmed on the quotation. Where a lead time changes after acceptance, we will tell you.",
          ],
        },
        {
          heading: "Licensing terms are set by the publisher",
          paragraphs: [
            "Software supplied through us is licensed to you by its publisher under that publisher's own licence terms, not by us. Your rights to install, use, transfer and reassign the software are governed by those terms.",
            "We will identify the applicable licensing model and its material constraints on the quotation. We cannot vary a publisher's licence terms, and nothing said by us modifies them.",
            "It is your responsibility to ensure your deployment stays within the entitlements you hold. Where we provide licence management as a service, the scope of that responsibility is set out in the service agreement.",
          ],
        },
        {
          heading: "Accounts",
          bullets: [
            "You are responsible for keeping your account credentials confidential and for activity carried out under your account.",
            "You must give accurate registration and company information. Invoicing details, in particular the GSTIN and registered legal name, must match your registration exactly.",
            "You must not attempt to access another organisation's data, probe the service for vulnerabilities without authorisation, or use automated means to extract the catalogue at scale.",
            "We may suspend an account where these terms are breached, or where we reasonably believe it has been compromised.",
          ],
        },
        {
          heading: "Availability of this website",
          paragraphs: [
            "We aim to keep this website available, but we do not guarantee uninterrupted access. It may be unavailable for maintenance, or for reasons outside our control.",
            "Service levels for managed services and support, where purchased, are set out in the relevant service agreement rather than here.",
          ],
        },
        {
          heading: "Content and trademarks",
          paragraphs: [
            "The content of this website belongs to the Company or its licensors. You may not reproduce it commercially without permission.",
            "Third-party product names and trademarks referenced on this site belong to their respective owners and are used descriptively, to identify the software supplied. Their use does not imply endorsement by, or affiliation with, those owners beyond a commercial reselling relationship.",
          ],
        },
        {
          heading: "Liability",
          paragraphs: [
            "The extent to which liability can be limited depends on applicable law and on the contract under which goods or services are supplied. This section must be drafted by a qualified adviser against the operating entity's actual contracting position and insurance, and should not be relied upon as it stands.",
            "As a general statement of intent: this website is provided for information and for requesting quotations, and the terms of any supply are those agreed in the quotation and any accompanying service agreement.",
          ],
        },
        {
          heading: "Governing law",
          paragraphs: [
            "The governing law and jurisdiction must be specified by the operating entity during the legal review of this document, and should match the jurisdiction stated in its quotations and service agreements.",
          ],
        },
      ]}
    />
  );
}
