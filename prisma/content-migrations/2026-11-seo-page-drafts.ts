import type { ContentMigration } from "./types";

/**
 * Three landing pages, as drafts, and an explanation of the eight that are not
 * here.
 *
 * ## What was asked for, and why most of it is absent
 *
 * The brief asked for landing pages at `/microsoft-enterprise-licensing`,
 * `/adobe-enterprise-licensing`, `/autodesk-enterprise-solutions`,
 * `/government-solutions`, `/case-studies`, `/our-partners`,
 * `/industries-we-serve`, `/microsoft-office-ltsc-2024`,
 * `/microsoft-windows-server`, and brand pages for Lenovo, Acer and Cisco.
 *
 * Nearly all of them already exist under another name, and the ones that do
 * not, mostly should not:
 *
 *  - `/microsoft-licensing` already covers volume licensing, CSP versus EA and
 *    Enterprise Agreement thresholds. `/microsoft-enterprise-licensing` is the
 *    same page with a longer slug.
 *  - `/adobe` and `/autodesk` already carry their licensing copy. So do
 *    `/get-a-quote/adobe` and `/get-a-quote/autodesk`.
 *  - `/microsoft-office-ltsc` and `/windows-server` exist. Adding
 *    `-2024` and `microsoft-` prefixed duplicates would split them.
 *  - `/brands` is the partners page. `/industries` is the industries page.
 *  - `/industries/government-psu` is the government page.
 *  - Lenovo, Acer and Cisco brand pages already resolve, at `/brands/lenovo`
 *    and the rest. They are deliberately `noindex` and deliberately out of the
 *    sitemap, because they carry no catalogue — I checked all three on the live
 *    site and each has around 848 words and zero links into products or
 *    hardware, against Dell's 1,992 words and a real catalogue. `src/app/sitemap.ts`
 *    documents the rule and the reason. The fix for those three is products,
 *    not pages, and writing landing-page copy over the top would make three
 *    thin trademark pages indexable.
 *  - `/case-studies` would need case studies. Inventing customers, project
 *    values or testimonials is out of the question, and a case-studies page
 *    with nothing on it is worse than no page.
 *
 * This is not a stylistic objection. A keyword-gap join against five ranking
 * competitors on 7 November 2026 found ten terms where this site ranks 16th to
 * 30th, and on the AutoCAD terms the ranking URL is
 * `/blog/autocad-subscription-price-in-india` while `/products/autocad` also
 * targets the query. Two URLs for one search, and the weaker wins internally.
 * `2026-10-delhi-local-page` refused four pages from a similar brief for this
 * reason before the measurement existed; it now exists.
 *
 * ## The three that are here
 *
 * Each answers a query nothing on this site answers at all.
 *
 * **GeM.** The Government e-Marketplace is how central and state government
 * buys, and there is no page about it. "GeM software seller" is in the target
 * keyword set, and of the competitors measured for the Microsoft, Adobe and
 * Autodesk reseller terms, not one ranks a serious page about public
 * procurement process. It is also the one subject where this company needs no
 * partner designation to be credible — it needs to be accurate about a
 * process.
 *
 * **Noida and Gurugram.** `pisoftware.in` holds five of the ten positions for
 * "autodesk reseller india" using city pages, and one competitor holds
 * position 5 for "microsoft 365 reseller india" on a page about Gurugram.
 * `2026-10-delhi-local-page` already took this route once, deliberately
 * writing one city page rather than five.
 *
 * Two more is a considered extension of that, not an abandonment of it. These
 * are written as **service-area** pages and each says plainly, in body copy,
 * that the office is in Netaji Subhash Place, Pitampura. Neither claims a
 * branch, an address or a local presence that does not exist, and the content
 * differs between them because the buyers differ — Noida's software market is
 * IT services and electronics manufacturing, Gurugram's is corporate head
 * offices and financial services. A city page that is the Delhi page with the
 * name substituted is a doorway page, which is both against Google's guidance
 * and useless to the person reading it.
 *
 * ## Rules followed
 *
 * **Drafts.** Every page is `status: "DRAFT"` with `publishedAt: null`. The
 * `[...slug]` route and the sitemap both read published pages only, so nothing
 * here is reachable or indexable until a person publishes it.
 *
 * **No prices.** No figure appears in any block below. The convention is the
 * one `2026-10-quote-page-autodesk` states: a price lives in the product row
 * and nowhere else.
 *
 * **No new claims about the company.** Every factual assertion here is one
 * already on the site — the Pitampura address from `/contact`, the service
 * lines from `/services`. No partner designation or certification is written
 * into any block below, because those are held in `seed-data/partner-status.ts`
 * and `seed-data/certifications.ts` behind a gate that can withdraw them: a
 * designation printed from a page block would outlive its own confirmation.
 * The GeM page is the one place a status is referenced, and TechZoid's GeM
 * seller registration is already stated on the home page — see
 * `2026-08-gem-mark`.
 *
 * **No GFR figures.** The government page describes direct-purchase and bid
 * thresholds by mechanism rather than by number, because the numbers are
 * amended by rule and a stale threshold in an indexed page is worse than a
 * pointer to where the current one lives.
 *
 * Idempotent. Creates nothing that already exists, by slug.
 */

