import type { Metadata } from "next";
import { LegalPage } from "@/components/marketing/legal-page";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Privacy Policy",
  description:
    "What personal data this site collects, why it is collected, how long it is kept and the choices available to you.",
  path: "/privacy",
});

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy policy"
      effectiveNote="This document describes the data handling implemented in this application at the time of writing."
      intro={[
        "This policy explains what personal data this website collects, why it is collected, how long it is kept and what choices you have. It describes the behaviour actually implemented in this application rather than a generic template.",
        "Throughout, “the Company” means the entity operating this website, and “you” means a visitor to it.",
      ]}
      sections={[
        {
          heading: "Data we collect, and when",
          paragraphs: [
            "We collect personal data at a small number of specific points. Nothing is collected passively for advertising or profiling purposes, and this site sets no third-party advertising or analytics cookies.",
          ],
          bullets: [
            "Enquiry form: name, business email, phone number, company name, optional GSTIN, country, optional city, optional user count, the products and quantities requested, your stated purchase timeline and any requirements you write.",
            "Contact form: name, email, optional phone, optional company name, the topic you select and your message.",
            "Account registration: name, business email, company name, optional phone number and a password, which is stored only as a bcrypt hash and is never recoverable or displayed.",
            "Company profile: registered legal name, optional GSTIN, website and address, which you supply for invoicing.",
            "Support tickets: the subject, category and message you write.",
            "Session records: a hashed session token, an expiry time, a non-reversible hash of your IP address and your browser's user-agent string, kept so that sessions can be expired and revoked.",
            "Audit records: for privileged and security-relevant actions, the action taken, the entity affected, the time, and a non-reversible hash of the IP address.",
          ],
        },
        {
          heading: "What we deliberately do not collect or store",
          bullets: [
            "We do not store your IP address in a readable form. Where an address is recorded for rate limiting or audit purposes, only a keyed hash is retained.",
            "We do not store passwords. Only a bcrypt hash is stored, and it is never included in any page, API response or log entry.",
            "We do not store payment card details on this platform.",
            "We do not set third-party advertising, tracking or analytics cookies.",
            "We do not sell personal data, and we do not share it for anyone else's marketing.",
          ],
        },
        {
          heading: "Why we process this data",
          bullets: [
            "To prepare and send the quotation you asked for, and to correspond with you about it.",
            "To operate your account, including keeping you signed in and letting you see your own enquiries, quotations, orders, licences and renewals.",
            "To issue tax invoices that carry your GSTIN and registered legal name correctly.",
            "To provide support in response to a ticket or message you raise.",
            "To protect the service — rate limiting, account lockout after repeated failed sign-ins, and an audit trail of privileged actions.",
            "To meet accounting and tax record-keeping obligations.",
          ],
        },
        {
          heading: "Cookies this site sets",
          paragraphs: [
            "This site sets two first-party cookies, both strictly necessary for it to function. Neither is used for tracking, and there are no third-party cookies.",
          ],
          bullets: [
            "A session cookie, set only after you sign in. It is HttpOnly, so scripts cannot read it, marked Secure in production, and SameSite=Lax. It expires after seven days or when you sign out, whichever is first.",
            "A CSRF token cookie, set for every visitor. It is deliberately readable by this site's own scripts so it can be echoed back on form submissions, which is how cross-site request forgery is prevented. It carries no personal data.",
            "Your enquiry basket is held in your browser's local storage rather than in a cookie, so it is never transmitted to us until you submit an enquiry.",
          ],
        },
        {
          heading: "How long we keep it",
          paragraphs: [
            "Retention periods should be confirmed against the operating entity's statutory obligations during the legal review of this document. The behaviour implemented in the application is described below.",
          ],
          bullets: [
            "Sessions expire seven days after creation and can be revoked earlier by signing out or by an administrator changing your role.",
            "Password reset tokens expire 30 minutes after being issued and can only be used once.",
            "Enquiries, quotations, orders and invoices are retained for as long as required for accounting and tax purposes.",
            "Account records are retained while the account is open. Deleted accounts are marked as deleted rather than erased immediately, so that historical transactions keep their integrity.",
          ],
        },
        {
          heading: "Who we share it with",
          paragraphs: [
            "We share personal data only where it is necessary to fulfil what you asked for, or where the law requires it.",
          ],
          bullets: [
            "Software publishers and distributors, where a licence must be provisioned to a named user or a tenant.",
            "Our hosting and email delivery providers, acting on our instructions.",
            "Tax and accounting authorities, where the law requires it.",
          ],
        },
        {
          heading: "Your rights",
          paragraphs: [
            "You can ask us for a copy of the personal data we hold about you, ask us to correct it, or ask us to delete it where we have no continuing legal obligation to retain it. You can update your own profile and company details directly in your account at any time.",
            "The specific statutory rights available to you depend on where you are located, and the applicable framework should be confirmed during the legal review of this document.",
          ],
        },
        {
          heading: "Security",
          paragraphs: [
            "The measures implemented in this application include: passwords hashed with bcrypt; session tokens stored only as keyed hashes so that a database disclosure cannot be replayed; HttpOnly, Secure, SameSite cookies; CSRF protection on every state-changing request; rate limiting and account lockout on authentication; server-side authorisation on every protected page and API route; a Content Security Policy; and automatic redaction of sensitive fields from application logs.",
            "No system is perfectly secure. If you believe you have found a vulnerability in this site, please contact us so it can be investigated.",
          ],
        },
        {
          heading: "Changes to this policy",
          paragraphs: [
            "If this policy changes materially, the revised version will be published on this page. Where the change affects how we use data you have already given us, we will tell you directly.",
          ],
        },
      ]}
    />
  );
}
