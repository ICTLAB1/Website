/**
 * Writes the legal pages into the CMS.
 *
 * These were the last four compiled pages, and their content was a placeholder:
 * the liability and governing-law sections said, in as many words, that they
 * had to be drafted by someone. This replaces them with documents written for
 * what this business actually is — an Indian private limited company reselling
 * enterprise software licences and services to other businesses, quotation-led,
 * taking no card payments — and adds the delivery policy that was missing.
 *
 * Three things to know about how this is written:
 *
 *  - Entity details are never transcribed. Registered name, address, GSTIN and
 *    the grievance officer come from server configuration and are rendered by
 *    the COMPANY_INFO block, so they cannot drift between five documents.
 *  - Every page opens with a NOTICE block saying the document is awaiting the
 *    company's own legal review. When their adviser signs it off, an
 *    administrator deletes that one block. No deploy, no environment change.
 *  - Where a number is genuinely the company's commercial decision rather than
 *    a statutory one, a conservative default is written in and called out in
 *    the review notice, so it is changed deliberately rather than inherited.
 *
 * The statutory commitments — acknowledging a grievance within 48 hours and
 * resolving it within one month — are the maxima set by the Consumer
 * Protection (E-Commerce) Rules 2020, not choices.
 *
 * Idempotent: each page is deleted and rewritten.
 *
 *   npx tsx scripts/migrate-legal-pages.ts
 */

import { PrismaClient, type PageSectionType, type Prisma } from "@prisma/client";
import { BLOCK_SCHEMAS, isBlockType } from "../src/lib/blocks/schemas";

const prisma = new PrismaClient();

type Block = { type: PageSectionType; data: Record<string, unknown> };
const block = (type: PageSectionType, data: Record<string, unknown>): Block => ({ type, data });

type PageSpec = {
  slug: string;
  title: string;
  description: string;
  keywords: string[];
  blocks: Block[];
};

/** The review notice every one of these pages carries until counsel signs off. */
const reviewNotice = (specifics: string) =>
  block("NOTICE", {
    tone: "warning",
    heading: "Awaiting legal review",
    markdown: [
      "This document describes how this business actually operates and is drafted against Indian law as it applies to a business-to-business reseller. It is **not legal advice**, and it has not yet been reviewed by the company's own adviser.",
      "",
      specifics,
      "",
      "To remove this notice once the document has been approved, open the page in the admin panel and delete this block.",
    ].join("\n"),
  });

const grievancePanel = block("COMPANY_INFO", {
  heading: "Grievance redressal",
  description:
    "If something has gone wrong and the team handling your account has not put it right, this is who to escalate to. We acknowledge a grievance within 48 hours of receiving it and aim to resolve it within one month, as required of an online seller under the Consumer Protection (E-Commerce) Rules 2020.",
  fields: "grievance",
  footnote:
    "Please include your quotation or order reference, the name of your organisation, and what outcome you are looking for. A grievance raised without a reference takes longer to trace.",
});

const closingCta = block("CTA_BANNER", {
  heading: "A question about this document",
  body: "If anything here is unclear, or conflicts with a quotation or agreement you already hold, tell us before you act on it. Where a signed agreement and this page disagree, the agreement governs.",
  primaryCta: { label: "Contact us", href: "/contact" },
  tone: "light",
});

/* ------------------------------------------------------------------ terms */