type Draft = {
  slug: string;
  title: string;
  description: string;
  keywords: string[];
  breadcrumb: { href?: string; label: string }[];
  sections: { type: string; displayOrder: number; data: unknown }[];
};

const GEM: Draft = {
  slug: "gem-software-supplier",
  title: "Software on GeM: how government buys licences, and what to specify",
  description:
    "How software licences are procured through the Government e-Marketplace and other public routes, what a specification needs, and what to file after award.",
  keywords: [
    "gem software seller",
    "government software supplier india",
    "gem software procurement",
    "buy software on gem",
    "government software licensing india",
  ],
  breadcrumb: [{ href: "/", label: "Home" }, { label: "Software on GeM" }],
  sections: [
    {
      type: "HERO",
      displayOrder: 10,
      data: {
        tone: "dark",
        eyebrow: "Public procurement",
        headline: "Software on GeM, specified so that bids are comparable",
        subheadline:
          "Most public software procurement goes wrong before any supplier is involved — in a specification that names a product instead of a requirement, or omits the licence term, or counts workstations where the software is licensed to people. This is what to settle first.",
        primaryCta: { href: "/enquiry", label: "Send us a draft specification" },
        secondaryCta: { href: "/contact", label: "Talk to our public-sector desk" },
        showSearch: false,
      },
    },
    {
      type: "RICH_TEXT",
      displayOrder: 20,
      data: {
        heading: "The routes, and when each applies",
        markdown: `**Government e-Marketplace (GeM).** The default channel for central and state purchases. Sellers list against product categories and buyers purchase either from a catalogue or through a bid. For a defined item — an office suite, a design subscription, a server operating system — GeM is normally the straightforward route, because the thing being bought is a product rather than a scope of work.

**Direct purchase.** Below a threshold set by the General Financial Rules a department may purchase without a competitive process; above it a competitive route applies, and above a further threshold a formal bid or reverse auction is required. Those thresholds are set by rule, have been amended, and are read against your own delegation of financial powers — so confirm the current figures from the GFR rather than from any supplier's website, including this one.

**Tender.** For composite requirements where licences come with migration, deployment or support. The specification carries the whole risk here: a tender written around one publisher's product names will either be challenged or will produce a single compliant bid.

**Existing rate contracts and frameworks.** Where a framework already covers the product, using it is faster and easier to defend.`,
      },
    },
    {
      type: "ICON_POINTS",
      displayOrder: 30,
      data: {
        eyebrow: "Before bids open",
        heading: "The five lines that decide whether bids can be compared",
        items: [
          {
            label: "Licence basis",
            detail: "Named user, device, or physical core — they are not interchangeable",
          },
          {
            label: "Term",
            detail: "Perpetual, one year or three; otherwise quotes are not comparable",
          },
          {
            label: "Quantity by type",
            detail: "Licence counts, not headcount or workstation counts",
          },
          {
            label: "Client access",
            detail: "Server CALs stated separately; core licences alone do not serve users",
          },
          {
            label: "Support and deployment",
            detail: "Scoped separately, or explicitly included in the licence line",
          },
        ],
      },
    },
    {
      type: "RICH_TEXT",
      displayOrder: 40,
      data: {
        heading: "Where public software purchases usually fail",
        markdown: `**The specification names a product rather than a requirement.** Where a specific product genuinely is required — because an existing archive must open correctly, or a certified process depends on a fixed version — the justification belongs on the file at the time, not reconstructed after a challenge.

**Named users are procured as devices.** Most current design and productivity software is licensed to a person. A department buying one licence per workstation will either over-buy or find the licences cannot be deployed as planned.

**Client Access Licences are omitted.** A server priced on core licences alone is not a working server. CALs must also match the server version; older CALs do not cover a newer release, and on a refresh the CAL line is often larger than the server line.

**Renewal is nobody's budget line.** A perpetual purchase has no renewal. A subscription has one every year, and an unbudgeted renewal is the most common cause of an avoidable procurement emergency.

**Academic eligibility is assumed.** Academic programmes have criteria that are checked. A department is not automatically eligible because it is public.`,
      },
    },
    {
      type: "KEY_VALUE_LIST",
      displayOrder: 50,
      data: {
        eyebrow: "After award",
        heading: "What the file should contain",
        items: [
          { key: "Invoice", value: "Raised to the department's own name, with GST" },
          { key: "Purchase order and acceptance", value: "Both, against the award" },
          { key: "Agreement or enrolment number", value: "For volume licences, with portal access" },
          { key: "Term and renewal date", value: "Recorded where a person will see it in time" },
          { key: "Assignment record", value: "Which licences are deployed where, or to whom" },
        ],
      },
    },
    {
      type: "NOTICE",
      displayOrder: 60,
      data: {
        tone: "info",
        heading: "A product key is not proof of licence",
        markdown:
          "A key activates software; it establishes nothing about who is licensed. What does is the invoice in the department's name, the agreement number, and the licensing portal access. An audit, a CAG query or a successor officer will ask for those, and assembling them two years later from a supplier's records is possible and unpleasant.",
      },
    },
    {
      type: "FAQ",
      displayOrder: 70,
      data: {
        source: "manual",
        heading: "Questions departments ask",
        items: [
          {
            question: "Does buying through GeM mean the licence is genuine?",
            answer:
              "GeM is a procurement channel, not a provenance check. What establishes genuineness is the documentation: an invoice in the department's name, the agreement or enrolment number, and portal access showing the entitlement against your organisation.",
          },
          {
            question: "Can a specification name a particular product?",
            answer:
              "It can where there is a recorded justification — file-format compatibility with an existing archive, or a certified process that depends on a fixed version are the usual ones. Without a justification on the file at the time, a product-named specification invites a challenge and tends to produce one compliant bid.",
          },
          {
            question: "Can a department commit to a multi-year subscription?",
            answer:
              "Multi-year terms are generally available from the publishers and usually cost less per year. Whether a department may commit across financial years is a question for its own financial rules and delegation of powers, not for the supplier.",
          },
          {
            question: "How should quantities be stated for software licensed per person?",
            answer:
              "By licence type and count — for example, a number of named-user subscriptions of a stated product and term. Headcount and workstation counts both produce the wrong number, in opposite directions.",
          },
          {
            question: "What about software used by people outside the department?",
            answer:
              "For server products there is usually a licensing route that covers external users without counting them individually. State the external access requirement in the specification so bidders price the right thing.",
          },
        ],
      },
    },
    {
      type: "CTA_BANNER",
      displayOrder: 80,
      data: {
        tone: "dark",
        heading: "Send us the draft before bids open",
        body: "The licence basis, the term and the quantity lines are where a specification is easiest to get wrong and hardest to fix once bids are open. We will read a draft and say what we think will produce incomparable bids.",
        primaryCta: { href: "/enquiry", label: "Send a specification" },
        secondaryCta: { href: "/industries/government-psu", label: "How we work with departments" },
        showContactEmail: true,
      },
    },
    {
      type: "LINK_LIST",
      displayOrder: 90,
      data: {
        heading: "Related reading",
        layout: "cards",
        itemAction: "Read",
        items: [
          {
            label: "How government departments procure genuine software",
            href: "/blog/how-government-departments-procure-genuine-software",
            description: "The routes, the documentation, and specifying for real competition.",
          },
          {
            label: "Government and PSU",
            href: "/industries/government-psu",
            description: "How we work with central and state departments and public enterprises.",
          },
          {
            label: "How to buy genuine Microsoft licences in India",
            href: "/blog/how-to-buy-genuine-microsoft-licences-in-india",
            description: "The legitimate channels, and how to verify what you already hold.",
          },
          {
            label: "Windows Server 2025 licensing explained",
            href: "/blog/windows-server-2025-licensing-explained",
            description: "Cores, CALs and virtual machines — the three lines a server bid needs.",
          },
        ],
      },
    },
  ],
};

