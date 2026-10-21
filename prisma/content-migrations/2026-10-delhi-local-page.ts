import type { ContentMigration } from "./types";

/**
 * A page for the one thing this site sells that has no page: itself, locally.
 *
 * `software licensing company in delhi` returns nothing from this domain, and
 * the reason is not competition. The SERP for it is thin. The reason is that
 * there is no page about being a licensing company in Delhi — every page here
 * is about a product or a programme, and the only mention of the office is a
 * line on `/contact`.
 *
 * That gap matters more than its search volume suggests. A buyer typing it is
 * not comparing SKUs; they are looking for a supplier they can call, visit and
 * put on a purchase order. It is the highest-intent query in the set and the
 * cheapest to win, because the competitors ranking for the national reseller
 * terms are doing it with city pages — one of them holds position 5 for
 * `microsoft 365 reseller india` on a page about Gurugram.
 *
 * Deliberately not five pages.
 *
 * The brief this came from proposed `/microsoft-365-reseller-india`,
 * `/autodesk-reseller-india`, `/adobe-reseller-india`,
 * `/volume-licensing-india` and this one. Four of those would have landed on
 * top of pages that already exist:
 *
 *  - `/microsoft-licensing` already targets volume licensing, CSP vs EA and
 *    Enterprise Agreement thresholds. `/volume-licensing-india` would have
 *    competed with it for the same query.
 *  - `/adobe` and `/autodesk` already carry the licensing copy their
 *    reseller-intent variants would have repeated.
 *  - `/microsoft-365` and `/microsoft-csp` cover the M365 purchasing question
 *    between them.
 *
 * Three pages aimed at one query is the state this site is already in for
 * Microsoft 365 Business Premium, which has a product page, a plan page and a
 * blog post, and ranks for none of them. Adding four more instances of that
 * would have been the opposite of the fix.
 *
 * No price appears here. The convention this catalogue uses is that an
 * unverified figure is worse on a page than a quote route — see
 * `2026-08-ranking-gaps` — and nothing on this page needs one.
 *
 * Every claim is one already on file elsewhere on the site: the ISO
 * certifications from `/about`, the partner designations from the brand pages,
 * the Netaji Subhash Place address from `/contact`. Nothing here is new about
 * the company, only newly findable.
 */
const SLUG = "software-licensing-company-delhi";