const TERMS: PageSpec = {
  slug: "terms",
  title: "Terms of Sale and Website Use",
  description:
    "The terms on which TechZoid supplies software licences, cloud services and IT solutions, how quotations and orders are formed, and the terms on which this website is provided.",
  keywords: ["terms of sale", "terms of service", "conditions of supply"],
  blocks: [
    block("HERO", {
      headline: "Terms of sale and website use",
      subheadline:
        "The terms on which we supply software licences, cloud services and IT solutions, and on which this website is made available. Please read them before submitting an enquiry or issuing a purchase order.",
      tone: "dark",
    }),

    reviewNotice(
      "Two points in particular are commercial decisions rather than legal requirements, and should be confirmed before this is published: the payment term stated in *Payment* (30 days from the date of invoice), and the aggregate liability cap stated in *Limits on our liability* (the amount paid under the order giving rise to the claim).",
    ),

    block("RICH_TEXT", {
      heading: "1. Who these terms are between",
      markdown: [
        "These terms are between you — the organisation named on a quotation or purchase order — and the company operating this website, whose registered name, registered office and GSTIN are set out on the [about page](/about) and repeated on every quotation and invoice we issue.",
        "",
        "In these terms, \"we\", \"us\" and \"our\" mean that company; \"you\" means the organisation you represent, and the person accepting these terms warrants that they are authorised to bind it.",
        "",
        "These terms apply together with each quotation. Where a quotation, a signed service agreement or a purchase order accepted by us says something different, that document governs to the extent of the difference.",
      ].join("\n"),
    }),

    block("RICH_TEXT", {
      heading: "2. This is a business-to-business service",
      markdown: [
        "This website and everything supplied through it is offered to businesses, government departments, public sector undertakings and other organisations, for use in the course of their activity. It is not offered to individual consumers buying for personal use.",
        "",
        "You confirm, when you submit an enquiry or issue a purchase order, that you are acting for an organisation and not as a consumer. Where a supply is nevertheless found to be a consumer transaction, nothing in these terms limits any right you have under the Consumer Protection Act, 2019 that cannot lawfully be limited.",
      ].join("\n"),
    }),

    block("RICH_TEXT", {
      heading: "3. Prices on this website are indicative",
      markdown: [
        "Prices shown in the catalogue are indicative, are exclusive of GST unless expressly stated, and are not an offer capable of acceptance. Nothing on this website forms a contract.",
        "",
        "Binding pricing is given only in a written quotation issued to you. Each quotation states its own validity period, the GST treatment, the delivery timeline and the licensing terms that apply. Where a quotation and this website disagree, the quotation governs.",
        "",
        "Catalogue prices may change without notice — because a publisher changes its own pricing, because an exchange rate moves, or because a promotion ends. A price you were quoted does not change during the validity period of that quotation.",
        "",
        "We may correct an obvious pricing error in a quotation before you accept it, and will tell you if we do. Where you have already accepted a quotation containing a manifest error, we will contact you before provisioning and you may cancel without charge.",
      ].join("\n"),
    }),

    block("CARDS", {
      eyebrow: "Section 4",
      heading: "How an order is formed",
      description:
        "No step here creates an obligation until the one after it. Knowing which step you are on tells you what you are committed to.",
      numbered: true,
      numberLabel: "Step",
      columns: 4,
      items: [
        {
          title: "You send an enquiry",
          body: "A request for a quotation. It is not an order, commits neither party, and can be withdrawn at any time.",
        },
        {
          title: "We issue a quotation",
          body: "An offer, open for the validity period stated on it. Prices, quantities, GST treatment, delivery timeline and licensing terms are fixed for that period.",
        },
        {
          title: "You issue a purchase order",
          body: "Acceptance of that quotation. It must reference the quotation and match it; where it does not, we will come back to you before proceeding.",
        },
        {
          title: "We accept it in writing",
          body: "The contract is formed at this point, and not before. We then provision, deliver and invoice against it.",
        },
      ],
    }),

    block("RICH_TEXT", {
      heading: "5. When we may decline an order",
      markdown: [
        "We may decline a purchase order, in whole or in part, and will tell you why. The reasons this happens in practice are:",
        "",
        "- the publisher declines to supply, or withdraws the product or the programme it is sold under;",
        "- the licensing eligibility claimed cannot be verified — academic, non-profit, government or similar pricing depends on the publisher's own qualification rules;",
        "- the quotation contained a manifest error in price, quantity or specification;",
        "- the purchase order materially differs from the quotation it references;",
        "- we cannot supply within a timeline you have made a condition of the order;",
        "- doing so would breach export controls, sanctions, or any law binding on us.",
        "",
        "Where we decline after you have paid, we refund in full. Declining an order is not a breach of these terms.",
      ].join("\n"),
    }),

    block("RICH_TEXT", {
      heading: "6. Software is licensed to you by its publisher, not by us",
      markdown: [
        "This is the most important thing to understand about buying software through a reseller.",
        "",
        "We supply licences. We do not grant them. Your right to install, use, transfer, reassign or renew the software is governed entirely by the publisher's own licence terms — Microsoft, Adobe, Autodesk, Zoho and every other vendor set their own — and you enter into that licence directly with the publisher.",
        "",
        "We will identify the applicable licensing model and its material constraints on the quotation, including seat minimums, term commitments, downgrade or transfer restrictions, and any renewal behaviour. We cannot vary a publisher's terms, and nothing said by us or written on this website modifies them.",
        "",
        "It is your responsibility to keep your deployment within the entitlements you hold. Where you have engaged us for licence management, the extent to which we take that on is set out in the service agreement rather than here.",
        "",
        "Where a publisher changes its licensing terms, its pricing model or its programme structure after you have bought, that change is between you and the publisher. We will tell you about a change we are aware of that affects you.",
      ].join("\n"),
    }),

    block("RICH_TEXT", {
      heading: "7. Tax and invoicing",
      markdown: [
        "We are registered under GST and issue a tax invoice for every supply, in the form required by the Central Goods and Services Tax Act, 2017.",
        "",
        "**Your details must be right.** Input tax credit is denied where the GSTIN or the registered legal name on the invoice does not match your registration. You are responsible for giving us those details accurately, and for telling us when they change. We will reissue an invoice that we have got wrong; we cannot reissue one that reflects the details you gave us, once the return period has closed.",
        "",
        "The place of supply, and therefore whether CGST and SGST or IGST applies, is determined by your registered address as recorded on the invoice.",
        "",
        "Where a supply is exempt, zero-rated or subject to reverse charge, the quotation says so.",
      ].join("\n"),
    }),

    block("RICH_TEXT", {
      heading: "8. Payment",
      markdown: [
        "Unless a quotation or a signed agreement says otherwise, invoices are payable within 30 days of the date of invoice, by bank transfer to the account named on the invoice.",
        "",
        "We do not take card payments and this website does not process payments of any kind. It never asks for card, net banking or UPI credentials, and no such details reach it. Payment instructions reach you only on an invoice or in the order confirmation email sent to the address on the order — if you receive payment instructions by any other route, or bank details differing from those on your invoice, do not act on them and contact us.",
        "",
        "Provisioning of subscription and cloud services may be made conditional on payment or on a credit check, and the quotation will say so where it is.",
        "",
        "We may suspend provisioning or support on an account with overdue invoices, having told you first. Interest on late payment, where charged, is as stated on the invoice.",
      ].join("\n"),
    }),

    block("RICH_TEXT", {
      heading: "9. Delivery, cancellation and refunds",
      markdown: [
        "How licences are delivered, and what happens when delivery is delayed, is set out in the [delivery and fulfilment policy](/delivery-policy).",
        "",
        "When an order can be cancelled, and when a refund is available, is set out in the [refund and cancellation policy](/refund-policy). In short: before we provision, you can cancel; after we provision, a software licence generally cannot be returned, because it has been issued in your name and cannot be resold.",
      ].join("\n"),
    }),

    block("RICH_TEXT", {
      heading: "10. Your account on this website",
      markdown: [
        "An account is optional. You can request a quotation without one; an account lets you see your quotations, orders, licences and renewal dates in one place.",
        "",
        "- Keep your credentials confidential. You are responsible for what is done through your account, and should tell us at once if you believe it has been compromised.",
        "- Give accurate registration and company information, and keep it current. Invoicing details in particular must match your GST registration exactly.",
        "- Do not attempt to access another organisation's data, probe the service for weaknesses without our written authorisation, interfere with its operation, or extract the catalogue at scale by automated means.",
        "- We may suspend or close an account that breaches these terms, that we reasonably believe has been compromised, or that has been dormant for an extended period. We will tell you, unless telling you would defeat the purpose.",
      ].join("\n"),
    }),

    block("RICH_TEXT", {
      heading: "11. This website itself",
      markdown: [
        "We aim to keep this website available and accurate, but we do not guarantee uninterrupted access. It may be unavailable for maintenance, or for reasons outside our control. Availability commitments for managed services and support, where you have bought them, are in the relevant service agreement — not here.",
        "",
        "Descriptions, specifications and images in the catalogue are provided by publishers and manufacturers and may change. They are a guide, not a warranty of a particular feature set.",
        "",
        "Where this website links to a third party — a publisher's own documentation, for instance — we do not control that site and are not responsible for its content.",
      ].join("\n"),
    }),

    block("RICH_TEXT", {
      heading: "12. Intellectual property and trademarks",
      markdown: [
        "The design, text and structure of this website belong to us or to our licensors. You may read, print and share it for the purpose of evaluating or making a purchase. You may not reproduce it commercially, or extract and re-publish the catalogue, without our written permission.",
        "",
        "Third-party product names, logos and trademarks referred to on this site belong to their respective owners and are used descriptively, to identify the software and hardware we supply. Their use does not imply endorsement by, sponsorship of, or affiliation with those owners beyond a commercial reselling relationship.",
        "",
        "Where we describe ourselves as a partner of a vendor, that describes a reselling or programme relationship of the kind that vendor operates. It is not a claim to act as that vendor's agent, and we cannot bind a vendor.",
      ].join("\n"),
    }),

    block("RICH_TEXT", {
      heading: "13. Limits on our liability",
      markdown: [
        "Nothing in these terms limits or excludes liability for death or personal injury caused by negligence, for fraud or fraudulent misrepresentation, or for anything else that cannot lawfully be limited.",
        "",
        "Subject to that:",
        "",
        "- We are not liable for loss of profit, loss of revenue, loss of anticipated savings, loss of business or goodwill, or for any indirect or consequential loss, however arising.",
        "- We are not liable for loss or corruption of data. Backup and recovery is your responsibility unless you have engaged us for it in writing, in which case the service agreement governs.",
        "- We are not liable for the performance, defects, availability or discontinuation of a publisher's or manufacturer's product. Those are matters between you and them, under their warranty and their licence. We will assist you in pursuing them.",
        "- Our total liability arising out of or in connection with an order, whether in contract, tort, under statute or otherwise, is limited in aggregate to the amount you have paid us under that order.",
        "",
        "These limits reflect that we are a reseller and an implementer: the margin on a licence does not, and could not, carry the risk of the systems it runs. Where you need a different allocation of risk for a particular engagement, say so before the order and it can be negotiated and priced.",
      ].join("\n"),
    }),

    block("RICH_TEXT", {
      heading: "14. Indemnity",
      markdown: [
        "You will indemnify us against claims, losses and reasonable costs arising from your use of the software or services in breach of a publisher's licence terms, from information you gave us that was inaccurate, or from your breach of these terms.",
        "",
        "We will indemnify you against a third-party claim that software supplied by us under a valid licence infringes that party's intellectual property rights in India, to the extent the publisher indemnifies us and permits that indemnity to be passed through.",
      ].join("\n"),
    }),

    block("RICH_TEXT", {
      heading: "15. Confidentiality",
      markdown: [
        "Each of us may learn things about the other in the course of an engagement — pricing, licence positions, technical architecture, commercial plans — that are not public. Neither of us will disclose the other's confidential information except to people who need it to perform the contract, or where required by law or a regulator.",
        "",
        "This applies for the term of the engagement and for three years afterwards. Where a separate non-disclosure agreement is in place, that agreement governs instead.",
      ].join("\n"),
    }),

    block("RICH_TEXT", {
      heading: "16. Events outside our control",
      markdown: [
        "Neither of us is liable for a failure to perform caused by something outside our reasonable control — including a publisher's or cloud provider's outage or withdrawal of service, failure of telecommunications or power, government action, natural disaster or epidemic.",
        "",
        "We will tell you as soon as we can, and do what can reasonably be done to limit the effect. Where such an event prevents performance for more than sixty days, either of us may cancel the affected part of the order, and you will be refunded for anything paid and not delivered.",
      ].join("\n"),
    }),

    block("RICH_TEXT", {
      heading: "17. Assignment, severability and waiver",
      markdown: [
        "You may not assign or transfer an order, or a licence supplied under it, without our written consent and the publisher's, where the publisher's terms require it. We may assign our rights under an order to a group company or in connection with a transfer of our business.",
        "",
        "If any part of these terms is found unenforceable, the rest continues to apply. If we do not enforce a right, that is not a waiver of it.",
        "",
        "These terms, together with the quotation and any signed agreement, are the whole agreement between us on their subject matter, and replace anything said or written beforehand.",
      ].join("\n"),
    }),

    block("RICH_TEXT", {
      heading: "18. Changes to these terms",
      markdown: [
        "We may update these terms — for example when the law changes, or when what we offer changes. The version in force for an order is the version published when your purchase order was accepted, and the quotation records the date.",
        "",
        "Changes to the terms on which this website is provided take effect when published. The date this document was last changed is shown in the page footer.",
      ].join("\n"),
    }),

    block("RICH_TEXT", {
      heading: "19. Governing law and jurisdiction",
      markdown: [
        "These terms, and any dispute arising out of them or out of a supply made under them, are governed by the laws of India.",
        "",
        "The courts at New Delhi have exclusive jurisdiction, that being where our registered office is situated.",
        "",
        "Before either of us commences proceedings, we will each first raise the matter through the grievance process below and allow thirty days for it to be resolved. Nothing in this paragraph prevents either of us from seeking urgent interim relief.",
      ].join("\n"),
    }),

    grievancePanel,
    closingCta,
  ],
};