const NOIDA: Draft = {
  slug: "software-licensing-company-noida",
  title: "Software licensing for Noida businesses",
  description:
    "Licensing, renewals and software asset management for companies in Noida and Greater Noida. Microsoft, Adobe, Autodesk and Zoho, invoiced in India with GST.",
  keywords: [
    "software licensing company noida",
    "microsoft 365 reseller noida",
    "software licensing noida",
    "autodesk reseller noida",
    "it procurement noida",
  ],
  breadcrumb: [{ href: "/", label: "Home" }, { label: "Noida" }],
  sections: [
    {
      type: "HERO",
      displayOrder: 10,
      data: {
        tone: "dark",
        eyebrow: "Delhi NCR",
        headline: "Software licensing for companies in Noida",
        subheadline:
          "Licences, renewals and the reconciliation nobody gets round to — for Microsoft, Adobe, Autodesk and Zoho. Our office is at Netaji Subhash Place in Pitampura, about an hour from Sector 62, and we work across Noida and Greater Noida.",
        primaryCta: { href: "/enquiry", label: "Get a quote" },
        secondaryCta: { href: "/contact", label: "Talk to us" },
        showSearch: false,
      },
    },
    {
      type: "RICH_TEXT",
      displayOrder: 20,
      data: {
        heading: "What Noida buys, and what it gets wrong",
        markdown: `Noida's software demand is shaped by what the city does: IT and ITES services across the sectors around 62, 63 and 125, electronics and component manufacturing in the industrial sectors, and a large and growing set of corporate back offices.

Three licensing problems come up repeatedly in that mix.

**Headcount that moves.** A services business staffing projects has a licence count that should move with it and usually does not. Annual commitments taken at a hiring peak are paid for through the trough, because an annual term generally cannot be reduced mid-way. The answer is rarely one term for the whole estate — it is a longer term for the stable core and monthly for the part that fluctuates.

**Design and engineering seats bought uniformly.** A manufacturing or product firm licenses its whole engineering team identically, when in practice two or three people work across several Autodesk products and the rest live in one. The first group wants collections, the second wants individual products, and the reviewers and project managers want Flex tokens rather than subscriptions.

**Nobody owns the renewal.** Subscriptions lapse quietly. A perpetual licence bought and forgotten keeps working; a subscription bought and forgotten stops, usually on a Monday morning.`,
      },
    },
    {
      type: "ICON_POINTS",
      displayOrder: 30,
      data: {
        heading: "What working with us involves",
        items: [
          { label: "A written quote", detail: "Priced against your seat count and term, not a range" },
          { label: "GST invoicing", detail: "Invoiced in India, input credit claimable" },
          { label: "Provisioning included", detail: "Set up and migrated, not just licence keys" },
          { label: "Renewal review", detail: "Usage checked before you pay for another year" },
          { label: "One point of contact", detail: "Somebody who already knows your estate" },
          { label: "On site when needed", detail: "Across Noida and Greater Noida from our Delhi office" },
        ],
      },
    },
    {
      type: "LINK_LIST",
      displayOrder: 40,
      data: {
        heading: "What we license",
        layout: "cards",
        itemAction: "View",
        items: [
          {
            label: "Microsoft",
            href: "/microsoft",
            description: "Microsoft 365, Windows Server, SQL Server and the licensing programmes behind them.",
          },
          {
            label: "Autodesk",
            href: "/autodesk",
            description: "AutoCAD, Revit, Civil 3D, Inventor, Fusion and the industry collections.",
          },
          {
            label: "Adobe",
            href: "/adobe",
            description: "Creative Cloud and Acrobat, for teams and for enterprise.",
          },
          {
            label: "Zoho",
            href: "/zoho",
            description: "Mail, CRM, Desk, Books and Workplace.",
          },
          {
            label: "Hardware",
            href: "/hardware",
            description: "Workstations, servers and laptops, specified against the software that runs on them.",
          },
          {
            label: "Software asset management",
            href: "/services/software-asset-management",
            description: "Installations reconciled against entitlements, in both directions.",
          },
        ],
      },
    },
    {
      type: "FAQ",
      displayOrder: 50,
      data: {
        source: "manual",
        heading: "Questions from Noida buyers",
        items: [
          {
            question: "Do you have an office in Noida?",
            answer:
              "No. Our office is at 407, 4th floor, Pearl Business Park, Netaji Subhash Place, Pitampura, New Delhi 110034. We work with companies across Noida and Greater Noida from there, and visit when a meeting or a deployment needs somebody in the room.",
          },
          {
            question: "Can you invoice to a Noida-registered entity?",
            answer:
              "Yes. Tell us which registered entity and GSTIN the invoice should carry before anything is provisioned — getting the entity right afterwards is an administrative exercise nobody enjoys, and an invoice to the wrong group entity loses the input credit.",
          },
          {
            question: "We have licences from three different suppliers and no register. Can you sort that out?",
            answer:
              "That is the usual starting point. The work is to count what is installed, assemble what you are entitled to, and reconcile the two. It normally finds gaps in both directions — unlicensed installations, and licences paid for that nobody opens.",
          },
          {
            question: "Our headcount changes every quarter. What term should we take?",
            answer:
              "Usually a mix. A longer term costs less per year and is right for the stable part of the team; monthly commitment costs more but can be reduced. Committing the whole estate at a hiring peak is the mistake to avoid.",
          },
        ],
      },
    },
    {
      type: "CTA_BANNER",
      displayOrder: 60,
      data: {
        tone: "dark",
        heading: "Tell us what your team actually uses",
        body: "A seat total produces a quote for the most expensive plan at that quantity. Headcount by role, and a usage export if you have one, produces a quote for what you need.",
        primaryCta: { href: "/enquiry", label: "Get a quote" },
        secondaryCta: { href: "/software-licensing-company-delhi", label: "Licensing in Delhi" },
        showContactEmail: true,
      },
    },
  ],
};

