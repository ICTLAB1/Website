import type { ContentMigration } from "./types";

/**
 * More FAQs, and one that had stopped being true.
 *
 * ## Where the gap actually was
 *
 * "121 of 134 products have no FAQ" is the number the catalogue reports and it
 * is the wrong number to act on. `src/app/products/[slug]/page.tsx` reads
 *
 *     const faqs = product.faqs.length > 0 ? product.faqs : product.brand.faqs;
 *
 * so a product with none of its own shows its brand's. Thirteen products
 * answer for themselves, a hundred and two are answered by their brand, and
 * **nineteen have nothing at all** — every HP product, because HP is the one
 * brand with a catalogue and no brand FAQs.
 *
 * That fallback is also why this adds brand FAQs rather than per-product ones.
 * The same three questions copied onto a hundred and two product pages is the
 * duplicate thin content `sitemap.ts` already keeps thirty-four brand pages out
 * of the index to avoid; written once on the brand, they reach every one of
 * those pages without repeating a word of markup.
 *
 * ## One of them was contradicting the site
 *
 * HPE's only FAQ asked *"Why is hardware quoted rather than priced online?"*
 * and answered that a headline figure against an unstated configuration would
 * be misleading. That was true when it was written and has not been true since
 * `2026-10-dtp-price-list` put a price on every server: the page it sits on now
 * shows "From ₹3,27,500" directly above an FAQ explaining why there is no
 * price. It is rewritten to say what the figure means instead of denying it
 * exists.
 *
 * ## What an answer here is allowed to claim
 *
 * Three sources, and nothing else:
 *
 *  - what is on the record — the term, the licence type, the GST position, the
 *    fact that hardware is priced per configuration;
 *  - what this site already publishes — the quotation process, the tentative
 *    price note, the 300-seat cap already stated on `/microsoft-365`, Adobe VIP
 *    already named on `/get-a-quote/adobe`;
 *  - procurement advice, which is this business's opinion and is written as
 *    one, with the trade-off stated rather than hidden.
 *
 * Nothing here promises a lead time, a discount, a stock position, a support
 * response or an authorisation. Where a publisher's rule is quoted it is one
 * that is stable and documented — Windows Server CALs, Autodesk named-user
 * reassignment — rather than a figure that moves with a price list.
 *
 * These are worth a read by whoever answers the phone before they are treated
 * as settled: they are accurate as far as this codebase can establish, and the
 * sales team knows things this codebase does not.
 *
 * Idempotent on the question text per brand, so a second run adds nothing and
 * an edited answer is left alone.
 */

type BrandFaq = { brand: string; question: string; answer: string; order: number };

/** The HPE answer that stopped being true, matched on the question it had. */
const REWRITE = {
  brand: "hpe",
  was: "Why is hardware quoted rather than priced online?",
  question: "What does the price on a server listing cover?",
  answer:
    "The configurations we have costed, and the figure shown is the lowest of them — a better-specified build of the same chassis costs more. It is indicative until a written quotation fixes it against the specification and quantity you need.",
  order: 10,
};