/* ---------------------------------------------------------------- privacy */

const PRIVACY: PageSpec = {
  slug: "privacy",
  title: "Privacy Policy",
  description:
    "What personal data this website collects, why, who it is shared with, how long it is kept, and the rights you have over it under the Digital Personal Data Protection Act, 2023.",
  keywords: ["privacy policy", "data protection", "DPDP Act"],
  blocks: [
    block("HERO", {
      headline: "Privacy policy",
      subheadline:
        "What personal data we collect, why we hold it, who else sees it, how long we keep it, and what you can ask us to do with it.",
      tone: "dark",
    }),

    reviewNotice(
      "The retention periods in *How long we keep it* follow the statutory minimums under the Companies Act, 2013 and the CGST Act, 2017. The Digital Personal Data Protection Act, 2023 is in force but its rules are still being notified; this document is drafted to meet it, and should be revisited once those rules are final.",
    ),

    block("RICH_TEXT", {
      heading: "Who is responsible for your data",
      markdown: [
        "The company operating this website is the Data Fiduciary for the personal data described here — meaning it decides why and how that data is processed. Its registered name, registered office and contact details are on the [about page](/about), and the grievance officer for data protection matters is named at the foot of this page.",
        "",
        "This policy covers this website, the account area, and the enquiry, quotation and order records created through them. It does not cover a publisher's own service — once a licence is provisioned into your Microsoft, Adobe, Autodesk or Zoho tenant, what happens to data in that tenant is governed by that publisher's terms and your own administrator's configuration.",
      ].join("\n"),
    }),

    block("RICH_TEXT", {
      heading: "What we collect, and when",
      markdown: [
        "**When you submit an enquiry or request a quotation.** Your name, business email address, telephone number, the organisation you represent, and what you told us you need. Where you ask for a formal quotation or an invoice, also your billing address and GSTIN.",
        "",
        "**When you create an account.** The above, plus a password, which is stored only as a bcrypt hash and is never readable by us or recoverable in plain text.",
        "",
        "**When you place an order.** The purchase order reference, the delivery contact, and the licence assignments made against the order. Where we provision into your tenant, the administrator email address needed to do it.",
        "",
        "**When you contact support.** The content of the ticket and the correspondence on it.",
        "",
        "**Automatically, on every request.** Your IP address, the page requested, the time, and the browser's user-agent string, recorded in server logs. Where a request fails or a security control is triggered, the same information is recorded in an audit log with the account it relates to.",
      ].join("\n"),
    }),

    block("BULLETS", {
      heading: "What we deliberately do not collect",
      items: [
        "Card numbers, CVVs, net banking credentials and UPI PINs. This website processes no payments and has no payment integration; there is no field anywhere in it that accepts a payment credential.",
        "Advertising or cross-site tracking data. There are no advertising pixels, no social plug-ins, no session recording and no third-party analytics on this site.",
        "Sensitive personal data as defined by the SPDI Rules, 2011 — health, biometric, sexual orientation, political or religious affiliation. We have no reason to ask for it and no field that accepts it.",
        "Your password in any readable form. Authentication compares a hash; a support agent cannot see, retrieve or tell you your password.",
      ],
    }),

    block("RICH_TEXT", {
      heading: "Why we process it",
      markdown: [
        "Under the Digital Personal Data Protection Act, 2023 we process personal data either with your consent or for a legitimate use permitted by the Act. In practice:",
        "",
        "- **To answer your enquiry and prepare a quotation.** You gave us the data for this purpose; that is the consent.",
        "- **To perform a contract** — provisioning licences, issuing invoices, providing support, managing renewals.",
        "- **To meet a legal obligation** — tax invoicing and the retention of books of account.",
        "- **To keep the service secure** — rate limiting, audit logging, and investigating misuse.",
        "- **To tell you about a renewal that is approaching**, which is a service message about something you already own rather than marketing.",
        "",
        "We do not sell personal data, and we do not use it to build advertising profiles. We do not send marketing email to an address that only ever reached us through a support ticket.",
      ].join("\n"),
    }),

    block("RICH_TEXT", {
      heading: "Who else sees it",
      markdown: [
        "**Publishers and distributors**, where provisioning a licence requires it. To create a Microsoft, Adobe, Autodesk or Zoho subscription in your name we must pass the administrator's name, email address and the organisation's details to that publisher or to the distributor through whom the programme runs. Provisioning cannot happen without this, and it happens only for orders you have placed.",
        "",
        "**Our hosting and email providers**, who process data on our instructions in order to run the site and deliver mail.",
        "",
        "**Professional advisers, auditors and authorities**, where we are required to disclose — a lawful demand, a tax audit, or the defence of a legal claim.",
        "",
        "That is the complete list. We do not share personal data with anyone else, and we do not transfer it as an asset except as part of a transfer of the business as a whole, in which case you would be told.",
        "",
        "**Transfers outside India.** Some publishers operate their provisioning and support systems outside India. Where a licence you have ordered is provisioned through such a system, the data needed to provision it is processed there. We do not transfer personal data outside India for any other purpose.",
      ].join("\n"),
    }),

    block("KEY_VALUE_LIST", {
      heading: "How long we keep it",
      items: [
        { key: "Enquiries that did not lead to an order", value: "3 years from last contact" },
        { key: "Quotations, orders, invoices and licence records", value: "8 years — Companies Act, 2013" },
        { key: "GST records", value: "72 months from the annual return — CGST Act, 2017" },
        { key: "Account and profile data", value: "For the life of the account, then 12 months" },
        { key: "Support tickets", value: "3 years from closure" },
        { key: "Server request logs", value: "90 days" },
        { key: "Security and audit logs", value: "12 months" },
      ],
    }),

    block("RICH_TEXT", {
      markdown: [
        "The commercial retention periods are statutory minimums and we cannot shorten them on request — an invoice cannot be deleted from the books because its recipient asked. Everything outside those periods can be, and is.",
      ].join("\n"),
    }),

    block("RICH_TEXT", {
      heading: "Your rights",
      markdown: [
        "Under the Digital Personal Data Protection Act, 2023 you may:",
        "",
        "- **ask what we hold about you**, and why, and who it has been shared with;",
        "- **have it corrected** where it is wrong, incomplete or out of date — you can do most of this yourself in the account area;",
        "- **have it erased**, where we are not required to keep it for one of the reasons above;",
        "- **nominate someone** to exercise these rights on your behalf if you die or become incapacitated;",
        "- **withdraw consent** where processing rests on consent — though withdrawing it may mean we can no longer provide the service it supported;",
        "- **complain to us**, through the grievance officer below, and afterwards to the Data Protection Board of India if you are not satisfied.",
        "",
        "To exercise any of these, write to the grievance officer named below. We will respond within thirty days. We may need to verify who you are before acting, which is a protection for you rather than an obstacle.",
      ].join("\n"),
    }),

    block("RICH_TEXT", {
      heading: "How it is protected",
      markdown: [
        "- All traffic is served over TLS. Session cookies are marked HttpOnly, Secure and SameSite, so they cannot be read by scripts or sent from another site.",
        "- Passwords are stored as bcrypt hashes with a per-password salt.",
        "- Every state-changing request carries a CSRF token that is checked against the request's origin.",
        "- Staff access is role-based and least-privilege: sales staff cannot reach content administration, and content administrators cannot reach another organisation's commercial records without an audit entry.",
        "- Administrative actions are written to an audit log with the actor and the source address.",
        "- Credentials, tokens and payment fields are redacted from application logs before they are written.",
        "",
        "No system is perfectly secure. If a personal data breach occurs, we will notify the Data Protection Board of India and every affected person as required by the Act, describing what happened, what data was involved, and what to do about it.",
      ].join("\n"),
    }),

    block("RICH_TEXT", {
      heading: "Cookies",
      markdown: [
        "This site sets two cookies, both strictly necessary, and no others. There is no analytics, advertising or tracking cookie anywhere on it. The [cookie policy](/cookie-policy) names each one and says what it does.",
      ].join("\n"),
    }),

    block("RICH_TEXT", {
      heading: "Children",
      markdown: [
        "This is a business service and is not directed at children. We do not knowingly collect the personal data of anyone under 18. If you believe a child's data has reached us, tell the grievance officer and it will be deleted.",
      ].join("\n"),
    }),

    block("RICH_TEXT", {
      heading: "Changes to this policy",
      markdown: [
        "We will update this policy when what we do changes, or when the law does. Where a change materially affects how we handle data you have already given us, we will tell account holders by email rather than only publishing it. The date of the last change is shown in the page footer.",
      ].join("\n"),
    }),

    grievancePanel,
    closingCta,
  ],
};