const GURUGRAM: Draft = {
  slug: "software-licensing-company-gurugram",
  title: "Software licensing for Gurugram businesses",
  description:
    "Licensing, renewals and compliance evidence for corporate offices in Gurugram. Microsoft, Adobe, Autodesk and Zoho, invoiced in India with GST.",
  keywords: [
    "software licensing company gurugram",
    "microsoft 365 reseller gurgaon",
    "software licensing gurgaon",
    "adobe reseller gurgaon",
    "it procurement gurugram",
  ],
  breadcrumb: [{ href: "/", label: "Home" }, { label: "Gurugram" }],
  sections: [
    {
      type: "HERO",
      displayOrder: 10,
      data: {
        tone: "dark",
        eyebrow: "Delhi NCR",
        headline: "Software licensing for companies in Gurugram",
        subheadline:
          "Licences, renewals and the compliance evidence your parent company or your largest customer will eventually ask for. Our office is at Netaji Subhash Place in Pitampura, and we work across Gurugram and the wider NCR.",
        primaryCta: { href: "/enquiry", label: "Get a quote" },
        secondaryCta: { href: "/contact", label: "Talk to us" },
        showSearch: false,
      },
    },
    {
      type: "RICH_TEXT",
      displayOrder: 20,
      data: {
        heading: "What Gurugram buys, and what it gets wrong",
        markdown: `Gurugram's software demand looks different from Noida's. It is dominated by corporate head offices, captive centres, financial and professional services, and the Indian arms of multinationals — which changes the licensing questions from "what does it cost" to "can we demonstrate it".

**Somebody will audit you.** A parent company's internal audit, a large customer's supplier assurance process, or a tender asking for compliance evidence. All three ask the same thing, and it is not whether you are licensed — it is whether you can show it. The organisations that struggle are rarely running anything unlicensed; they bought what they needed over several years through several people, and cannot now assemble the paperwork. A product key proves nothing. The invoice in your name, the agreement number and portal access do.

**Group entities get tangled.** A company with several registered entities provisions a subscription against whichever one was convenient, and discovers at the first GST reconciliation that the input credit sits in the wrong place. Decide which entity holds a subscription before it is provisioned.

**Security licensing is bought as a blanket.** Microsoft 365 Business Premium's device management and conditional access are assigned per user, not per tenant. Putting the twelve people who travel, approve payments or handle client files on Premium and leaving the rest on Standard is permitted, usually correct, and rarely done — because buying everybody the same thing is simpler.`,
      },
    },
    {
      type: "ICON_POINTS",
      displayOrder: 30,
      data: {
        heading: "What working with us involves",
        items: [
          { label: "A written quote", detail: "Priced against your seat count and term, not a range" },
          { label: "GST invoicing", detail: "To the registered entity you nominate, input credit claimable" },
          { label: "A licence register", detail: "Entitlements, terms and renewal dates, in one place" },
          { label: "Audit-ready paperwork", detail: "Invoices and agreement numbers you can produce on request" },
          { label: "Renewal review", detail: "Usage checked before you pay for another year" },
          { label: "On site when needed", detail: "Across Gurugram and the NCR from our Delhi office" },
        ],
      },
    },
    {
      type: "LINK_LIST",
      displayOrder: 40,
      data: {
        heading: "What we license",
        layout: "cards",
        itemAction: "View",
        items: [
          {
            label: "Microsoft",
            href: "/microsoft",
            description: "Microsoft 365, Windows Server, SQL Server and the licensing programmes behind them.",
          },
          {
            label: "Adobe",
            href: "/adobe",
            description: "Creative Cloud and Acrobat, for teams and for enterprise.",
          },
          {
            label: "Autodesk",
            href: "/autodesk",
            description: "AutoCAD, Revit, Civil 3D and the industry collections.",
          },
          {
            label: "Zoho",
            href: "/zoho",
            description: "Mail, CRM, Desk, Books and Workplace.",
          },
          {
            label: "Software asset management",
            href: "/services/software-asset-management",
            description: "Installations reconciled against entitlements, in both directions.",
          },
          {
            label: "Licence management",
            href: "/services/licence-management",
            description: "The renewal calendar, owned by somebody.",
          },
        ],
      },
    },
    {
      type: "FAQ",
      displayOrder: 50,
      data: {
        source: "manual",
        heading: "Questions from Gurugram buyers",
        items: [
          {
            question: "Do you have an office in Gurugram?",
            answer:
              "No. Our office is at 407, 4th floor, Pearl Business Park, Netaji Subhash Place, Pitampura, New Delhi 110034. We work with companies across Gurugram and the NCR from there, and visit when a meeting or a deployment needs somebody in the room.",
          },
          {
            question: "Our parent company audits our software annually. Can you produce the evidence?",
            answer:
              "For licences bought through us, yes — invoices in your entity's name, agreement or enrolment numbers, terms and assignment records. For licences bought elsewhere we can help assemble what exists and identify what does not, which is usually the more useful half of the exercise.",
          },
          {
            question: "Can you invoice different group entities separately?",
            answer:
              "Yes. Tell us which entity and GSTIN each subscription should sit under before provisioning. Moving a subscription between entities afterwards is possible and tedious.",
          },
          {
            question: "Can we license only some of our staff for the higher security plan?",
            answer:
              "Yes. Microsoft 365 licences are assigned per user, so a mixed assignment across one tenant is normal and usually cheaper than a blanket upgrade. The risk is not evenly distributed across your staff, so the spend need not be either.",
          },
        ],
      },
    },
    {
      type: "CTA_BANNER",
      displayOrder: 60,
      data: {
        tone: "dark",
        heading: "Tell us what your team actually uses",
        body: "A seat total produces a quote for the most expensive plan at that quantity. Headcount by role, and a usage export if you have one, produces a quote for what you need.",
        primaryCta: { href: "/enquiry", label: "Get a quote" },
        secondaryCta: { href: "/software-licensing-company-delhi", label: "Licensing in Delhi" },
        showContactEmail: true,
      },
    },
  ],
};