const ADDITIONS: BrandFaq[] = [
  {
    brand: "hpe",
    order: 20,
    question: "How far ahead should we order?",
    answer:
      "Lead times depend on the configuration and are confirmed in writing on the quotation before an order is placed. We would rather give you a date on the quotation than a date on the phone that nobody can hold.",
  },

  /*
   * HP first. These nineteen products are the only ones on the site that show
   * no FAQ at all, which is the whole reason this migration exists.
   */
  {
    brand: "hp",
    order: 10,
    question: "What separates the Pro, Elite and Z ranges?",
    answer:
      "Pro is the mainstream business line. Elite adds the manageability and security features larger estates standardise on. Z is the workstation range, for CAD, rendering and simulation. Most offices are well served by Pro.",
  },
  {
    brand: "hp",
    order: 20,
    question: "Should we standardise on one configuration?",
    answer:
      "Above a handful of machines, yes. One image, one spares holding and one support conversation are worth more than the few thousand rupees a mixed order saves, and it makes the next tranche a repeat order rather than a fresh specification.",
  },
  {
    brand: "hp",
    order: 30,
    question: "What does the listed price cover?",
    answer:
      "The configuration priced, excluding GST. A different processor, memory or storage specification changes the figure, which is why the quotation is the number to work from rather than the page.",
  },

  {
    brand: "adobe",
    order: 30,
    question: "What is VIP, and does it change the price?",
    answer:
      "The Value Incentive Plan is Adobe's subscription programme for organisations: every seat sits on one renewal date, and the discount tier rises with the number of seats on the agreement. Seats added mid-term are prorated to that date.",
  },
  {
    brand: "adobe",
    order: 40,
    question: "What happens to our work if we stop subscribing?",
    answer:
      "Files saved on your own machines stay yours and stay readable in whatever formats other software supports. The applications themselves stop opening at the end of the term, so the renewal decision is better made before the date than on it.",
  },

  {
    brand: "autodesk",
    order: 30,
    question: "Can a subscription be moved to a different person?",
    answer:
      "Yes. A named-user subscription is reassigned through the Autodesk account portal when somebody leaves or changes role. It is the seat that is licensed, not the person permanently.",
  },
  {
    brand: "autodesk",
    order: 40,
    question: "Is a multi-year term worth taking?",
    answer:
      "It fixes the price for the term, which is the argument for it where the software is certain to be needed. Against that, a one-year term keeps the option to change product or quantity at each renewal. We will price both and let you choose.",
  },

  {
    brand: "microsoft",
    order: 40,
    question: "Is there a seat limit on the Business plans?",
    answer:
      "Yes. The Microsoft 365 Business plans are capped at 300 users. Above that the Enterprise plans apply, and the move is far easier planned before the cap is reached than at it.",
  },
  {
    brand: "microsoft",
    order: 50,
    question: "Do Windows Server licences include client access?",
    answer:
      "No. Windows Server is licensed by core, and each user or device that connects to it needs a CAL as well. We quote the cores and the CALs together, so the figure on the page is not a surprise on the invoice.",
  },

  {
    brand: "dell",
    order: 20,
    question: "Is a workstation worth it over a business desktop?",
    answer:
      "Where the software is certified against workstation graphics — CAD, simulation, colour-critical work — yes, because the software publisher's own support assumes it. For office work it is money spent on headroom nobody uses.",
  },
  {
    brand: "dell",
    order: 30,
    question: "Can one quotation cover servers, desktops and the licences?",
    answer:
      "Yes. Quotations are itemised and can carry several manufacturers alongside the software that runs on them, which is usually easier to approve than three documents arriving separately.",
  },

  {
    brand: "zoho",
    order: 30,
    question: "Can Zoho run alongside Microsoft 365?",
    answer:
      "Yes, and it commonly does — mail and documents on Microsoft, CRM and finance on Zoho. The integration worth setting up first is contact and calendar sync, so the sales team is not keeping two address books.",
  },

  {
    brand: "sketchup",
    order: 20,
    question: "Is SketchUp enough for construction documentation?",
    answer:
      "For design development and client-facing visuals, usually. For full construction documentation most practices still produce the drawings in a dedicated CAD or BIM tool and use SketchUp upstream of it.",
  },

  {
    brand: "corel",
    order: 20,
    question: "Can CorelDRAW work with Illustrator files?",
    answer:
      "It imports and exports AI, PDF, SVG and EPS, which covers most exchange with an Adobe-based studio. Complex effects and some typography can shift on the way across, so test a representative file before committing a workflow to it.",
  },
];

export const moreBrandFaqs: ContentMigration = {
  id: "2026-10-more-brand-faqs",
  describe: "add brand FAQs, and correct the HPE one that says hardware is not priced",

  async apply(prisma) {
    let added = 0;
    let rewritten = 0;
    const unknown = new Set<string>();

    const stale = await prisma.faq.findFirst({
      where: { brand: { slug: REWRITE.brand }, question: REWRITE.was },
      select: { id: true },
    });
    if (stale) {
      await prisma.faq.update({
        where: { id: stale.id },
        data: { question: REWRITE.question, answer: REWRITE.answer, displayOrder: REWRITE.order },
      });
      rewritten = 1;
    }

    for (const faq of ADDITIONS) {
      const brand = await prisma.brand.findFirst({
        where: { slug: faq.brand },
        select: { id: true },
      });
      if (!brand) {
        unknown.add(faq.brand);
        continue;
      }

      /*
       * Keyed on the question, not on a count. A brand that has had an FAQ
       * added by hand since this was written keeps it, and this adds only what
       * is genuinely missing.
       */
      const existing = await prisma.faq.findFirst({
        where: { brandId: brand.id, question: faq.question },
        select: { id: true },
      });
      if (existing) continue;

      await prisma.faq.create({
        data: {
          brandId: brand.id,
          question: faq.question,
          answer: faq.answer,
          displayOrder: faq.order,
        },
      });
      added += 1;
    }

    const parts = [`added ${added} brand FAQ${added === 1 ? "" : "s"}`];
    if (rewritten) parts.push("and corrected the HPE answer that said hardware is not priced");
    if (unknown.size > 0) parts.push(`no brand record for ${[...unknown].join(", ")}`);
    return parts.join(", ");
  },
};