/* ----------------------------------------------------------------- refund */

const REFUND: PageSpec = {
  slug: "refund-policy",
  title: "Refund and Cancellation Policy",
  description:
    "When an order for software licences, cloud services, hardware or professional services can be cancelled, when a refund is available, and how to request one.",
  keywords: ["refund policy", "cancellation policy", "returns"],
  blocks: [
    block("HERO", {
      headline: "Refund and cancellation policy",
      subheadline:
        "What can be cancelled, what can be refunded, and what genuinely cannot — with the reason in each case, so you can tell in advance which one you are in.",
      tone: "dark",
    }),

    reviewNotice(
      "Two commercial defaults here should be confirmed before publication: refunds are stated as being processed **within 10 business days** of approval, and cancellation before provisioning is stated as **free of charge**. Both are conservative and can be edited in the admin panel.",
    ),

    block("RICH_TEXT", {
      heading: "The principle",
      markdown: [
        "A software licence is not a product on a shelf. When we provision one, it is issued in your organisation's name — a key generated against your details, or a subscription created in your tenant — and it is registered with the publisher as yours. At that point it cannot be returned to stock, cannot be resold, and in most programmes cannot be cancelled by us at all.",
        "",
        "So the dividing line for almost everything below is **provisioning**, not payment and not delivery of an invoice. Before we provision, cancelling is straightforward. After we provision, what is possible depends on the publisher's own rules, and we will tell you what those are for your specific order.",
        "",
        "We would rather you did not order the wrong thing than have to unwind it afterwards. If you are unsure whether a licensing model fits, ask before the purchase order — that conversation costs nothing.",
      ].join("\n"),
    }),

    block("CARDS", {
      heading: "Cancelling before provisioning",
      description: "This is the window in which cancellation is simple.",
      columns: 2,
      items: [
        {
          title: "Before we accept your purchase order",
          body: "Withdraw it at any time, for any reason, at no cost. No contract has been formed.",
        },
        {
          title: "After acceptance but before provisioning",
          body: "Tell us in writing and we will cancel free of charge, provided we have not yet placed the order with the publisher. Anything you have paid is refunded in full.",
        },
        {
          title: "After we have placed it with the publisher",
          body: "We will ask the publisher to cancel. Where they agree, you pay only any charge they levy on us. Where they do not, the order stands.",
        },
        {
          title: "Where we cancel",
          body: "If we decline or cannot fulfil an order — a publisher withdraws a product, eligibility cannot be verified — you are refunded in full, including anything already paid.",
        },
      ],
    }),

    block("RICH_TEXT", {
      heading: "Subscription licences",
      markdown: [
        "Subscriptions are sold on the publisher's own commitment terms — typically an annual or monthly term, sometimes with a short cancellation window at the start.",
        "",
        "Microsoft's CSP programme, for example, allows a subscription to be cancelled within a limited number of days of purchase; after that the term is committed for its full duration. Adobe, Autodesk and Zoho each have their own rules. **The window that applies to your order is stated on your quotation**, because it is the publisher's rule and not ours, and it changes.",
        "",
        "Within a cancellation window that the publisher honours, we pass the refund through to you in full, less nothing.",
        "",
        "Outside it, a subscription runs to the end of its committed term. You can usually stop it from renewing — tell us at least fifteen days before the renewal date and we will set it not to renew. Reducing seat count mid-term is possible in some programmes and not in others; the quotation says which.",
      ].join("\n"),
    }),

    block("RICH_TEXT", {
      heading: "Perpetual licences and licence keys",
      markdown: [
        "Once a key has been issued or a download made available against your details, a perpetual licence is not returnable. This is the publisher's rule, universally, and there is no version of it we can waive: the key exists, it is registered to you, and it cannot be un-issued.",
        "",
        "If a key does not work, that is a fulfilment problem and not a refund question — tell us and we will get you a working one at our cost.",
      ].join("\n"),
    }),

    block("RICH_TEXT", {
      heading: "Cloud consumption",
      markdown: [
        "Consumption-based services — Azure, AWS and similar — are billed for what was actually used, in arrears. Usage that has occurred cannot be refunded, by us or by the provider.",
        "",
        "If you believe consumption was caused by an error in a configuration we delivered, raise it with us. Where the fault is ours, we will pursue a credit with the provider and cover the shortfall.",
        "",
        "We will help you set spending limits and budget alerts. Ask before, not after.",
      ].join("\n"),
    }),

    block("RICH_TEXT", {
      heading: "Hardware",
      markdown: [
        "Hardware is covered by the manufacturer's warranty, which is stated on the quotation along with its duration and whether it is on-site or return-to-base.",
        "",
        "- **Dead on arrival or damaged in transit:** tell us within 48 hours of delivery, with photographs of the packaging and the unit. We handle the replacement.",
        "- **A fault within the warranty period:** we will help you raise it with the manufacturer and chase it.",
        "- **Change of mind:** unopened, undamaged and in original packaging, we will ask the distributor to take it back. Where they agree, a restocking charge usually applies and is passed on at cost. Configured-to-order and custom-built items cannot be returned at all.",
      ].join("\n"),
    }),

    block("RICH_TEXT", {
      heading: "Professional and managed services",
      markdown: [
        "- **Before work starts:** cancel with written notice and nothing is charged, unless the engagement letter says otherwise.",
        "- **After work starts:** work already performed is chargeable, at the rate or milestone value in the engagement. We will tell you what has been done and what it comes to.",
        "- **Managed services on a term:** cancellation and notice are set out in the service agreement, which governs over this page.",
        "- **Where we have not delivered what was agreed:** tell us. We will put it right at our cost, and where we cannot, we will refund the part not delivered.",
      ].join("\n"),
    }),

    block("RICH_TEXT", {
      heading: "When the mistake is ours",
      markdown: [
        "If we supply the wrong product, the wrong quantity, or a licence that does not match the quotation you accepted, that is our error and it costs you nothing to fix. We will correct it — replacing, re-provisioning or refunding as appropriate — and we will not ask you to bear a publisher charge caused by our mistake.",
        "",
        "The same applies to a duplicate payment, or a payment taken against an invoice that was later cancelled: it is refunded in full without you having to argue for it.",
      ].join("\n"),
    }),

    block("RICH_TEXT", {
      heading: "How to request a cancellation or refund",
      markdown: [
        "Write to us with the order or quotation reference, what you want cancelled or refunded, and why. Use the [contact form](/contact), or reply on the email thread the order was placed through.",
        "",
        "We will acknowledge within two business days and tell you what is possible for your specific order, including any publisher charge, before anything is actioned.",
        "",
        "Approved refunds are made to the bank account the original payment came from, and are processed within 10 business days of approval. We do not refund to a different account than the one that paid, which protects both of us.",
        "",
        "If you are not satisfied with the outcome, escalate through the grievance process below.",
      ].join("\n"),
    }),

    grievancePanel,
    closingCta,
  ],
};

