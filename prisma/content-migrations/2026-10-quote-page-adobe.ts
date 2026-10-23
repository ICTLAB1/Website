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
const SLUG = "get-a-quote/adobe";

export const quoteAdobe: ContentMigration = {
  id: "2026-10-quote-page-adobe",
  describe: "an Adobe quote page carrying catalogue prices, which the site did not have",

  async apply(prisma) {
    const existing = await prisma.page.findUnique({ where: { slug: SLUG }, select: { id: true } });
    if (existing) return `/${SLUG} already exists; nothing changed`;

    const page = await prisma.page.create({
      data: {
        slug: SLUG,
        title: "Adobe Creative Cloud & Acrobat Pricing in India",
        description:
          "Adobe for Teams pricing in INR with an exact quote for your seat count. VIP programme, Admin Console setup, GST invoicing.",
        keywords: [
          "adobe creative cloud price india",
          "adobe acrobat pro price india",
          "adobe for teams price",
          "adobe vip licensing india",
          "adobe quote india"
        ],
        status: "PUBLISHED",
        breadcrumb: [{ href: "/", label: "Home" }, { label: "Adobe quote" }],
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
          eyebrow: "Adobe for Teams",
          headline: "Adobe pricing, and an exact quote under VIP",
          subheadline:
            "What each licence is sold for is below. Under the Adobe VIP programme discount tiers begin around ten seats and improve with volume — tell us your count and we quote the tier you actually land in.",
          primaryCta: { href: "/enquiry", label: "Get an exact quote" },
          secondaryCta: { href: "/contact", label: "Talk to a specialist" },
          showSearch: false,
        },
      },
      {
        type: "PLANS" as const,
        displayOrder: 20,
        data: {
          heading: "The licences, and what they cost",
          note: "Each figure is the catalogue price for the commitment named beneath it, excluding GST at 18%. Read the commitment before comparing two cards: one may be billed monthly and the other yearly. Seats added mid-term are charged pro rata and renew on your existing anniversary date.",
          items: [
            {
              "name": "Acrobat Standard for Teams",
              "productSlug": "adobe-acrobat-standard-teams",
              "summary": "PDF creation, editing and e-signing for business.",
              "points": [
                "Create, edit and combine PDFs",
                "Fill and sign",
                "Admin Console seat management",
                "Windows and Mac"
              ]
            },
            {
              "name": "Acrobat Pro for Teams",
              "productSlug": "adobe-acrobat-pro-teams",
              "summary": "Acrobat Standard plus advanced editing and comparison.",
              "points": [
                "Everything in Standard",
                "Compare and redact",
                "Advanced e-sign workflows",
                "Mobile and web editing"
              ]
            },
            {
              "name": "Creative Cloud Single App",
              "productSlug": "adobe-creative-cloud-single-app-teams",
              "summary": "One application per user, for teams who need one tool.",
              "points": [
                "Any single Creative Cloud app",
                "100 GB cloud storage",
                "Admin Console seat management",
                "Reassignable when staff change"
              ]
            },
            {
              "name": "Creative Cloud All Apps",
              "productSlug": "adobe-creative-cloud-all-apps-teams",
              "summary": "The full application set for design and production teams.",
              "points": [
                "Photoshop, Illustrator, InDesign, Premiere and more",
                "100 GB cloud storage",
                "Adobe Fonts and Stock integration",
                "Centralised licence control"
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
              "href": "/adobe",
              "label": "Adobe licensing overview"
            },
            {
              "href": "/adobe-acrobat",
              "label": "Acrobat for business"
            },
            {
              "href": "/adobe-creative-cloud",
              "label": "Creative Cloud for teams"
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