export const delhiLocalPage: ContentMigration = {
  id: "2026-10-delhi-local-page",
  describe: "a page about being a licensing company in Delhi, which this site did not have",

  async apply(prisma) {
    const existing = await prisma.page.findUnique({
      where: { slug: SLUG },
      select: { id: true },
    });
    if (existing) return `/${SLUG} already exists; nothing changed`;

    const page = await prisma.page.create({
      data: {
        slug: SLUG,
        /*
         * No brand in the title, and a description under 160 characters.
         *
         * The root layout sets `title.template` to "%s | TechZoid", so a title
         * carrying the name itself renders as "... | TechZoid | TechZoid" —
         * which is what this one did when it was first rendered. Every other
         * page in the catalogue omits it for that reason.
         *
         * 160 is where Google truncates, and `2026-09-trim-long-meta-descriptions`
         * exists because every description over it was being cut mid-clause.
         * This one was 164 and would have re-introduced exactly that.
         */
        title: "Software Licensing Company in Delhi NCR",
        description:
          "Microsoft, Adobe and Autodesk licensing from a Delhi partner. Office at Netaji Subhash Place, ISO 27001 certified, GST invoicing and purchase orders accepted.",
        keywords: [
          "software licensing company in delhi",
          "software reseller delhi",
          "it licensing partner delhi ncr",
          "microsoft partner delhi",
          "software licensing netaji subhash place",
        ],
        status: "PUBLISHED",
        breadcrumb: [{ href: "/", label: "Home" }, { label: "Delhi NCR" }],
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
          eyebrow: "Delhi NCR",
          headline: "A licensing partner with an office you can walk into",
          subheadline:
            "TechZoid Technologies supplies Microsoft, Adobe, Autodesk, AWS and Zoho licensing from Netaji Subhash Place, New Delhi. ISO 9001, ISO 27001 and ISO/IEC 20000-1 certified.",
          primaryCta: { href: "/enquiry", label: "Request pricing" },
          secondaryCta: { href: "/contact", label: "Visit or call us" },
          showSearch: false,
        },
      },
      {
        type: "RICH_TEXT" as const,
        displayOrder: 20,
        data: {
          markdown:
            "Buying licences from a publisher's website works until something goes wrong. Then you are in a support queue, explaining your tenant to somebody who has never seen it.\n\nA local partner means a named person who answers the phone, knows your setup, and can be in your office when a deployment stalls. For a tender or an audit it also means a supplier with a verifiable Delhi address and an Indian GST registration — which is a procurement requirement far more often than it is a preference.",
        },
      },
      {
        type: "BULLETS" as const,
        displayOrder: 30,
        data: {
          heading: "What we license",
          items: [
            "Microsoft — Microsoft 365, Office, Windows, Windows Server, SQL Server, Visual Studio, Visio and Azure",
            "Autodesk — AutoCAD, Revit, Civil 3D, 3ds Max, Fusion and the AEC and Product Design collections",
            "Adobe — Creative Cloud, Acrobat and Acrobat Sign under the VIP programme",
            "Zoho — the business application suite, and AWS for cloud infrastructure",
            "Hardware — HP and Dell workstations, laptops and servers, quoted alongside the software",
          ],
        },
      },
      {
        type: "RICH_TEXT" as const,
        displayOrder: 40,
        data: {
          heading: "Where we are, and who we reach",
          markdown:
            "Our office is in **Netaji Subhash Place, Pitampura**, in North West Delhi — convenient for Rohini, Shalimar Bagh, Ashok Vihar and Punjabi Bagh, and a straightforward run from Central and South Delhi.\n\nWe supply customers across the National Capital Region, including Noida, Gurugram, Ghaziabad and Faridabad, and nationally across India. For a requirement that warrants it, we will come to your office rather than ask you to come to ours.",
        },
      },
      {
        type: "KEY_VALUE_LIST" as const,
        displayOrder: 50,
        data: {
          heading: "For procurement and compliance teams",
          items: [
            {
              key: "GST invoicing",
              value: "A compliant tax invoice from TechZoid Technologies Private Limited, with input credit claimable.",
            },
            {
              key: "Purchase orders",
              value: "We accept POs and issue proforma invoices against them.",
            },
            {
              key: "Tender documentation",
              value: "ISO certificates, partner authorisation letters and company registration documents supplied on request.",
            },
            {
              key: "Certifications",
              value: "ISO 9001:2015 quality management, ISO 27001:2022 information security, ISO/IEC 20000-1:2018 IT service management.",
            },
          ],
        },
      },
      {
        type: "FAQ" as const,
        displayOrder: 60,
        data: {
          source: "page",
          items: [
            {
              question: "Where is your office in Delhi?",
              answer:
                "Netaji Subhash Place, Pitampura, New Delhi. The full address and business hours are on our contact page, and you are welcome to visit by appointment.",
            },
            {
              question: "Do you serve Noida and Gurugram?",
              answer:
                "Yes — across the whole National Capital Region, and nationally across India.",
            },
            {
              question: "Do you supply to government departments and public sector undertakings?",
              answer:
                "Yes. We can provide the documentation a tender requires, including ISO certificates, partner authorisation letters and company registration papers.",
            },
            {
              question: "Can I get a GST invoice?",
              answer:
                "Every order is invoiced by TechZoid Technologies Private Limited with GST, and the input credit is claimable.",
            },
          ],
        },
      },
      {
        type: "LINK_LIST" as const,
        displayOrder: 70,
        data: {
          heading: "Related pages",
          layout: "cards",
          items: [
            { href: "/microsoft-licensing", label: "Microsoft licensing guide" },
            { href: "/autodesk", label: "Autodesk licensing" },
            { href: "/adobe", label: "Adobe licensing" },
            { href: "/about", label: "About TechZoid" },
          ],
        },
      },
      {
        type: "CTA_BANNER" as const,
        displayOrder: 80,
        data: {
          tone: "dark",
          heading: "Tell us what you need licensed",
          body: "Send your requirement and seat count and we will come back with a written quotation. If you would rather talk it through first, call the Delhi office.",
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