/* --------------------------------------------------------------- delivery */

const DELIVERY: PageSpec = {
  slug: "delivery-policy",
  title: "Delivery and Fulfilment Policy",
  description:
    "How software licences, cloud subscriptions, hardware and services are delivered, what the timelines depend on, and what to do if something has not arrived.",
  keywords: ["delivery policy", "fulfilment", "licence delivery"],
  blocks: [
    block("HERO", {
      headline: "Delivery and fulfilment",
      subheadline:
        "Almost everything we supply is delivered electronically, to the address on your order. This is how that works, what it depends on, and what to do when it has not happened.",
      tone: "dark",
    }),

    reviewNotice(
      "The indicative timelines below describe how fulfilment normally runs. The authoritative timeline for any given order is the one stated on its quotation — that is by design, because lead times differ by publisher and by programme.",
    ),

    block("RICH_TEXT", {
      heading: "The timeline on your quotation is the one that counts",
      markdown: [
        "Every quotation states the delivery timeline for the items on it. That timeline is specific to those products, that programme and that quantity, and it is the commitment. The ranges below describe what normally happens; where they and your quotation differ, the quotation governs.",
        "",
        "Delivery begins once we have accepted your purchase order — and, where the quotation makes provisioning conditional on payment or on a credit check, once that condition is met.",
      ].join("\n"),
    }),

    block("KEY_VALUE_LIST", {
      heading: "What normally happens, and how quickly",
      items: [
        { key: "Licence keys for stocked products", value: "Same or next business day" },
        { key: "Cloud subscriptions provisioned into your tenant", value: "1–2 business days" },
        { key: "Volume licensing agreements", value: "3–7 business days, publisher-dependent" },
        { key: "Academic, government or non-profit pricing", value: "Longer — eligibility is verified by the publisher first" },
        { key: "Hardware in distributor stock", value: "3–7 business days within India" },
        { key: "Configured-to-order hardware", value: "As quoted; build time is set by the manufacturer" },
        { key: "Professional services", value: "Scheduled with you after the order is accepted" },
      ],
    }),

    block("RICH_TEXT", {
      heading: "Where delivery goes",
      markdown: [
        "Licence keys, download links, tenant confirmations and invoices are sent by email to the delivery contact named on the purchase order. Where no delivery contact is named, they go to the person who placed the order.",
        "",
        "**Check that address is right before you order.** A key sent to a mistyped address has still been issued and cannot be re-issued for free by most publishers. If the person who should receive it is not the person ordering, name them on the purchase order.",
        "",
        "Where an order is provisioned directly into your tenant, we need administrator access or an invitation from your administrator. We will ask for exactly what is needed and no more, and we do not retain that access after provisioning unless you have engaged us for ongoing management.",
        "",
        "Hardware ships to the delivery address on the purchase order, within India. Someone must be present to receive it.",
      ].join("\n"),
    }),

    block("BULLETS", {
      heading: "What causes a delay, in practice",
      items: [
        "Eligibility verification by the publisher, for academic, government, non-profit or charity pricing. This is the most common cause and is outside our control.",
        "A mismatch between the purchase order and the quotation, which we have to resolve with you before proceeding.",
        "A publisher or distributor outage, or a programme change taking effect mid-order.",
        "Stock — for hardware, and occasionally for boxed software.",
        "A credit check or a payment condition on the quotation that has not yet been met.",
      ],
    }),

    block("RICH_TEXT", {
      heading: "If it has not arrived",
      markdown: [
        "First, check the spam folder of the delivery address — licence keys arrive as plain email from our domain and are occasionally filtered.",
        "",
        "Then tell us, with the order reference. We will trace it and tell you where it is: with the publisher, with the distributor, or with us. If it is with us, we will say so.",
        "",
        "Where we have missed a delivery timeline that was stated on the quotation and the delay is ours, you may cancel the undelivered part of the order and be refunded for it. Where the delay is the publisher's, we will keep you informed and pursue it, and we will agree a revised date with you rather than let it drift.",
      ].join("\n"),
    }),

    block("RICH_TEXT", {
      heading: "Title and risk",
      markdown: [
        "For hardware, risk passes to you on delivery to the address on the purchase order; title passes on payment in full.",
        "",
        "For software, no title passes at all — you receive a licence from the publisher on its terms, as explained in the [terms of sale](/terms).",
      ].join("\n"),
    }),

    grievancePanel,
    closingCta,
  ],
};

