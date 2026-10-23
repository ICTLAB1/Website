import type { ContentMigration } from "./types";

/**
 * A quote page per brand, carrying the catalogue's own prices.
 *
 * The ads work and the landing page does not. Over the seven days to 22
 * October the licensing campaign took 278 clicks at an 8.97% click-through
 * rate, which is a good advertisement doing its job. Across the whole of
 * October, against roughly ₹8,250 of spend, the enquiry table gained one
 * submission that was neither internal nor outside the target market. The loss
 * is not in the auction; it is between arriving and asking.
 *
 * The likeliest reason is what a product page says where a number should be.
 * Somebody who searched "autocad license price", clicked a priced advertisement
 * and landed on a page that declines to answer has learned nothing. The
 * resellers holding those positions publish figures and win the enquiry anyway,
 * because a credible number beside "your price depends on seat count" is a
 * reason to ask rather than a reason to leave.
 *
 * ## No price is written into this file
 *
 * The PLANS block takes a `productSlug` and the price is read from the
 * catalogue row — the same figure the quotation engine charges from. A price
 * typed into a migration is correct the day it is written and wrong the first
 * time a publisher moves a list, and two copies of a price is how a page and
 * an invoice come to disagree. That also keeps the rule from
 * `2026-08-ranking-gaps` intact: it was never "no prices", it was no figure
 * nobody can check.
 *
 * That the block renders the price was not true when this page was written. It
 * used the slug for a link labelled "View pricing" and nothing else, so these
 * three pages would have shipped headed "the plans, and what they cost", noting
 * "excluding GST at 18%", and carrying no figure anywhere — the exact defect
 * they exist to fix, reproduced one level further in. `PlansBlock` reads the
 * catalogue now, and prints each variant's own commitment beside the money,
 * because Acrobat Standard at ₹16,320 a year and Acrobat Pro at ₹1,850 a month
 * are otherwise a comparison that says Pro is nine times cheaper.
 *
 * One page per brand rather than one for all three, because the ad groups are
 * already split that way: somebody who searched for AutoCAD should not land on
 * a page that opens with Microsoft 365.
 *
 * Idempotent, and creates nothing that already exists.
 */
const SLUG = "get-a-quote/microsoft";