const DRAFTS: Draft[] = [GEM, NOIDA, GURUGRAM];

export const seoPageDrafts: ContentMigration = {
  id: "2026-11-seo-page-drafts",
  describe: "three landing pages — GeM, Noida, Gurugram — as drafts for review",

  async apply(prisma) {
    const created: string[] = [];
    const skipped: string[] = [];

    for (const draft of DRAFTS) {
      const existing = await prisma.page.findUnique({
        where: { slug: draft.slug },
        select: { id: true },
      });
      if (existing) {
        skipped.push(draft.slug);
        continue;
      }

      const page = await prisma.page.create({
        data: {
          slug: draft.slug,
          title: draft.title,
          description: draft.description,
          keywords: draft.keywords,
          /*
           * The whole point. A PUBLISHED page here would put three unreviewed
           * pages into the sitemap on the next deploy — one of them making
           * statements about public procurement rules.
           */
          status: "DRAFT",
          breadcrumb: draft.breadcrumb,
          faqTopic: null,
          publishedAt: null,
        },
        select: { id: true },
      });

      await prisma.pageSection.createMany({
        data: draft.sections.map((section) => ({
          pageId: page.id,
          type: section.type as never,
          displayOrder: section.displayOrder,
          data: section.data as never,
        })),
      });

      created.push(draft.slug);
    }

    if (created.length === 0) {
      return `all ${DRAFTS.length} page drafts already exist; nothing changed`;
    }
    const tail = skipped.length > 0 ? `; ${skipped.length} already existed` : "";
    return `created ${created.length} page drafts (${created.join(", ")}), none published${tail}`;
  },
};