/* ----------------------------------------------------------------- cookies */

const COOKIES: PageSpec = {
  slug: "cookie-policy",
  title: "Cookie Policy",
  description:
    "The two cookies this website sets, what each one does, what is kept in your browser's local storage, and what this site deliberately does not use.",
  keywords: ["cookie policy", "cookies", "tracking"],
  blocks: [
    block("HERO", {
      headline: "Cookie policy",
      subheadline:
        "This site sets two cookies. Both are strictly necessary, neither tracks you, and there is no third-party cookie of any kind.",
      tone: "dark",
    }),

    reviewNotice(
      "This document describes the site exactly as built. If analytics, a chat widget, an advertising pixel or any other third-party script is added later, this page must be updated and a consent mechanism added — none is needed today because nothing here requires consent.",
    ),

    block("RICH_TEXT", {
      heading: "Why there is no cookie banner",
      markdown: [
        "A consent banner exists to obtain permission for cookies that are not necessary — analytics, advertising, profiling. This site sets none of those, so there is nothing to ask permission for, and a banner would be theatre.",
        "",
        "The two cookies below are strictly necessary: without them you could not sign in, and the site could not protect a form submission from being forged. Necessary cookies do not require consent under any framework we operate in, but you are entitled to know exactly what they are — so here they are.",
      ].join("\n"),
    }),

    block("KEY_VALUE_LIST", {
      heading: "The two cookies",
      items: [
        { key: "csrf_token", value: "Ties a form submission to your browser, so another site cannot forge one" },
        { key: "csrf_token — lifetime", value: "The browser session" },
        { key: "ictlab_session", value: "Keeps you signed in. Set only when you sign in" },
        { key: "ictlab_session — lifetime", value: "Until you sign out or it expires" },
        { key: "Both — flags", value: "HttpOnly, Secure, SameSite" },
        { key: "Both — contents", value: "An opaque random token. No name, email or account detail" },
      ],
    }),

    block("RICH_TEXT", {
      markdown: [
        "`HttpOnly` means no script on the page can read the cookie, which is what stops a cross-site scripting bug from becoming an account takeover. `Secure` means it is only ever sent over HTTPS. `SameSite` means it is not sent when another site links to us.",
        "",
        "Neither cookie contains anything about you. The session cookie holds a random token; the mapping from that token to an account exists only on our server, and the token itself is stored there as a hash.",
      ].join("\n"),
    }),

    block("RICH_TEXT", {
      heading: "Your enquiry basket is not a cookie",
      markdown: [
        "When you add products to an enquiry, the list is kept in your browser's local storage, not in a cookie. It never leaves your browser until you submit the enquiry, and it is not sent with ordinary page requests.",
        "",
        "It holds only product codes and quantities. Clearing your browser's site data clears it. Because it is local to that browser, a basket built on your laptop does not appear on your phone.",
        "",
        "When you do submit an enquiry, the server re-reads every product code from the catalogue and rebuilds the pricing itself — so nothing kept in your browser affects what you are quoted.",
      ].join("\n"),
    }),

    block("BULLETS", {
      heading: "What this site does not use",
      items: [
        "No analytics of any kind — no Google Analytics, no product analytics, no session recording, no heatmaps.",
        "No advertising or remarketing pixels, and no conversion tracking.",
        "No social media plug-ins, share widgets or embedded feeds.",
        "No third-party fonts, scripts or tag managers loaded from another domain.",
        "No cross-site tracking, device fingerprinting or profiling.",
      ],
    }),

    block("RICH_TEXT", {
      heading: "Managing cookies",
      markdown: [
        "Every browser lets you view, block and delete cookies, usually under privacy or site settings.",
        "",
        "Blocking cookies for this site is entirely your choice, and most of it will still work: you can browse the catalogue, read every page, search, and build an enquiry basket. You will not be able to sign in, and you will not be able to submit a form, because the protection against forged submissions depends on the token cookie.",
        "",
        "Signing out clears the session cookie immediately, and also revokes the session on our side — so a copy of the cookie taken beforehand stops working too.",
      ].join("\n"),
    }),

    closingCta,
  ],
};