export const quoteMicrosoft: ContentMigration = {
  id: "2026-10-quote-page-microsoft",
  describe: "a Microsoft quote page carrying catalogue prices, which the site did not have",

  async apply(prisma) {
    const existing = await prisma.page.findUnique({ where: { slug: SLUG }, select: { id: true } });
    if (existing) return `/${SLUG} already exists; nothing changed`;

    const page = await prisma.page.create({
      data: {
        slug: SLUG,
        title: "Microsoft 365 Pricing & Quote in India",
        description:
          "Microsoft 365 plan pricing in INR with an exact quote for your seat count. CSP terms, GST invoicing, Microsoft Solutions Partner.",
        keywords: [
          "microsoft 365 price india",
          "office 365 price india",
          "microsoft 365 quote",
          "microsoft 365 business premium price",
          "microsoft licensing quote india"
        ],
        status: "PUBLISHED",
        breadcrumb: [{ href: "/", label: "Home" }, { label: "Microsoft 365 quote" }],
        faqTopic: null,
        publishedAt: new Date(),
      },
      select: { id: true },
    });

    const sections = [
      {
        type: "HERO" as const,
        displayOrder: 10,
        data: {
          tone: "dark",
          eyebrow: "Microsoft 365",
          headline: "Microsoft 365 pricing, and an exact quote for your seat count",
          subheadline:
            "The plans and what each is sold for are below. What you pay depends on seat count and commitment term, and for most customers it is less than list — send us your numbers and you get a written figure back.",
          primaryCta: { href: "/enquiry", label: "Get an exact quote" },
          secondaryCta: { href: "/contact", label: "Talk to a specialist" },
          showSearch: false,
        },
      },
      {
        type: "PLANS" as const,
        displayOrder: 20,
        data: {
          heading: "The plans, and what they cost",
          note: "Each figure is the catalogue price for the commitment named beneath it, excluding GST at 18%. Business plans cap at 300 seats; above that the Enterprise plans apply.",
          items: [
            {
              "name": "Business Basic",
              "productSlug": "microsoft-365-business-basic",
              "summary": "Web and mobile Office, business email and Teams. No desktop applications.",
              "points": [
                "Business email on your own domain",
                "Teams, OneDrive and SharePoint",
                "Web and mobile Office only",
                "Suits frontline and field roles"
              ]
            },
            {
              "name": "Business Standard",
              "productSlug": "microsoft-365-business-standard",
              "summary": "Desktop Office applications plus the hosted services. The common default.",
              "points": [
                "Installed Word, Excel, PowerPoint and Outlook",
                "Up to five devices per user",
                "Everything in Business Basic",
                "300-seat maximum"
              ]
            },
            {
              "name": "Business Premium",
              "productSlug": "microsoft-365-business-premium",
              "summary": "Standard plus device management and the security stack.",
              "points": [
                "Everything in Business Standard",
                "Intune device management",
                "Defender for Office 365",
                "Entra ID P1 conditional access"
              ]
            },
            {
              "name": "Microsoft 365 E3",
              "productSlug": "microsoft-365-e3",
              "summary": "Enterprise licensing with no seat ceiling.",
              "points": [
                "No 300-seat cap",
                "Compliance and eDiscovery",
                "Windows Enterprise rights",
                "For 300+ users or regulated work"
              ]
            },
            {
              "name": "Microsoft 365 E5",
              "productSlug": "microsoft-365-e5",
              "summary": "E3 plus the advanced security and analytics tier.",
              "points": [
                "Everything in E3",
                "Advanced threat protection",
                "Power BI Pro included",
                "Audit and insider risk controls"
              ]
            }
          ],
        },
      },
      {
        type: "ICON_POINTS" as const,
        displayOrder: 30,
        data: {
          heading: "What quoting through us gets you",
          items: [
            { label: "A written figure", detail: "Priced against your seat count and term, not a range" },
            { label: "GST invoicing", detail: "Invoiced in India, input credit claimable" },
            { label: "Deployment included", detail: "Provisioning and migration, not just the keys" },
            { label: "Renewal review", detail: "Usage checked before you pay for another year" },
          ],
        },
      },
      {
        type: "FAQ" as const,
        displayOrder: 40,
        data: {
          source: "page",
          items: [
            {
              question: "Are these the prices I will pay?",
              answer:
                "They are the list prices this catalogue sells at, excluding GST, and each one says which commitment it is the price of. What you pay depends on seat count and term, and for most customers it is lower. Send us your numbers and we will quote exactly.",
            },
            {
              question: "Is there a minimum order?",
              answer: "No. We supply from a single licence upwards, though pricing improves with volume.",
            },
            {
              question: "Can I get a GST invoice?",
              answer:
                "Yes. Every order is invoiced by TechZoid Technologies Private Limited with GST, and the input credit is claimable.",
            },
            {
              question: "Do you help with deployment?",
              answer:
                "Yes. Provisioning, licence assignment and migration support are part of what we supply, not a separate engagement.",
            },
          ],
        },
      },
      {
        type: "LINK_LIST" as const,
        displayOrder: 50,
        data: {
          heading: "Related pages",
          layout: "cards",
          items: [
            {
              "href": "/microsoft-365",
              "label": "Compare all Microsoft 365 plans"
            },
            {
              "href": "/microsoft-licensing",
              "label": "CSP, EA and volume licensing"
            },
            {
              "href": "/microsoft-csp",
              "label": "How CSP works"
            }
          ],
        },
      },
      {
        type: "CTA_BANNER" as const,
        displayOrder: 60,
        data: {
          tone: "dark",
          heading: "Tell us your seat count",
          body: "Send the products and the number of users. You get a written quotation with the exact figure, the term options and what deployment is included.",
          primaryCta: { href: "/enquiry", label: "Request a quotation" },
          secondaryCta: { href: "/contact", label: "Call the Delhi office" },
        },
      },
    ];

    for (const section of sections) {
      await prisma.pageSection.create({
        data: {
          pageId: page.id,
          type: section.type,
          displayOrder: section.displayOrder,
          visible: true,
          data: section.data,
        },
      });
    }

    return `/${SLUG} created with ${sections.length} sections`;
  },
};