const PAGES: PageSpec[] = [TERMS, PRIVACY, REFUND, DELIVERY, COOKIES];

async function main() {
  // Validate every payload before writing anything: a block that fails its
  // schema is skipped at render time, which on a legal page means a clause
  // silently disappearing.
  for (const page of PAGES) {
    page.blocks.forEach((entry, index) => {
      if (!isBlockType(entry.type)) throw new Error(`${page.slug}#${index}: unknown type`);
      const parsed = BLOCK_SCHEMAS[entry.type].safeParse(entry.data);
      if (!parsed.success) {
        throw new Error(
          `${page.slug} block ${index} (${entry.type}): ${JSON.stringify(parsed.error.issues)}`,
        );
      }
    });
  }

  for (const page of PAGES) {
    await prisma.page.deleteMany({ where: { slug: page.slug } });

    await prisma.page.create({
      data: {
        slug: page.slug,
        title: page.title,
        description: page.description,
        keywords: page.keywords,
        breadcrumb: [{ label: "Home", href: "/" }, { label: page.title }] as unknown as Prisma.InputJsonValue,
        status: "PUBLISHED",
        publishedAt: new Date(),
        sections: {
          create: page.blocks.map((entry, index) => ({
            type: entry.type,
            displayOrder: index,
            visible: true,
            data: BLOCK_SCHEMAS[entry.type].parse(entry.data) as Prisma.InputJsonValue,
          })),
        },
      },
    });

    console.log(`${page.slug.padEnd(16)} ${page.blocks.length} blocks`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
